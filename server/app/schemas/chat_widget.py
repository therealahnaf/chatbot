"""Chat widget schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ChatWidgetColors(BaseModel):
    """Schema for widget colors."""

    primary: str = Field(default="#3b82f6", description="Primary color")
    background: str = Field(default="#ffffff", description="Background color")
    text: str = Field(default="#1f2937", description="Text color")
    user_bubble: str = Field(
        default="#3b82f6", description="User message bubble color", alias="userBubble"
    )
    bot_bubble: str = Field(
        default="#f3f4f6", description="Bot message bubble color", alias="botBubble"
    )
    user_text: str = Field(
        default="#ffffff", description="User message text color", alias="userText"
    )
    bot_text: str = Field(
        default="#1f2937", description="Bot message text color", alias="botText"
    )

    model_config = {"populate_by_name": True}


class ChatWidgetRadius(BaseModel):
    """Schema for widget border radius settings."""

    widget: int = Field(default=16, description="Widget window border radius in pixels")
    message_bubble: int = Field(
        default=12,
        description="Message bubble border radius in pixels",
        alias="messageBubble",
    )
    button: int = Field(default=50, description="Chat button border radius in pixels")

    model_config = {"populate_by_name": True}


class FAQItem(BaseModel):
    """Schema for FAQ items."""

    question: str = Field(description="FAQ question")
    answer: str = Field(description="FAQ answer")


class InitPageConfig(BaseModel):
    """Schema for initial page configuration."""

    enabled: bool = Field(default=False, description="Whether init page is enabled")
    welcome_message: str | None = Field(
        default="Hello 👋\nI am a Virtual Assistant\nHow may I help you?",
        description="Welcome message on init page",
        alias="welcomeMessage",
    )
    faqs: list[FAQItem] = Field(default=[], description="List of FAQ items")
    show_start_new_message: bool = Field(
        default=True,
        description="Show 'Start new message' button",
        alias="showStartNewMessage",
    )
    show_continue_conversation: bool = Field(
        default=True,
        description="Show 'Continue conversation' button",
        alias="showContinueConversation",
    )

    model_config = {"populate_by_name": True}


class ChatWidgetBase(BaseModel):
    """Base chat widget schema with common fields."""

    name: str = Field(
        max_length=255,
        min_length=1,
        description="Name of the widget",
    )
    position: str = Field(
        default="bottom-right",
        description="Widget position (bottom-right, bottom-left, top-right, top-left)",
    )
    colors: ChatWidgetColors = Field(
        default_factory=ChatWidgetColors, description="Widget color configuration"
    )
    radius: ChatWidgetRadius = Field(
        default_factory=ChatWidgetRadius, description="Widget radius configuration"
    )
    welcome_message: str = Field(
        default="Hi! How can I help you today?",
        description="Welcome message displayed when chat starts",
        alias="welcomeMessage",
    )
    placeholder: str = Field(
        default="Type your message...",
        description="Input field placeholder text",
    )
    api_endpoint: str = Field(
        default="/api/v1/chat",
        max_length=500,
        description="API endpoint for chat requests",
        alias="apiEndpoint",
    )
    enabled: bool = Field(
        default=True, description="Whether the widget is enabled"
    )
    init_page: InitPageConfig = Field(
        default_factory=InitPageConfig,
        description="Initial page configuration",
        alias="initPage",
    )
    show_bot_icon: bool = Field(
        default=True, description="Whether to show bot icon next to bot messages", alias="showBotIcon"
    )
    show_user_icon: bool = Field(
        default=True, description="Whether to show user icon next to user messages", alias="showUserIcon"
    )

    model_config = {"populate_by_name": True}


class ChatWidgetCreate(ChatWidgetBase):
    """Schema for creating a chat widget."""

    pass


class ChatWidgetUpdate(BaseModel):
    """Schema for updating a chat widget (all fields optional)."""

    name: str | None = Field(None, max_length=255, min_length=1)
    position: str | None = None
    colors: ChatWidgetColors | None = None
    radius: ChatWidgetRadius | None = None
    welcome_message: str | None = Field(None, alias="welcomeMessage")
    placeholder: str | None = None
    api_endpoint: str | None = Field(None, max_length=500, alias="apiEndpoint")
    enabled: bool | None = None
    init_page: InitPageConfig | None = Field(None, alias="initPage")
    show_bot_icon: bool | None = Field(None, alias="showBotIcon")
    show_user_icon: bool | None = Field(None, alias="showUserIcon")

    model_config = {"populate_by_name": True}


class ChatWidgetResponse(BaseModel):
    """Schema for chat widget response."""

    id: UUID
    user_id: UUID
    name: str
    position: str
    colors: dict
    radius: dict
    welcome_message: str
    placeholder: str
    api_endpoint: str
    enabled: bool
    init_page: dict
    show_bot_icon: bool
    show_user_icon: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class ChatWidgetListResponse(BaseModel):
    """Schema for paginated chat widget list response."""

    items: list[ChatWidgetResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
