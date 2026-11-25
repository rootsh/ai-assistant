# Demonstração de hackathon

## O que mostrar

1. Abrir um chamado real no SysAid em uma aba Chrome.
2. Carregar `demo/extension` como extensão não empacotada em `chrome://extensions` (habilitar modo de desenvolvedor).
3. Clicar no ícone da extensão para abrir o side panel e em **Autorizar acesso ao SysAid**. O Chrome pede acesso somente a `rtm.sysaidit.com`.
4. Abrir um chamado e clicar em **Ler chamado visível**. Mostrar os campos reconhecidos.
5. Perguntar “Qual é o SLA deste chamado?” e observar a resposta simulada chegando em streaming.

## Subir a API

```bash
cp .env.example .env
docker compose up --build
```

A API fica em `http://localhost:8000`; readiness em `/health/ready`. PostgreSQL e Valkey sobem como infraestrutura da base, mas não participam da resposta mock.

## O que a extensão lê

A leitura só é acionada pelo analista. A permissão opcional de host é pedida após clique explícito e limitada a `https://rtm.sysaidit.com/*`; Chrome mantém essa permissão até ser revogada em `chrome://extensions`. `scripting` injeta a função somente após **Ler chamado visível**. A extensão procura labels/ARIA/textos simples correspondentes a ID, assunto, empresa/cliente, solicitante, prioridade e status. Campos reconhecidos ficam no side panel. O payload envia somente esses campos e a pergunta para o FastAPI local; não envia o texto integral da página, HTML, cookies ou screenshots.

O extractor é genérico e best effort. SysAid pode renderizar alguns dados em componentes sem labels DOM acessíveis ou dentro de canvas/iframes; nesses casos os campos podem não ser capturados. A demo não afirma compatibilidade universal com versões/layouts SysAid. Depois de validar o DOM da instância, os aliases e seletores podem ser ajustados sem inventar endpoints.

## Comportamento mock

`POST /api/demo/chat` responde com templates estáticos e simula streaming SSE. Não chama LLM, SysAid ou ERP, não consulta PostgreSQL/Valkey e não toma decisões de autorização. Exemplos de SLA/contrato/infraestrutura são fictícios e o painel exibe essa indicação.

## Limites e proteção de dados

- Use uma conta e chamado de demonstração autorizados pela organização.
- Não use dados sensíveis em apresentações públicas.
- A conexão à API é HTTP local para a demo; não deve ser exposta em rede ou usada em produção.
- A API mock não é autenticada; CORS permite a extensão e origens locais de desenvolvimento.
- A permissão concedida cobre apenas `rtm.sysaidit.com`; não conceda acesso amplo a todos os sites.
