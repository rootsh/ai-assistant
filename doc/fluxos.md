# Fluxos do assistente

Os fluxos abaixo descrevem o comportamento alvo. A seção final explica o que a demo faz hoje.

## 1. Pergunta sobre um chamado SysAid

```mermaid
sequenceDiagram
  actor Analyst as Analista
  participant Ext as Extensão Chrome
  participant Page as Tela SysAid
  participant API as FastAPI
  participant Auth as Autorização
  participant Graph as LangGraph
  participant SysAid as Conector SysAid
  participant AI as LiteLLM / modelo
  participant DB as PostgreSQL

  Analyst->>Ext: Seleciona SysAid e clica em Ler chamado
  Ext->>Page: Lê localmente o ID visível do chamado
  Analyst->>Ext: Envia pergunta
  Ext->>API: Pergunta + ID + históricos dos modos
  API->>Auth: Autentica analista
  Auth-->>API: Identidade e permissões
  API->>SysAid: Resolve o ID e obtém dados autorizados
  SysAid-->>API: Chamado e dados relacionados
  API->>Auth: Autoriza acesso ao chamado resolvido
  Auth-->>API: Permitido
  API->>Graph: Pergunta + contexto validado + histórico
  Graph->>AI: Solicita resposta ou síntese
  AI-->>Graph: Tokens da resposta
  Graph-->>API: Tokens e referências
  API->>DB: Registra conversa e auditoria
  API-->>Ext: Resposta em SSE
  Ext-->>Analyst: Exibe resposta no chat
```

**Proteção:** o backend não usa o ID como prova de autorização. Se o chamado não existir ou o analista não puder acessá-lo, a consulta é recusada e auditada.

## 2. Pergunta no modo Geral

```mermaid
sequenceDiagram
  actor Analyst as Analista
  participant Ext as Extensão Chrome
  participant API as FastAPI
  participant Auth as Autorização
  participant Graph as LangGraph
  participant Sources as Haystack / Tools
  participant AI as LiteLLM / modelo
  participant DB as PostgreSQL

  Analyst->>Ext: Seleciona Geral
  Analyst->>Ext: Envia pergunta aberta
  Ext->>API: Pergunta + histórico dos modos, sem ID de chamado
  API->>Auth: Autentica analista
  Auth-->>API: Identidade e permissões
  API->>Graph: Pergunta + histórico autorizado
  Graph->>Sources: Recupera conteúdo ou chama tool permitida
  Sources-->>Graph: Evidências autorizadas
  Graph->>AI: Gera resposta baseada nas evidências
  AI-->>Graph: Tokens da resposta
  Graph-->>API: Tokens e referências
  API->>DB: Registra conversa e auditoria
  API-->>Ext: Resposta em SSE
  Ext-->>Analyst: Exibe resposta no chat Geral
```

O modo Geral não herda o ID do chamado. O histórico de Geral e o de SysAid são separados, mas enviados juntos para a API para preservar o contexto de cada conversa. A extensão limpa as duas conversas quando o analista inicia uma nova sessão pelo ícone da extensão.

## 3. Ingestão e consulta de documentos (RAG)

```mermaid
flowchart LR
  Owner[Responsável pela fonte] -->|fonte autorizada| Ingest[Processo de ingestão]
  Ingest --> Haystack[Haystack<br/>limpeza · divisão · metadados]
  Haystack -->|vetores e metadados| PG[(PostgreSQL + pgvector)]

  Question[Pergunta autorizada] --> Graph[LangGraph]
  Graph -->|consulta com filtros de acesso| Haystack
  Haystack -->|trechos e referências| Graph
  Graph --> Answer[Resposta com fontes]
```

O processo de ingestão registra origem, versão e permissões de cada documento. Na consulta, filtros de acesso são aplicados antes de devolver trechos ao fluxo. O modelo recebe conteúdo recuperado, não acesso direto ao banco.

## 4. O que acontece na demo atual

1. O analista escolhe **SysAid** e autoriza o domínio no Chrome.
2. Ao clicar em **Ler chamado visível**, a extensão captura apenas o ID da URL `SREdit.jsp`.
3. A pergunta, o modo e os dois históricos seguem para o FastAPI local; somente no modo SysAid o ID é enviado.
4. O FastAPI responde com templates mock em SSE. Empresa e solicitante são nomes fictícios; não há consulta ao SysAid, ERP, LLM, Haystack ou banco.
5. No modo **Geral**, a extensão aceita perguntas sem ID e a API responde que o modelo ainda não está conectado.

Assim, os fluxos 1–3 são o desenho futuro; a demo comprova somente a interação visual, leitura explícita do ID, alternância de modos, histórico em memória e streaming mock.