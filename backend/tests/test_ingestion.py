"""CSV upload API tests: happy path, validation, tier caps, ownership."""
import io
import os

SAMPLE_CSV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sample_reviews.csv")


def csv_bytes(rows: int, rating: int = 4) -> bytes:
    lines = ["author,rating,text,created_at"]
    for i in range(rows):
        lines.append(f'Buyer {i},{rating},"Great crema and easy cleanup, review {i}.",2026-07-0{(i % 9) + 1}T10:00:00Z')
    return "\n".join(lines).encode()


def upload_kwargs(content: bytes, **form):
    data = {"name": "Amazon — NovaBrew Go", "productName": "NovaBrew Go Espresso Maker", "source": "amazon"}
    data.update(form)
    return {"files": {"file": ("reviews.csv", io.BytesIO(content), "text/csv")}, "data": data}


async def test_upload_happy_path_creates_dataset_and_job(auth_client):
    res = await auth_client.post("/api/datasets/upload", **upload_kwargs(csv_bytes(10)))
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["dataset"]["reviewCount"] == 10
    assert body["dataset"]["source"] == "amazon"
    assert body["dataset"]["productName"] == "NovaBrew Go Espresso Maker"
    assert body["job"]["datasetId"] == body["dataset"]["id"]
    # response snapshot is taken at creation time (job runs after the response)
    assert body["job"]["progress"] == 0 or body["job"]["status"] == "queued"


async def test_upload_free_tier_cap_413(auth_client):
    res = await auth_client.post("/api/datasets/upload", **upload_kwargs(csv_bytes(51)))
    assert res.status_code == 413
    assert "50" in res.json()["detail"] and "51" in res.json()["detail"]


async def test_upload_premium_cap_is_200(premium_client):
    ok = await premium_client.post("/api/datasets/upload", **upload_kwargs(csv_bytes(60)))
    assert ok.status_code == 201
    too_big = await premium_client.post("/api/datasets/upload", **upload_kwargs(csv_bytes(201)))
    assert too_big.status_code == 413


async def test_upload_missing_columns_400(auth_client):
    bad = b"author,stars\nAlice,5\n"
    res = await auth_client.post("/api/datasets/upload", **upload_kwargs(bad))
    assert res.status_code == 400
    assert "missing required columns" in res.json()["detail"]


async def test_upload_bad_row_422_with_row_number(auth_client):
    bad = b'author,rating,text,created_at\nAlice,9,"Nice",2026-07-01T10:00:00Z\n'
    res = await auth_client.post("/api/datasets/upload", **upload_kwargs(bad))
    assert res.status_code == 422
    assert "Row 2" in res.json()["detail"]


async def test_upload_empty_csv_400(auth_client):
    res = await auth_client.post("/api/datasets/upload", **upload_kwargs(b"author,rating,text,created_at\n"))
    assert res.status_code == 400


async def test_upload_requires_auth(client):
    res = await client.post("/api/datasets/upload", **upload_kwargs(csv_bytes(3)))
    assert res.status_code == 401


async def test_list_and_get_datasets(auth_client):
    up = await auth_client.post("/api/datasets/upload", **upload_kwargs(csv_bytes(5)))
    dataset_id = up.json()["dataset"]["id"]

    listing = await auth_client.get("/api/datasets")
    assert listing.status_code == 200
    assert [d["id"] for d in listing.json()] == [dataset_id]

    single = await auth_client.get(f"/api/datasets/{dataset_id}")
    assert single.status_code == 200
    assert single.json()["id"] == dataset_id


async def test_get_dataset_of_other_user_404(auth_client, client):
    up = await auth_client.post("/api/datasets/upload", **upload_kwargs(csv_bytes(3)))
    dataset_id = up.json()["dataset"]["id"]

    other = await client.post(
        "/api/auth/register",
        json={"email": "other@test.co", "name": "Other", "password": "S3cure!pass"},
    )
    res = await client.get(
        f"/api/datasets/{dataset_id}",
        headers={"Authorization": f"Bearer {other.json()['token']}"},
    )
    assert res.status_code == 404


async def test_sample_csv_has_50_rows_and_parses(auth_client):
    with open(SAMPLE_CSV, "rb") as f:
        content = f.read()
    res = await auth_client.post("/api/datasets/upload", **upload_kwargs(content))
    assert res.status_code == 201, res.text
    assert res.json()["dataset"]["reviewCount"] == 50
