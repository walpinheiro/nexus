# 04 — Modelo de conhecimento

## Objetos

`Iniciativa`, `Projeto`, `Épico`, `Feature`, `Regra`, `Persona`, `Jornada`, `Tela`, `API`, `PBI`, `Teste`, `ADR`, `Artefato`, `Decisão`, `Risco`.

## Campos base de todo objeto

- ID imutável, título, descrição estruturada, status e gate.
- Owner, participantes, etiquetas de domínio e confidencialidade.
- Fonte: informado, inferido, padrão corporativo ou pendente.
- Versão, baseline, histórico e links de evidência.

## Relações tipadas

| Relação | Origem → destino | Significado |
|---|---|---|
| contém | Épico → Feature | hierarquia de produto |
| realiza | PBI → Feature/Regra | trabalho que materializa intenção |
| consome | Tela → API | dependência de interface |
| valida | Teste → Aceite | evidência de comportamento |
| restringe | ADR/Política → API/PBI | decisão técnica ou governança |
| impacta | Mudança → Artefato | recalcular/revisar |

## Invariantes

- Relação tem tipo, versão de origem/destino, autor e justificativa.
- Artefato aprovado nunca é sobrescrito: uma nova versão é criada.
- PBI não pode ser pronto sem feature e ao menos um critério de aceite.

## Grafo, versão e impacto

Uma aresta é uma entidade versionada: `edge_id`, origem e destino com versão, tipo, força (`required` ou `optional`), autor e justificativa. `contains` agrega; `realizes`, `consumes`, `validates` e `constrains` participam do cálculo de impacto.

| Alteração | Dependentes que ficam desatualizados |
|---|---|
| regra | critérios, APIs, testes, PBIs e código que a realizam |
| critério de aceite | testes e PBIs vinculados |
| contrato API | clientes, mocks, testes de contrato e telas consumidoras |
| ADR/NFR | artefatos técnicos restringidos |
| tela | testes de UI, analytics e PBIs relacionados |

Antes de qualquer regeneração, o NEXO DEVE apresentar plano com diff da origem, artefatos afetados, risco, operação sugerida (`revisar`, `regenerar` ou `sem ação`) e responsável. Baselines nunca são sobrescritas; toda cascata possui `correlation_id`, pode ser pausada e é recuperável por versão.

## Motor de regras e validações

O motor separa cinco camadas: schema (tipos, obrigatórios e referências), negócio (estados, permissões e dependências), política (segurança/compliance), qualidade de IA (completude, ambiguidade e contradição) e técnica (OpenAPI, lint, testes, SAST e CI).

| Código | Regra | Tipo | Severidade padrão |
|---|---|---|---|
| VAL-001 | referência aponta para item inexistente/arquivado | schema | bloqueante |
| VAL-002 | versão aprovada sofreu edição direta | workflow | bloqueante |
| VAL-003 | fonte/classificação incompatível | policy | bloqueante |
| VAL-004 | duas regras aplicáveis entram em conflito | IA + revisão humana | aviso alto |
| VAL-005 | critério não tem resultado verificável | negócio | bloqueante |
| VAL-006 | tela mutável sem autorização | negócio/segurança | bloqueante |
| VAL-007 | API sem erro padronizado | técnico | bloqueante no G3 |
| VAL-008 | dependente aprovado ficará stale | impacto | aviso alto + plano |
| VAL-009 | saída IA não valida contra schema | IA | bloqueante |
| VAL-010 | ausência de evidência de teste | técnico | bloqueante no G5 |

A ordem de execução é: permissão → schema → referências → domínio → políticas → impacto → qualidade IA → checks técnicos. Inferência de IA gera aviso/escalonamento, nunca bloqueio autônomo, salvo quando falha política determinística. Conflito abre uma decisão com fontes, subgrafo, opções e owner; não é resolvido pela IA sem aprovação.
