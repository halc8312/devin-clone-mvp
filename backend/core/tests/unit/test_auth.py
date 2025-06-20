import pytest
from datetime import datetime, timedelta
from jose import jwt

from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
)
from app.core.config import settings


class TestSecurity:
    """Test security functions."""
    
    def test_password_hashing(self):
        """Test password hashing and verification."""
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        assert hashed != password
        assert verify_password(password, hashed) is True
        assert verify_password("WrongPassword", hashed) is False
    
    def test_create_access_token(self):
        """Test access token creation."""
        data = {"sub": "test@example.com"}
        token = create_access_token(data)
        
        decoded = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        assert decoded["sub"] == "test@example.com"
        assert "exp" in decoded
        assert decoded["type"] == "access"
    
    def test_create_refresh_token(self):
        """Test refresh token creation."""
        data = {"sub": "test@example.com"}
        token = create_refresh_token(data)
        
        decoded = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        
        assert decoded["sub"] == "test@example.com"
        assert "exp" in decoded
        assert decoded["type"] == "refresh"
    
    def test_token_expiration(self):
        """Test token expiration times."""
        data = {"sub": "test@example.com"}
        
        # Test access token expiration
        access_token = create_access_token(data)
        decoded = jwt.decode(
            access_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        exp_time = datetime.fromtimestamp(decoded["exp"])
        expected_exp = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        assert abs((exp_time - expected_exp).total_seconds()) < 5  # Allow 5 seconds difference
        
        # Test refresh token expiration
        refresh_token = create_refresh_token(data)
        decoded = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        exp_time = datetime.fromtimestamp(decoded["exp"])
        expected_exp = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        assert abs((exp_time - expected_exp).total_seconds()) < 5


@pytest.mark.asyncio
class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    async def test_signup(self, client, test_user_data):
        """Test user signup."""
        response = await client.post(
            "/api/v1/auth/signup",
            json=test_user_data
        )
        
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    async def test_signup_duplicate_email(self, client, test_user):
        """Test signup with duplicate email."""
        response = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": test_user.email,
                "password": "AnotherPassword123!",
                "full_name": "Another User",
            }
        )
        
        assert response.status_code == 409
        assert "already registered" in response.json()["detail"]
    
    async def test_signin(self, client, test_user, test_user_data):
        """Test user signin."""
        response = await client.post(
            "/api/v1/auth/signin",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"],
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    async def test_signin_wrong_password(self, client, test_user, test_user_data):
        """Test signin with wrong password."""
        response = await client.post(
            "/api/v1/auth/signin",
            json={
                "email": test_user_data["email"],
                "password": "WrongPassword123!",
            }
        )
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    async def test_signin_nonexistent_user(self, client):
        """Test signin with nonexistent user."""
        response = await client.post(
            "/api/v1/auth/signin",
            json={
                "email": "nonexistent@example.com",
                "password": "Password123!",
            }
        )
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]
    
    async def test_get_current_user(self, client, test_user, auth_headers):
        """Test getting current user."""
        response = await client.get(
            "/api/v1/auth/me",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name
        assert data["id"] == str(test_user.id)
    
    async def test_get_current_user_unauthorized(self, client):
        """Test getting current user without auth."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401
    
    async def test_refresh_token(self, client, test_user, test_user_data):
        """Test token refresh."""
        # First, sign in to get tokens
        signin_response = await client.post(
            "/api/v1/auth/signin",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"],
            }
        )
        
        refresh_token = signin_response.json()["refresh_token"]
        
        # Use refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    async def test_logout(self, client, test_user, test_user_data, auth_headers):
        """Test user logout."""
        # First, sign in to get tokens
        signin_response = await client.post(
            "/api/v1/auth/signin",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"],
            }
        )
        
        refresh_token = signin_response.json()["refresh_token"]
        
        # Logout
        response = await client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": refresh_token},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Successfully logged out"