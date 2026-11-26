# RTM AI Assistant

Assistente conversacional para analistas de suporte, integrado visualmente ao SysAid por uma extensão Chrome.

## Escopo atual

O repositório contém a fundação local (Fase 1) e um recorte demonstrativo para hackathon: extensão Chrome side panel, captura acionada do ID do chamado na URL SysAid e respostas simuladas via FastAPI. Isso não implementa autenticação, agente, integrações reais SysAid/ERP, RAG, histórico persistente ou deploy OpenShift.

## Pré-requisitos

- Docker Engine e Docker Compose v2
- Python 3.12–3.14 (opcional, para testes fora do Compose)

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

Para carregar a extensão no Chrome e demonstrar em uma tela SysAid, siga [`docs/demo.md`](docs/demo.md). A extensão lê somente o ID do chamado após clique explícito e envia apenas esse ID e a pergunta para `localhost:8000`. Empresa e solicitante são fictícios no mock; os dados reais deverão ser consultados no SysAid em uma fase futura. As respostas são simuladas.

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
demo/extension/           Extensão Chrome Manifest V3 sem dependências JS
docs/architecture/        visão e decisões arquiteturais
tests/                    testes automatizados
compose.yaml              API, PostgreSQL e Valkey para desenvolvimento
```

Consulte `.env.example` para configuração, `docs/architecture/dependencies.md` para dependências e `PLANS.md` para fases futuras. Credenciais locais padrão servem somente para desenvolvimento.
