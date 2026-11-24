from fastapi.testclient import TestClient

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


def build_client(*, db_ok: bool = True, cache_ok: bool = True):
    pool = FakePool(db_ok)
    cache = FakeRedis(cache_ok)

    async def pool_factory(_: str) -> FakePool:
        return pool

    def redis_factory(_: str) -> FakeRedis:
        return cache

    return TestClient(create_app(pool_factory=pool_factory, redis_factory=redis_factory)), pool, cache


def test_liveness_is_independent_of_dependencies() -> None:
    client, pool, cache = build_client(db_ok=False, cache_ok=False)
    with client:
        response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert pool.closed and cache.closed


def test_readiness_reports_healthy_dependencies() -> None:
    client, _, _ = build_client()
    with client:
        response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "checks": {"postgres": "ok", "cache": "ok"},
    }


def test_readiness_returns_503_when_a_dependency_is_unavailable() -> None:
    client, _, _ = build_client(cache_ok=False)
    with client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "checks": {"postgres": "ok", "cache": "unavailable"},
    }
