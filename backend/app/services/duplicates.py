"""Near-duplicate review detection over the stored pgvector embeddings.

Why this exists, and why it is a vector query rather than string matching:
templated reviews are rarely byte-identical. They are reworded around a fixed
skeleton — the same claims in the same order with a few words swapped — which
defeats exact matching and hashing but leaves cosine distance small.

Why it fits the embeddings this project actually has: the default embedder maps
each token to a fixed pseudo-random vector and averages, which is a random
projection of a bag of words. It captures **lexical** overlap, not semantics —
a real limitation for theme clustering, and exactly the right property here.
Two reviews built from the same template share almost all of their vocabulary.

Why there is no ANN index: `<=>` runs an exact scan, and a dataset holds at most
`premium_review_cap` (200) rows. An ivfflat or HNSW index over 200 vectors would
add build and maintenance cost to return the same answer more slowly. The column
is indexable the moment cardinality justifies it; today it does not.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Review
from app.schemas.dashboard import DuplicateGroupOut, DuplicateMemberOut

# Cosine distance below which two reviews are treated as near-duplicates.
# 0.15 ≈ 0.85 cosine similarity: calibrated against the sample data, where
# genuine restatements of the same complaint ("box arrived crushed" vs "box was
# crushed on arrival") land under it while two unrelated packaging complaints do
# not. Deliberately conservative — a false positive accuses a real customer of
# writing a fake review, which is the more expensive mistake.
MAX_COSINE_DISTANCE = 0.15


async def find_near_duplicates(
    db: AsyncSession, dataset_id: uuid.UUID, threshold: float = MAX_COSINE_DISTANCE
) -> list[DuplicateGroupOut]:
    """Group a dataset's reviews into clusters of near-identical wording.

    Returns only groups of two or more, ordered by size then tightness, so the
    strongest signal is first and a clean dataset returns an empty list.
    """
    reviews = list(
        (
            await db.scalars(
                select(Review)
                .where(Review.dataset_id == dataset_id, Review.embedding.isnot(None))
                .order_by(Review.created_at)
            )
        ).all()
    )
    if len(reviews) < 2:
        return []

    # One query per review rather than a self-join: the join's output is
    # quadratic in the dataset and most of it is discarded by the threshold.
    # At n <= 200 this is a few hundred exact scans over a few hundred rows.
    by_id = {r.id: r for r in reviews}
    neighbours: dict[uuid.UUID, set[uuid.UUID]] = {r.id: set() for r in reviews}
    for review in reviews:
        distance = Review.embedding.cosine_distance(review.embedding)
        rows = await db.execute(
            select(Review.id, distance.label("distance"))
            .where(
                Review.dataset_id == dataset_id,
                Review.id != review.id,
                Review.embedding.isnot(None),
                distance <= threshold,
            )
            .order_by(distance)
        )
        for other_id, _ in rows:
            neighbours[review.id].add(other_id)
            neighbours[other_id].add(review.id)

    # Connected components: A~B and B~C puts all three in one group even when
    # A and C are just over the threshold. A template drifts as it is reused,
    # so transitivity is the behaviour that matches how these actually appear.
    groups: list[list[Review]] = []
    unvisited = {r.id for r in reviews if neighbours[r.id]}
    while unvisited:
        stack = [unvisited.pop()]
        component = []
        while stack:
            current = stack.pop()
            component.append(by_id[current])
            for neighbour in neighbours[current]:
                if neighbour in unvisited:
                    unvisited.discard(neighbour)
                    stack.append(neighbour)
        if len(component) > 1:
            groups.append(component)

    out = []
    for component in groups:
        component.sort(key=lambda r: r.created_at)
        anchor = component[0]
        similarities = []
        for member in component[1:]:
            dot = sum(a * b for a, b in zip(anchor.embedding, member.embedding))
            similarities.append(max(0.0, min(1.0, dot)))  # vectors are L2-normalised
        out.append(
            DuplicateGroupOut(
                size=len(component),
                max_similarity=round(max(similarities), 3) if similarities else 1.0,
                reviews=[
                    DuplicateMemberOut(
                        id=r.id, author=r.author, rating=r.rating,
                        text=r.text, created_at=r.created_at,
                    )
                    for r in component
                ],
            )
        )
    out.sort(key=lambda g: (g.size, g.max_similarity), reverse=True)
    return out
