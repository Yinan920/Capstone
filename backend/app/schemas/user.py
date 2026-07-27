from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.base import CamelModel, Id


class UserOut(CamelModel):
    id: Id
    email: str
    name: str
    tier: str
    created_at: datetime


class RegisterRequest(CamelModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class AuthResponse(CamelModel):
    token: str
    user: UserOut
