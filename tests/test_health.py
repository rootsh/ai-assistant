import asyncio
import json

from httpx import ASGITransport, AsyncClient, Response

from rtm_ai.main import create_app


class FakePool:
    def __init__(self, healthy: bool = True) -> None:
        self.healthy = healthy
        self.closed = False

    async def fetchval(self, query: str) -> int:
        assert query == "SELECT 1"
        if not self.healthy:
            raise RuntimeError("database unavailable")
        return 1

    async def close(self) -> None:
        self.closed = True


class FakeRedis:
    def __init__(self, healthy: bool = True) -> None:
        self.healthy = healthy
        self.closed = False

    async def ping(self) -> bool:
        if not self.healthy:
            raise RuntimeError("cache unavailable")
        return True

    async def aclose(self) -> None:
        self.closed = True


async def request_health(*, path: str, db_ok: bool = True, cache_ok: bool = True) -> tuple[Response, FakePool, FakeRedis]:
    pool = FakePool(db_ok)
    cache = FakeRedis(cache_ok)

    async def pool_factory(_: str) -> FakePool:
        return pool

    def redis_factory(_: str) -> FakeRedis:
        return cache

    app = create_app(pool_factory=pool_factory, redis_factory=redis_factory)
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get(path)
    return response, pool, cache


def test_liveness_is_independent_of_dependencies() -> None:
    response, pool, cache = asyncio.run(
        request_health(path="/health/live", db_ok=False, cache_ok=False)
    )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert pool.closed and cache.closed


def test_readiness_reports_healthy_dependencies() -> None:
    response, _, _ = asyncio.run(request_health(path="/health/ready"))

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {"postgres": "ok", "cache": "ok"},
    }


def test_readiness_returns_503_when_a_dependency_is_unavailable() -> None:
    response, _, _ = asyncio.run(
        request_health(path="/health/ready", cache_ok=False)
    )

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "checks": {"postgres": "ok", "cache": "unavailable"},
    }


def test_demo_chat_streams_a_mock_answer_with_screen_context() -> None:
    async def run_demo():
        pool = FakePool()
        cache = FakeRedis()

        async def pool_factory(_: str) -> FakePool:
            return pool

        def redis_factory(_: str) -> FakeRedis:
            return cache

        app = create_app(pool_factory=pool_factory, redis_factory=redis_factory)
        async with app.router.lifespan_context(app):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                screen_context = {
                    "ticket_id": "INC-2048",
                    "subject": "NAT CloudLink p/ SLC",
                    "customer": "IUGU",
                    "support_type": "Suporte Técnico TI",
                    "status": "Em andamento",
                }
                details = await client.post(
                    "/api/demo/chat",
                    json={
                        "message": "Qual é o tipo de suporte contratado, o nome da empresa e o título do chamado?",
                        "screen_context": screen_context,
                    },
                )
                support_level = await client.post(
                    "/api/demo/chat",
                    json={"message": "Qual é o nível de suporte contratado?", "screen_context": screen_context},
                )
                return details, support_level

    response, support_response = asyncio.run(run_demo())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    tokens = [
        json.loads(line[6:])["text"]
        for line in response.text.splitlines()
        if line.startswith("data: ") and '"token"' in line
    ]
    streamed_text = "".join(tokens)
    assert "Resposta simulada" in streamed_text
    assert "Empresa Cliente: IUGU" in streamed_text
    assert "Título: NAT CloudLink p/ SLC" in streamed_text
    assert "Tipo de suporte: Suporte Técnico TI" in streamed_text
    assert "INC-2048" in streamed_text
    level_tokens = [
        json.loads(line[6:])["text"]
        for line in support_response.text.splitlines()
        if line.startswith("data: ") and '"token"' in line
    ]
    level_text = "".join(level_tokens)
    assert "nível de suporte contratado: Suporte Premium" in level_text
    assert "Empresa Cliente: IUGU" not in level_text


def test_demo_chat_rejects_unallowlisted_page_content() -> None:
    async def run_demo():
        async def pool_factory(_: str) -> FakePool:
            return FakePool()

        def redis_factory(_: str) -> FakeRedis:
            return FakeRedis()

        app = create_app(pool_factory=pool_factory, redis_factory=redis_factory)
        async with app.router.lifespan_context(app):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                return await client.post(
                    "/api/demo/chat",
                    json={
                        "message": "Resumo",
                        "screen_context": {},
                        "full_page_text": "conteúdo não permitido",
                    },
                )

    response = asyncio.run(run_demo())
    assert response.status_code == 422
