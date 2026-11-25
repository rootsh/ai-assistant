# Plano de entrega

Não iniciar uma fase posterior sem aprovação explícita.

| Fase | Escopo | Estado |
|---|---|---|
| 1. Fundação do monorepo e ambiente local | Estrutura, FastAPI mínimo, health checks, Compose, documentação e testes-base | Em revisão |
| Demo de hackathon (recorte) | Side panel MV3, leitura explícita de campos visíveis da tela atual e resposta mockada em streaming pelo FastAPI | Em revisão |
| 2. Backend FastAPI e autenticação | Identidade, autorização no backend e contratos protegidos | Aguardando aprovação |
| 3. LLM Gateway e LangGraph | Abstração de provedores e orquestração de agente | Aguardando aprovação |
| 4. Ferramentas e conectores | Interfaces e conectores configuráveis | Aguardando aprovação |
| 5. Extensão Chrome e chat contínuo | MV3, painel lateral, streaming, histórico e scroll independente | Aguardando aprovação |
| 6. Integração com SysAid | Contexto de chamado e resolução segura de cliente | Aguardando documentação oficial |
| 7. Integração com ERP e contratos | Consulta de contratos e produtos via contrato confirmado | Aguardando documentação oficial |
| 8. RAG e documentação | Ingestão e recuperação de conteúdo autorizado | Aguardando aprovação |
| 9. Deploy no OpenShift | Imagens e manifests compatíveis com ambiente alvo | Aguardando aprovação |
| 10. Segurança, observabilidade e E2E | Hardening, métricas, auditoria e fluxos ponta a ponta | Aguardando aprovação |

## Critério de saída da Fase 1
- Monorepo com API inicial e dependências locais PostgreSQL e cache.
- Health endpoints de liveness e readiness.
- Testes automatizados da API.
- Instruções e decisões arquiteturais documentadas.
- Nenhuma funcionalidade de negócio, autenticação, agente ou chat.

## Limite do demonstrador

A demo não substitui a Fase 5 nem implementa conexão real com APIs SysAid/ERP. Usa `activeTab` para leitura iniciada pelo analista, sem permissão permanente para todos os sites. A extração depende de labels textuais/ARIA comuns; a UI real do SysAid pode exigir um adaptador DOM específico após inspeção autorizada da instância.
