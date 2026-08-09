# 08 — Gate 3: Arquitetura e qualidade

## Pergunta

Como construir a feature de modo seguro, integrado e operável?

## Conteúdo obrigatório

- Domínios, ownership e entidades.
- APIs, eventos, integrações e modelo de dados.
- NFRs: performance, disponibilidade, escala, observabilidade.
- Autorização, dados pessoais, ameaças e controles.
- ADRs, estratégia de rollout e rollback.

## Saídas

C4/diagrama de contêiner, Mermaid de sequência, OpenAPI, modelo de dados, matriz de falhas, threat model e ADRs.

## Aprovação

Arquiteto, segurança e desenvolvimento aprovam contratos, NFRs e riscos. Toda exceção de segurança tem owner, prazo e aceite explícito.

## Regras de validação G3

- API pública exige OpenAPI, respostas 2xx/4xx/5xx, autenticação, compatibilidade e consumidor identificado.
- Persistência exige entidade, validações, migration, índice quando necessário e plano de dados para alteração destrutiva.
- Integração exige owner externo, timeout, retry, idempotência quando houver retry/webhook e comportamento de indisponibilidade.
- Dado pessoal exige classificação, finalidade, retenção e controle de acesso.
- NFR deve ter medida, alvo e estratégia de observabilidade; “ser rápido” não é NFR válido.
- Exceção de segurança expirada bloqueia o item na próxima operação relevante.

O G3 exige aprovação de arquiteto e segurança além do responsável técnico. Evidências mínimas: OpenAPI/contrato, ADRs, threat model e matriz de falhas quando aplicável.
