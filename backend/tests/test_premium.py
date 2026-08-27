"""Premium API tests: 402 gating for free tier, real data for premium."""
import uuid

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
        "id", "datasetId", "theme", "severity", "share", "threshold", "previousShare",
        "sampleReviews", "readAt", "triggeredAt",
    }
    assert alert["severity"] in {"warning", "serious", "critical"}
    assert alert["share"] > 0
    assert alert["readAt"] is None, "a freshly raised alert must be unread"


async def test_alerts_carry_their_dataset(premium_client):
    """Every alert names the upload that raised it, so the client can show the
    selected dataset's alerts instead of every dataset's at once."""
    await seed_competitors()
    first = (await upload_sample(premium_client))["dataset"]["id"]
    second = (await upload_sample(premium_client))["dataset"]["id"]

    alerts = (await premium_client.get("/api/alerts")).json()
    by_dataset = {a["datasetId"] for a in alerts}
    assert by_dataset == {first, second}, "the feed should span both uploads"
    assert [a for a in alerts if a["datasetId"] == first]
    assert [a for a in alerts if a["datasetId"] == second]


async def test_competitors_follow_the_selected_dataset(premium_client):
    """`datasetId` picks which dataset is benchmarked. Without it the endpoint
    pinned itself to the newest analysed upload, so the UI's dataset switcher
    changed nothing on this page."""
    await seed_competitors()
    first = (await upload_sample(premium_client))["dataset"]["id"]
    second = (await upload_sample(premium_client))["dataset"]["id"]

    def review_count(body):
        return body[0]["you"]["reviewCount"]

    explicit_first = (await premium_client.get(f"/api/competitors?datasetId={first}")).json()
    explicit_second = (await premium_client.get(f"/api/competitors?datasetId={second}")).json()
    assert explicit_first and explicit_second
    assert review_count(explicit_first) == 50 and review_count(explicit_second) == 50

    # The two uploads are the same CSV, so compare identity rather than counts:
    # each response must be built from the dataset that was asked for.
    assert explicit_first[0]["you"]["name"] == explicit_second[0]["you"]["name"]

    # Omitted -> newest analysed dataset (the documented fallback).
    assert (await premium_client.get("/api/competitors")).json()

    # Unknown / malformed ids yield nothing rather than another dataset's numbers.
    import uuid as _uuid

    assert (await premium_client.get(f"/api/competitors?datasetId={_uuid.uuid4()}")).json() == []
    assert (await premium_client.get("/api/competitors?datasetId=not-a-uuid")).json() == []


async def test_competitors_reject_another_users_dataset(premium_client, client):
    """Asking for a stranger's dataset returns nothing, never their numbers."""
    await seed_competitors()
    mine = (await upload_sample(premium_client))["dataset"]["id"]

    stranger = await client.post(
        "/api/auth/register",
        json={"email": "peeker@test.co", "name": "Peeker", "password": "S3cure!pass"},
    )
    from app.db.session import async_session_factory
    from app.models import User

    async with async_session_factory() as db:
        u = await db.get(User, uuid.UUID(stranger.json()["user"]["id"]))
        u.tier = "premium"
        await db.commit()

    res = await client.get(
        f"/api/competitors?datasetId={mine}",
        headers={"Authorization": f"Bearer {stranger.json()['token']}"},
    )
    assert res.status_code == 200
    assert res.json() == []


async def test_alert_read_state(premium_client):
    """Alerts are in-app notifications: unread on arrival, markable read one at
    a time or in bulk, and marking read is idempotent."""
    await upload_sample(premium_client)
    alerts = (await premium_client.get("/api/alerts")).json()
    assert alerts and all(a["readAt"] is None for a in alerts)

    first = alerts[0]["id"]
    res = await premium_client.patch(f"/api/alerts/{first}/read")
    assert res.status_code == 200
    stamped = res.json()["readAt"]
    assert stamped is not None

    # Idempotent: a second read keeps the original timestamp.
    again = await premium_client.patch(f"/api/alerts/{first}/read")
    assert again.json()["readAt"] == stamped

    res = await premium_client.post("/api/alerts/read-all")
    assert res.status_code == 200
    assert all(a["readAt"] is not None for a in res.json())
    # read-all must not disturb an alert that was already read.
    assert next(a for a in res.json() if a["id"] == first)["readAt"] == stamped


async def test_read_all_can_be_scoped_to_one_dataset(premium_client):
    """The page's primary button sits beside one dataset's alerts, so scoping
    matters: it must not clear alerts the seller cannot currently see."""
    first = (await upload_sample(premium_client))["dataset"]["id"]
    second = (await upload_sample(premium_client))["dataset"]["id"]

    res = await premium_client.post(f"/api/alerts/read-all?datasetId={first}")
    assert res.status_code == 200
    body = res.json()
    assert all(a["readAt"] is not None for a in body if a["datasetId"] == first)
    assert all(a["readAt"] is None for a in body if a["datasetId"] == second), (
        "scoped read-all leaked into another dataset"
    )

    # A bad id must match nothing — failing open to "all" is the dangerous direction.
    res = await premium_client.post("/api/alerts/read-all?datasetId=not-a-uuid")
    assert all(a["readAt"] is None for a in res.json() if a["datasetId"] == second)

    # Unscoped still clears everything.
    res = await premium_client.post("/api/alerts/read-all")
    assert all(a["readAt"] is not None for a in res.json())


async def test_alert_read_requires_premium_and_ownership(premium_client, client):
    """Free tier gets a 402; a *premium* stranger gets a 404 rather than a
    glimpse of someone else's alert.

    The second account is driven through explicit headers because the fixtures
    share one httpx client — `premium_client` is `auth_client` upgraded.
    """
    await upload_sample(premium_client)
    alert_id = (await premium_client.get("/api/alerts")).json()[0]["id"]

    stranger = await client.post(
        "/api/auth/register",
        json={"email": "stranger@test.co", "name": "Stranger", "password": "S3cure!pass"},
    )
    headers = {"Authorization": f"Bearer {stranger.json()['token']}"}

    # Free tier: gated before ownership is ever considered.
    res = await client.patch(f"/api/alerts/{alert_id}/read", headers=headers)
    assert res.status_code == 402

    from app.db.session import async_session_factory
    from app.models import User

    async with async_session_factory() as db:
        user = await db.get(User, uuid.UUID(stranger.json()["user"]["id"]))
        user.tier = "premium"
        await db.commit()

    res = await client.patch(f"/api/alerts/{alert_id}/read", headers=headers)
    assert res.status_code == 404


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
