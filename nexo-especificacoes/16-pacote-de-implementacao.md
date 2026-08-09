# 16 — Pacote de implementação

## Objetivo

Dar ao time um pacote consistente e revisável, em vez de um snippet de IA isolado.

## Frontend Vue.js

- rota, navegação, guarda de acesso e feature flag;
- SFCs, componentes/tokens oficiais e estados de UI;
- cliente de API tipado, composable, Pinia e validações;
- acessibilidade, telemetria e testes unitário/componente/E2E.

## Backend Ruby

- OpenAPI, endpoint, controller, service/caso de uso e policy;
- modelo, validação, migration, índice e serializer;
- integração/job/evento com timeout e idempotência;
- logs, métricas, auditoria, erros HTTP e RSpec.

## Evidência gerada

Arquivos sugeridos, diff, comandos de validação, resultados, rastreabilidade com critérios e limitações conhecidas.

## Checks obrigatórios antes de revisão

| Área | Checks |
|---|---|
| Vue | TypeScript, lint, testes, acessibilidade e design system |
| API | lint OpenAPI, respostas de erro, autenticação e compatibilidade |
| Ruby | RuboCop, RSpec, SAST/Brakeman, migration safety e cobertura |
| Integração | timeout, retry, idempotência, log/métrica e teste de contrato |

O gerador só inicia com PBI pronto, schema válido, fontes autorizadas e contratos aprovados/dispensados. Ele executa em workspace isolado, não cria segredos e não aplica migrations em ambiente compartilhado.
