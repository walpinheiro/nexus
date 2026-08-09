# 20 — Métricas e MVP

## Métricas

- Tempo da ideia até PBI pronto.
- % de épicos com persona, KPI, escopo e owner.
- % de PBIs reabertos por requisito incompleto.
- Cobertura de rastreabilidade: aceite → teste → código.
- Taxa de mudanças pós-G3 e impacto estimado versus real.
- Taxa de contribuição por área e tempo de aprovação por gate.

## MVP (12–16 semanas)

- Entra ID e RBAC básico.
- Projeto, épico, feature, PBI, versões e comentários.
- Canvas com navegação/zoom, breadcrumb, busca e painel de IA.
- Gates 0–2: entrevista, PRD, regras, BDD e aprovação.
- Grafo inicial e alerta de impacto.
- Exportação a Azure Boards/Jira e auditoria.

## Depois do MVP

G3 (OpenAPI/ADR/threat model), G4/G5 (pacote Vue/Ruby/sandbox/PR) e só depois cascata de geração assistida.

## Piloto

Uma squad, um épico real e representantes de negócio, UX, arquitetura, dev e QA. Medir qualidade do PBI e redução de retrabalho, não volume de texto gerado.

## Instrumentação obrigatória

Eventos de produto devem registrar criação/edição de objeto, envio e aprovação de gate, validação falha, proposta de IA aceita/editada/rejeitada, cálculo de impacto, execução de skill e geração técnica. Cada evento usa `project_id`, `object_id`, `version`, `actor_type`, `skill_id` quando aplicável e `correlation_id`.

O MVP deve estabelecer baseline de tempo ideia→PBI, reabertura por requisito e cobertura de rastreabilidade antes de comparar ganhos. Métricas de “linhas geradas” ou “quantidade de prompts” NÃO devem ser usadas como indicador de valor.
