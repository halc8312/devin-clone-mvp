from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ClaudeModelBase(BaseModel):
    model_id: str
    display_name: str
    description: Optional[str] = None
    input_price: float
    output_price: float
    context_window: int = 200000
    supports_vision: bool = False
    supports_tool_use: bool = True
    supports_computer_use: bool = False
    supports_extended_thinking: bool = False
    is_active: bool = True
    is_default: bool = False
    is_deprecated: bool = False
    release_date: Optional[str] = None
    model_family: Optional[str] = None
    model_tier: Optional[str] = None


class ClaudeModelCreate(ClaudeModelBase):
    pass


class ClaudeModelUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    input_price: Optional[float] = None
    output_price: Optional[float] = None
    context_window: Optional[int] = None
    supports_vision: Optional[bool] = None
    supports_tool_use: Optional[bool] = None
    supports_computer_use: Optional[bool] = None
    supports_extended_thinking: Optional[bool] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    is_deprecated: Optional[bool] = None
    release_date: Optional[str] = None
    model_family: Optional[str] = None
    model_tier: Optional[str] = None


class ClaudeModel(ClaudeModelBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClaudeModelList(BaseModel):
    models: list[ClaudeModel]
    total: int
    active_count: int
    default_model: Optional[ClaudeModel] = None


class ModelSelectionRequest(BaseModel):
    model_id: str


class ModelSelectionResponse(BaseModel):
    success: bool
    message: str
    selected_model: ClaudeModel