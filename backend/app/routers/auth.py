from fastapi import APIRouter, HTTPException, status
from jose import jwt
from datetime import datetime, timedelta
from app.models.auth import LoginRequest, LoginResponse
from app.database import supabase
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])

def _create_token(user_id: int, role: str, name: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "user_id": user_id,
        "role": role,
        "name": name,
        "exp": expire
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest):
    # Fetch user by email
    res = (
        supabase.table("users")
        .select("user_id, name, email, phone, password_hash, role, status")
        .eq("email", body.email)
        .limit(1)
        .execute()
    )

    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    user = res.data[0]

    # Check account status
    if user.get("status") != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact admin."
        )

    # Compare password — stored as plain text in password_hash column
    if body.password != user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = _create_token(user["user_id"], user["role"], user["name"])

    return {
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone"),
            "role": user["role"],
            "status": user["status"],
        },
        "tokens": {
            "access_token": token,
            "refresh_token": None,
            "token_type": "bearer",
        },
    }
