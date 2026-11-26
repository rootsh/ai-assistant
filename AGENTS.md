# Instruções para agentes

## Escopo
- Implementar somente os escopos aprovados em `PLANS.md`: Fase 1 e recorte demonstrativo de hackathon.
- O recorte demo permite extensão MV3 com leitura acionada apenas do ID do chamado na URL e resposta mock no FastAPI.
- A demo não autoriza implementação de autenticação, conectores reais SysAid/ERP, LLM, RAG, histórico persistente ou deploy.
- O recorte demo não equivale à conclusão da Fase 5 (extensão e chat de produção).
- Não executar SQL arbitrário gerado por LLM; ferramentas futuras devem usar operações parametrizadas e allowlists.
- Não confiar em identidade, empresa, cliente ou chamado informados pelo navegador. Validar autorização no servidor.
- Não inventar endpoints SysAid ou ERP. Usar contratos configuráveis até receber documentação oficial.

## Arquitetura
- Manter monorepo modular e backend coeso; evitar microserviços prematuros.
- Separar prompts, workflows, tools e conectores quando aprovados.
- Documentar decisões em `doc/decisoes/`.
- Preservar independência de provedor LLM e uso de componentes permissivos sem módulos Enterprise.

## Dependências
- Antes de adicionar/atualizar dependência, conferir licença, compatibilidade, atividade de manutenção, versão estável e dependências transitivas relevantes.
- Registrar análise em `doc/dependencias.md`.
- Não instalar componentes Enterprise nem extensões comerciais.

## Segurança e qualidade
- Não registrar segredos, tokens ou conteúdo sensível de chamados/respostas.
- Credenciais vêm do ambiente; `.env` não deve ser versionado.
- Consultas ao banco devem ser parametrizadas; não expor consultas arbitrárias.
- Manter testes automatizados e atualizar README/documentação com mudanças de contratos e comandos.
- Liveness mede apenas o processo; readiness verifica dependências.
