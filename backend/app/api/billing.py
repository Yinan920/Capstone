"""Plan management (upgrade / downgrade).

**Payment is deliberately stubbed.** These endpoints perform the tier
transition — the part this application owns — but take no card details. The
production design is Stripe Checkout: the client is redirected to a
Stripe-hosted payment page, and Stripe calls back to a webhook that flips the
tier. Card data would never reach this server, which keeps the app out of PCI
DSS scope. `upgrade()` is where that webhook handler's logic would live.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/upgrade", response_model=UserOut)
async def upgrade(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> UserOut:
    """Activate Premium for the current user (payment stubbed — see module docstring)."""
    if user.tier == "premium":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Your account is already on Premium")
    user.tier = "premium"
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/downgrade", response_model=UserOut)
async def downgrade(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> UserOut:
    """Return to the Free plan. Exists so the tier transition is demonstrable in
    both directions; in production this is a subscription cancellation."""
    if user.tier == "free":
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Your account is already on Free")
    user.tier = "free"
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/plans")
async def plans() -> dict:
    """Plan catalogue. Served from the API so pricing and limits have one source
    of truth — the same caps the upload endpoint enforces."""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "priceMonthly": 0,
                "reviewCap": settings.free_review_cap,
                "features": [
                    "Sentiment analysis on every review",
                    "Automatic theme discovery",
                    "High-frequency complaint keywords",
                    "Review drill-through",
                ],
                "locked": ["Smart alerts", "Competitor benchmarking", "AI reply drafts"],
            },
            {
                "id": "premium",
                "name": "Premium",
                "priceMonthly": 29,
                "reviewCap": settings.premium_review_cap,
                "features": [
                    f"Everything in Free, up to {settings.premium_review_cap} reviews per upload",
                    "Smart alerts when a complaint theme crosses threshold",
                    "Competitor benchmarking across six dimensions",
                    "AI reply drafts with seller-portal deep links",
                ],
                "locked": [],
            },
        ]
    }
