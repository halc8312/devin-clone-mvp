from typing import Optional, List
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, validator


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    language: str = Field("python", max_length=50)
    template: str = Field("blank", max_length=50)
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Project name cannot be empty')
        return v.strip()
    
    @validator('language')
    def validate_language(cls, v):
        allowed_languages = ['python', 'javascript', 'typescript', 'java', 'cpp', 'go', 'rust']
        if v not in allowed_languages:
            raise ValueError(f'Language must be one of {allowed_languages}')
        return v


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    language: Optional[str] = Field(None, max_length=50)
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('Project name cannot be empty')
        return v.strip() if v else v


class ProjectInDBBase(ProjectBase):
    id: UUID
    owner_id: UUID
    max_files: int
    total_size_kb: int
    max_size_kb: int
    created_at: datetime
    updated_at: datetime
    last_accessed_at: Optional[datetime]

    class Config:
        from_attributes = True


class Project(ProjectInDBBase):
    pass


class ProjectInDB(ProjectInDBBase):
    pass


class ProjectList(BaseModel):
    """Response model for project list"""
    projects: List[Project]
    total: int
    page: int
    page_size: int
    

class ProjectStats(BaseModel):
    """Project statistics"""
    total_files: int
    total_size_kb: int
    last_activity: Optional[datetime]
    language_breakdown: dict  # {"python": 10, "js": 5, ...}