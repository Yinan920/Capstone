"""Shared FastAPI dependencies: authentication and tier gating."""
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    subject = decode_token(credentials.credentials)
    if subject is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    try:
        user_id = uuid.UUID(subject)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return user


def premium_required(feature: str):
    """Dependency factory guarding premium routes; free tier gets 402."""

    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.tier != "premium":
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"{feature} is a Premium feature. Upgrade to unlock.",
            )
        return user

    return dependency


def review_cap_for(user: User) -> int:
    return settings.premium_review_cap if user.tier == "premium" else settings.free_review_cap
