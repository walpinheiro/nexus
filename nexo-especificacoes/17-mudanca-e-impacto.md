# 17 — Mudança e impacto

## Máquina de estado

`Rascunho → Em revisão → Aprovado → Baseline → Desatualizado → Regenerado → Validado → Publicado`.

## Fluxo

1. Alteração cria nova versão do objeto de origem.
2. Motor percorre relações de realização, consumo, validação e restrição.
3. Itens dependentes recebem estado `Desatualizado` com causa.
4. IA propõe plano de impacto: artefatos, diffs, riscos e estimativa.
5. Responsável aprova regeneração por grupo ou item.
6. Novas versões são validadas; baseline anterior permanece recuperável.

## Regras

- Mudança de regra afeta aceite, API, testes e código que a realizam.
- Mudança de API afeta todos os consumidores/mocks/contratos.
- Não sobrescrever saída aprovada automaticamente.
- Toda cascata deve ser reversível por versão.

## Regras de cálculo

O motor percorre relações `realiza`, `consome`, `valida` e `restringe`; relações de hierarquia só agregam a visualização. Ciclos não hierárquicos são detectados e limitados por profundidade. Cada cascata tem `correlation_id`, pode ser pausada e registra as operações aplicadas.

O plano de impacto precisa apresentar origem/versionamento, diff, dependentes, risco, operação sugerida e owner. Usuário aprova a ação por item ou em lote; o motor nunca substitui baseline automaticamente.
