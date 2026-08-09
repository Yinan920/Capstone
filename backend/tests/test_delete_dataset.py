"""Deleting a dataset must remove everything derived from it, and must not let
one account delete another's data."""
import uuid

from sqlalchemy import func, select

from tests.test_pipeline import upload_sample


async def _count(model, dataset_id):
    from app.db.session import async_session_factory

    async with async_session_factory() as db:
        return await db.scalar(
            select(func.count()).select_from(model).where(model.dataset_id == uuid.UUID(dataset_id))
        )


async def test_delete_removes_dataset_and_all_derived_rows(auth_client):
    from app.models import AnalysisJob, KeywordStat, Review, ThemeCluster

    body = await upload_sample(auth_client)
    dataset_id = body["dataset"]["id"]

    # The pipeline has run, so every derived table has rows for this dataset.
    assert await _count(Review, dataset_id) == 50
    assert await _count(ThemeCluster, dataset_id) > 0
    assert await _count(KeywordStat, dataset_id) > 0
    assert await _count(AnalysisJob, dataset_id) == 1

    res = await auth_client.delete(f"/api/datasets/{dataset_id}")
    assert res.status_code == 204

    # Parent gone…
    assert (await auth_client.get(f"/api/datasets/{dataset_id}")).status_code == 404
    assert (await auth_client.get("/api/datasets")).json() == []
    # …and no orphans left behind.
    assert await _count(Review, dataset_id) == 0
    assert await _count(ThemeCluster, dataset_id) == 0
    assert await _count(KeywordStat, dataset_id) == 0
    assert await _count(AnalysisJob, dataset_id) == 0


async def test_cannot_delete_another_users_dataset(auth_client, client):
    body = await upload_sample(auth_client)
    dataset_id = body["dataset"]["id"]

    other = await client.post(
        "/api/auth/register",
        json={"email": "intruder@test.co", "name": "Intruder", "password": "S3cure!pass"},
    )
    res = await client.delete(
        f"/api/datasets/{dataset_id}",
        headers={"Authorization": f"Bearer {other.json()['token']}"},
    )
    assert res.status_code == 404  # not 403 — we don't confirm it exists

    # Owner's data is untouched
    assert (await auth_client.get(f"/api/datasets/{dataset_id}")).status_code == 200


async def test_delete_unknown_dataset_404(auth_client):
    res = await auth_client.delete("/api/datasets/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 404


async def test_delete_requires_auth(client):
    res = await client.delete("/api/datasets/00000000-0000-0000-0000-000000000000")
    assert res.status_code == 401
