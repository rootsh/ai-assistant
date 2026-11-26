# Demonstração de hackathon

## O que mostrar

1. Abrir um chamado real no SysAid em uma aba Chrome.
2. Carregar `demo/extension` como extensão não empacotada em `chrome://extensions` (habilitar modo de desenvolvedor).
3. Clicar no ícone da extensão para abrir o side panel e em **Autorizar acesso ao SysAid**. O Chrome pede acesso somente a `rtm.sysaidit.com`.
4. Abrir um chamado e clicar em **Ler chamado visível**. Mostrar apenas o ID capturado.
5. Perguntar “Qual é o SLA deste chamado?” e observar a resposta simulada chegando em streaming.

## Subir a API

```bash
cp .env.example .env
docker compose up --build
```

A API fica em `http://localhost:8000`; readiness em `/health/ready`. PostgreSQL e Valkey sobem como infraestrutura da base, mas não participam da resposta mock.

## O que a extensão lê

O painel oferece os modos **SysAid** e **Geral**. O histórico de cada modo fica separado e é mantido ao alternar entre eles; clicar no ícone da extensão inicia uma nova sessão e limpa as conversas. No modo Geral, o analista pode fazer perguntas abertas sem usar o contexto de chamado e não há sugestões prontas. A leitura do chamado só é acionada no modo SysAid pelo analista. A permissão opcional de host é pedida após clique explícito e limitada a `https://rtm.sysaidit.com/*`; o padrão cobre páginas como `/SREdit.jsp?pageID=4&id=15261`. Chrome mantém essa permissão até ser revogada em `chrome://extensions`. `scripting` injeta a função somente após **Ler chamado visível**. No modo SysAid, a extensão captura somente o parâmetro `id` em páginas `SREdit.jsp` e o mostra no side panel. Não tenta ler os outros campos do formulário. O payload envia o modo, a pergunta, os históricos separados de SysAid e Geral e, somente no modo SysAid, o ID para o FastAPI local; não envia a URL completa, texto integral da página, HTML, cookies ou screenshots.

O `id` é usado para contextualizar a resposta mock nesta etapa. Em fase futura, será uma chave para o backend buscar o registro no SysAid; o backend deverá confirmar o chamado e a autorização antes de retornar dados reais. O mock escolhe nomes fictícios de empresa e solicitante de forma estável para cada ID, para que não mudem entre perguntas. Título e tipo de suporte são indicados como dados que seriam consultados no SysAid.

## Comportamento mock

`POST /api/demo/chat` recebe o modo selecionado, responde com templates estáticos e simula streaming SSE. No modo Geral, a resposta informa que a integração ainda não está conectada. Não chama LLM, SysAid ou ERP, não consulta PostgreSQL/Valkey e não toma decisões de autorização. Exemplos de SLA/contrato/infraestrutura são fictícios e o painel exibe essa indicação.

## Limites e proteção de dados

- Use uma conta e chamado de demonstração autorizados pela organização.
- Não use dados sensíveis em apresentações públicas.
- A conexão à API é HTTP local para a demo; não deve ser exposta em rede ou usada em produção.
- A API mock não é autenticada; CORS permite a extensão e origens locais de desenvolvimento.
- A permissão concedida cobre apenas `rtm.sysaidit.com`; não conceda acesso amplo a todos os sites.
