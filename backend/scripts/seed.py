"""Idempotent demo seed: premium demo user + competitor profiles.

Run:  cd backend && .venv/bin/python -m scripts.seed
Login afterwards with demo@novabrew.co / demo1234! (premium tier).
"""
import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models import Competitor, User

DEMO_EMAIL = "demo@novabrew.co"
DEMO_PASSWORD = "demo1234!"

COMPETITORS = [
    {
        "name": "WanderBean Mini",
        "channel": "amazon",
        "review_count": 236,
        "net_sentiment": 0.41,
        "avg_rating": 3.9,
        "axes": [
            {"axis": "Coffee quality", "score": 72},
            {"axis": "Packaging", "score": 78},
            {"axis": "Shipping", "score": 66},
            {"axis": "Battery life", "score": 58},
            {"axis": "Support", "score": 55},
            {"axis": "Value", "score": 74},
        ],
    },
    {
        "name": "PocketPress Pro",
        "channel": "shopify",
        "review_count": 158,
        "net_sentiment": 0.55,
        "avg_rating": 4.2,
        "axes": [
            {"axis": "Coffee quality", "score": 84},
            {"axis": "Packaging", "score": 71},
            {"axis": "Shipping", "score": 80},
            {"axis": "Battery life", "score": 52},
            {"axis": "Support", "score": 68},
            {"axis": "Value", "score": 62},
        ],
    },
]


async def seed() -> None:
    async with async_session_factory() as db:
        user = await db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if user is None:
            user = User(
                email=DEMO_EMAIL,
                name="Yinan He",
                hashed_password=hash_password(DEMO_PASSWORD),
                tier="premium",
            )
            db.add(user)
            print(f"created demo user {DEMO_EMAIL} (password: {DEMO_PASSWORD}, tier: premium)")
        else:
            # Keep the demo account in a known state (password + premium tier)
            user.hashed_password = hash_password(DEMO_PASSWORD)
            user.tier = "premium"
            print(f"demo user {DEMO_EMAIL} reset to premium with the demo password")

        for payload in COMPETITORS:
            existing = await db.scalar(select(Competitor).where(Competitor.name == payload["name"]))
            if existing is None:
                db.add(Competitor(**payload))
                print(f"created competitor {payload['name']}")
            else:
                print(f"competitor {payload['name']} already exists")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())
