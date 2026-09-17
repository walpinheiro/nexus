# NEXO — DELTA-PLANO (delta de escopo pós-E1 + port m3e-canvas para Vue)

## 0. Contexto

E1 APROVADO pela Lupa: shell + base OK, build verde. O shell (Topbar com logo, breadcrumb, busca, pill de impacto), a Sidebar (Visão/Canvas/Backlog + gates), os tipos (`src/types/nexo.ts`), o seed (`src/data/seed.ts` com projeto Cobranças, épico Pagamento por Pix e as 4 features com textos exatos do PNG) e as stores Pinia com persistência eager (`nexo.v1.*`) estão aprovados e não devem ser reescritos.

E2+E3 EM ANDAMENTO (Canvas + Painel) — MANTER e integrar, não reescrever:

- Toolbar do canvas com 11 ações funcionais (select, hand, connect, comment, zoom in/out, fit, tidy, novo nó, undo, redo).
- Copilot local rule-based em PT-BR que cria nós e arestas de verdade via texto (ex.: "criar feature X", "ligar A a B como realiza", "mudar status de X para review"), com confirmação explícita antes de executar.
- Propor/Aceitar diff versionado (ProposePatch → AcceptPatch, nova versão + evento de auditoria; Rejeitar descarta).
- Prompt output real derivado do grafo (todo ou seleção, alvo Vue/Ruby, PT/EN, textarea editável antes de copiar).
- Share-link com estado comprimido que reconstrói o canvas ao abrir.
- Export PNG do canvas via snapshot SVG.
- Gates com checklist bloqueante real + auditoria de tentativas.
- Impacto real (BFS sobre realiza/consome/valida/restringe/impacta, marca stale com causa + correlation_id, plano com aprovar por item/lote, aplicar e reverter).
- Backlog com tabela hierárquica + filtros + checklist + auditoria.
- Usuários com CRUD + role switcher derivando permissão.
- Busca global funcional (Ctrl/⌘K, `/`, Esc) navegando para o nó.

Stack permanece Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia, persistência localStorage, sem backend. NÃO instalar React/Next sob nenhuma hipótese. Todo comportamento novo é portado para Vue (comportamento inspirado, código original Vue).

Referência m3e (somente leitura, para port de comportamento):

- Diretório local: `C:\Users\walder\AppData\Local\Temp\opencode\m3e-ref\`
- Doc de referência: `docs/ref-m3e/agent.md`
- Formato Doc: `{ title, brief, frame, platform, paletteKey, theme, frames[], groups[] }`
- KIND_ORDER com 30+ kinds de parts
- Share-link `#docz=` (deflate-raw + base64url)
- Prompt-output (design inteiro ou 1 tela, com notes)
- Tidy, undo/redo, atalhos V/H, wheel, +/-, 0, Ctrl+Z, Ctrl+D, setas, Delete, P

Este DELTA-PLANO descreve apenas o delta. Em caso de conflito com E2+E3 já implementado, vale a regra integrar, não reescrever.

---

## 1. Seleção/criação de projetos

### 1.1 Objetivo

Sair do projeto único hardcoded (`proj-cobrancas`) para múltiplos projetos com escopo isolado, mantendo Cobranças intacto como exemplo. A Home deixa de ser um resumo do projeto atual e vira galeria de projetos.

### 1.2 HomeView vira galeria

- `src/views/HomeView.vue` lista cards de projetos: cada card exibe título, épico principal, contagem de nós/arestas, status agregado dos gates (ex.: "G1 aprovado · G2 em revisão"), data de atualização e usuário/owner.
- Botão "Novo projeto" abre o formulário G0 mínimo (seção 1.3) em dialog inline na própria Home (sem rota nova, sem biblioteca de modal: `div role="dialog" aria-modal="true"`).
- Clique no card define o projeto atual (`useProjects.selecionar(id)`), sincroniza `useProject`, e navega para o fluxo macro (Backlog do projeto). Cada card tem também botão secundário "Abrir Canvas" (deep-link com contexto, ver item 3).
- Estado vazio (zero projetos — cenário pós-limpeza total): EmptyState com texto em PT-BR + botão "Criar primeiro projeto".

### 1.3 Form G0 mínimo (criação)

Campos obrigatórios, todos em PT-BR, com validação bloqueante real:

| Campo | Regra bloqueante | Código |
|---|---|---|
| Contexto/dor observável | mínimo 30 caracteres | G0-001 |
| Público afetado | não vazio | G0-001 |
| Objetivo + métrica inicial | objetivo não vazio + métrica com nome | G0-001 |
| Restrições e não-objetivos | ao menos 1 item em cada lista | G0-002 (aviso alto se vazio: permite criar, marca pendência) |
| Owner | usuário existente selecionado | G0-003 |
| Classificação | `internal` / `confidential` / `restricted` (default `internal`) | — |

- G0 incompleto bloqueia a criação com o código exibido junto ao campo (ex.: chip vermelho "G0-001").
- Criação válida gera: projeto (`id = slug + sufixo`), épico inicial em rascunho G0 (título = objetivo resumido, `status: draft`, `gate: G0`), gates próprios zerados (G0 rascunho, demais bloqueados por sequência — ver item 2), grafo próprio contendo só o épico, auditoria própria com evento `ProjectCreated`.
- Seed mantém Cobranças como exemplo; "criar do zero" nunca clona Cobranças — gera apenas o épico inicial rascunho G0 descrito acima.

### 1.4 Seletor de projeto no Topbar

- `src/components/layout/Topbar.vue` ganha `select` persistido (valor = projeto atual), posicionado entre logo e breadcrumb, com `aria-label="Projeto atual"`.
- Trocar o select executa `useProjects.selecionar(id)`: troca grafo, gates, baseline, auditoria, breadcrumb e nível de zoom (reseta para `epico`) sem vazar dados entre projetos (stores recarregam do namespace do projeto; nada do projeto anterior permanece em memória reativa).
- O select mostra todos os projetos + contador de nós; a opção atual é desabilitada no dropdown da Home para evitar reseleção redundante.

### 1.5 Escopo por projeto (namespaces)

- Grafo: `nexo.v1.graph.<projectId>` (nós, arestas, selecionado, patches, auditoria do grafo).
- Gates: `nexo.v1.gates.<projectId>` (status por gate, baselines, tentativas).
- Baseline própria: `baselineVersao` por gate por projeto; aprovar G1 no projeto A não afeta o projeto B.
- Auditoria própria: eventos de projeto (criação, seleção, aprovação de gate) ficam no namespace do projeto; auditoria global mínima (`nexo.v1.projects`) registra apenas criar/remover/trocar projeto.
- UI global (`nexo.v1.ui`: sidebar, tema de ferramenta, preview) permanece global — não é por projeto. `currentUserId` (`nexo.v1.users`) também permanece global, mas permissões são avaliadas contra `projeto_ids` do usuário: usuário sem o projeto atual na lista não pode editar/aprovar (motivo exibido).

### 1.6 Migração sem perda

- `src/stores/useProjects.ts` (novo) contém `migrarLegado()`: na primeira carga, se existir `nexo.v1.graph` (formato antigo, sem sufixo) e ainda não existir `nexo.v1.projects`, move o conteúdo para `nexo.v1.graph.proj-cobrancas`, `nexo.v1.gates.proj-cobrancas`, registra o projeto Cobranças em `nexo.v1.projects` e remove as chaves antigas somente após confirmar escrita das novas (leitura de verificação). Qualquer falha aborta sem apagar o legado.
- `src/stores/useProject.ts` passa a ser visão derivada: lê `useProjects.atual` e expõe `projetoId/titulo/epico/nivel/breadcrumb`; `abrirNivel/aprofundar/subir` continuam com a mesma assinatura para não quebrar Canvas/Breadcrumb.
- `src/data/seed.ts` exporta `seedMultiProjeto()` retornando o projeto Cobranças completo (projeto + épico + 4 features + arestas + gates iniciais + auditoria `SeedLoaded`); usado tanto na primeira carga quanto no `resetSeed` (que restaura Cobranças e preserva projetos criados pelo usuário — reset total exige confirmação explícita em dialog com digitação do nome do projeto).

### 1.7 Arquivos-alvo

- `src/stores/useProjects.ts` (novo: CRUD de projetos, seleção, migração, namespaces).
- `src/stores/useProject.ts` (aponta para o projeto atual via useProjects).
- `src/views/HomeView.vue` (galeria + dialog G0 + EmptyState).
- `src/components/layout/Topbar.vue` (seletor persistido).
- `src/data/seed.ts` (seed multi-projeto + `seedMultiProjeto()`).

---

## 2. Gates SEQUENCIAIS com cadeado

### 2.1 Regra sequencial

`G(n)` só abre (permite submissão, proposta e aprovação) se `G(n-1)` estiver com `status: aprovado` E com `baselineVersao` registrada (não nula). Ordem total: `G0 < G1 < G2 < G3 < G4 < G5`. G0 é sempre desbloqueado (porta de entrada).

Exemplo concreto no seed: G2/Features fica desbloqueado somente porque G1/Épicos está aprovado com baseline; se o usuário reverter G1 para revisão (via patch aceito que mude status), G2 trava imediatamente em todas as vistas.

### 2.2 Sidebar mostra G0..G5

Hoje a Sidebar exibe apenas G1–G4 — corrigir para a lista completa:

- G0 Enquadramento, G1 Épicos, G2 Features, G3 Arquitetura, G4 PBIs, G5 Entrega.
- Cada linha mantém pill circular com sigla + rótulo; adiciona-se ícone de estado à direita (cadeado/check/aviso) sem remover o layout aprovado pela Lupa.
- Gate bloqueado é clicável (navega para o GateView, que explica o bloqueio) — nunca desabilitado na navegação; o que é desabilitado são as ações dentro dele.

### 2.3 Matriz estado → cor → ícone (tokens de `design.md`)

| Estado do gate | Cor | Ícone | Tooltip / texto |
|---|---|---|---|
| bloqueado (anterior sem baseline) | cinza `#64748B`, fundo `#F1F5F9` | cadeado | "Aprove G(n-1) primeiro — ver Gate G(n-1)" (link) |
| atual (desbloqueado, não aprovado) | azul `#1D4ED8`, fundo `#EFF6FF` | círculo/pill sólida | "Gate atual — checklist pendente" |
| aprovado (com baseline) | verde `#15803D`, fundo `#F0FDF4` | check | "Aprovado · baseline vX por Nome em DATA" |
| em revisão | azul-claro destaque `#EFF6FF` + borda `#BFDBFE` | olho/relógio | "Em revisão — aguardando aprovação" |
| com dependente desatualizado | âmbar `#B45309`, fundo `#FFFBEB` | aviso `⚠` | "N dependente(s) desatualizado(s) — ver Impacto" |
| rascunho (desbloqueado, sem submissão) | neutro `#475569` | círculo vazado | "Rascunho — preencha o checklist" |

A mesma matriz aparece na Sidebar, no GateView (cabeçalho) e nos cards da Home (versão compacta: cor + sigla).

### 2.4 GateView com gate bloqueado

- Se `gateDesbloqueado(gateId) === false`: botões "Aprovar gate" e "Propor alteração" renderizam desabilitados (`disabled` + `aria-disabled="true"` + `title` com o motivo); componente `BlockedReason` exibe pré-requisito ("Gate G(n-1) — Título — status atual"), o que falta ("baseline não registrada") e link "Ir para G(n-1)" (router-link real).
- Checklist ainda é visível (somente leitura) para planejamento; itens de dispensa (ver item 4) ficam desabilitados no modo bloqueado.
- Assim que o anterior é aprovado, a vista reage sem reload (computeds sobre `useGate.gates`).

### 2.5 Lógica (`utils/gates.ts` + `useGate.ts`)

- `utils/gates.ts`: nova função pura `gateDesbloqueado(gateId: GateId, gates: { id, status, baselineVersao }[]): boolean` + constante `ORDEM_GATES = ['G0','G1','G2','G3','G4','G5']`. Sem acesso a stores (testável por import direto).
- `useGate.ts`: `aprovarGate` passa a checar nesta ordem e nesta prioridade de mensagem: (1) sequencial → se bloqueado, registra tentativa negada com motivo "G(n-1) sem baseline" e retorna `{ ok: false }`; (2) papel permitido; (3) proponente ≠ único aprovador; (4) checklist bloqueante 100%. A primeira falha interrompe (mensagem única e acionável, sem lista genérica).
- Tentativa negada entra em `tentativas` + auditoria do projeto (`GateDenied` com `detalhe` = motivo + gate anterior). Regra proponente ≠ aprovador mantida integralmente.
- `BlockedReason.vue` (`src/components/gates/BlockedReason.vue`, novo): props `{ gateId, anteriorId, motivo }`; exibe ícone cadeado, motivo, pré-requisito e link; usado no GateView e reutilizável no Backlog.

### 2.6 Arquivos-alvo

- `src/components/layout/Sidebar.vue` (lista G0–G5 + matriz de estado).
- `src/views/GateView.vue` (modo bloqueado + BlockedReason + link anterior).
- `src/utils/gates.ts` (`gateDesbloqueado` + `ORDEM_GATES`).
- `src/stores/useGate.ts` (checagem sequencial primeiro + auditoria).
- `src/components/gates/BlockedReason.vue` (novo).

---

## 3. Canvas SOB DEMANDA + workflow macro → detalhe

### 3.1 Princípio

Home, Backlog e Gates formam o fluxo principal sequencial: lista macro → detalhe → aprofunda. O Canvas (grafo NEXO fiel ao PNG, com os 4 nós e arestas do seed) é uma vista de trabalho que se abre sob demanda — nunca o destino default ao abrir o app (que cai na Home/galeria).

### 3.2 Pontos de entrada ("Abrir Canvas" em ≥ 3 lugares)

1. Linha do Backlog: cada linha ganha botão "Abrir Canvas" que navega para `/canvas?view=canvas&selecionado=<id>` (seleciona o nó e abre o grafo).
2. GateView: botão "Abrir no Canvas" (usa o objeto atualmente selecionado no gate ou o primeiro alvo do gate).
3. Cards da Home: botão secundário "Abrir Canvas" por projeto (contexto = épico do projeto).
4. Atalhos preservados: duplo-clique num item navegável, rota direta digitada, e busca global (Enter abre no canvas).

### 3.3 Rota `/canvas` com query `view`

- `router/index.ts`: `/canvas` aceita `?view=canvas|contexto` (default `contexto`) + `?selecionado=<id>` (opcional, combinado com ambas).
- Sem param (`/canvas` puro) ou `view=contexto`: exibe seletor de contexto — dois selects (nível: Projeto/Épico/Feature/PBI + objeto do nível) + botão "Abrir grafo" (navega para `view=canvas` mantendo `selecionado`) + resumo do contexto atual (contagem de nós/arestas no nível). O grafo NÃO monta nesse modo (evita custo e preserves intenção macro→detalhe).
- `view=canvas`: monta `NexoCanvas` + DetailPanel + toolbar + minimap como hoje (E2+E3 preservado integralmente).
- Query params espelham a store (`selecionado`, nível via `useProject`) para deep-link: colar a URL restaura vista, seleção e nível.

### 3.4 Toggle "Grafo NEXO | Telas (Studio)" no CanvasView

- Tabs reais (não apenas visual) no topo do CanvasView: "Grafo NEXO" (default) e "Telas (Studio)".
- "Grafo NEXO" = canvas E2+E3 atual, intocado.
- "Telas (Studio)" = sub-aba que monta o Studio (item 5) no contexto do nó selecionado (o Studio abre com a tela inicial vinculada ao `selecionadoId` quando houver vínculo; sem vínculo, abre na primeira screen).
- O toggle sincroniza com a query (`?view=canvas` vs `?view=studio`) para que share-links e histórico do navegador distingam as duas vistas. Rota direta `/studio` redireciona para `/canvas?view=studio` (alias preservado para links externos e para o item 5).

### 3.5 Breadcrumb reflete nível e navega o zoom

- Formato: `Projeto › Épico › Feature › PBI` (segmentos além do nível atual não renderizam; ex.: no nível Épico, mostra `Cobranças › Pagamento por Pix`).
- Cada segmento é botão real que chama `useProject.subir(nivel)` (+ ajusta `view` para contexto quando o nível sai de Feature) e atualiza a query; o segmento atual usa `aria-current="page"` e não é clicável.
- Breadcrumb aparece no Topbar (global) e reflete `useProject.nivel`; mudar de projeto reseta para o nível do épico do novo projeto.

### 3.6 Arquivos-alvo

- `src/router/index.ts` (query `view`, alias `/studio`).
- `src/views/CanvasView.vue` (toggle + seletor de contexto + montagem condicional).
- `src/views/BacklogView.vue` (botão Abrir Canvas por linha).
- `src/views/GateView.vue` (botão Abrir no Canvas).
- `src/views/HomeView.vue` (cards com Abrir Canvas).
- `src/stores/useProject.ts` (breadcrumb navegável já existente — estender `subir/abrirNivel` para sincronizar query).

---

## 4. Edição EM TEXTO (sem mock, tudo via patch versionado)

### 4.1 DetailPanel ganha 4ª tab "Texto"

Ordem das tabs: Detalhes / Copilot / Impacto / Texto. A tab Texto contém formulário real vinculado ao nó selecionado:

- `textareas` para título (input simples, contador 5–140 com validação OBJ-001 em tempo real), descrição e `fluxo_feliz` (quando o nó for Feature; oculto com mensagem explicativa para outros tipos).
- Critérios BDD: um por linha no formato `Given | When | Then` (parser divide por `|`; linha malformada marca erro inline na linha, sem bloquear as demais; IDs `AC-xxx` auto-gerados na proposta, preservando IDs existentes quando a linha corresponde a um critério atual por igualdade de `given`).
- `regras_ids`: input CSV (separado por vírgula; espaços aparados; vazio = lista vazia).
- Botão "Propor" gera `ProposePatch` com tabela de → para (campo, valor atual, valor proposto, linhas removidas/adicionadas no BDD) — o diff é visível antes de qualquer aplicação.
- "Aceitar" aplica (nova versão + auditoria `AcceptPatch`); "Rejeitar" descarta (auditoria `PatchRejected`). Enquanto houver patch pendente no nó, o formulário trava com aviso (evita patches concorrentes; o usuário aceita/rejeita o pendente primeiro).
- Trocar de nó com formulário sujo abre confirmação nativa (`confirm`) — "Descartar alterações?" — sem biblioteca nova.

### 4.2 Backlog: edição inline

- Células título, descrição (truncada com expandir), owner (select de usuários do projeto) e gate (select G0–G5, respeitando sequência: gate futuro bloqueado não é oferecido) tornam-se editáveis por duplo-clique ou Enter com a linha focada.
- Enter confirma via `atualizarNo` (nova versão + auditoria `UpdateObject`); Esc cancela restaurando o valor; blur confirma somente se o valor mudou (evita versões vazias).
- Validação inline: título fora de 5–140 caracteres bloqueia a confirmação com mensagem na célula (sem toast genérico).

### 4.3 Gate checklists: dispensa de avisos

- Itens de severidade `aviso` ganham ação "Dispensar" que exige justificativa (mín. 20 caracteres) + owner + prazo (data futura); a dispensa é registrada na auditoria (`WaiverGranted`) e o item passa a exibir "dispensado por Nome até DATA".
- Itens `bloqueante` nunca são dispensáveis: o checklist exibe link direto "corrigir no objeto" (navega para o canvas com o nó selecionado e a tab Texto aberta) — correção acontece no objeto, nunca no checklist.
- Dispensa vencida (prazo passado) volta a reprovar automaticamente na próxima avaliação (computado, sem job: `new Date(prazo) < now` → `ok: false` com código original + sufixo `-EXP`).

### 4.4 Arquivos-alvo

- `src/components/canvas/DetailPanel.vue` (4ª tab Texto + parser BDD + tabela diff).
- `src/views/BacklogView.vue` (edição inline com Enter/Esc/blur).
- `src/components/backlog/GateChecklist.vue` (novo; ou seção dentro de GateView se o componente ainda não existir — extrair para componente dedicado e importar no GateView e no Backlog).

---

## 5. M3E-CANVAS STUDIO (port Vue — sem React/Next)

### 5.1 Posição e rota

- Nova rota `/studio` (vista completa) + sub-aba "Telas (Studio)" dentro do CanvasView via toggle (item 3.4). Ambas montam o mesmo `StudioView`; a rota direta é o alias canônico para links externos.
- O Studio edita telas (screens) de UI mobile/desktop; o Grafo NEXO edita conhecimento. O vínculo entre eles é o `selecionadoId`: o Studio pode ser aberto "a partir de" um nó (ex.: feature `ft-confirmar`), e o prompt do Studio cita o nó de origem. O Copilot NEXO NÃO cria parts do Studio (escopo separado; ver passo 7).

### 5.2 Tipos (`src/types/studio.ts`, novo — espelho do formato m3e)

```ts
interface StudioAction { to: string; transition: 'slide' | 'fade' | 'expand' | 'none' }
interface StudioItem { id: string; kind: string; label?: string; icon?: string; variant?: string; supporting?: string; note?: string; action?: StudioAction; toggle?: string; tabs?: string[]; selected?: number; size?: number; size2?: number; checked?: boolean; value?: number; src?: string; fill?: string; radiusTop?: boolean; radiusBottom?: boolean; noImage?: boolean; layout?: string; count?: number; corners?: number; x: number; y: number; w?: number; h?: number }
interface StudioGroup { id: string; x: number; y: number; axis: 'x' | 'y'; items: string[] }
interface StudioFrame { id: string; name: string; x: number; y: number; w: number; h: number; note?: string; bg?: string; swipe?: boolean; place?: string }
interface StudioDoc { title: string; brief?: string; frame: string; platform: 'android' | 'web'; paletteKey?: string; theme: { palette: string; scheme: string; type: string; radius: string }; frames: StudioFrame[]; groups: StudioGroup[]; items: StudioItem[] }
```

Campos opcionais preservam compatibilidade de leitura com docs m3e reais (ignorar desconhecidos, nunca quebrar). `x/y` em dp virtuais dentro do frame; frames posicionados no stage (x/y do frame no canvas infinito).

### 5.3 Store (`src/stores/useStudio.ts`, novo)

- Estado: `doc: StudioDoc`, `screenAtualId`, `selecionados: string[]`, `preview: boolean`, `zoom/pan` do stage.
- Persistência: `nexo.v1.studio` (doc inteiro + metadados de vista). Por projeto? Não nesta etapa: studio único global vinculado por `frame.place`/`note` ao nó NEXO de origem (vínculo frouxo por convenção, sem migração de namespace).
- Undo/redo ≥ 50 (snapshots de `doc`; mesma técnica do `useGraph`: pilha com limite, `beginDrag` para mover contínuo).
- Share COMPATÍVEL com o m3e original: `src/utils/studioShare.ts` com `encodeDoc(doc)` → `#docz=` + base64url(deflate-raw via `CompressionStream('deflate-raw')`, async com fallback síncrono simples) e `decodeDoc(hash)` que aceita `#docz=` (m3e) e `#doc=` (fallback JSON legado); `readShareHash` valida shape (`frames` array, `items` array, `theme` objeto) e retorna erro tipado para hash inválido (mensagem PT-BR, sem exceção estourada na UI).
- Seed do Studio: 2 screens iniciais ("Pagamento Pix" phone 412×892, "Checkout Web" desktop 1280×800) com parts que espelham as 4 features (topAppBar com título, cards com labels das features, button "Pagar com Pix" com action → segunda screen).

### 5.4 Paleta mínima (21 parts, todos arrastáveis)

button, fab, chip, topAppBar, bottomNav, tabs, searchBar, card, listItem, dialog, snackbar, textField, select, switch, checkbox, radio, slider, text, image, box, divider, loadingIndicator (+ navRail, toolbar, extendedFab se couber sem estourar o passo).

Cada entrada da paleta: kind, label PT-BR, ícone outline 1.5px, defaults de tamanho. Drag-from-palette: arrastar para o stage cria o item (com snap); duplo-clique na entrada da paleta cria no centro da screen atual.

### 5.5 Componentes

- `src/views/StudioView.vue`: layout (paleta esquerda, stage centro, inspector direita, toolbar topo, screens strip inferior).
- `src/components/studio/PartsPalette.vue`: busca por kind/label + drag-from-palette (HTML5 drag + fallback por clique-duplo).
- `src/components/studio/StudioStage.vue`: drag-move com snap 4px + guides (linhas de alinhamento temporárias), handles de redimensionar (cantos), multiselect (shift+clique + caixa), group/ungroup, z-order (frente/trás), Delete, duplo-clique edita label inline.
- `src/components/studio/StudioInspector.vue`: edita label, icon, variant, supporting, note, action (select de tela destino + transição), toggle/tabs/selected/checked/value conforme o kind; toda edição persiste + entra no undo.
- `src/components/studio/StudioPreview.vue`: modo tap-through clicável — actions navegam com transições slide/fade/expand/none (CSS, respeitando `prefers-reduced-motion`), botão voltar (histórico de telas visitadas), `P` alterna preview, Esc sai.
- `src/components/studio/PromptPanel.vue`: prompt PT-BR (alvo Web Vue default) do design inteiro ou de 1 tela (select), incluindo labels, notes, telas, actions e tema; textarea editável antes de copiar; botão copiar (clipboard real) + contador de caracteres.
- `src/components/studio/StudioToolbar.vue`: tidy (alinha seleção em grade 8dp + undo), undo/redo, zoom fit, preview P, export PNG (snapshot SVG do stage → `studio-<screen>.png`), export JSON (download do Doc), share-link copiar (`#docz=`).

### 5.6 Screens e navegação

- CRUD de screens: adicionar (phone 412×892 ou desktop 1280×800), renomear (inline), duplicar (copia items com novos ids), remover (com confirmação; remove actions que apontavam para ela, marcando `action.to` órfão como `none` + nota).
- Tap-to-navigate: item com `action.to` navega no preview com a transição declarada; swipe (nas screens com `swipe: true`) avança/volta entre screens irmãs via botões ‹ › e gesto horizontal (pointer events, sem lib).
- Strip de screens: miniaturas com nome + botão +/duplicar/renomear/remover; screen atual destacada.

### 5.7 Atalhos (mesmos do m3e, implementados no stage)

V (select), H (hand/pan), + / - (zoom), 0 (fit), Ctrl+Z (undo), Ctrl+Shift+Z (redo), Ctrl+D (duplicar seleção), setas (nudge 1dp, Shift = 8dp), Delete (remover seleção), P (preview), Esc (sair preview/limpar seleção). Escopo: ativos quando o foco está no stage (não dentro de inputs).

### 5.8 Restrições

- NÃO instalar React/Next. Sem `framer-motion`, sem `html-to-image` (PNG via snapshot SVG próprio como já feito no canvas NEXO), sem dependência nova sem aprovação: usar apenas Vue + Pinia + Tailwind + APIs web (`CompressionStream`, clipboard, canvas).
- Persistência exclusivamente localStorage (`nexo.v1.studio` + share por URL).

---

## 6. Ordem de execução p/ Forja (integrar E2+E3, não reescrever)

Regra de cada passo: `vue-tsc --noEmit` + `vite build` passando + commit pequeno + regressão dos 9 itens E2+E3 (toolbar 11 ações, Copilot, Propor/Aceitar, prompt, share, PNG, gates, impacto, backlog/usuários/busca).

- **Passo 1 — multi-projeto** (`useProjects` + migração + Home galeria + Topbar seletor). Done: 2 projetos coexistem, reload preserva ambos, Cobranças intacto (nós, posições, patches, auditoria). Nenhum import de E2+E3 muda assinatura.
- **Passo 2 — gates sequenciais** (`gates.ts gateDesbloqueado` + `useGate` checagem primeiro + Sidebar G0–G5 + GateView BlockedReason). Done: G2 bloqueado sem G1 baseline (cadeado + tooltip explicam), Aprovar desabilitado com motivo, tentativa negada na auditoria. Sequência G0→G5 percorrível no seed.
- **Passo 3 — canvas sob demanda** (router query `view` + CanvasView toggle Grafo|Telas + seletor de contexto + botões Abrir Canvas em Backlog/Gate/Home). Done: abrir o app cai na Home (não no canvas); deep-link `/canvas?view=canvas&selecionado=ft-status` restaura; breadcrumb clica e muda o zoom.
- **Passo 4 — edição em texto** (DetailPanel tab Texto + Backlog inline + checklist com dispensa de avisos). Done: editar título via tab Texto gera diff visível e só aplica no Aceitar (v+1 + auditoria); inline Enter confirma / Esc cancela; dispensa de aviso exige justificativa + owner + prazo.
- **Passo 5 — studio tipos + store + share compat** (`types/studio.ts` + `useStudio` + `utils/studioShare.ts`, teste contra link m3e real do diretório de referência). Done: link gerado abre no m3e original e link m3e abre no Studio (round-trip validado manualmente uma vez por direção).
- **Passo 6 — studio UI** (Palette + Stage + Inspector + screens + preview + prompt + tidy + atalhos + PNG/JSON). Done: 21 parts arrastáveis, inspector persiste, tap-through com transição, prompt PT-BR com conteúdo real, share/PNG/JSON funcionam.
- **Passo 7 — E4–E7 final** (Copilot segue NEXO — NÃO cria parts do Studio; prompt/share/PNG integrados nas duas vistas; regressão backlog+gates+users+busca; polish a11y: foco, aria, teclado, reduced-motion; build verde). Done: zero botão fake em qualquer vista; `npm run dev` + `build` verdes.

---

## 7. Critérios de aceite da Lupa por item

### (a) Projetos

- Criar projeto com G0 incompleto bloqueia exibindo o código (ex.: sem objetivo → "G0-001" junto ao campo).
- Projeto criado aparece na galeria; trocar de projeto troca grafo + gates + baseline sem vazar nenhum dado do anterior (verificar: nós do A ausentes no canvas do B; GateView do B mostra baselines do B).
- Reload mantém projeto atual, lista de projetos e conteúdo de cada um.
- Migração: perfil com chaves legadas (`nexo.v1.graph` sem sufixo) abre com Cobranças intacto e chaves novas criadas; perfil novo parte do seed sem executar migração.

### (b) Gates sequenciais

- Cada `G(n)` sem `G(n-1)` aprovado + baseline exibe cadeado + tooltip "Aprove G(n-1) primeiro" e mantém "Aprovar gate" desabilitado com o motivo visível (sem tooltip genérico).
- Sequência G0→G5 percorrível no seed do zero ao fim (aprovar em ordem libera o seguinte imediatamente, sem reload).
- Proponente único tentando aprovar sozinho é negado com mensagem específica; a tentativa consta na auditoria com ator, gate e motivo.
- Sidebar exibe G0..G5 (seis itens) com cores/ícones da matriz do item 2.3.

### (c) Canvas sob demanda

- Abrir o app (raiz `/`) cai na Home/galeria, nunca direto no grafo.
- Botão "Abrir Canvas" existe em ≥ 3 lugares (Backlog, GateView, Home) e todos levam ao contexto correto (nó/projeto selecionado).
- Toggle "Grafo NEXO | Telas (Studio)" alterna as vistas preservando seleção e query; rota `/studio` resolve (alias para `view=studio`).
- Breadcrumb: cada segmento clica, muda o nível (`useProject`) e atualiza a vista/query; segmento atual não clicável com `aria-current`.

### (d) Edição em texto

- Editar o título na tab Texto e clicar Propor exibe tabela de → para; nada muda no grafo até Aceitar; Aceitar gera `v+1` + evento `AcceptPatch`; Rejeitar descarta sem vestígio no grafo (apenas auditoria da rejeição).
- Backlog inline: Enter confirma (nova versão + auditoria), Esc cancela (valor original restaurado), validação de título exibida na célula.
- Dispensa de item `aviso` sem justificativa/owner/prazo é recusada com mensagem no item; dispensa válida exibe "dispensado por Nome até DATA"; item `bloqueante` nunca oferece dispensa (só link "corrigir no objeto").

### (e) Studio

- As 21 parts da paleta arrastam para o stage e criam items reais (visíveis, selecionáveis, persistidos após reload).
- Inspector edita label/variant/note/action e cada edição persiste + participa do undo/redo.
- Preview tap-through: clicar em item com action navega para a tela destino com a transição declarada; voltar retorna; `P` alterna, Esc sai.
- Prompt PT-BR gerado contém labels, notes, telas, actions e tema reais do doc (nenhum texto fixo além de rótulos); textarea editável; copiar transfere exatamente o conteúdo editado.
- Share-link `#docz=` colado no m3e original abre o mesmo design (e link m3e abre no Studio) — compatibilidade validada uma vez por direção.
- PNG (`studio-<screen>.png`) e JSON (Doc completo) exportam por download real.
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z) e todos os atalhos do item 5.7 funcionam com foco no stage; reload preserva doc, screens, seleção de screen e vista.

### (f) Regressão E2+E3 + build

- Nenhum dos 9 itens E2+E3 (seção 0) quebra: toolbar 11 ações, Copilot criando nós, Propor/Aceitar, prompt, share, PNG, gates com bloqueio, impacto com stale/reversão, backlog + usuários + busca — reverificação manual item a item após o Passo 7.
- `vue-tsc --noEmit` + `vite build` verdes; `npm run dev` serve em `http://127.0.0.1:5173/` sem erro no console para os fluxos acima.
- Zero botão fake em qualquer vista (cada controle executa ação real ou está desabilitado com motivo explícito).
