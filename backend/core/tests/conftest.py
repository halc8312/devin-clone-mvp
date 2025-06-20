import pytest
import asyncio
from typing import AsyncGenerator, Generator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from httpx import AsyncClient
from fastapi.testclient import TestClient
import os

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.models.user import User

# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/devinclone_test"

# Override settings for tests
settings.DATABASE_URL = TEST_DATABASE_URL
settings.REDIS_URL = "redis://localhost:6379/1"
settings.ENVIRONMENT = "test"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=NullPool,
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session_maker = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session_maker() as session:
        yield session


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with database override."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    """Test user data."""
    return {
        "email": "test@example.com",
        "password": "Test123!",
        "full_name": "Test User",
    }


@pytest.fixture
async def test_user(db_session: AsyncSession, test_user_data) -> User:
    """Create a test user."""
    user = User(
        email=test_user_data["email"],
        hashed_password=get_password_hash(test_user_data["password"]),
        full_name=test_user_data["full_name"],
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Create authentication headers."""
    access_token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
async def test_project(db_session: AsyncSession, test_user: User):
    """Create a test project."""
    from app.models.project import Project
    
    project = Project(
        name="Test Project",
        description="Test project description",
        owner_id=test_user.id,
        language="python",
        template="blank",
    )
    db_session.add(project)
    await db_session.commit()
    await db_session.refresh(project)
    return project


@pytest.fixture
async def test_file(db_session: AsyncSession, test_project):
    """Create a test file."""
    from app.models.file import ProjectFile
    
    file = ProjectFile(
        project_id=test_project.id,
        name="test.py",
        path="/test.py",
        type="file",
        content="print('Hello, World!')",
        language="python",
        size_bytes=23,
        is_binary=False,
        mime_type="text/x-python",
        encoding="utf-8",
    )
    db_session.add(file)
    await db_session.commit()
    await db_session.refresh(file)
    return file


@pytest.fixture
async def mock_anthropic_client(monkeypatch):
    """Mock Anthropic client for testing."""
    from unittest.mock import AsyncMock, MagicMock
    
    mock_client = MagicMock()
    mock_messages = AsyncMock()
    
    # Mock streaming response
    async def mock_stream():
        messages = [
            {"type": "content_block_start", "content_block": {"type": "text", "text": ""}},
            {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Hello from Claude!"}},
            {"type": "content_block_stop"},
        ]
        for msg in messages:
            yield MagicMock(type=msg["type"], delta=msg.get("delta"), content_block=msg.get("content_block"))
    
    mock_response = AsyncMock()
    mock_response.__aiter__ = mock_stream
    mock_messages.stream.return_value.__aenter__.return_value = mock_response
    
    # Mock non-streaming response
    mock_messages.create.return_value = AsyncMock(
        content=[MagicMock(text="Generated code here")]
    )
    
    mock_client.messages = mock_messages
    
    monkeypatch.setattr("app.core.claude.AsyncAnthropic", lambda api_key: mock_client)
    
    return mock_client