"""Near-duplicate detection over pgvector embeddings.

The load-bearing test is `test_detects_reworded_template`: exact-match or hash
dedup would find nothing there, so if that one passes for the wrong reason the
feature has no purpose.
"""
import uuid

from tests.test_pipeline import upload_sample


async def _dataset_with(reviews: list[tuple[str, int, str]], user_id: str):
    """Insert one analyzed dataset with hand-written reviews and real embeddings."""
    from datetime import datetime, timedelta, timezone

    from app.db.session import async_session_factory
    from app.integrations.embeddings.mock import MockEmbeddings
    from app.models import Dataset, Review

    vectors = await MockEmbeddings().embed([text for _, _, text in reviews])
    async with async_session_factory() as db:
        dataset = Dataset(
            user_id=uuid.UUID(user_id), name="dupes", source="csv",
            product_name="Widget", review_count=len(reviews),
        )
        db.add(dataset)
        await db.flush()
        base = datetime.now(timezone.utc)
        for i, ((author, rating, text), vec) in enumerate(zip(reviews, vectors)):
            db.add(Review(
                dataset_id=dataset.id, author=author, rating=rating, text=text,
                created_at=base + timedelta(minutes=i), embedding=vec,
                sentiment_score=0.0, sentiment_label="neutral",
            ))
        await db.commit()
        return str(dataset.id)


async def test_detects_reworded_template(auth_client):
    """Three reviews built from one template, none byte-identical, plus two
    unrelated reviews. Only the template should be grouped."""
    dataset_id = await _dataset_with([
        ("A", 5, "Absolutely love this product, shipping was fast and the quality is amazing"),
        ("B", 5, "Absolutely love this product, the shipping was fast and quality is amazing"),
        ("C", 5, "Love this product absolutely, shipping fast and the quality amazing"),
        ("D", 2, "The battery drains overnight even when the device is switched off"),
        ("E", 4, "Compact enough for my desk and the espresso tastes genuinely good"),
    ], auth_client.user_id)

    res = await auth_client.get(f"/api/datasets/{dataset_id}/duplicates")
    assert res.status_code == 200, res.text
    groups = res.json()

    assert len(groups) == 1, f"expected one templated group, got {groups}"
    group = groups[0]
    assert group["size"] == 3
    assert {r["author"] for r in group["reviews"]} == {"A", "B", "C"}
    assert 0.0 < group["maxSimilarity"] <= 1.0

    # No two of them are identical — string matching would have found nothing.
    texts = {r["text"] for r in group["reviews"]}
    assert len(texts) == 3


async def test_clean_dataset_returns_nothing(auth_client):
    """Genuinely distinct reviews must not be accused of being templated —
    a false positive here calls a real customer a fake."""
    dataset_id = await _dataset_with([
        ("A", 5, "The crema is thick and the machine heats up in under a minute"),
        ("B", 1, "Arrived with a crushed box and a cracked water tank inside"),
        ("C", 3, "Shipping took eleven days and the tracking page never updated once"),
        ("D", 4, "Support answered my descaling question within the hour, very helpful"),
    ], auth_client.user_id)

    res = await auth_client.get(f"/api/datasets/{dataset_id}/duplicates")
    assert res.status_code == 200
    assert res.json() == []


async def test_groups_are_transitive(auth_client):
    """A~B and B~C must land in one group of three, not two overlapping pairs —
    a reused template drifts as it is edited."""
    dataset_id = await _dataset_with([
        ("A", 5, "Great product fast shipping excellent quality happy customer"),
        ("B", 5, "Great product fast shipping excellent quality very happy"),
        ("C", 5, "Great product fast shipping excellent quality delighted customer"),
    ], auth_client.user_id)

    groups = (await auth_client.get(f"/api/datasets/{dataset_id}/duplicates")).json()
    assert len(groups) == 1 and groups[0]["size"] == 3


async def test_duplicates_require_ownership(auth_client, client):
    """Another user's dataset is a 404, consistent with the rest of the API."""
    body = await upload_sample(auth_client)
    dataset_id = body["dataset"]["id"]

    stranger = await client.post(
        "/api/auth/register",
        json={"email": "dupe-spy@test.co", "name": "Spy", "password": "S3cure!pass"},
    )
    res = await client.get(
        f"/api/datasets/{dataset_id}/duplicates",
        headers={"Authorization": f"Bearer {stranger.json()['token']}"},
    )
    assert res.status_code == 404


async def test_real_sample_has_no_false_positives(auth_client):
    """The 50-review sample is genuine customer text. The detector must stay
    quiet on it — this is the guard against a threshold set too loose."""
    body = await upload_sample(auth_client)
    res = await auth_client.get(f"/api/datasets/{body['dataset']['id']}/duplicates")
    assert res.status_code == 200
    assert res.json() == [], f"false positives on genuine reviews: {res.json()}"
