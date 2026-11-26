# Dependências e licenças

Esta página distingue o **baseline instalado no protótipo** da **stack prevista para o produto final**. A revisão do baseline foi feita em 2026-11-23; a stack-alvo foi conferida em 2026-11-26. Os itens da stack-alvo são candidatos arquiteturais: ainda não foram adicionados ao projeto nem tiveram versões fixadas. Antes de incluí-los, revisar licença, compatibilidade, manutenção e dependências transitivas. Esta verificação não é auditoria jurídica nem de segurança independente.

## Baseline do protótipo

As versões abaixo correspondem às dependências atuais do ambiente local.

| Componente | Versão | Uso | Licença declarada | Compatibilidade/atividade observada |
|---|---:|---|---|---|
| setuptools | 84.2.1 | Backend de build do pacote | MIT | PyPI marca manutenção ativa e release out/2026; Python >=3.10 |
| FastAPI | 0.165.0 | Framework HTTP | MIT | Release publicado em nov/2026; compatível com Python >=3.11 |
| Uvicorn | 0.54.0 | Servidor ASGI | BSD-3-Clause | Projeto ativo; publicado no PyPI |
| asyncpg | 0.32.0 | Driver async PostgreSQL | Apache-2.0 | Release out/2026; PyPI declara suporte a PostgreSQL até 19 e Python >=3.9 |
| redis-py | 8.2.0 | Cliente do protocolo Redis | MIT | Release publicada em nov/2026; PyPI declara suporte Python >=3.11 e compatibilidade com servidores Redis atuais; protocolo usado pelo Valkey |
| HTTPX | 0.28.1 | Cliente ASGI para testes | BSD-3-Clause | Desenvolvimento/testes; compatível com Python >=3.8 |
| pytest | 9.2.0 | Testes | MIT | PyPI classifica como maduro; release out/2026; Python >=3.10 |
| PostgreSQL | 17 (Alpine) | Banco local | PostgreSQL License | Licença liberal semelhante a BSD/MIT |
| Valkey | 8 (Alpine) | Cache local compatível com Redis | BSD-3-Clause | Fork comunitário ativo; servidor selecionado para licença permissiva |

## Stack prevista para o produto final

| Componente | Pacote/projeto | Responsabilidade prevista | Licença declarada | Compatibilidade Python informada pelo upstream | Situação |
|---|---|---|---|---|---|
| LangGraph | `langgraph` | Orquestração dos fluxos conversacionais, estado, memória e chamada de ferramentas | MIT | >=3.10 | Candidato. Revisar dependências transitivas e estratégia de persistência/checkpoint antes de fixar versão. |
| Haystack | `haystack-ai` | Ingestão, recuperação de documentos e pipelines de RAG | Apache-2.0 | >=3.11 | Candidato. Integrações, conversores e adaptadores são pacotes separados e devem ser avaliados individualmente. |
| LiteLLM | `litellm` (SDK principal) | Interface/gateway para desacoplar a aplicação dos provedores de LLM | MIT para o núcleo | >=3.10 e <3.16 | Candidato. Usar somente o núcleo após revisão das dependências. Não selecionar o extra `[proxy]`: a configuração publicada atualmente inclui `litellm-enterprise`. Módulos Enterprise têm licença separada. |

A faixa atual de Python do projeto (3.12–3.14) atende aos requisitos declarados por esses três projetos upstream. Isso não substitui a validação conjunta das versões escolhidas, nem garante que todos os extras ou integrações sejam compatíveis.

### Como os componentes se complementam

- **LangGraph** coordena o caminho de cada conversa e decide quando chamar ferramentas autorizadas.
- **Haystack** organiza a busca em documentos e fontes indexadas quando o fluxo precisar de RAG.
- **LiteLLM** oferece a camada de integração com provedores de modelos, evitando acoplar os workflows a um fornecedor.
- **FastAPI** permanece como API da aplicação. Os conectores SysAid e ERP continuam como interfaces próprias, sem presumir endpoints que ainda não foram confirmados.

A escolha final de versões e extras será feita na fase de implementação correspondente, com revisão de licença e compatibilidade e inclusão de pins no arquivo de dependências. Não instalar componentes Enterprise nem extras que os tragam indiretamente.

## Referências primárias da stack-alvo

- [LangGraph: metadados e dependências](https://github.com/langchain-ai/langgraph/blob/main/libs/langgraph/pyproject.toml) · [licença](https://github.com/langchain-ai/langgraph/blob/main/LICENSE)
- [Haystack: metadados e dependências](https://github.com/deepset-ai/haystack/blob/main/pyproject.toml) · [licença](https://github.com/deepset-ai/haystack/blob/main/LICENSE)
- [LiteLLM: metadados, dependências e extras](https://github.com/BerriAI/litellm/blob/main/pyproject.toml) · [licença e separação de Enterprise](https://github.com/BerriAI/litellm/blob/main/LICENSE)

## Referências do baseline

- [FastAPI (MIT)](https://github.com/fastapi/fastapi)
- [setuptools no PyPI](https://pypi.org/project/setuptools/)
- [Uvicorn no PyPI](https://pypi.org/project/uvicorn/)
- [asyncpg no PyPI](https://pypi.org/project/asyncpg/)
- [redis-py no PyPI](https://pypi.org/project/redis/)
- [HTTPX no PyPI](https://pypi.org/project/httpx/)
- [pytest no PyPI](https://pypi.org/project/pytest/)
- [Licença PostgreSQL](https://www.postgresql.org/about/licence/)
- [Valkey (BSD-3-Clause)](https://github.com/valkey-io/valkey)
- [Licenças oficiais do Redis](https://redis.io/legal/licenses/)

## Nota sobre Redis

Redis 7.2.x e anteriores permanecem BSD-3-Clause. Redis 7.4–7.8 usa RSALv2/SSPLv1 e Redis 8 oferece RSALv2, SSPLv1 e AGPLv3. Como esses termos não atendem ao requisito de componentes permissivos, Compose usa Valkey e o cliente redis-py. Se o requisito for especificamente o servidor Redis oficial atual, a política de licença deverá ser revista antes da adoção.

## Limites da verificação

Versões refletem o catálogo consultado nas datas indicadas; imagem de contêiner precisa de digest pinning e varredura antes de produção. A disponibilidade de uma versão ou licença permissiva não representa certificação de segurança.
