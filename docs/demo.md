# Demonstração de hackathon

## O que mostrar

1. Abrir um chamado real no SysAid em uma aba Chrome.
2. Carregar `demo/extension` como extensão não empacotada em `chrome://extensions` (habilitar modo de desenvolvedor).
3. Clicar no ícone da extensão para abrir o side panel.
4. Clicar em **Ler chamado visível** e mostrar os campos que foram reconhecidos.
5. Perguntar “Qual é o SLA deste chamado?” e observar a resposta simulada chegando em streaming.

## Subir a API

```bash
cp .env.example .env
docker compose up --build
```

A API fica em `http://localhost:8000`; readiness em `/health/ready`. PostgreSQL e Valkey sobem como infraestrutura da base, mas não participam da resposta mock.

## O que a extensão lê

A leitura só é acionada pelo analista. A permissão `activeTab` é temporária para a aba atual e `scripting` injeta a função de leitura sob demanda. A extensão procura labels/ARIA/textos simples correspondentes a ID, assunto, empresa/cliente, solicitante, prioridade e status. Campos reconhecidos ficam no side panel. O payload envia somente esses campos e a pergunta para o FastAPI local; não envia o texto integral da página, HTML, cookies ou screenshots.

O extractor é genérico e best effort. SysAid pode renderizar alguns dados em componentes sem labels DOM acessíveis ou dentro de canvas/iframes; nesses casos os campos podem não ser capturados. A demo não afirma compatibilidade universal com versões/layouts SysAid. Depois de validar o DOM da instância, os aliases e seletores podem ser ajustados sem inventar endpoints.

## Comportamento mock

`POST /api/demo/chat` responde com templates estáticos e simula streaming SSE. Não chama LLM, SysAid ou ERP, não consulta PostgreSQL/Valkey e não toma decisões de autorização. Exemplos de SLA/contrato/infraestrutura são fictícios e o painel exibe essa indicação.

## Limites e proteção de dados

- Use uma conta e chamado de demonstração autorizados pela organização.
- Não use dados sensíveis em apresentações públicas.
- A conexão à API é HTTP local para a demo; não deve ser exposta em rede ou usada em produção.
- A API mock não é autenticada; CORS permite a extensão e origens locais de desenvolvimento.
- Não conceda à extensão permissão permanente para todos os sites. O MVP usa interação explícita e `activeTab`.
