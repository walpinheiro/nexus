# 09 — Gate 4: Planejamento de PBIs

## Pergunta

Que unidades de trabalho podem ser construídas, testadas e liberadas?

## Regras de decomposição

- PBI entrega uma fatia observável de valor ou reduz um risco técnico explícito.
- Não mistura múltiplas features sem relação de aceite clara.
- Possui escopo incluído/excluído, dependências e estratégia de teste.
- É pequeno o suficiente para planejamento da squad; caso contrário, deve ser dividido.

## Saídas

PBIs priorizados, estimativas, dependências, Definition of Ready, plano de release e pacote de implementação.

## Aprovação

PO, desenvolvimento e QA confirmam que não há bloqueador oculto e que critérios são verificáveis.

## Definition of Ready

O PBI só pode passar se tiver título, feature ou regra de origem, ao menos um critério de aceite, escopo dentro/fora, dependências resolvidas ou assumidas, owner, estratégia de teste, contratos aprovados/dispensados e zero bloqueador aberto.

Regras: PBI que altera contrato público exige plano de compatibilidade ou consumidor correspondente; migration destrutiva exige plano de dados/rollback; tela que consome API referencia contrato versionado; PBI sem teste não entra em sprint.
