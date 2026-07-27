"""Auth API tests: register, login, me, token handling, camelCase contract."""

REGISTER = {"email": "seller@test.co", "name": "Test Seller", "password": "S3cure!pass"}


async def test_register_creates_free_user_with_token(client):
    res = await client.post("/api/auth/register", json=REGISTER)
    assert res.status_code == 201
    body = res.json()
    assert body["token"]
    user = body["user"]
    assert user["email"] == "seller@test.co"
    assert user["name"] == "Test Seller"
    assert user["tier"] == "free"
    # camelCase contract — matches frontend types.ts
    assert "createdAt" in user
    assert "hashed_password" not in user and "hashedPassword" not in user


async def test_register_duplicate_email_409(client):
    assert (await client.post("/api/auth/register", json=REGISTER)).status_code == 201
    res = await client.post("/api/auth/register", json=REGISTER)
    assert res.status_code == 409
    assert res.json()["detail"] == "Email is already registered"


async def test_register_invalid_email_422(client):
    res = await client.post("/api/auth/register", json={**REGISTER, "email": "not-an-email"})
    assert res.status_code == 422


async def test_register_short_password_422(client):
    res = await client.post("/api/auth/register", json={**REGISTER, "password": "short"})
    assert res.status_code == 422


async def test_login_returns_token(client):
    await client.post("/api/auth/register", json=REGISTER)
    res = await client.post("/api/auth/login", json={"email": REGISTER["email"], "password": REGISTER["password"]})
    assert res.status_code == 200
    assert res.json()["user"]["email"] == "seller@test.co"


async def test_login_wrong_password_401(client):
    await client.post("/api/auth/register", json=REGISTER)
    res = await client.post("/api/auth/login", json={"email": REGISTER["email"], "password": "wrong-pass-123"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect email or password"


async def test_login_unknown_email_401(client):
    res = await client.post("/api/auth/login", json={"email": "ghost@test.co", "password": "whatever123"})
    assert res.status_code == 401


async def test_me_returns_current_user(auth_client):
    res = await auth_client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == "seller@test.co"


async def test_me_without_token_401(client):
    res = await client.get("/api/auth/me")
    assert res.status_code == 401
    assert res.json()["detail"] == "Not authenticated"


async def test_me_with_garbage_token_401(client):
    client.headers["Authorization"] = "Bearer not.a.jwt"
    res = await client.get("/api/auth/me")
    assert res.status_code == 401
