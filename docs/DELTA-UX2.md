# NEXO — DELTA-UX2 (seed rico + gates stepper + menu Projetos + proposta seleção de projetos)

## 0. Diagnóstico (5 bullets)

1. **Seletor Topbar minúsculo sem status/busca** — sintoma: em `src/components/layout/Topbar.vue` o projeto atual é um `label "Projeto" + select max-w-44` com apenas o título, sem dot de cor, sem mini-stepper, sem busca e sem contadores → impacto: o usuário não sabe em qual gate o projeto está nem encontra projetos quando a lista crescer; o controle some visualmente entre logo, breadcrumb, busca ⌘K e `ImpactBanner`.
2. **Home galeria com cards pobres** — sintoma: em `src/views/HomeView.vue` cada card mostra só título, descrição, uma linha `Épico · N nós · N arestas · resumo textual de gates · owner` e dois botões, sem stepper visual, sem contadores de pendências/stale, sem filtro/busca/ordenação → impacto: com 2+ projetos a descoberta degrada para leitura linear; não dá para comparar saúde dos projetos nem retomar o mais recente.
3. **Sidebar plana sem hierarquia projeto vs global** — sintoma: em `src/components/layout/Sidebar.vue` há um `nav` solto (Visão/Canvas/Backlog/Studio) + seção `GATES` (G0–G5) + link Usuários + `role-switch`, tudo no mesmo nível, sem seção PROJETO e sem submenu indentado → impacto: o usuário não distingue o que é do projeto atual (Visão/Backlog/Canvas/Studio/Gates) do que é global (Usuários); trocar de contexto não tem âncora visual.
4. **Gates com emoji cadeado sem conector stepper nem explicação clicável** — sintoma: em `Sidebar.vue:134-136` o estado bloqueado renderiza o emoji `🔒` como texto (`{{ estadoGate(gid) === 'bloqueado' ? '🔒' : ... }}`), sem linha conectora vertical, sem dot/pill de progresso, com a explicação só no `title` (tooltip nativo, inacessível no teclado/mobile) → impacto: a sequência G0→G5 não é percebida como funil; o usuário não entende por que G3–G5 estão travados nem como destravar.
5. **Breadcrumb sem contexto de projeto/gate atual** — sintoma: `src/stores/useProject.ts` monta `breadcrumb` como `[projetoTitulo, epicoTitulo, Feature?, PBI?, Implementação?]` a partir de `useProjects().atual` com fallbacks hardcoded (`Cobranças`/`Pagamento por Pix`), sem segmento clicável de projeto que abra o switcher e sem indicar o gate atual → impacto: perdido no Canvas/Studio o usuário não sabe de qual projeto aquele grafo é, nem em que gate está; o primeiro segmento leva a `/` (galeria) em vez de ancorar o contexto.

## 1. Seed rico + Copilot conversacional (pedido 1)

### 1.1 O que o seed atual JÁ tem e o que FALTA

**O que `src/data/seed.ts` JÁ tem (lido na íntegra, 268 linhas):**

- 1 épico `ep-pix` ("Pagamento por Pix", `gate: G1`, `status: approved`, `baseline: 1`, KPI "Adoção Pix", `x: 600, y: 40, z: 0`).
- 4 features com textos EXATOS do PNG: `ft-pagar` ("Pagar fatura com Pix…simples e segura.", 3 contribuidores), `ft-confirmar` ("…apenas uma vez, evitando transações duplicadas.", 5 contribuidores), `ft-criar` ("…QR Code para o pagador.", 2 contribuidores), `ft-status` ("…para o cliente.", 2 contribuidores, `status: stale`, `causa_stale: 'regra de confirmação alterada'`, `versao: 2`).
- 3 arestas: `e1 ft-pagar→ft-confirmar (consome)`, `e2 ft-criar→ft-confirmar (consome)`, `e3 ft-confirmar→ft-status (impacta)`.
- 7 usuários (`u-pm/u-ux/u-arq/u-tl/u-dev/u-qa/u-sec`, todos com `projeto_ids: ['proj-cobrancas']`).
- `seedGates`: G0/G1 `aprovado` com `baselineVersao: 1`, G2 `revisao`, G3–G5 `rascunho`; mais `gatesZerados()` e `seedMultiProjeto()` (pacote Cobranças completo para `useProjects`).
- Positions `x/y/z` replicando o PNG (pagar 120/220/1, confirmar 480/330/2, criar 840/220/3, status 480/590/4).

**O que FALTA para VER as features e CRIAR via Copilot:**

- (a) **Checklist G2 avaliável por feature.** Regras lidas em `src/utils/gates.ts`: `FTR-001` (ator + descrição), `FTR-002` (fluxo_feliz ≥ 10 chars), `FTR-007` (bloqueante, ≥ 1 BDD), `FTR-004` (owner), `FTR-008` (aviso, ≥ 1 alternativo). Diagnóstico honesto do seed atual: `ft-pagar`, `ft-confirmar` e `ft-criar` PASSAM em FTR-001/002/007 (têm ator, fluxo longo e 1 BDD cada: AC-001/AC-010/AC-020); **`ft-status` FALHA em FTR-007** (`criterios_bdd: []`) — é o caso didático certo, mas hoje parece bug em vez de exemplo; e `ft-pagar`/`ft-criar`/`ft-status` falham no aviso `FTR-008` (`alternativos: []`, só `ft-confirmar` tem alternativo). Proposta: completar no seed — `ft-status` ganha 1 BDD (`AC-030`: given "cobrança confirmada com idTx", when "cliente abre o status", then "exibe pago com idTx e horário") mantendo `status: stale` (o stale continua vindo da causa, não da falta de BDD); `ft-pagar` e `ft-criar` ganham 1 alternativo cada (ex.: "PSP fora do ar → exibe erro com tentar de novo"; "QR expirado → permite regenerar"); `ft-confirmar` já está completo e vira referência.
- (b) **1–2 PBIs de exemplo ligados a `ft-confirmar`** para o fluxo macro→detalhe existir: `pbi-idtx` ("Dedup por idTx no webhook", `feature_id: ft-confirmar`, aresta `realiza` → `ft-confirmar`, BDD AC-010 reutilizado, `estrategia_teste: 'contrato + request'`) e `pbi-status` ("Polling de status pós-confirmação", aresta `realiza` → `ft-status`). Sem isso, Backlog/Gate G4 ficam vazios e o nível PBI do breadcrumb nunca tem conteúdo.
- (c) **Filtro default mostrando as 4 features.** Hoje `BacklogView`/`CanvasView` iniciam com `filtroEstado = ''` (correto), mas qualquer filtro legado persistido em `nexo.v1.ui` pode esconder nós; proposta: seed/normalização que zera `buscaTexto/filtroEstado/filtroOwner` na primeira carga e GateView G2 com `alvoId` default = primeira feature (em vez de select vazio), de modo que Backlog + Canvas + Gate G2 exibam as 4 features sem clique prévio.
- (d) **Positions já OK** (`x/y/z` lidos acima) — manter; novos PBIs entram em `(840, 590)` e `(120, 590)`, `z: 5/6`, sem mover os 4 existentes.

### 1.2 O que falta no Copilot

**O que `src/ai/copilot.ts` (181 linhas) JÁ tem:** `interpretarCopilot(input, nos)` com intents `ajuda`, `pendências do gate G(n)`, `ligar A a B como <tipo>` (default `realiza`), `mudar status de X para <estado>` (mapa PT-BR→status + validação), `criar <tipo> <título> [ligado a/em X]` (10 tipos, PBI default `realiza`, demais `contem`), fallback pergunta-sobre-nó (fato/inferência/pendência) e `buscarPorNome` (igual → contém → id). Falta: (1) tornar os 6 comandos do pedido garantidos com exemplos literais testáveis; (2) amarrar cada execução a nó/aresta REAL via `useGraph.criarNo/criarAresta/aplicarStatus` + `ProposePatch` + Aceitar explícito — hoje o `DetailPanel` já faz isso na aba Copilot via `acaoPendente`, mas o comando `criar pbi` não preenche `feature_id`/`gate: G4`, e `listar pendências` retorna texto genérico em vez da lista real de checks reprovados.

**Intents obrigatórios (regex sobre texto normalizado sem acento, caixa-insensível):**

| # | Frase literal (teste) | Intent/regex | Ação REAL |
|---|---|---|---|
| 1 | `criar feature Notificação` | `cria\w*\s+(feature\|funcionalidade)\s+(.+)` | `criarNo({tipo:'feature', gate:'G2'})` + patch título/descrição + Aceitar cria e seleciona |
| 2 | `criar feature Lembrete ligada a Pagar fatura com Pix` | sufixo `ligad[oa]\s+(a\|em)\s+(.+)` → `buscarPorNome` + `criarAresta(ref, novo, 'contem')` | nó + aresta `contem` |
| 3 | `criar pbi Dedup por idTx` | `cria\w*\s+pbi\s+(.+)` (sem "ligado" → sem aresta, `gate:'G4'`, `feature_id` vazio com pendência explícita) | `criarNo({tipo:'pbi', gate:'G4'})` |
| 4 | `ligar Status de pagamento a Confirmação idempotente como realiza` | `ligar\s+(.+?)\s+a\s+(.+?)(\s+como\s+(\w+))?` + `acharEdgeTipo` ∈ {contem,realiza,consome,valida,restringe,impacta} | `criarAresta(de, para, tipo)` + auditoria |
| 5 | `mudar status de Status de pagamento para review` | `(mudar\|alterar\|atualizar)\s+status\s+(de\|do\|da)?\s*(.+?)\s+para\s+(.+)` + mapa PT-BR | `aplicarStatus(id, 'review')` (v+1 + auditoria) |
| 6 | `listar pendências do gate G2` | `pendencias?.*gate\s*(g[0-5])` | enumera `avaliarGate(n)` reprovados das features (código + título), não texto genérico |
| 7 | `ajuda` | `^(ajuda\|help\|comandos)` | lista os 6 exemplos acima |

**Resposta sempre rotulada:** `Fato:` (o que existe no grafo) / `Inferência:` (ex.: sem BDD → provavelmente bloqueia FTR-007) / `Pendência:` (ex.: título ambíguo, `feature_id` vazio) — padrão já usado no fallback de pergunta-sobre-nó, estender a todos os intents. Nunca aplica direto: toda ação passa por `acaoPendente` (Confirmar/Descartar) e mutações de campo passam por `ProposePatch` + Aceitar.

**Arquivos-alvo:** `src/data/seed.ts` (BDD/ator/fluxo de `ft-status` + 2 PBIs + positions), `src/ai/copilot.ts` (intents 1–7 + pendências reais), `src/components/canvas/DetailPanel.vue` (aba Copilot: `feature_id` no criar-PBI + lista de pendências clicável), `src/stores/useGraph.ts` (`criarNo/criarAresta` já existem — reusar, sem duplicar).

## 2. Gates como STEPPER (pedido 2)

### 2.1 Sidebar vertical G0→G5 com conector CSS

Estrutura por step (dentro do `nav[aria-label="Gates"]`, que ganha `aria-label="Progresso de gates"`): cada item é `RouterLink` relativo com um `span.conector` absoluto (`border-l-2`, `left: 27px`, do dot ao próximo item; último sem conector) + `span.dot` absoluto (12px, borda 2px da cor do estado, fundo superfície, centralizado no pill) + conteúdo atual (pill sigla + rótulo + ícone SVG de estado à direita). Tokens (anexar em `design.md`):

- **concluído/aprovado:** texto `#15803D`, fundo `#F0FDF4`, borda `#BBF7D0`, dot preenchido `#15803D`, ícone check SVG inline (círculo + check, 16px, `stroke="currentColor"`).
- **atual (desbloqueado, não aprovado):** texto `#1D4ED8`, fundo `#EFF6FF`, dot `#1D4ED8` com anel pulsante (`animate-ping` num `span` irmão + `@media (prefers-reduced-motion: reduce)` desligando a animação, mantendo o dot sólido).
- **bloqueado:** texto `#64748B`, fundo `#F1F5F9`, dot vazado cinza, ícone cadeado **SVG inline** (nunca emoji — remover o `🔒` de `Sidebar.vue:135`); o item continua clicável e abre popover/tooltip focável com pré-requisito (`Aprove G(n-1) primeiro`) + link `Ir para G(n-1)`.
- **revisão:** texto `#B45309`, fundo `#FFFBEB`, borda `#FDE68A`, ícone alerta SVG (triângulo + `!`), dot âmbar.

### 2.2 Stepper horizontal no topo de GateView/Backlog

`ol` horizontal com `li` por gate (sigla + rótulo curto), setas conectoras via `::after` (`›` em `text-nexo-muted`, `aria-hidden`), scroll-x com `overflow-x-auto` e `snap` abaixo de 768px, `aria-current="step"` no gate atual, bloqueados com `aria-disabled="true"` mas clicáveis (levam ao GateView que explica). GateView usa tamanho normal; Backlog usa variante compacta (só dots + sigla, com `title`).

### 2.3 A11y

`nav[aria-label="Progresso de gates"]` > `ol` > `li` (um por gate); atual com `aria-current="step"` (sidebar: `aria-current="page"` continua no link da rota ativa — os dois coexistem); bloqueados com `aria-disabled="true"` + `aria-describedby` apontando o motivo; foco visível (`outline 2px #1D4ED8`); contraste ≥ 4.5 em todos os pares (verde #15803D/branco, azul #1D4ED8/branco, cinza #64748B/#F1F5F9, âmbar #B45309/#FFFBEB — todos passam).

### 2.4 Reuso de regra (não duplicar)

`ORDEM_GATES`, `gateDesbloqueado(gateId, gates)` e `gateAnterior(gateId)` já existem em `src/utils/gates.ts` (linhas 180–199) e `useGate.aprovarGate` já checa sequencial primeiro (linhas 113–125) — o stepper consome essas funções puras tanto na Sidebar quanto no `GateStepper.vue`; nenhuma cópia da ordem em componente.

**Arquivos:** `Sidebar.vue` (stepper vertical), `GateView.vue` (stepper horizontal no topo), `BacklogView.vue` (stepper compacto), novo `src/components/gates/GateStepper.vue` (`props: { orientation: 'vertical'|'horizontal', compact?: boolean }`), `utils/gates.ts` (nada a adicionar — ORDEM já existe; só documentar), `design.md` (anexar tokens do §2.1).

## 3. Menu Projetos + submenu (pedido 3)

**Reestruturação da Sidebar em 3 seções (ordem fixa):**

1. **PROJETO** — `Project Switcher` card (detalhe no item 4a): dot de cor por projeto + título + mini-stepper G0–G5 (6 dots) + owner/contagem; dropdown com busca. É o único lugar de troca de projeto.
2. **DO PROJETO** — submenu indentado (`ml-4 border-l border-nexo-border pl-3`): Visão, Backlog, Canvas, Studio. Rotas NÃO mudam (`/`, `/backlog`, `/canvas?view=…`, `/studio-full`); o submenu só agrupa visualmente. Sem projeto selecionado (`useProjects.atual == null`): itens com `aria-disabled="true"`, classe cinza, tooltip "Selecione um projeto" e clique interceptado (não navega).
3. **GATES** — stepper do item 2 (G0–G5).
4. **GLOBAL** — Usuários (`/usuarios`, sempre ativo).

**Guard sem projeto:** `router/index.ts` ganha `beforeEach` que lê `useProjects().atual`; se `null` e a rota for `/backlog`, `/canvas`, `/gates/*` ou `/studio-full`, a navegação é permitida mas a view renderiza `EmptyState` ("Nenhum projeto selecionado" + CTA "Selecionar/criar projeto" → `/`) em vez do grafo/tabela vazios. Sem redirect forçado (preserva deep-link: ao criar/selecionar, o usuário pode voltar). `/` e `/usuarios` nunca bloqueiam.

**Topbar sem select:** remover o `label "Projeto" + select` de `Topbar.vue:93-102` (e a função `trocarProjeto` local); Topbar vira só logo + breadcrumb (com projeto atual como raiz) + busca ⌘K + `ImpactBanner`. A troca passa a existir só no switcher da sidebar + Home.

**Arquivos-alvo:** `Sidebar.vue` (3 seções + submenu + switcher), `router/index.ts` (guard `beforeEach`, sem mudar paths), `Topbar.vue` (remover select e `trocarProjeto`, manter breadcrumb/busca/ImpactBanner), `views/*` (`EmptyState` quando `!atual`), `stores/useProjects.ts` + `useProject.ts` (fonte única: `useProjects.atual`; `useProject` segue derivado).

## 4. PROPOSTA seleção de projetos (pedido 4 — está muito ruim)

**Por que NÃO manter o select no Topbar:** (problema → solução) o Topbar tem 4 concorrentes por espaço (logo, breadcrumb, busca 300px, alerta) → o select foi espremido em `max-w-44` sem status; (status invisível → card dedicado) gate/contadores não cabem num `option`; (fora do contexto → sidebar) troca de projeto é navegação estrutural, não ação de cabeçalho — pertence ao eixo de navegação, sempre visível.
**Por que sidebar + Home:** (contexto sempre visível → switcher na sidebar) o projeto atual aparece em 100% das telas sem ocupar o Topbar; (descoberta → Home rica) comparar/criar projetos é tarefa de galeria, não de dropdown.

### (a) Project Switcher na sidebar

Decisão: card fixo no topo da seção PROJETO (sempre visível, mesmo com sidebar rolada) — problema "projeto atual invisível" → solução "âncora persistente".

```
┌ PROJETO ────────────────────┐
│ ● Cobranças            ▾     │  <- dot cor do projeto + título + chevron
│ G0 G1 G2 G3 G4 G5           │  <- mini-stepper: ● ● ○ ○ ○ ○ (6 dots)
│ Paula · 5 nós · G2 revisão  │  <- owner + contagem + gate atual
│ ┌ dropdown ───────────────┐ │
│ │ [buscar projeto…      ] │ │  <- input filtra por título
│ │ ● Cobranças  G1✓ G2… 2d │ │  <- status agregado + atualizado em
│ │ ○ Novo Pix   G0…     5h │ │
│ │ + Novo projeto (G0)     │ │  <- abre dialog G0 inline (HomeView reuse)
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

Comportamento: clique no card alterna o dropdown (Esc fecha, foco retorna ao card); digitar filtra; Enter no item seleciona (`selecionar` + `trocarProjeto` de grafo/gates + breadcrumb reseta) e fecha; "Novo projeto (G0)" abre o mesmo dialog G0 da Home (componentizar `ProjectCreateDialog.vue` e reusar nos dois lugares).

### (b) Home "Projetos" rica

Decisão: cards comparáveis com mini-stepper e filtros — problema "cards pobres sem comparação" → solução "densidade de status por card".

```
┌ Cobranças ────────────────────────┐ ┌ Novo Pix ────────┐
│ Cobranças via Pix (2 linhas…)     │ │ ...              │
│ ● ● ○ ○ ○ ○  G0✓ G1✓ G2 revisão   │ │ ○ ○ ○ ○ ○ ○      │
│ 5 nós · 3 arestas · 1 stale       │ │ 1 nó · 0 ares…   │
│ Paula · atualizado há 2 dias      │ │ Tina · há 5h     │
│ [Abrir projeto] [Abrir Canvas]    │ │ [...]            │
└───────────────────────────────────┘ └──────────────────┘
[busca texto…] [status: todos▾]  orden: recentes ▾
EmptyState: "Nenhum projeto ainda — Crie o primeiro (G0)" + CTA
```

Filtros: texto (título/descrição) + select status (todos/ativo/stale/bloqueado); ordenação "recentes" por `updatedAt`; contadores lidos dos namespaces (`nexo.v1.graph.<id>`, gates) sem carregar o grafo inteiro.

### (c) Topbar sem select

Decisão: Topbar com 3 peças — problema "select espremido" → solução "cada peça no seu eixo".

```
[NEXO]  Cobranças › Pagamento por Pix › Feature   [Buscar ⌘K 300px] [⚠ Impacto›]
        ^ projeto atual = raiz do breadcrumb (clica → Home)
```

Projeto atual continua visível como raiz do breadcrumb (navega para `/`); busca e alerta inalterados.

## 5. Matriz arquivos-alvo

| Arquivo | Mudança | Item (1–4) | Risco | Depende de |
|---|---|---|---|---|
| `src/data/seed.ts` | BDD/alternativos `ft-status`/`ft-pagar`/`ft-criar` + 2 PBIs exemplo + filtro default G2 | 1 | baixo | — |
| `src/ai/copilot.ts` | 7 intents PT-BR + pendências reais via `avaliarGate` | 1 | médio | seed rico |
| `src/components/canvas/DetailPanel.vue` | aba Copilot: `feature_id` no criar-PBI + pendências clicáveis | 1 | baixo | copilot.ts |
| `src/stores/useGraph.ts` | reusar `criarNo/criarAresta` (sem duplicar); `feature_id` default | 1 | baixo | — |
| `src/components/gates/GateStepper.vue` | novo, `orientation` vertical/horizontal + `compact` | 2 | médio | `utils/gates.ts` (pronto) |
| `src/components/layout/Sidebar.vue` | stepper vertical + 3 seções + switcher + remover emoji | 2, 3, 4 | médio | GateStepper, useProjects |
| `src/views/GateView.vue` | stepper horizontal + `aria-current=step` | 2 | baixo | GateStepper |
| `src/views/BacklogView.vue` | stepper compacto + guard EmptyState | 2, 3 | baixo | GateStepper |
| `src/components/layout/Topbar.vue` | remover select + `trocarProjeto`; breadcrumb com raiz | 3, 4 | baixo | useProjects |
| `src/router/index.ts` | guard `beforeEach` (EmptyState, sem mudar paths) | 3 | médio | useProjects |
| `src/views/HomeView.vue` | cards ricos + filtros + `ProjectCreateDialog` reuse | 4 | médio | useProjects |
| `src/components/projects/ProjectSwitcher.vue` | novo (card + dropdown + busca) | 4 | médio | useProjects, gates |
| `src/components/projects/ProjectCreateDialog.vue` | novo (extrair dialog G0 da Home) | 4 | baixo | useProjects |
| `views/*` (Canvas/Studio/Gates) | `EmptyState` quando `!atual` | 3 | baixo | guard |
| `design.md` | anexar tokens stepper + switcher | 2, 4 | baixo | — |
| `src/stores/useProjects.ts` + `useProject.ts` | fonte única `atual`; submenu desabilitado sem projeto | 3 | baixo | — |

## 6. Ordem de execução 1–6 p/ Forja (sem reescrever o que funciona)

1. **Seed rico** (`seed.ts`: BDD AC-030 em `ft-status`, alternativos em `ft-pagar`/`ft-criar`, PBIs `pbi-idtx`/`pbi-status` com arestas `realiza`, filtro default zerado) — done: Backlog + Canvas + Gate G2 exibem as 4 features + 2 PBIs, checklist G2 avaliável com códigos FTR-001/002/004/007/008.
2. **Copilot intents PT-BR** (`copilot.ts` + aba Copilot: 7 intents, `feature_id` no PBI, pendências reais clicáveis) — done: `criar feature Teste` digitado cria nó real após Aceitar e o nó aparece no Canvas/Backlog.
3. **GateStepper.vue + Sidebar stepper + tokens** (conector CSS, 4 estados, SVG check/cadeado/alerta, zero emoji, `prefers-reduced-motion`) — done: linha conectora visível G0→G5, bloqueado cinza clicável abrindo popover com pré-requisito + link.
4. **Stepper horizontal GateView/Backlog + a11y** (`ol/li`, `aria-current="step"`, `aria-disabled`, scroll-x < 768, foco visível) — done: navegação por teclado completa, mobile com scroll sem quebrar layout.
5. **Menu Projetos + guard + remover select Topbar** (3 seções, submenu indentado `ml-4 border-l`, `beforeEach` com EmptyState, Topbar só breadcrumb/busca/alerta) — done: sem projeto o submenu desabilita com tooltip e as views mostram EmptyState + CTA; rotas inalteradas.
6. **Project Switcher + Home rica** (busca no dropdown, `ProjectCreateDialog` reuse, cards com mini-stepper/contadores/filtros) — done: busca filtra a lista, Novo projeto G0 cria e seleciona, cards exibem stepper + pendências. Cada passo: `vue-tsc --noEmit` + `vite build` verdes + commit pequeno + regressão E2+E3 (toolbar 11 ações, Copilot, Propor/Aceitar, prompt/share/PNG, gates, impacto, backlog/usuários/busca).

## 7. Critérios da Lupa

Verificação manual no dev `http://127.0.0.1:5173/`:

- **Seed:** as 4 features + 2 PBIs visíveis em Backlog, Canvas (`/canvas?view=canvas`) e GateView G2/G4; checklist G2 exibe códigos `FTR-001/002/004/007` ✔ e `FTR-008` com dispensa; `ft-status` com BDD AC-030 mas `stale` pela causa (não por falta de BDD).
- **Copilot (5 frases literais):** `criar feature Notificação` → nó criado após Confirmar; `criar pbi Dedup por idTx ligada a Confirmação idempotente` → PBI + aresta `realiza`; `ligar Status de pagamento a Confirmação idempotente como realiza` → aresta azul; `mudar status de Status de pagamento para review` → v+1 + auditoria; `listar pendências do gate G2` → lista real (ex.: FTR-008 em `ft-pagar`); `ajuda` → os 6 exemplos.
- **Stepper:** Sidebar com linha conectora contínua, dots verde/azul/cinza/âmbar, ícones SVG (zero `🔒`/emoji), bloqueado clicável com popover "Aprove G(n-1) primeiro" + link; GateView/Backlog com stepper horizontal `ol` + `aria-current="step"`; < 768px com scroll-x.
- **Menu:** Sidebar com 3 seções (PROJETO / DO PROJETO indentado / GATES + GLOBAL Usuários); sem projeto, submenu `aria-disabled` com tooltip e views com EmptyState + CTA; `router/index.ts` sem path alterado (só guard).
- **Switcher:** card com dot + mini-stepper 6 dots + owner/contagem; dropdown com busca que filtra; `Novo projeto (G0)` cria e seleciona; Topbar sem `select` (só breadcrumb com raiz + busca + alerta).
- **Regressão:** E2+E3 intactos (11 ações da toolbar, Copilot cria, Propor→diff→Aceitar v+1, prompt/share/PNG reais, gates bloqueiam, impacto marca stale/reverte, backlog inline, usuários CRUD, busca ⌘K); `vue-tsc --noEmit` + `vite build` verdes; zero emoji na UI; zero botão fake.
