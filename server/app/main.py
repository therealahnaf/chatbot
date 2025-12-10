"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1 import api_router
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import logger
from app.schemas.common import ErrorResponse, HealthResponse

# Add custom middleware (in reverse order of execution)
from app.api.middleware import (
    LoggingMiddleware,
    RateLimitMiddleware,
    SecurityLoggingMiddleware,
)
from app.cache.redis_client import redis_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting AI Agent Platform", environment=settings.APP_ENV)
    
    # Initialize Redis connection
    try:
        await redis_client.connect()
        logger.info("Redis client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Redis client: {e}")
        # Continue without Redis - rate limiting will be disabled
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Agent Platform")
    
    # Close Redis connection
    try:
        await redis_client.disconnect()
        logger.info("Redis client disconnected successfully")
    except Exception as e:
        logger.error(f"Error disconnecting Redis client: {e}")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="AI Agent Platform with FastAPI, LangChain, and LangGraph",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Security and request logging
app.add_middleware(SecurityLoggingMiddleware)
app.add_middleware(LoggingMiddleware)

# Rate limiting (IP-based)
app.add_middleware(RateLimitMiddleware)

# Include API router
app.include_router(api_router, prefix=settings.API_PREFIX)


# Exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application exceptions."""
    logger.error(
        "Application error",
        error=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
        details=exc.details,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.__class__.__name__, message=exc.message, details=exc.details
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle validation errors."""
    logger.warning("Validation error", path=request.url.path, errors=exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error="ValidationError",
            message="Request validation failed",
            details={"errors": exc.errors()},
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.error(
        "Unexpected error", error=str(exc), error_type=type(exc).__name__, path=request.url.path
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="InternalServerError",
            message="An unexpected error occurred" if settings.is_production else str(exc),
        ).model_dump(),
    )


# Health check endpoint
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns:
        Health status
    """
    return HealthResponse(
        status="healthy", version="1.0.0", environment=settings.APP_ENV
    )


# Prometheus metrics
if settings.ENABLE_METRICS:
    try:
        instrumentator = Instrumentator(
        should_group_status_codes=False,  # Track individual status codes (500, 501, etc.)
        should_ignore_untemplated=True,
            should_respect_env_var=False,  # Don't respect env var, use our setting
        excluded_handlers=["/metrics", "/health", "/docs", "/openapi.json", "/redoc"],
        )
        instrumentator.instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
        logger.info("Prometheus metrics enabled at /metrics")
    except Exception as e:
        logger.error(f"Failed to setup Prometheus metrics: {e}")

# Root endpoint
@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """
    Root endpoint.

    Returns:
        Welcome message
    """
    return {
        "message": "Welcome to AI Agent Platform API",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics" if settings.ENABLE_METRICS else "disabled",
    }
