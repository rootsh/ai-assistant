# RTM AI Assistant

Assistente conversacional para analistas de suporte, integrado visualmente ao SysAid por uma extensão Chrome.

## Escopo atual

Este repositório implementa somente a **Fase 1: fundação do monorepo e ambiente local**. Ainda não há autenticação, agente, integrações SysAid/ERP, RAG, chat, histórico ou deploy OpenShift.

## Pré-requisitos

- Docker Engine e Docker Compose v2
- Python 3.12+ (opcional, para testes fora do Compose)

## Início rápido

```bash
cp .env.example .env
docker compose up --build
```

API: http://localhost:8000  
OpenAPI: http://localhost:8000/docs  
Liveness: http://localhost:8000/health/live  
Readiness: http://localhost:8000/health/ready

O Compose aguarda PostgreSQL e Valkey ficarem saudáveis antes de iniciar a API. Valkey é compatível com o protocolo Redis e tem licença BSD-3-Clause; foi escolhido para preservar o requisito de licenças permissivas.

## Testes

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[dev]'
pytest
```

Os testes da API usam dependências simuladas e não exigem serviços externos.

## Estrutura

```text
apps/api/                 API FastAPI
docs/architecture/        visão e decisões arquiteturais
tests/                    testes automatizados
compose.yaml              API, PostgreSQL e Valkey para desenvolvimento
```

Consulte `.env.example` para configuração, `docs/architecture/dependencies.md` para dependências e `PLANS.md` para fases futuras. Credenciais locais padrão servem somente para desenvolvimento.
