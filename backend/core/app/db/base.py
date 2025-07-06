# Import all the models, so that Base has them before being
# imported by Alembic
from app.db.base_class import Base  # noqa
from app.models.user import User  # noqa
from app.models.session import Session  # noqa
from app.models.project import Project  # noqa
from app.models.project_file import ProjectFile  # noqa
from app.models.chat import ChatSession, ChatMessage  # noqa
from app.models.claude_models import ClaudeModel  # noqa
