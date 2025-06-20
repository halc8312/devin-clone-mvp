from typing import Optional, List
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, validator

from app.models.project_file import FileType


class ProjectFileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    path: str = Field(..., min_length=1, max_length=1000)
    type: FileType = FileType.FILE
    content: Optional[str] = None
    language: Optional[str] = Field(None, max_length=50)
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('File name cannot be empty')
        # Check for invalid characters
        invalid_chars = ['/', '\\', '\0']
        for char in invalid_chars:
            if char in v:
                raise ValueError(f'File name cannot contain {char}')
        return v.strip()
    
    @validator('path')
    def validate_path(cls, v):
        if not v or not v.strip():
            raise ValueError('File path cannot be empty')
        # Normalize path separators
        v = v.replace('\\', '/')
        # Remove leading slash
        if v.startswith('/'):
            v = v[1:]
        return v


class ProjectFileCreate(ProjectFileBase):
    parent_id: Optional[UUID] = None


class ProjectFileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    language: Optional[str] = Field(None, max_length=50)


class ProjectFileMove(BaseModel):
    new_path: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[UUID] = None


class ProjectFileInDBBase(ProjectFileBase):
    id: UUID
    project_id: UUID
    parent_id: Optional[UUID]
    size_bytes: int
    is_binary: bool
    mime_type: Optional[str]
    encoding: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectFile(ProjectFileInDBBase):
    pass


class ProjectFileInDB(ProjectFileInDBBase):
    pass


class ProjectFileTree(ProjectFile):
    """File tree representation with children"""
    children: List['ProjectFileTree'] = []


ProjectFileTree.model_rebuild()  # Enable forward reference


class ProjectFileList(BaseModel):
    """Response model for file list"""
    files: List[ProjectFile]
    total: int
    directories: int
    total_size_bytes: int