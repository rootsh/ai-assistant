# RTM AI Assistant

Assistente conversacional para analistas de suporte, integrado visualmente ao SysAid por uma extensão Chrome. A demo oferece áreas **SysAid** e **Geral**, com históricos separados enviados à API e mantidos ao trocar de modo; eles são limpos ao clicar no ícone da extensão.

## Documentação

- [Índice da documentação](doc/README.md)
- [Arquitetura alvo](doc/arquitetura.md)
- [Fluxos](doc/fluxos.md)
- [Como executar a demo](doc/demo.md)

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

Para carregar a extensão no Chrome e demonstrar em uma tela SysAid, siga [`doc/demo.md`](doc/demo.md). A extensão lê somente o ID do chamado após clique explícito e envia o modo, a pergunta, os históricos separados dos dois modos e, somente no modo SysAid, o ID para `localhost:8000`. Empresa e solicitante são fictícios no mock; os dados reais deverão ser consultados no SysAid em uma fase futura. As respostas são simuladas.

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
doc/                      arquitetura, fluxos, demo, dependências e decisões
tests/                    testes automatizados
compose.yaml              API, PostgreSQL e Valkey para desenvolvimento
```

Consulte `.env.example` para configuração, `doc/dependencias.md` para dependências e `PLANS.md` para fases futuras. Credenciais locais padrão servem somente para desenvolvimento.
