import logging
import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("taskarena")


def setup_middleware(app: FastAPI) -> None:
    """Register all middleware on the app. Called once in main.py."""

    # CORS removed - frontend served by Tauri, same origin as backend.
    # If you need to test in a plain browser (not Tauri), add CORS back temporarily.

    # Request timing + logging
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = (time.perf_counter() - start) * 1000
        logger.debug(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration:.1f}ms)"
        )
        return response

    # Global exception handler - never expose stack traces to client
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unhandled error on {request.method} {request.url.path}: {exc}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Check server logs."},
        )

    # ValueError -> 404 (resource not found)
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    # PermissionError -> 400 (invalid state transition e.g. completing an already completed task)
    @app.exception_handler(PermissionError)
    async def permission_error_handler(request: Request, exc: PermissionError):
        return JSONResponse(status_code=400, content={"detail": str(exc)})
