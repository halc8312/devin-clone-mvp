from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy import and_
from typing import List, Optional
from app.models.claude_models import ClaudeModel
from app.schemas.claude_models import ClaudeModelCreate, ClaudeModelUpdate


async def get_model(db: AsyncSession, model_id: str) -> Optional[ClaudeModel]:
    """Get a specific Claude model by model_id"""
    result = await db.execute(select(ClaudeModel).where(ClaudeModel.model_id == model_id))
    return result.scalar_one_or_none()


async def get_model_by_id(db: AsyncSession, id: int) -> Optional[ClaudeModel]:
    """Get a specific Claude model by database id"""
    result = await db.execute(select(ClaudeModel).where(ClaudeModel.id == id))
    return result.scalar_one_or_none()


async def get_models(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    active_only: bool = True,
    include_deprecated: bool = False
) -> List[ClaudeModel]:
    """Get list of Claude models with filtering"""
    query = select(ClaudeModel)
    
    if active_only:
        query = query.where(ClaudeModel.is_active == True)
    
    if not include_deprecated:
        query = query.where(ClaudeModel.is_deprecated == False)
    
    query = query.order_by(ClaudeModel.model_family, ClaudeModel.model_tier).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def get_default_model(db: AsyncSession) -> Optional[ClaudeModel]:
    """Get the default Claude model"""
    result = await db.execute(
        select(ClaudeModel).where(
            and_(ClaudeModel.is_default == True, ClaudeModel.is_active == True)
        )
    )
    return result.scalar_one_or_none()


async def create_model(db: AsyncSession, model: ClaudeModelCreate) -> ClaudeModel:
    """Create a new Claude model"""
    # If this is set as default, unset other defaults
    if model.is_default:
        await db.execute(
            select(ClaudeModel).where(ClaudeModel.is_default == True)
        )
        # Update all existing defaults to False
        existing_defaults = await db.execute(
            select(ClaudeModel).where(ClaudeModel.is_default == True)
        )
        for existing_model in existing_defaults.scalars():
            existing_model.is_default = False
    
    db_model = ClaudeModel(**model.model_dump())
    db.add(db_model)
    await db.commit()
    await db.refresh(db_model)
    return db_model


async def update_model(db: AsyncSession, model_id: str, model_update: ClaudeModelUpdate) -> Optional[ClaudeModel]:
    """Update an existing Claude model"""
    db_model = await get_model(db, model_id)
    if not db_model:
        return None
    
    update_data = model_update.model_dump(exclude_unset=True)
    
    # If setting as default, unset other defaults
    if update_data.get("is_default"):
        existing_defaults = await db.execute(
            select(ClaudeModel).where(ClaudeModel.is_default == True)
        )
        for existing_model in existing_defaults.scalars():
            existing_model.is_default = False
    
    for field, value in update_data.items():
        setattr(db_model, field, value)
    
    await db.commit()
    await db.refresh(db_model)
    return db_model


async def delete_model(db: AsyncSession, model_id: str) -> bool:
    """Delete a Claude model (soft delete by setting inactive)"""
    db_model = await get_model(db, model_id)
    if not db_model:
        return False
    
    db_model.is_active = False
    await db.commit()
    return True


async def set_default_model(db: AsyncSession, model_id: str) -> Optional[ClaudeModel]:
    """Set a model as the default"""
    # Unset all defaults
    existing_defaults = await db.execute(
        select(ClaudeModel).where(ClaudeModel.is_default == True)
    )
    for existing_model in existing_defaults.scalars():
        existing_model.is_default = False
    
    # Set new default
    db_model = await get_model(db, model_id)
    if db_model and db_model.is_active:
        db_model.is_default = True
        await db.commit()
        await db.refresh(db_model)
        return db_model
    
    return None


async def get_models_count(db: AsyncSession, active_only: bool = True) -> int:
    """Get total count of models"""
    query = select(ClaudeModel)
    if active_only:
        query = query.where(ClaudeModel.is_active == True)
    result = await db.execute(query)
    return len(result.scalars().all())