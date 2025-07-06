from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.db.session import get_db
from app.crud import claude_models as crud
from app.schemas.claude_models import (
    ClaudeModel,
    ClaudeModelCreate,
    ClaudeModelUpdate,
    ClaudeModelList,
    ModelSelectionRequest,
    ModelSelectionResponse
)

router = APIRouter()


@router.get("/", response_model=ClaudeModelList)
async def get_claude_models(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    include_deprecated: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Get list of available Claude models"""
    models = await crud.get_models(
        db=db, 
        skip=skip, 
        limit=limit, 
        active_only=active_only,
        include_deprecated=include_deprecated
    )
    total = await crud.get_models_count(db=db, active_only=active_only)
    active_count = await crud.get_models_count(db=db, active_only=True)
    default_model = await crud.get_default_model(db=db)
    
    return ClaudeModelList(
        models=models,
        total=total,
        active_count=active_count,
        default_model=default_model
    )


@router.get("/default", response_model=ClaudeModel)
async def get_default_model(db: AsyncSession = Depends(get_db)):
    """Get the current default Claude model"""
    model = await crud.get_default_model(db=db)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No default model configured"
        )
    return model


@router.get("/{model_id}", response_model=ClaudeModel)
async def get_claude_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific Claude model by ID"""
    model = await crud.get_model(db=db, model_id=model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    return model


@router.post("/", response_model=ClaudeModel)
async def create_claude_model(
    model: ClaudeModelCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new Claude model configuration"""
    # Check if model already exists
    existing_model = await crud.get_model(db=db, model_id=model.model_id)
    if existing_model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model with this ID already exists"
        )
    
    return await crud.create_model(db=db, model=model)


@router.put("/{model_id}", response_model=ClaudeModel)
async def update_claude_model(
    model_id: str,
    model_update: ClaudeModelUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing Claude model configuration"""
    model = await crud.update_model(db=db, model_id=model_id, model_update=model_update)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    return model


@router.delete("/{model_id}")
async def delete_claude_model(model_id: str, db: AsyncSession = Depends(get_db)):
    """Delete (deactivate) a Claude model"""
    success = await crud.delete_model(db=db, model_id=model_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    return {"message": "Model deactivated successfully"}


@router.post("/set-default", response_model=ModelSelectionResponse)
async def set_default_model(
    request: ModelSelectionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Set a model as the default"""
    model = await crud.set_default_model(db=db, model_id=request.model_id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found or inactive"
        )
    
    return ModelSelectionResponse(
        success=True,
        message=f"Successfully set {model.display_name} as default model",
        selected_model=model
    )


@router.post("/initialize-defaults")
async def initialize_default_models(db: AsyncSession = Depends(get_db)):
    """Initialize the database with latest Claude models"""
    
    # Latest Claude models as of 2025
    default_models = [
        # Claude 4 Models (Latest - 2025)
        {
            "model_id": "claude-opus-4-20250514",
            "display_name": "Claude Opus 4",
            "description": "World's best coding model with extended thinking capabilities",
            "input_price": 15.0,
            "output_price": 75.0,
            "context_window": 200000,
            "supports_vision": True,
            "supports_tool_use": True,
            "supports_computer_use": True,
            "supports_extended_thinking": True,
            "is_active": True,
            "is_default": False,
            "release_date": "2025-05-14",
            "model_family": "Claude 4",
            "model_tier": "Opus"
        },
        {
            "model_id": "claude-sonnet-4-20250514",
            "display_name": "Claude Sonnet 4",
            "description": "Balanced performance and cost with superior coding and reasoning",
            "input_price": 3.0,
            "output_price": 15.0,
            "context_window": 200000,
            "supports_vision": True,
            "supports_tool_use": True,
            "supports_computer_use": True,
            "supports_extended_thinking": True,
            "is_active": True,
            "is_default": True,  # Set as default
            "release_date": "2025-05-14",
            "model_family": "Claude 4",
            "model_tier": "Sonnet"
        },
        
        # Claude 3.7 Models
        {
            "model_id": "claude-3-7-sonnet-20250219",
            "display_name": "Claude Sonnet 3.7",
            "description": "Enhanced version of Claude 3.5 Sonnet with improved capabilities",
            "input_price": 3.0,
            "output_price": 15.0,
            "context_window": 200000,
            "supports_vision": True,
            "supports_tool_use": True,
            "supports_computer_use": False,
            "supports_extended_thinking": False,
            "is_active": True,
            "is_default": False,
            "release_date": "2025-02-19",
            "model_family": "Claude 3.7",
            "model_tier": "Sonnet"
        },
        
        # Claude 3.5 Models (Still popular)
        {
            "model_id": "claude-3-5-sonnet-20241022",
            "display_name": "Claude 3.5 Sonnet",
            "description": "Excellent balance of intelligence, speed, and cost",
            "input_price": 3.0,
            "output_price": 15.0,
            "context_window": 200000,
            "supports_vision": True,
            "supports_tool_use": True,
            "supports_computer_use": True,
            "supports_extended_thinking": False,
            "is_active": True,
            "is_default": False,
            "release_date": "2024-10-22",
            "model_family": "Claude 3.5",
            "model_tier": "Sonnet"
        },
        {
            "model_id": "claude-3-5-haiku-20241022",
            "display_name": "Claude 3.5 Haiku",
            "description": "Fastest model with advanced coding and reasoning at accessible price",
            "input_price": 0.8,
            "output_price": 4.0,
            "context_window": 200000,
            "supports_vision": True,
            "supports_tool_use": True,
            "supports_computer_use": False,
            "supports_extended_thinking": False,
            "is_active": True,
            "is_default": False,
            "release_date": "2024-10-22",
            "model_family": "Claude 3.5",
            "model_tier": "Haiku"
        },
        
        # Claude 3 Models (Legacy but still available)
        {
            "model_id": "claude-3-opus-20240229",
            "display_name": "Claude 3 Opus",
            "description": "Most powerful Claude 3 model for complex tasks",
            "input_price": 15.0,
            "output_price": 75.0,
            "context_window": 200000,
            "supports_vision": True,
            "supports_tool_use": True,
            "supports_computer_use": False,
            "supports_extended_thinking": False,
            "is_active": True,
            "is_default": False,
            "is_deprecated": True,
            "release_date": "2024-02-29",
            "model_family": "Claude 3",
            "model_tier": "Opus"
        },
        {
            "model_id": "claude-3-haiku-20240307",
            "display_name": "Claude 3 Haiku",
            "description": "Fast and cost-effective Claude 3 model",
            "input_price": 0.25,
            "output_price": 1.25,
            "context_window": 200000,
            "supports_vision": True,
            "supports_tool_use": True,
            "supports_computer_use": False,
            "supports_extended_thinking": False,
            "is_active": True,
            "is_default": False,
            "is_deprecated": True,
            "release_date": "2024-03-07",
            "model_family": "Claude 3",
            "model_tier": "Haiku"
        }
    ]
    
    created_count = 0
    updated_count = 0
    
    for model_data in default_models:
        existing_model = await crud.get_model(db=db, model_id=model_data["model_id"])
        
        if existing_model:
            # Update existing model
            update_data = ClaudeModelUpdate(**{k: v for k, v in model_data.items() if k != "model_id"})
            await crud.update_model(db=db, model_id=model_data["model_id"], model_update=update_data)
            updated_count += 1
        else:
            # Create new model
            model_create = ClaudeModelCreate(**model_data)
            await crud.create_model(db=db, model=model_create)
            created_count += 1
    
    return {
        "message": f"Successfully initialized models. Created: {created_count}, Updated: {updated_count}",
        "created": created_count,
        "updated": updated_count
    }