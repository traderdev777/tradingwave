"""Main FastAPI application entrypoint for TradingWave."""

import logging
import time
import uuid
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from packages.shared_types.errors import TradingWaveException
from services.api.config import get_settings
from services.api.database import Base, engine
from services.api.routes.auth import router as auth_router
from services.api.routes.auth import users_router
from services.api.routes.health import router as health_router
from services.api.routes.workspaces import router as workspaces_router
from services.api.routes.ai_studio import router as ai_studio_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("tradingwave.api")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle hooks: initialize database tables."""
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    openapi_url="/openapi.json" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def correlation_id_and_timing_middleware(
    request: Request,
    call_next: Callable[[Request], Any],
) -> Response:
    """Assign or preserve correlation ID and calculate request duration."""
    correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id

    start_time = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["X-Response-Time-Ms"] = str(duration_ms)

    logger.info(
        f"{request.method} {request.url.path} status={response.status_code} "
        f"duration={duration_ms}ms cid={correlation_id}"
    )
    return response


@app.exception_handler(TradingWaveException)
async def domain_exception_handler(
    request: Request,
    exc: TradingWaveException,
) -> JSONResponse:
    """Handle custom domain exceptions according to standard error format."""
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        headers={"X-Correlation-ID": correlation_id},
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": correlation_id,
                "details": exc.details,
            }
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Handle Pydantic request validation errors."""
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    details = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err.get("loc", []))
        details.append(
            {
                "field": loc,
                "reason": err.get("msg", "Invalid value"),
            }
        )

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        headers={"X-Correlation-ID": correlation_id},
        content={
            "error": {
                "code": "INVALID_REQUEST_BODY",
                "message": "The request body failed validation.",
                "request_id": correlation_id,
                "details": details,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Handle unexpected server errors without leaking internals or stack traces."""
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    logger.exception(f"Unhandled server error cid={correlation_id}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        headers={"X-Correlation-ID": correlation_id},
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing your request.",
                "request_id": correlation_id,
                "details": [],
            }
        },
    )


# Include API routers
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(users_router, prefix=settings.API_V1_PREFIX)
app.include_router(workspaces_router, prefix=settings.API_V1_PREFIX)
app.include_router(ai_studio_router, prefix=settings.API_V1_PREFIX)
