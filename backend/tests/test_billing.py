"""Plan upgrade/downgrade: the tier transition must actually unlock the
premium APIs and re-lock them on downgrade."""


async def test_plans_catalogue_reflects_configured_caps(client):
    res = await client.get("/api/billing/plans")
    assert res.status_code == 200
    plans = {p["id"]: p for p in res.json()["plans"]}
    assert plans["free"]["reviewCap"] == 50
    assert plans["premium"]["reviewCap"] == 200
    assert plans["premium"]["priceMonthly"] > 0
    assert plans["free"]["locked"], "free plan must advertise what's gated"


async def test_upgrade_unlocks_premium_endpoints(auth_client):
    # Free tier is blocked
    assert (await auth_client.get("/api/competitors")).status_code == 402

    res = await auth_client.post("/api/billing/upgrade")
    assert res.status_code == 200
    assert res.json()["tier"] == "premium"

    # Same token, now allowed — gating reads the DB, not the token
    assert (await auth_client.get("/api/competitors")).status_code == 200
    assert (await auth_client.get("/api/alerts")).status_code == 200


async def test_downgrade_relocks_premium_endpoints(premium_client):
    assert (await premium_client.get("/api/competitors")).status_code == 200

    res = await premium_client.post("/api/billing/downgrade")
    assert res.status_code == 200
    assert res.json()["tier"] == "free"

    assert (await premium_client.get("/api/competitors")).status_code == 402


async def test_upgrade_twice_is_rejected(auth_client):
    assert (await auth_client.post("/api/billing/upgrade")).status_code == 200
    res = await auth_client.post("/api/billing/upgrade")
    assert res.status_code == 409


async def test_upgrade_requires_auth(client):
    assert (await client.post("/api/billing/upgrade")).status_code == 401
