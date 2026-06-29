from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    user_id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    status: str

class TokenBundle(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

class LoginResponse(BaseModel):
    user: UserResponse
    tokens: TokenBundle

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
    name: Optional[str] = None
