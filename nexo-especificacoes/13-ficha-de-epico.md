# 13 — Ficha de épico

## Schema funcional

| Campo | Obrigatório | Validação |
|---|---:|---|
| Título orientado a resultado | sim | não é apenas nome técnico |
| Problema e evidência | sim | descreve dor/público |
| Objetivo e KPI | sim | métrica tem unidade e baseline quando disponível |
| Persona | sim | ao menos uma pessoa/segmento |
| Escopo e não-escopo | sim | fronteira explícita |
| Regras iniciais | sim | fonte marcada |
| Dependências e riscos | sim | owner definido |
| Features filhas | antes do G2 | capacidade observável |

## Perguntas de revisão

- Se este épico for concluído, que comportamento ou indicador muda?
- Quem não é atendido por ele?
- Quais políticas ou sistemas podem impedir a entrega?
- Que decisão ainda é uma hipótese?

## Regras operacionais

`outcome` não pode citar solução (“construir API Ruby”); deve descrever efeito no usuário ou negócio. Cada KPI deve ter unidade, alvo, janela e responsável. Riscos críticos exigem probabilidade, impacto, mitigação e owner. A IA pode sugerir dados, mas toda informação afirmativa precisa da marca `informada`, `inferida`, `padrão corporativo` ou `pendente`.

```yaml
epic_ready:
  - problem_statement.valid
  - outcome.valid
  - kpis.count >= 1
  - personas.count >= 1
  - scope.in.not_empty
  - scope.out.not_empty
  - critical_risks.unowned == 0
```
