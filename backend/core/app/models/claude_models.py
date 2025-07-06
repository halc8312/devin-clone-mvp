from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from datetime import datetime
from app.db.session import Base


class ClaudeModel(Base):
    """Claude AI model configuration"""

    __tablename__ = "claude_models"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    description = Column(String)

    # Pricing (per million tokens)
    input_price = Column(Float, nullable=False)  # USD per million input tokens
    output_price = Column(Float, nullable=False)  # USD per million output tokens

    # Capabilities
    context_window = Column(Integer, default=200000)  # Context window size
    supports_vision = Column(Boolean, default=False)
    supports_tool_use = Column(Boolean, default=True)
    supports_computer_use = Column(Boolean, default=False)
    supports_extended_thinking = Column(Boolean, default=False)

    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    is_deprecated = Column(Boolean, default=False)

    # Metadata
    release_date = Column(String)  # e.g., "2025-05-14"
    model_family = Column(String)  # e.g., "Claude 4", "Claude 3.5"
    model_tier = Column(String)  # e.g., "Opus", "Sonnet", "Haiku"

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<ClaudeModel(model_id='{self.model_id}', display_name='{self.display_name}')>"
