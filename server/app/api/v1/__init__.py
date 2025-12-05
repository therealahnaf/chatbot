"""API v1 router."""

from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    auth,
    chat,
    chat_widgets,
    conversation,
    feedback,
    knowledge_base,
    messages,
    projects,
    users,
)

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(knowledge_base.router)
api_router.include_router(chat.router)
api_router.include_router(chat_widgets.router)
api_router.include_router(conversation.router)
api_router.include_router(messages.router)
api_router.include_router(feedback.router)
api_router.include_router(analytics.router)