# ADR 0001: cache compatível com Redis sob licença permissiva

- Estado: Aceita para desenvolvimento local da Fase 1
- Data: 2026-11-23

## Contexto

O requisito pede PostgreSQL e Redis, mas também exige componentes open source permissivos. Redis 8 permite escolha entre RSALv2, SSPLv1 e AGPLv3; Redis 7.4–7.8 usa RSALv2/SSPLv1.

## Decisão

Usar Valkey 8 no Compose local. Valkey é compatível com o protocolo Redis e usa BSD-3-Clause. O cliente Python `redis` é MIT. PostgreSQL usa sua licença permissiva própria.

## Consequências

- O ambiente oferece cache compatível com Redis e mantém a política de licença permissiva.
- Recursos específicos do servidor Redis não devem ser usados sem validar compatibilidade com Valkey.
- Se “Redis oficial” for requisito obrigatório, há conflito com a política permissiva e a escolha requer decisão explícita.
- Licença e proveniência das imagens precisam ser revalidadas antes de produção.
