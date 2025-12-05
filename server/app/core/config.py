"""Application configuration using Pydantic Settings."""

from typing import Any, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application Configuration
    APP_NAME: str = "ai-agent-platform"
    APP_ENV: str = Field(default="development", pattern="^(development|staging|production)$")
    DEBUG: bool = False
    LOG_LEVEL: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")

    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = Field(default=8000, ge=1, le=65535)
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    # Database Configuration
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/ai_agent_db"
    )
    DATABASE_POOL_SIZE: int = Field(default=20, ge=1, le=100)
    DATABASE_MAX_OVERFLOW: int = Field(default=0, ge=0, le=50)

    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = Field(default=50, ge=1, le=1000)

    # Qdrant Configuration
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION: str = "knowledge_base"
    QDRANT_API_KEY: Optional[str] = None

    # OpenAI Configuration
    OPENAI_API_KEY: str = Field(min_length=1)
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_MAX_TOKENS: int = Field(default=4096, ge=1, le=128000)
    OPENAI_TEMPERATURE: float = Field(default=0.7, ge=0.0, le=2.0)

    # Langfuse Configuration (Optional)
    LANGFUSE_PUBLIC_KEY: Optional[str] = None
    LANGFUSE_SECRET_KEY: Optional[str] = None
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"
    LANGFUSE_ENABLED: bool = True

    # Security Configuration
    SECRET_KEY: str = Field(min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, ge=1, le=1440)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, ge=1, le=30)

    # Rate Limiting
    RATE_LIMIT_PER_USER: int = Field(default=100, ge=1, le=10000)
    RATE_LIMIT_PER_IP: int = Field(default=1000, ge=1, le=100000)
    AGENT_QUERY_LIMIT: int = Field(default=20, ge=1, le=1000)

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = Field(default=50, ge=1, le=500)
    ALLOWED_FILE_TYPES: str = "pdf,txt,docx,md"

    # Prometheus Configuration
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = Field(default=8000, ge=1, le=65535)
    PROMETHEUS_URL: str = Field(default="http://prometheus:9090")

    # Grafana Configuration
    GRAFANA_ADMIN_PASSWORD: str = Field(default="admin", min_length=5)

    # Agent Configuration
    AGENT_MAX_ITERATIONS: int = Field(default=10, ge=1, le=50)
    AGENT_TIMEOUT_SECONDS: int = Field(default=30, ge=1, le=300)
    CONVERSATION_HISTORY_LIMIT: int = Field(default=50, ge=1, le=200)

    # Knowledge Base Configuration
    KB_CHUNK_SIZE: int = Field(default=500, ge=100, le=2000)
    KB_CHUNK_OVERLAP: int = Field(default=50, ge=0, le=500)
    KB_TOP_K_RESULTS: int = Field(default=5, ge=1, le=20)
    KB_CHUNKING_STRATEGY: str = Field(
        default="section",
        pattern="^(token|section)$",
        description="Chunking strategy: 'section' for section-wise (split by # headings), 'token' for token-based"
    )

    # Cache Configuration
    CACHE_TTL_SECONDS: int = Field(default=3600, ge=60, le=86400)
    CACHE_USER_PROFILE_TTL: int = Field(default=21600, ge=300, le=86400)
    CACHE_QUERY_TTL: int = Field(default=3600, ge=60, le=86400)

    # External APIs (Optional)
    SERPER_API_KEY: Optional[str] = None
    TAVILY_API_KEY: Optional[str] = None

    @field_validator("CORS_ORIGINS")
    @classmethod
    def parse_cors_origins(cls, v: str) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in v.split(",") if origin.strip()]

    @field_validator("ALLOWED_FILE_TYPES")
    @classmethod
    def parse_allowed_file_types(cls, v: str) -> list[str]:
        """Parse allowed file types from comma-separated string."""
        return [ft.strip().lower() for ft in v.split(",") if ft.strip()]

    @field_validator("LANGFUSE_ENABLED", mode="before")
    @classmethod
    def parse_langfuse_enabled(cls, v: Any) -> bool:
        """Parse LANGFUSE_ENABLED from various string formats."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "on")
        return bool(v)

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.APP_ENV == "development"

    @property
    def max_upload_size_bytes(self) -> int:
        """Get max upload size in bytes."""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# Global settings instance
settings = Settings()
