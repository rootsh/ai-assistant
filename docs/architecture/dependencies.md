# Dependências e licenças

Verificação inicial em 2026-11-23. Versões estão fixadas para reprodutibilidade. Antes de atualizar, revalidar licença, compatibilidade, manutenção e dependências transitivas. A revisão de licença não é auditoria jurídica nem de segurança independente.

| Componente | Versão | Uso | Licença declarada | Compatibilidade/atividade observada |
|---|---:|---|---|---|
| setuptools | 84.2.1 | Backend de build do pacote | MIT | PyPI marca manutenção ativa e release out/2026; Python >=3.10 |
| FastAPI | 0.165.0 | Framework HTTP | MIT | Release publicado em nov/2026; compatível com Python >=3.11 |
| Uvicorn | 0.54.0 | Servidor ASGI | BSD-3-Clause | Projeto ativo; publicado no PyPI |
| asyncpg | 0.32.0 | Driver async PostgreSQL | Apache-2.0 | Release out/2026; PyPI declara suporte a PostgreSQL até 19 e Python >=3.9 |
| redis-py | 8.2.0 | Cliente do protocolo Redis | MIT | Release publicada em nov/2026; PyPI declara suporte Python >=3.11 e compatibilidade com servidores Redis atuais; protocolo usado pelo Valkey |
| HTTPX | 0.28.1 | Cliente ASGI para testes | BSD-3-Clause | Desenvolvimento/testes; compatível com Python >=3.8 |
| pytest | 9.2.0 | Testes | MIT | PyPI classifica como maduro; release out/2026; Python >=3.10 |
| PostgreSQL | 17 (Alpine) | Banco local | PostgreSQL License | Licença liberal semelhante a BSD/MIT |
| Valkey | 8 (Alpine) | Cache local compatível com Redis | BSD-3-Clause | Fork comunitário ativo; servidor selecionado para licença permissiva |

## Referências primárias

- [FastAPI (MIT)](https://github.com/fastapi/fastapi)
- [setuptools no PyPI](https://pypi.org/project/setuptools/)
- [Uvicorn no PyPI](https://pypi.org/project/uvicorn/)
- [asyncpg no PyPI](https://pypi.org/project/asyncpg/)
- [redis-py no PyPI](https://pypi.org/project/redis/)
- [HTTPX no PyPI](https://pypi.org/project/httpx/)
- [pytest no PyPI](https://pypi.org/project/pytest/)
- [Licença PostgreSQL](https://www.postgresql.org/about/licence/)
- [Valkey (BSD-3-Clause)](https://github.com/valkey-io/valkey)
- [Licenças oficiais do Redis](https://redis.io/legal/licenses/)

## Nota sobre Redis

Redis 7.2.x e anteriores permanecem BSD-3-Clause. Redis 7.4–7.8 usa RSALv2/SSPLv1 e Redis 8 oferece RSALv2, SSPLv1 e AGPLv3. Como esses termos não atendem ao requisito de componentes permissivos, Compose usa Valkey e o cliente redis-py. Se o requisito for especificamente o servidor Redis oficial atual, a política de licença deverá ser revista antes da adoção.

## Limites da verificação

Versões refletem o catálogo consultado nesta data; imagem de contêiner precisa de digest pinning e varredura antes de produção. A disponibilidade de uma versão ou licença permissiva não representa certificação de segurança.
