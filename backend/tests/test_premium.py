"""Premium API tests: 402 gating for free tier, real data for premium."""
from tests.test_pipeline import upload_sample


async def seed_competitors():
    from scripts.seed import COMPETITORS

    from app.db.session import async_session_factory
    from app.models import Competitor

    async with async_session_factory() as db:
        for payload in COMPETITORS:
            db.add(Competitor(**payload))
        await db.commit()


# ---- 402 gating (free tier) ----

async def test_competitors_free_tier_402(auth_client):
    res = await auth_client.get("/api/competitors")
    assert res.status_code == 402
    assert "Premium" in res.json()["detail"]


async def test_alerts_free_tier_402(auth_client):
    res = await auth_client.get("/api/alerts")
    assert res.status_code == 402


async def test_reply_draft_free_tier_402(auth_client):
    res = await auth_client.post("/api/reviews/00000000-0000-0000-0000-000000000000/reply-draft")
    assert res.status_code == 402


# ---- premium behavior ----

async def test_competitors_premium(premium_client):
    await seed_competitors()
    await upload_sample(premium_client)

    res = await premium_client.get("/api/competitors")
    assert res.status_code == 200
    comparisons = res.json()
    assert len(comparisons) == 2
    comp = comparisons[0]
    assert set(comp.keys()) == {
        "you", "competitor", "axes", "sentimentSplit", "overlapScore", "advantages", "gaps",
    }
    assert comp["you"]["reviewCount"] == 50
    assert len(comp["axes"]) == 6
    assert all(set(a.keys()) == {"axis", "you", "competitor"} for a in comp["axes"])
    assert 0 <= comp["overlapScore"] <= 1


async def test_competitors_premium_without_dataset_empty(premium_client):
    await seed_competitors()
    res = await premium_client.get("/api/competitors")
    assert res.status_code == 200
    assert res.json() == []


async def test_alerts_premium_returns_pipeline_alerts(premium_client):
    await upload_sample(premium_client)
    res = await premium_client.get("/api/alerts")
    assert res.status_code == 200
    alerts = res.json()
    assert alerts, "pipeline should have produced at least one alert for the sample data"
    alert = alerts[0]
    assert set(alert.keys()) == {
        "id", "theme", "severity", "share", "threshold", "previousShare",
        "windowDays", "sampleReviews", "emailSentTo", "triggeredAt",
    }
    assert alert["severity"] in {"warning", "serious", "critical"}
    assert alert["share"] > 0


async def test_reply_draft_premium(premium_client):
    await upload_sample(premium_client)
    dash = await premium_client.get(
        f"/api/datasets/{(await premium_client.get('/api/datasets')).json()[0]['id']}/dashboard"
    )
    negative = next(r for r in dash.json()["reviews"] if r["sentimentLabel"] == "negative")

    res = await premium_client.post(f"/api/reviews/{negative['id']}/reply-draft")
    assert res.status_code == 201, res.text
    draft = res.json()
    assert set(draft.keys()) == {"id", "reviewId", "tone", "body", "portal", "portalUrl"}
    assert draft["reviewId"] == negative["id"]
    assert draft["portal"] == "amazon"
    assert "NovaBrew" in draft["body"]
    assert draft["portalUrl"].startswith("https://")


async def test_reply_draft_unknown_review_404(premium_client):
    res = await premium_client.post("/api/reviews/00000000-0000-0000-0000-000000000000/reply-draft")
    assert res.status_code == 404
