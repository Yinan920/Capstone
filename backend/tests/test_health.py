import httpx

from app.main import app


async def test_health_returns_ok_and_version():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["database"] in {"up", "down"}
    assert body["version"] == "0.1.0"
