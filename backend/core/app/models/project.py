from datetime import datetime
import uuid

from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Project(Base):
    __tablename__ = "projects"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic fields
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Owner
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Settings
    language = Column(String(50), default="python")  # python, javascript, typescript
    template = Column(String(50), default="blank")   # blank, web-app, api
    
    # Limits
    max_files = Column(Integer, default=20)          # Free: 20, Pro: 500
    total_size_kb = Column(Integer, default=0)       # Current total size
    max_size_kb = Column(Integer, default=10240)     # Free: 10MB, Pro: 1GB
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="project", cascade="all, delete-orphan")
    code_generations = relationship("CodeGeneration", back_populates="project", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Project {self.name}>"