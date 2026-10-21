# Contratos das skills de refinamento por Gate

Esta é a especificação de comportamento para o roteiro de entrevista do NEXO. As skills leem estado e validadores existentes; não aprovam baseline, não alteram status de entrega e não declaram evidência verificada.

| Gate | Foco da entrevista | Evidência/campo que precisa ser informado | Próxima etapa |
|---|---|---|---|
| G0 — Enquadramento | Dor observável, pessoas afetadas, hipótese/KPI, responsável, escopo e riscos | Fonte e natureza da afirmação (fato, hipótese, evidência ou decisão pendente); alvo do KPI precisa ter unidade e janela | Revisão humana de Negócio/PM; depois decompor o épico em outcomes/features |
| G1 — Épicos | Outcome, benefício mensurável, escopo e riscos | KPI ligado ao épico, objetivo e limites dentro/fora do escopo | Criar uma feature filha em rascunho, confirmar vínculo e owner |
| G2 — Features | Atores/benefício, fluxo, regras e fontes, autorização, estados, integrações, BDD e alternativos | Regras precisam ter origem declarada; fonte continua sendo declaração até verificação; policy deve identificar recurso/ação | Decompor em PBIs após arquitetura suficiente |
| G3 — Arquitetura | Integrações/contratos, ADR, persistência, privacidade, NFRs e ameaças | Decisões, riscos e referências precisam ser explicitamente fornecidos; a skill não gera resultados de scanner ou contrato | Criar PBI filho draft ligado à feature de origem |
| G4 — PBIs | Aceite, owner, dependências, estratégia de testes, contrato e rollback | Dependência vazia é válida somente com decisão explícita de que não há dependência; referências a CI/teste permanecem não verificadas | Preparar pacote G5 para o mesmo PBI sem alterar estado de entrega |
| G5 — Entrega | PR/merge, pipeline, testes/aceite, segurança, observabilidade e rastreabilidade | Links/IDs e resultados reais informados por pessoa; revisar status publicado/validado pelo validador e aprovadores | Auditoria de evidências; só aprovadores humanos concluem gate/baseline |

## Regras comuns

1. Fazer uma pergunta por vez, ligada a um código de validação, explicar por que importa e mostrar progresso, pendências e próximo passo.
2. Exibir separadamente o que foi registrado como fato, hipótese, referência de evidência e decisão pendente. Referência fornecida pelo usuário é uma alegação até checagem humana ou integração confiável.
3. Coach determinístico pode apresentar o próximo critério e explicar o validador. Ele não é LLM. Uma chamada real só é rotulada com provider/model obtido em runtime; falhas mostram erro e permitem retry.
4. Resposta conversacional, output de modelo e exemplos educativos não são fatos nem patch. O formulário tipado produz diff somente com campos fornecidos, versão-base e opção humana de aceitar/rejeitar.
5. Aceitar diff só altera dados; checklist é reexecutado e aprovação segue quorum e SoD. Nenhuma skill cria baseline ou muda item para `validated`/`published`.
6. Crianças do grafo só são criadas como rascunho, após ação humana explícita, via API do grafo e com `project_id` e relação pai válidos.

## Catálogo e contrato de execução

Os identificadores abaixo são contratos de comportamento desta aplicação, versão `1.0.0`. O roteiro determinístico compartilhado de critérios é implementado em `src/ai/gateSkills.ts`; ainda não existe registro de skills executáveis independentes nem catálogo editável em runtime.

| ID | Gate | Entrada mínima | Saída permitida | Ações e escalonamento |
|---|---|---|---|---|
| `discovery.facilitator` | G0 | alvo, ENQ-001..006, respostas humanas com natureza e referências | uma pergunta priorizada, lacunas e próxima decisão | ler objeto/checks, registrar nota; escalar para Negócio/PM; sem criação ou aprovação |
| `outcome.epic-refiner` | G1 | épico, EPC-001..006, baseline G0 e respostas do solicitante | perguntas sobre outcome/KPI/escopo, lacunas | ler e orientar; feature draft exige confirmação humana no GateView; escalar a Negócio/PM |
| `feature.validator` | G2 | feature, checks FTR-001..008, regras e referências declaradas | pergunta sobre uma lacuna, progresso e campos a revisar | nenhuma inferência de regra/fonte; policy/BDD só entram por formulário; escalar PM/UX/TechLead |
| `architecture.risk-reviewer` | G3 | feature e checks ARC-001..008, integrações/ADR declarados | perguntas sobre contrato, dados, NFR, ameaça e incerteza | não gera OpenAPI/scan/ADR; PBI draft exige clique humano após Gate 3; escalar Arquiteto/Segurança/TechLead |
| `pbi.readiness-reviewer` | G4 | PBI, feature de origem, checks de aceite, dependência, teste, contrato e rollback | lacunas e decisão explícita de dependências | não cria testes ou link de CI; dependência nenhuma/resolvida pede justificativa; escalar PO/Dev/QA |
| `delivery.evidence-auditor` | G5 | PBI reutilizado, evidência de PR/CI/teste/segurança/observabilidade | lista de evidências faltantes e pontos que precisam validação | nunca muda status para `validated`/`published`; referência é alegação até conferência; escalar Dev/QA/TechLead |

**Fontes permitidas:** objeto do projeto atual, critérios de `avaliarGate`, contexto de grafo do mesmo projeto, texto fornecido pelo usuário (marcado como declaração) e resultado de provider real identificado em runtime. Seed de demonstração só vale no projeto de demonstração. **Fontes proibidas:** outro projeto, exemplos do roteiro como fatos, inferência do modelo como evidência e outputs simulados.

**Envelope de saída planejado:** `{ skillId, version, projectId, targetId, baseVersion, question?, gaps[], notes[], proposal? }`. Cada proposta deve enumerar campos e valores explicitamente enviados no editor tipado, manter `baseVersion`, origem e estado de revisão; o diff precisa de aceite humano. O envelope não tem ação para aprovar gate/baseline/status.

## Referências normativas

- [Visão e princípios](../nexo-especificacoes/01-visao-e-principios.md)
- [Pessoas e permissões](../nexo-especificacoes/02-pessoas-e-permissoes.md)
- [Modelo de conhecimento](../nexo-especificacoes/04-modelo-de-conhecimento.md)
- [Gate 0](../nexo-especificacoes/05-gate-0-enquadramento.md), [Gate 1](../nexo-especificacoes/06-gate-1-epicos.md), [Gate 2](../nexo-especificacoes/07-gate-2-features.md)
- [Gate 3](../nexo-especificacoes/08-gate-3-arquitetura.md), [Gate 4](../nexo-especificacoes/09-gate-4-pbis.md), [Gate 5](../nexo-especificacoes/10-gate-5-entrega.md)
- [Agentes e skills](../nexo-especificacoes/11-agentes-e-skills.md), [Experiência conversacional](../nexo-especificacoes/12-experiencia-conversacional.md)

## Estado de implementação

Diagnóstico e roteiros dos seis gates vêm do catálogo de critérios e dos validadores. A tela oferece formulário Nova por código suportado e mostra o diff antes de aceitar; códigos sem schema não emitem patch genérico. A revisão é persistida localmente por projeto/alvo/gate; o quorum aplica-se às solicitações novas e versões registradas. A criação de feature/PBI rascunho e a preparação do mesmo PBI para G5 exigem ação humana e não geram evidência nem promovem status. Os contratos desta tabela orientam os fluxos, mas ainda não há registry de skills executáveis nem envelope versionado persistido. Trilha central multiusuário segue pendente.
