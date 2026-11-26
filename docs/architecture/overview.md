# Visão arquitetural

## Objetivo

Assistente conversacional para analistas consultarem informações autorizadas de clientes, contratos, serviços, infraestrutura, SLAs e histórico. A interface planejada é uma extensão Chrome integrada visualmente ao SysAid.

## Princípios

- Backend é autoridade para identidade, contexto e autorização; dados do navegador são não confiáveis.
- Não executar SQL arbitrário produzido por LLM. Tools futuras usarão operações explícitas, parâmetros validados e autorização por chamada.
- Não inferir endpoints SysAid/ERP. Conectores começam por interfaces/configuração e só implementam APIs documentadas.
- Manter um monorepo e backend modular até que escala ou limites operacionais justifiquem serviços separados.
- Isolar prompts, workflows, tools e conectores.
- Auditar consultas/respostas com minimização de dados sensíveis.
- Usar componentes permissivos e sem dependência de módulos Enterprise.

## Contexto de alto nível (alvo evolutivo)

O diagrama atualizado, com componentes e responsabilidades, está em [Arquitetura alvo](../../doc/arquitetura.md). Os fluxos de consulta SysAid, modo Geral e RAG estão em [Fluxos](../../doc/fluxos.md). Esses documentos descrevem o destino planejado, não funcionalidades já implementadas.

## Fase 1 e demonstrador de hackathon

A API mantém pool de conexões PostgreSQL e cliente de cache no ciclo de vida do processo. Liveness mede se o processo responde; readiness verifica `SELECT 1` e `PING`.

Na demo, o side panel só lê o ID da URL `SREdit.jsp` após ação explícita do analista. O FastAPI recebe a pergunta, os históricos em memória dos modos SysAid e Geral e, no modo SysAid, o ID; transmite uma resposta mock em SSE. Empresa e solicitante são fictícios. Não há chamada a SysAid, ERP, LLM ou banco para compor a resposta, nem decisão de autorização de negócio.

## Identificação de chamado e cliente (fases futuras)

O identificador do chamado fornecido pela extensão (incluindo o parâmetro `id` de `SREdit.jsp`) pode servir como chave de consulta. Nas fases de integração, o backend deve resolver esse identificador junto ao SysAid e aplicar autorização sobre o registro retornado. O número vindo do navegador não é prova de existência nem de autorização. Domínio de e-mail é uma pista de resolução quando a empresa estiver ausente; o resultado precisa ser confirmado por fonte autorizada. Nunca aceitar identificador de cliente como prova de autorização.

## Implantação (fases futuras)

Compose é somente para desenvolvimento local. Imagens, configuração, segredos, probes e políticas de rede do OpenShift serão definidos na Fase 9 com base no cluster alvo.
