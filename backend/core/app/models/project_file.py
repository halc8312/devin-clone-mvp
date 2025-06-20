from datetime import datetime
import uuid
import enum

from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Integer, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class FileType(str, enum.Enum):
    FILE = "file"
    DIRECTORY = "directory"


class ProjectFile(Base):
    __tablename__ = "project_files"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Project relationship
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    # File info
    name = Column(String(255), nullable=False)
    path = Column(String(1000), nullable=False)  # Full path from project root
    type = Column(SQLEnum(FileType), default=FileType.FILE)
    
    # Content (for files)
    content = Column(Text, nullable=True)
    language = Column(String(50), nullable=True)  # Auto-detected or set
    encoding = Column(String(50), default="utf-8")
    
    # Metadata
    size_bytes = Column(Integer, default=0)
    is_binary = Column(Boolean, default=False)
    mime_type = Column(String(100), nullable=True)
    
    # Parent directory (for tree structure)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("project_files.id", ondelete="CASCADE"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="files")
    parent = relationship("ProjectFile", remote_side=[id], backref="children")
    
    def __repr__(self):
        return f"<ProjectFile {self.path}>"
    
    @property
    def is_directory(self) -> bool:
        """Check if this is a directory."""
        return self.type == FileType.DIRECTORY
    
    @property
    def is_file(self) -> bool:
        """Check if this is a file."""
        return self.type == FileType.FILE