"""Dashboard API tests: full DashboardData shape + camelCase contract + 409."""
from tests.test_pipeline import upload_sample


async def test_dashboard_matches_frontend_contract(auth_client):
    body = await upload_sample(auth_client)
    dataset_id = body["dataset"]["id"]

    res = await auth_client.get(f"/api/datasets/{dataset_id}/dashboard")
    assert res.status_code == 200, res.text
    dash = res.json()

    # Top-level keys — must equal frontend DashboardData exactly
    assert set(dash.keys()) == {"dataset", "kpis", "trend", "distribution", "themes", "keywords", "reviews"}
    assert set(dash["kpis"].keys()) == {
        "reviewsAnalyzed", "netSentiment", "positiveRate", "complaintThemes", "avgRating", "responseOpportunities",
    }
    assert dash["kpis"]["reviewsAnalyzed"] == 50
    assert -1 <= dash["kpis"]["netSentiment"] <= 1
    assert 0 <= dash["kpis"]["positiveRate"] <= 1
    assert dash["kpis"]["complaintThemes"] >= 1

    # Trend: weekly buckets, percentages
    assert len(dash["trend"]) >= 4
    for point in dash["trend"]:
        assert set(point.keys()) == {"date", "positive", "neutral", "negative", "score"}
        assert point["positive"] + point["neutral"] + point["negative"] == 100

    dist = dash["distribution"]
    assert dist["positive"] + dist["neutral"] + dist["negative"] == 100

    # Themes match frontend ThemeCluster fields
    theme = dash["themes"][0]
    assert set(theme.keys()) == {
        "id", "label", "summary", "reviewCount", "share", "avgSentiment", "isComplaint", "trend",
    }

    keyword = dash["keywords"][0]
    assert set(keyword.keys()) == {"term", "count", "sentiment"}

    review = dash["reviews"][0]
    assert set(review.keys()) == {
        "id", "datasetId", "author", "rating", "text", "createdAt", "sentimentScore", "sentimentLabel", "themeId",
    }
    assert len(dash["reviews"]) == 50


async def test_dashboard_before_analysis_409(auth_client, monkeypatch):
    # Suppress background execution so the job stays queued
    from app.workers import runner

    monkeypatch.setattr(runner.job_runner, "enqueue", lambda background, job_id: None)
    import app.api.datasets as datasets_api

    monkeypatch.setattr(datasets_api, "job_runner", runner.job_runner)

    body = await upload_sample(auth_client)
    res = await auth_client.get(f"/api/datasets/{body['dataset']['id']}/dashboard")
    assert res.status_code == 409
    assert "status: queued" in res.json()["detail"]


async def test_dashboard_unknown_dataset_404(auth_client):
    res = await auth_client.get("/api/datasets/00000000-0000-0000-0000-000000000000/dashboard")
    assert res.status_code == 404
