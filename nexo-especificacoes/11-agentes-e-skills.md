# 11 — Agentes e skills

## Catálogo mínimo

| Skill | Entrada | Saída | Escalonamento |
|---|---|---|---|
| Discovery Facilitator | ideia/G0 | perguntas e one-pager | ausência de objetivo |
| Product Strategist | G1 | KPI, valor, épicos | conflito de prioridade |
| Business Analyst | G1–G2 | regras e exceções | ambiguidade material |
| UX Flow Designer | G2 | fluxo/telas/estados | decisão de experiência |
| BDD/QA Analyst | G2–G5 | aceite e testes | cenário não testável |
| Domain Architect | G3 | ADR/C4/modelo | trade-off técnico |
| API Designer | G3 | OpenAPI e erros | contrato incompatível |
| Security Reviewer | G3–G5 | riscos e controles | alto risco/LGPD |
| Vue Engineer | G4–G5 | front e testes | padrão ausente |
| Ruby Engineer | G4–G5 | back e specs | regra de domínio ambígua |

## Contrato de uma skill

Uma skill tem: versão, instrução, schema de entrada/saída, fontes permitidas, política de confidencialidade, validadores, critérios de qualidade e regra de escalonamento humano.

## Roteamento

O roteador usa intenção, tipo do objeto, gate, papel do usuário e nível de risco. Ele nunca concede à skill acesso maior do que o usuário tem.

## Contrato técnico de uma skill

Cada skill DEVE declarar `id`, versão semântica, gates permitidos, JSON Schema de entrada e saída, fontes permitidas, ações (`read`, `propose`, `generate`, `validate`), condições de escalonamento humano, validadores de qualidade e classes de dado permitidas.

## Catálogo acionável sugerido

| ID | Entrada | Saída | Limite de autonomia |
|---|---|---|---|
| `discovery.facilitator` | ideia/contexto | perguntas e one-pager | não define orçamento/prioridade |
| `product.outcome_designer` | problema/KPI | épico e hipótese de valor | não inventa meta sem owner |
| `business.rule_analyst` | conversa/documentos | regras, exceções, glossário | não trata inferência como fato |
| `ux.flow_designer` | persona/regras | jornada, telas e estados | não aprova UX final |
| `quality.bdd_author` | fluxo/regra | BDD testável | não aceita comportamento ambíguo |
| `architecture.domain_designer` | feature/NFR | C4, entidades e ADR | não fecha trade-off sem arquiteto |
| `architecture.api_designer` | domínio/fluxo | OpenAPI e erros | não quebra compatibilidade sozinho |
| `security.threat_reviewer` | dados/API/fluxo | ameaças e controles | não aceita risco alto |
| `delivery.pbi_planner` | feature + G3 | PBIs e dependências | não define estimativa final |
| `engineering.vue_generator` | pacote aprovado | SFCs e testes | não faz merge/publicação |
| `engineering.ruby_generator` | pacote aprovado | Rails API e specs | não aplica migration destrutiva |
| `consistency.guardian` | subgrafo/contexto | conflitos e impacto | não sobrescreve baseline |

## Regras de acionamento e escalonamento

- Skills recebem somente dados que o solicitante pode ler e que o modelo está autorizado a processar.
- `propose` cria diff e nunca aplica mudança. `generate` só opera com gate e schema de entrada completos.
- Uma validação IA só bloqueia autonomamente quando a política é determinística; baixa confiança ou contradição gera aviso e escalonamento.
- Conflito de regra vai para PM/BA; dados pessoais/financeiros para segurança; contrato incompatível para arquiteto e donos consumidores; impacto alto para change approver; check de código falho para autor/tech lead.

Métricas por skill: completude do schema, rastreabilidade de fonte, aceitação sem edição, falsos bloqueios, falhas escapadas e latência. Baixa precisão reduz autonomia, nunca a amplia.
