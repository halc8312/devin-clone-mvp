from typing import Any, List, Optional
from datetime import datetime
from uuid import UUID
import os
import mimetypes

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
import aiofiles

from app.api import deps
from app.db.session import get_db
from app.models import User, Project, ProjectFile, FileType
from app.schemas.project_file import (
    ProjectFile as ProjectFileSchema,
    ProjectFileCreate,
    ProjectFileUpdate,
    ProjectFileMove,
    ProjectFileList,
    ProjectFileTree
)

router = APIRouter()


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


def get_file_language(filename: str) -> Optional[str]:
    """Detect programming language from file extension"""
    ext_map = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'javascript',
        '.tsx': 'typescript',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.h': 'c',
        '.hpp': 'cpp',
        '.go': 'go',
        '.rs': 'rust',
        '.rb': 'ruby',
        '.php': 'php',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.scala': 'scala',
        '.r': 'r',
        '.m': 'matlab',
        '.jl': 'julia',
        '.sh': 'bash',
        '.ps1': 'powershell',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.sass': 'sass',
        '.less': 'less',
        '.xml': 'xml',
        '.json': 'json',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.md': 'markdown',
        '.tex': 'latex',
        '.sql': 'sql',
    }
    
    _, ext = os.path.splitext(filename.lower())
    return ext_map.get(ext)


@router.get("/{project_id}/files", response_model=ProjectFileList)
async def list_project_files(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    path: Optional[str] = Query(None, description="Filter by path prefix"),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    List all files in a project
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    # Build query
    query = select(ProjectFile).where(ProjectFile.project_id == project_id)
    
    if path:
        # Filter by path prefix
        query = query.where(ProjectFile.path.startswith(path))
    
    result = await db.execute(query.order_by(ProjectFile.path))
    files = result.scalars().all()
    
    # Calculate statistics
    total_files = sum(1 for f in files if f.type == FileType.FILE)
    total_dirs = sum(1 for f in files if f.type == FileType.DIRECTORY)
    total_size = sum(f.size_bytes for f in files if f.type == FileType.FILE)
    
    return ProjectFileList(
        files=files,
        total=len(files),
        directories=total_dirs,
        total_size_bytes=total_size
    )


@router.get("/{project_id}/files/tree", response_model=List[ProjectFileTree])
async def get_file_tree(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get project file tree structure
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    # Get all files
    result = await db.execute(
        select(ProjectFile)
        .where(ProjectFile.project_id == project_id)
        .order_by(ProjectFile.path)
    )
    files = result.scalars().all()
    
    # Build tree structure
    file_map = {f.id: f for f in files}
    roots = []
    
    for file in files:
        if file.parent_id is None:
            roots.append(file)
    
    def build_tree(node: ProjectFile) -> ProjectFileTree:
        children = [
            build_tree(child) 
            for child in files 
            if child.parent_id == node.id
        ]
        
        tree_node = ProjectFileTree(**node.__dict__)
        tree_node.children = sorted(
            children, 
            key=lambda x: (x.type != FileType.DIRECTORY, x.name.lower())
        )
        return tree_node
    
    tree = [build_tree(root) for root in roots]
    return sorted(tree, key=lambda x: (x.type != FileType.DIRECTORY, x.name.lower()))


@router.post("/{project_id}/files", response_model=ProjectFileSchema)
async def create_file(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    file_in: ProjectFileCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new file or directory in project
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    # Check file count limit
    if file_in.type == FileType.FILE:
        file_count_result = await db.execute(
            select(func.count(ProjectFile.id))
            .where(
                and_(
                    ProjectFile.project_id == project_id,
                    ProjectFile.type == FileType.FILE
                )
            )
        )
        file_count = file_count_result.scalar_one()
        
        if file_count >= project.max_files:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Project file limit reached ({project.max_files} files)"
            )
    
    # Check if file already exists
    existing_result = await db.execute(
        select(ProjectFile).where(
            and_(
                ProjectFile.project_id == project_id,
                ProjectFile.path == file_in.path
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="File already exists at this path"
        )
    
    # Create file
    db_file = ProjectFile(
        **file_in.dict(),
        project_id=project_id,
        language=get_file_language(file_in.name) if file_in.type == FileType.FILE else None,
        size_bytes=len(file_in.content.encode()) if file_in.content else 0,
        mime_type=mimetypes.guess_type(file_in.name)[0] if file_in.type == FileType.FILE else None
    )
    
    db.add(db_file)
    
    # Update project size
    if file_in.type == FileType.FILE and file_in.content:
        project.total_size_kb += db_file.size_bytes // 1024
        
        if project.total_size_kb > project.max_size_kb:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Project size limit exceeded ({project.max_size_kb} KB)"
            )
    
    await db.commit()
    await db.refresh(db_file)
    
    return db_file


@router.get("/{project_id}/files/{file_id}", response_model=ProjectFileSchema)
async def get_file(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    file_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get file details
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    result = await db.execute(
        select(ProjectFile).where(
            and_(
                ProjectFile.id == file_id,
                ProjectFile.project_id == project_id
            )
        )
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return file


@router.put("/{project_id}/files/{file_id}", response_model=ProjectFileSchema)
async def update_file(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    file_id: UUID,
    file_in: ProjectFileUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update file content or metadata
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    result = await db.execute(
        select(ProjectFile).where(
            and_(
                ProjectFile.id == file_id,
                ProjectFile.project_id == project_id,
                ProjectFile.type == FileType.FILE
            )
        )
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Update size if content changed
    old_size = file.size_bytes
    
    update_data = file_in.dict(exclude_unset=True)
    
    if "content" in update_data and update_data["content"] is not None:
        new_size = len(update_data["content"].encode())
        size_diff = new_size - old_size
        
        # Check size limit
        if project.total_size_kb + (size_diff // 1024) > project.max_size_kb:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Project size limit exceeded ({project.max_size_kb} KB)"
            )
        
        file.size_bytes = new_size
        project.total_size_kb += size_diff // 1024
    
    # Update fields
    for field, value in update_data.items():
        setattr(file, field, value)
    
    # Update language detection
    if "name" in update_data:
        file.language = get_file_language(file.name)
    
    await db.commit()
    await db.refresh(file)
    
    return file


@router.post("/{project_id}/files/{file_id}/move", response_model=ProjectFileSchema)
async def move_file(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    file_id: UUID,
    move_data: ProjectFileMove,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Move/rename file or directory
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    result = await db.execute(
        select(ProjectFile).where(
            and_(
                ProjectFile.id == file_id,
                ProjectFile.project_id == project_id
            )
        )
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check if destination exists
    existing_result = await db.execute(
        select(ProjectFile).where(
            and_(
                ProjectFile.project_id == project_id,
                ProjectFile.path == move_data.new_path,
                ProjectFile.id != file_id
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A file already exists at the destination path"
        )
    
    # Update file
    file.path = move_data.new_path
    file.name = os.path.basename(move_data.new_path)
    file.parent_id = move_data.parent_id
    
    # Update language for files
    if file.type == FileType.FILE:
        file.language = get_file_language(file.name)
    
    # If moving a directory, update all children paths
    if file.type == FileType.DIRECTORY:
        old_path = file.path
        children_result = await db.execute(
            select(ProjectFile).where(
                and_(
                    ProjectFile.project_id == project_id,
                    ProjectFile.path.startswith(old_path + "/")
                )
            )
        )
        children = children_result.scalars().all()
        
        for child in children:
            child.path = child.path.replace(old_path, move_data.new_path, 1)
    
    await db.commit()
    await db.refresh(file)
    
    return file


@router.delete("/{project_id}/files/{file_id}")
async def delete_file(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    file_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete file or directory
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    result = await db.execute(
        select(ProjectFile).where(
            and_(
                ProjectFile.id == file_id,
                ProjectFile.project_id == project_id
            )
        )
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Update project size if deleting a file
    if file.type == FileType.FILE:
        project.total_size_kb -= file.size_bytes // 1024
    
    # Delete file (cascades to children if directory)
    await db.delete(file)
    await db.commit()
    
    return {"message": "File deleted successfully"}


@router.get("/{project_id}/files/{file_id}/download")
async def download_file(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    file_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Download file content
    """
    project = await verify_project_access(project_id, current_user.id, db)
    
    result = await db.execute(
        select(ProjectFile).where(
            and_(
                ProjectFile.id == file_id,
                ProjectFile.project_id == project_id,
                ProjectFile.type == FileType.FILE
            )
        )
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    if file.is_binary:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Binary files not supported in MVP"
        )
    
    # Return file content as stream
    def iterfile():
        yield file.content.encode(file.encoding)
    
    return StreamingResponse(
        iterfile(),
        media_type=file.mime_type or 'text/plain',
        headers={
            "Content-Disposition": f'attachment; filename="{file.name}"'
        }
    )