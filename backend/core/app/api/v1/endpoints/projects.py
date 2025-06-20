from typing import Any, List
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.api import deps
from app.db.session import get_db
from app.models import User, Project, SubscriptionPlan
from app.schemas.project import (
    Project as ProjectSchema,
    ProjectCreate,
    ProjectUpdate,
    ProjectList,
    ProjectStats
)
from app.core.cache import cache, cached, project_cache_key

router = APIRouter()


@router.get("/", response_model=ProjectList)
async def read_projects(
    *,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve projects for current user with pagination
    """
    # Calculate offset
    skip = (page - 1) * page_size
    
    # Get total count
    count_result = await db.execute(
        select(func.count(Project.id))
        .where(Project.owner_id == current_user.id)
    )
    total = count_result.scalar_one()
    
    # Get projects
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .offset(skip)
        .limit(page_size)
        .order_by(Project.updated_at.desc())
    )
    projects = result.scalars().all()
    
    # Update last accessed time for retrieved projects
    for project in projects:
        project.last_accessed_at = datetime.utcnow()
    await db.commit()
    
    return ProjectList(
        projects=projects,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/", response_model=ProjectSchema)
async def create_project(
    *,
    db: AsyncSession = Depends(get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new project for current user
    """
    # Check project limit based on subscription
    count_result = await db.execute(
        select(func.count(Project.id))
        .where(Project.owner_id == current_user.id)
    )
    current_project_count = count_result.scalar_one()
    
    # Free users limited to 1 project, Pro users unlimited
    if current_user.subscription_plan == SubscriptionPlan.FREE and current_project_count >= 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Free plan is limited to 1 project. Please upgrade to Pro."
        )
    
    # Set limits based on subscription
    if current_user.subscription_plan == SubscriptionPlan.FREE:
        max_files = 20
        max_size_kb = 10240  # 10MB
    else:
        max_files = 500
        max_size_kb = 1048576  # 1GB
    
    project = Project(
        **project_in.dict(),
        owner_id=current_user.id,
        max_files=max_files,
        max_size_kb=max_size_kb
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectSchema)
@cached(expire=300, key_func=lambda project_id, **kwargs: project_cache_key(str(project_id)))
async def read_project(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get project by ID
    """
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.owner_id == current_user.id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Update last accessed time
    project.last_accessed_at = datetime.utcnow()
    await db.commit()
    
    return project


@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    project_in: ProjectUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update project
    """
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.owner_id == current_user.id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    update_data = project_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    
    # Invalidate cache
    await cache.delete(project_cache_key(str(project_id)))
    
    return project


@router.delete("/{project_id}")
async def delete_project(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete project and all associated data
    """
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.owner_id == current_user.id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Delete project (cascades to files and chats)
    await db.delete(project)
    await db.commit()
    
    # Invalidate related caches
    await cache.delete(project_cache_key(str(project_id)))
    await cache.invalidate_pattern(f"file_tree:{project_id}*")
    await cache.invalidate_pattern(f"file:{project_id}:*")
    
    return {"message": "Project deleted successfully"}


@router.get("/{project_id}/stats", response_model=ProjectStats)
async def get_project_stats(
    *,
    db: AsyncSession = Depends(get_db),
    project_id: UUID,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get project statistics
    """
    # Verify project ownership
    result = await db.execute(
        select(Project).where(
            and_(
                Project.id == project_id,
                Project.owner_id == current_user.id
            )
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get file statistics
    from app.models import ProjectFile
    file_result = await db.execute(
        select(
            func.count(ProjectFile.id),
            func.sum(ProjectFile.size_bytes)
        ).where(
            and_(
                ProjectFile.project_id == project_id,
                ProjectFile.type == "file"
            )
        )
    )
    total_files, total_size = file_result.one()
    
    # Get language breakdown
    lang_result = await db.execute(
        select(
            ProjectFile.language,
            func.count(ProjectFile.id)
        ).where(
            and_(
                ProjectFile.project_id == project_id,
                ProjectFile.type == "file",
                ProjectFile.language.isnot(None)
            )
        ).group_by(ProjectFile.language)
    )
    language_breakdown = {lang: count for lang, count in lang_result}
    
    # Get last activity
    activity_result = await db.execute(
        select(func.max(ProjectFile.updated_at))
        .where(ProjectFile.project_id == project_id)
    )
    last_activity = activity_result.scalar_one_or_none() or project.updated_at
    
    return ProjectStats(
        total_files=total_files or 0,
        total_size_kb=int((total_size or 0) / 1024),
        last_activity=last_activity,
        language_breakdown=language_breakdown
    )