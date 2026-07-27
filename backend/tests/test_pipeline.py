"""End-to-end pipeline test with mock adapters: upload → background analysis →
job done → sentiment/embeddings/themes/keywords/alerts persisted."""
import io
import os
import uuid

from sqlalchemy import select

SAMPLE_CSV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sample_reviews.csv")


async def upload_sample(client):
    with open(SAMPLE_CSV, "rb") as f:
        content = f.read()
    res = await client.post(
        "/api/datasets/upload",
        files={"file": ("sample_reviews.csv", io.BytesIO(content), "text/csv")},
        data={"name": "Amazon — NovaBrew Go", "productName": "NovaBrew Go Espresso Maker", "source": "amazon"},
    )
    assert res.status_code == 201, res.text
    return res.json()


async def test_pipeline_end_to_end(auth_client):
    body = await upload_sample(auth_client)
    job_id = body["job"]["id"]
    dataset_id = body["dataset"]["id"]

    # ASGITransport runs BackgroundTasks after the response, so the job is done by now.
    job = await auth_client.get(f"/api/jobs/{job_id}")
    assert job.status_code == 200
    assert job.json()["status"] == "done", job.json()
    assert job.json()["progress"] == 100

    from app.db.session import async_session_factory
    from app.models import FeedbackAlert, KeywordStat, Review, ThemeCluster

    async with async_session_factory() as db:
        reviews = list((await db.scalars(select(Review).where(Review.dataset_id == uuid.UUID(dataset_id)))).all())
        assert len(reviews) == 50
        assert all(r.sentiment_score is not None and r.sentiment_label is not None for r in reviews)
        assert all(r.embedding is not None and len(r.embedding) == 384 for r in reviews)
        assert all(r.theme_id is not None for r in reviews)

        themes = list(
            (await db.scalars(select(ThemeCluster).where(ThemeCluster.dataset_id == uuid.UUID(dataset_id)))).all()
        )
        assert len(themes) >= 2
        assert any(t.is_complaint for t in themes)
        assert abs(sum(t.share for t in themes) - 1.0) < 0.01

        keywords = list(
            (await db.scalars(select(KeywordStat).where(KeywordStat.dataset_id == uuid.UUID(dataset_id)))).all()
        )
        assert keywords, "expected persisted keyword stats"
        assert {k.sentiment for k in keywords} <= {"positive", "neutral", "negative"}

        alerts = list(
            (await db.scalars(select(FeedbackAlert).where(FeedbackAlert.dataset_id == uuid.UUID(dataset_id)))).all()
        )
        # packaging complaints are ~24% of the sample — above the 15% threshold
        assert alerts, "expected the rule engine to trigger at least one alert"
        assert all(a.severity in {"warning", "serious", "critical"} for a in alerts)
        assert any(a.email_sent_to for a in alerts if a.severity in {"serious", "critical"})


async def test_job_of_other_user_404(auth_client, client):
    body = await upload_sample(auth_client)
    other = await client.post(
        "/api/auth/register",
        json={"email": "spy@test.co", "name": "Spy", "password": "S3cure!pass"},
    )
    res = await client.get(
        f"/api/jobs/{body['job']['id']}",
        headers={"Authorization": f"Bearer {other.json()['token']}"},
    )
    assert res.status_code == 404


async def test_pipeline_marks_failed_job(auth_client, monkeypatch):
    """If a pipeline stage blows up, the job records failed + error message."""
    from app.integrations import providers

    class ExplodingEmbedder:
        async def embed(self, texts):
            raise RuntimeError("Embedding provider unavailable")

    monkeypatch.setattr(providers, "get_embedder", lambda: ExplodingEmbedder())
    import app.services.pipeline as pipeline_module

    monkeypatch.setattr(pipeline_module, "get_embedder", lambda: ExplodingEmbedder())

    body = await upload_sample(auth_client)
    job = await auth_client.get(f"/api/jobs/{body['job']['id']}")
    assert job.json()["status"] == "failed"
    assert "Embedding provider unavailable" in job.json()["error"]
