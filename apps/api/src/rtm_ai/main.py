"""FastAPI application factory and initial health endpoints."""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any, Callable

import asyncpg
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from redis.asyncio import Redis


async def _default_pool_factory(database_url: str) -> Any:
    return await asyncpg.create_pool(dsn=database_url, min_size=1, max_size=5)


def _default_redis_factory(redis_url: str) -> Redis:
    return Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)


def create_app(
    *,
    pool_factory: Callable[[str], Any] = _default_pool_factory,
    redis_factory: Callable[[str], Any] = _default_redis_factory,
) -> FastAPI:
    """Create the API; injected factories keep health behavior testable."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.db_pool = await pool_factory(
            os.getenv(
                "DATABASE_URL",
                "postgresql://rtm_ai:local-only-change-me@localhost:5432/rtm_ai",
            )
        )
        try:
            app.state.redis = redis_factory(
                os.getenv("REDIS_URL", "redis://localhost:6379/0")
            )
            yield
        finally:
            await app.state.db_pool.close()
            if hasattr(app.state, "redis"):
                await app.state.redis.aclose()

    app = FastAPI(
        title="RTM AI Assistant API",
        version="0.1.0",
        description="Fundação da API. Funcionalidades de negócio serão adicionadas em fases aprovadas.",
        lifespan=lifespan,
    )

    @app.get("/health/live", tags=["health"], summary="Verifica se o processo está ativo")
    async def live() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health/ready", tags=["health"], summary="Verifica dependências essenciais")
    async def ready(request: Request) -> JSONResponse:
        checks: dict[str, str] = {}
        try:
            await request.app.state.db_pool.fetchval("SELECT 1")
            checks["postgres"] = "ok"
        except Exception:
            checks["postgres"] = "unavailable"
        try:
            await request.app.state.redis.ping()
            checks["cache"] = "ok"
        except Exception:
            checks["cache"] = "unavailable"

        is_ready = all(value == "ok" for value in checks.values())
        return JSONResponse(
            status_code=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "ok" if is_ready else "not_ready", "checks": checks},
        )

    return app


app = create_app()
