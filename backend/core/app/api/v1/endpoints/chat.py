from typing import Any, List
from datetime import datetime
from uuid import UUID
import json
import re

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.api import deps
from app.db.session import get_db
from app.models import User, Project, ChatSession, ChatMessage, CodeGeneration, MessageRole, ProjectFile
from app.schemas.chat import (
    ChatSession as ChatSessionSchema,
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatSessionWithMessages,
    ChatSessionList,
    ChatMessage as ChatMessageSchema,
    ChatMessageCreate,
    CodeGenerationRequest,
    CodeGenerationResponse,
    CodeExplanationRequest,
    CodeFixRequest,
    CodeImprovementRequest,
    StreamingChatRequest
)
from app.core.claude import claude_client, code_assistant
from app.core.config import settings

router = APIRouter()


def extract_code_blocks(content: str) -> List[dict]:
    """Extract code blocks from message content"""
    pattern = r'```(\w+)?\n(.*?)```'
    matches = re.findall(pattern, content, re.DOTALL)
    
    code_blocks = []
    for match in matches:
        language = match[0] or 'plaintext'
        code = match[1].strip()
        code_blocks.append({
            'language': language,
            'code': code
        })
    
    return code_blocks


async def verify_project_access(
    project_id: UUID,
    user_id: UUID,
    db: AsyncSession
) -> Project:
    """Verify user has access to project"""
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.owner_id == user_id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return project


@router.get("/projects/{project_id}/chat/sessions", response_model=ChatSessionList)
async def list_chat_sessions(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List all chat sessions for a project
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.project_id == project_id)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    
    return ChatSessionList(
        sessions=sessions,
        total=len(sessions)
    )


@router.post("/projects/{project_id}/chat/sessions", response_model=ChatSessionSchema)
async def create_chat_session(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    session_in: ChatSessionCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new chat session
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    session = ChatSession(
        project_id=project_id,
        title=session_in.title or f"Chat {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return session


@router.get("/projects/{project_id}/chat/sessions/{session_id}", response_model=ChatSessionWithMessages)
async def get_chat_session(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    session_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get chat session with messages
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    result = await db.execute(
        select(ChatSession)
        .where(
            and_(
                ChatSession.id == session_id,
                ChatSession.project_id == project_id
            )
        )
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Load messages
    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = messages_result.scalars().all()
    
    return ChatSessionWithMessages(
        **session.__dict__,
        messages=messages
    )


@router.post("/projects/{project_id}/chat/sessions/{session_id}/messages", response_model=ChatMessageSchema)
async def send_message(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    session_id: UUID,
    message_in: ChatMessageCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Send a message and get AI response
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    # Verify session exists
    session_result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.project_id == project_id
            )
        )
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Save user message
    user_message = ChatMessage(
        session_id=session_id,
        role=MessageRole.USER,
        content=message_in.content,
        file_references=message_in.file_references
    )
    db.add(user_message)
    
    # Get conversation history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .limit(20)  # Last 20 messages for context
    )
    history = history_result.scalars().all()
    
    # Build messages for Claude
    messages = []
    for msg in history:
        messages.append({
            "role": msg.role.value,
            "content": msg.content
        })
    
    # Add current message
    messages.append({
        "role": "user",
        "content": message_in.content
    })
    
    # Get file context if referenced
    file_context = ""
    if message_in.file_references:
        for file_id in message_in.file_references[:5]:  # Max 5 files
            file_result = await db.execute(
                select(ProjectFile).where(
                    and_(
                        ProjectFile.id == file_id,
                        ProjectFile.project_id == project_id
                    )
                )
            )
            file = file_result.scalar_one_or_none()
            if file and file.content:
                file_context += f"\n\nFile: {file.path}\n```{file.language or ''}\n{file.content[:2000]}\n```"
    
    # Create system prompt
    system_prompt = f"""You are an AI software engineering assistant for a project using {project.language}.
Help the user with coding tasks, answer questions, and provide suggestions.
Be concise but thorough. Use code examples when helpful.
Current project context: {project.name} - {project.description or 'No description'}"""

    if file_context:
        system_prompt += f"\n\nReferenced files:{file_context}"
    
    # Get AI response
    try:
        response = await claude_client.create_message(
            messages=messages,
            system=system_prompt,
            max_tokens=4096
        )
        
        ai_content = response["content"][0]["text"]
        
        # Save AI message
        ai_message = ChatMessage(
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=ai_content,
            code_blocks=extract_code_blocks(ai_content),
            token_count=response.get("usage", {}).get("output_tokens")
        )
        db.add(ai_message)
        
        # Update session timestamp
        session.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(ai_message)
        
        return ai_message
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}"
        )


@router.post("/projects/{project_id}/chat/stream")
async def stream_chat_response(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    request: StreamingChatRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Stream chat response from AI
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    # Verify session
    session_result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == request.session_id,
                ChatSession.project_id == project_id
            )
        )
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )
    
    # Save user message
    user_message = ChatMessage(
        session_id=request.session_id,
        role=MessageRole.USER,
        content=request.message,
        file_references=request.file_references
    )
    db.add(user_message)
    await db.commit()
    
    # Get conversation history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == request.session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(reversed(history_result.scalars().all()))
    
    # Build messages
    messages = []
    for msg in history[:-1]:  # Exclude the just-added message
        messages.append({
            "role": msg.role.value,
            "content": msg.content
        })
    messages.append({
        "role": "user",
        "content": request.message
    })
    
    # Create system prompt
    system_prompt = f"""You are an AI software engineering assistant for a project using {project.language}.
Help the user with coding tasks, answer questions, and provide suggestions.
Be concise but thorough. Use code examples when helpful."""
    
    async def generate():
        full_response = ""
        
        try:
            async for chunk in claude_client.create_message_stream(
                messages=messages,
                system=system_prompt
            ):
                full_response += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            # Save complete AI message
            ai_message = ChatMessage(
                session_id=request.session_id,
                role=MessageRole.ASSISTANT,
                content=full_response,
                code_blocks=extract_code_blocks(full_response)
            )
            db.add(ai_message)
            session.updated_at = datetime.utcnow()
            await db.commit()
            
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/projects/{project_id}/code/generate", response_model=CodeGenerationResponse)
async def generate_code(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    request: CodeGenerationRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Generate code based on prompt
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    try:
        generated_code = await code_assistant.generate_code(
            prompt=request.prompt,
            language=request.language or project.language,
            context=request.context,
            existing_code=request.existing_code
        )
        
        # Save generation record
        generation = CodeGeneration(
            project_id=project_id,
            prompt=request.prompt,
            generated_code=generated_code,
            language=request.language or project.language,
            target_file_path=request.target_file_path,
            model_used=settings.CLAUDE_MODEL,
            temperature="0.3"
        )
        
        db.add(generation)
        await db.commit()
        await db.refresh(generation)
        
        return generation
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code generation error: {str(e)}"
        )


@router.post("/projects/{project_id}/code/explain")
async def explain_code(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    request: CodeExplanationRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Explain what code does
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    try:
        explanation = await code_assistant.explain_code(
            code=request.code,
            language=request.language or project.language
        )
        
        return {"explanation": explanation}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code explanation error: {str(e)}"
        )


@router.post("/projects/{project_id}/code/fix")
async def fix_code_errors(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    request: CodeFixRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Fix errors in code
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    try:
        fixed_code = await code_assistant.fix_errors(
            code=request.code,
            error_message=request.error_message,
            language=request.language or project.language
        )
        
        return {"fixed_code": fixed_code}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code fix error: {str(e)}"
        )


@router.post("/projects/{project_id}/code/improve")
async def improve_code(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    request: CodeImprovementRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Suggest improvements for code
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    try:
        improvements = await code_assistant.suggest_improvements(
            code=request.code,
            language=request.language or project.language
        )
        
        return {"improvements": improvements}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code improvement error: {str(e)}"
        )