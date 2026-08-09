# 06 — Gate 1: Épicos

## Pergunta

Qual capacidade de negócio entregará valor mensurável?

## Requisitos de entrada

Gate 0 aprovado ou uma solicitação com os mesmos campos mínimos.

## Conteúdo obrigatório

- Nome orientado a resultado; problema e objetivo/KPI.
- Personas, proposta de valor e capacidades.
- Regras iniciais, limites de escopo e dependências.
- Prioridade, risco, owner e definição de pronto.

## Saídas

PRD, personas, jornada macro, mapa de épicos/features e métricas de sucesso.

## Aprovação

Negócio e PM confirmam que valor, público, escopo e indicadores são compreendidos. Arquitetura pode registrar riscos, mas não substitui a decisão de valor.

## Schema, regras e validações

| Campo | Regra bloqueante |
|---|---|
| Problema | cita público, dor e contexto; mínimo de 30 caracteres |
| Resultado | descreve mudança observável, não uma solução tecnológica |
| KPI | possui nome, unidade, alvo, janela temporal e responsável |
| Escopo | inclui ao menos um item dentro e um item fora |
| Risco | risco crítico tem probabilidade, impacto, mitigação e owner |
| Fonte | cobertura mínima de 80% nos campos afirmativos |

Regras: um épico pertence a um projeto; cada feature filha explica contribuição ao KPI ou registra justificativa; KPI sem baseline só passa com plano de medição e data. Dependência externa desconhecida vira risco bloqueante, não comentário livre.

```gherkin
Cenário: bloquear G1 sem métrica
  Dado um épico com problema e personas
  Quando o PM solicita aprovação sem KPI
  Então o sistema recusa a aprovação
  E apresenta EPC-002 no checklist
```
