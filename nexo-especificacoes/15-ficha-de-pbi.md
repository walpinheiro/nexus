# 15 — Ficha de PBI

## Campos obrigatórios

- ID, título, feature/regra vinculada e objetivo.
- Escopo incluído e explicitamente excluído.
- Critérios de aceite BDD e exemplos de dados.
- Dependências, bloqueios, risco e owner.
- Impacto: front, back, banco, integração, segurança e observabilidade.
- Estratégia de teste, feature flag, rollout e rollback.
- Estimativa e links do pacote de implementação.

## Definition of Ready

PBI só entra na sprint se aceite, contrato/decisão necessária, dependências e responsabilidade estiverem visíveis. “A IA consegue gerar código” não substitui esses itens.

## Definição de Done

Código revisado, testes verdes, evidência de aceite, telemetria quando aplicável e rastreabilidade atualizada.

## Validações adicionais

Um PBI DEVE realizar uma feature, regra, risco ou decisão técnica explícita. Se altera contrato público, exige plano de compatibilidade. Se altera dados de forma destrutiva, exige plano de dados e rollback. Cada mutação inclui autorização, erros esperados e estratégia de observabilidade.

## Resultado esperado da IA

O output é um `Implementation Packet`: inventário de arquivos, diffs propostos, comandos de validação, resultados, fontes usadas, limitações conhecidas e links para critérios/regras. O pacote não cria merge nem executa mudança de produção.
