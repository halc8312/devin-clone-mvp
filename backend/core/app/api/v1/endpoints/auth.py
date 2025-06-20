from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.api import deps
from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models import User, Session
from app.schemas.auth import (
    UserSignUp, UserSignIn, Token, TokenRefresh,
    PasswordReset, PasswordResetConfirm
)
from app.schemas.user import User as UserSchema

router = APIRouter()


class GoogleOAuthRequest(BaseModel):
    token: str
    user: dict


@router.post("/signup", response_model=UserSchema)
async def signup(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserSignUp
) -> Any:
    """
    Create new user account
    """
    # Check if user already exists
    result = await db.execute(
        select(User).where(
            or_(User.email == user_in.email, User.username == user_in.username)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email or username already exists"
        )
    
    # Create new user
    user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=security.get_password_hash(user_in.password),
        is_active=True,
        is_verified=False,  # Email verification can be added later
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/signin", response_model=Token)
async def signin(
    request: Request,
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    # Find user by email
    result = await db.execute(
        select(User).where(User.email == form_data.username)
    )
    user = result.scalar_one_or_none()
    
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    # Create tokens
    access_token, jti = security.create_access_token(
        user.id,
        additional_claims={"email": user.email, "role": user.role.value}
    )
    refresh_token = security.create_refresh_token(user.id)
    
    # Create session
    session = Session(
        user_id=user.id,
        refresh_token=refresh_token,
        access_token_jti=jti,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    db.add(session)
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    *,
    db: AsyncSession = Depends(get_db),
    token_data: TokenRefresh
) -> Any:
    """
    Refresh access token using refresh token
    """
    try:
        payload = security.jwt.decode(
            token_data.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
    except security.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    # Find session
    result = await db.execute(
        select(Session).where(
            Session.refresh_token == token_data.refresh_token,
            Session.user_id == UUID(user_id)
        )
    )
    session = result.scalar_one_or_none()
    
    if not session or session.is_expired:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    
    # Get user
    result = await db.execute(
        select(User).where(User.id == UUID(user_id))
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user"
        )
    
    # Create new access token
    access_token, jti = security.create_access_token(
        user.id,
        additional_claims={"email": user.email, "role": user.role.value}
    )
    
    # Update session
    session.access_token_jti = jti
    session.last_activity = datetime.utcnow()
    
    await db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": token_data.refresh_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
    token_data: Optional[TokenRefresh] = None
) -> Any:
    """
    Logout user by invalidating the session
    """
    if token_data and token_data.refresh_token:
        # Remove specific session
        result = await db.execute(
            select(Session).where(
                Session.refresh_token == token_data.refresh_token,
                Session.user_id == current_user.id
            )
        )
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserSchema)
async def get_current_user(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get current user info
    """
    return current_user


@router.post("/oauth/google", response_model=dict)
async def google_oauth(
    *,
    db: AsyncSession = Depends(get_db),
    oauth_data: GoogleOAuthRequest
) -> Any:
    """
    Handle Google OAuth login/registration
    """
    user_data = oauth_data.user
    email = user_data.get("email")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not provided"
        )
    
    # Check if user exists
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        user = User(
            email=email,
            username=email.split("@")[0],
            full_name=user_data.get("name", ""),
            avatar_url=user_data.get("image", ""),
            google_id=user_data.get("google_id", ""),
            # Set a random password for OAuth users
            hashed_password=security.get_password_hash(security.jwt.encode({"email": email}, settings.SECRET_KEY)),
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update existing user's Google info
        user.google_id = user_data.get("google_id", user.google_id)
        user.avatar_url = user_data.get("image", user.avatar_url)
        if not user.full_name and user_data.get("name"):
            user.full_name = user_data.get("name")
        await db.commit()
    
    # Create tokens
    access_token = security.create_access_token(user.id)
    refresh_token = security.create_refresh_token(user.id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
        }
    }