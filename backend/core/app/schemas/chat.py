from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, validator

from app.models.chat import MessageRole


class ChatMessageBase(BaseModel):
    content: str = Field(..., min_length=1)
    role: MessageRole = MessageRole.USER
    file_references: Optional[List[UUID]] = None
    
    @validator('content')
    def content_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Message content cannot be empty')
        return v.strip()


class ChatMessageCreate(ChatMessageBase):
    pass


class ChatMessage(ChatMessageBase):
    id: UUID
    session_id: UUID
    code_blocks: Optional[List[Dict[str, Any]]] = None
    token_count: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatSessionBase(BaseModel):
    title: Optional[str] = Field(None, max_length=255)


class ChatSessionCreate(ChatSessionBase):
    pass


class ChatSessionUpdate(ChatSessionBase):
    pass


class ChatSession(ChatSessionBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChatSessionWithMessages(ChatSession):
    messages: List[ChatMessage] = []


class ChatSessionList(BaseModel):
    sessions: List[ChatSession]
    total: int


class CodeGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    language: str = Field(..., max_length=50)
    target_file_path: Optional[str] = Field(None, max_length=1000)
    context: Optional[str] = None
    existing_code: Optional[str] = None
    
    @validator('prompt')
    def prompt_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Prompt cannot be empty')
        return v.strip()


class CodeGenerationResponse(BaseModel):
    id: UUID
    generated_code: str
    language: str
    target_file_path: Optional[str]
    tokens_used: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


class CodeExplanationRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field(..., max_length=50)


class CodeFixRequest(BaseModel):
    code: str = Field(..., min_length=1)
    error_message: str = Field(..., min_length=1)
    language: str = Field(..., max_length=50)


class CodeImprovementRequest(BaseModel):
    code: str = Field(..., min_length=1)
    language: str = Field(..., max_length=50)


class StreamingChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: UUID
    file_references: Optional[List[UUID]] = None
    stream: bool = True