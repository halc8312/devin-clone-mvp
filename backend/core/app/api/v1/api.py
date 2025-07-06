from fastapi import APIRouter

# Import endpoint routers here
from app.api.v1.endpoints import (
    auth,
    projects,
    files,
    chat,
    subscription,
    health,
    claude_models,
)

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router, prefix="", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(files.router, prefix="/projects", tags=["files"])
api_router.include_router(chat.router, prefix="", tags=["chat"])
api_router.include_router(
    subscription.router, prefix="/subscription", tags=["subscription"]
)
api_router.include_router(
    claude_models.router, prefix="/claude-models", tags=["claude-models"]
)


# Temporary test endpoint
@api_router.get("/test")
async def test_endpoint():
    return {"message": "API v1 is working!"}
