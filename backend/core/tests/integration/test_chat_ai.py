import pytest
import json
from unittest.mock import AsyncMock, patch

from app.models.chat import ChatSession, ChatMessage


@pytest.mark.asyncio
class TestChatAPI:
    """Test chat endpoints."""
    
    async def test_create_chat_session(self, client, auth_headers, test_project):
        """Test creating a chat session."""
        session_data = {
            "title": "Test Chat Session",
        }
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/chat/sessions",
            json=session_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == session_data["title"]
        assert data["project_id"] == str(test_project.id)
        assert "id" in data
    
    async def test_list_chat_sessions(self, client, auth_headers, test_project, db_session):
        """Test listing chat sessions."""
        # Create a test session
        session = ChatSession(
            project_id=test_project.id,
            title="Test Session",
        )
        db_session.add(session)
        await db_session.commit()
        
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/chat/sessions",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert "total" in data
        assert data["total"] >= 1
    
    async def test_get_chat_session(self, client, auth_headers, test_project, db_session):
        """Test getting a chat session with messages."""
        # Create session and messages
        session = ChatSession(
            project_id=test_project.id,
            title="Test Session",
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        
        message = ChatMessage(
            session_id=session.id,
            role="user",
            content="Hello, AI!",
        )
        db_session.add(message)
        await db_session.commit()
        
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/chat/sessions/{session.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(session.id)
        assert "messages" in data
        assert len(data["messages"]) == 1
        assert data["messages"][0]["content"] == "Hello, AI!"
    
    async def test_stream_chat_response(self, client, auth_headers, test_project, db_session, mock_anthropic_client):
        """Test streaming chat response."""
        # Create a session
        session = ChatSession(
            project_id=test_project.id,
            title="Test Session",
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        
        request_data = {
            "message": "Write a hello world function",
            "session_id": str(session.id),
            "stream": True,
        }
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/chat/stream",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
        
        # Parse SSE response
        events = []
        for line in response.text.split("\n"):
            if line.startswith("data: "):
                events.append(line[6:])
        
        assert len(events) > 0
        assert "Hello from Claude!" in "".join(events)


@pytest.mark.asyncio
class TestCodeGeneration:
    """Test code generation endpoints."""
    
    async def test_generate_code(self, client, auth_headers, test_project, mock_anthropic_client):
        """Test code generation."""
        request_data = {
            "prompt": "Create a function to calculate fibonacci numbers",
            "language": "python",
        }
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/code/generate",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "code" in data
        assert "explanation" in data
        assert data["code"] == "Generated code here"
    
    async def test_explain_code(self, client, auth_headers, test_project, mock_anthropic_client):
        """Test code explanation."""
        request_data = {
            "code": "def fib(n): return fib(n-1) + fib(n-2) if n > 1 else n",
            "language": "python",
        }
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/code/explain",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "explanation" in data
        assert data["explanation"] == "Generated code here"
    
    async def test_fix_code(self, client, auth_headers, test_project, mock_anthropic_client):
        """Test code fixing."""
        request_data = {
            "code": "def divide(a, b): return a / b",
            "error_message": "ZeroDivisionError: division by zero",
            "language": "python",
        }
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/code/fix",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "fixed_code" in data
        assert "explanation" in data
        assert data["fixed_code"] == "Generated code here"
    
    async def test_improve_code(self, client, auth_headers, test_project, mock_anthropic_client):
        """Test code improvement."""
        request_data = {
            "code": "def add(a,b):\n  return a+b",
            "language": "python",
        }
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/code/improve",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "improved_code" in data
        assert "suggestions" in data
        assert data["improved_code"] == "Generated code here"


@pytest.mark.asyncio
class TestChatWithFileContext:
    """Test chat with file context."""
    
    async def test_chat_with_file_references(self, client, auth_headers, test_project, test_file, db_session, mock_anthropic_client):
        """Test chat with file references."""
        # Create a session
        session = ChatSession(
            project_id=test_project.id,
            title="Test Session",
        )
        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)
        
        request_data = {
            "message": "Explain the code in test.py",
            "session_id": str(session.id),
            "file_references": [str(test_file.id)],
            "stream": False,
        }
        
        # Mock the non-streaming response
        mock_anthropic_client.messages.create.return_value = AsyncMock(
            content=[AsyncMock(text="This file contains a simple print statement.")]
        )
        
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/chat/stream",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message_id" in data
        assert "content" in data
        assert "This file contains" in data["content"]