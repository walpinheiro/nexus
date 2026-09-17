# NEXO — STUDIO-V2 (paridade EXATA com m3e-canvas)

## 0. Fontes lidas

- `docs/ref-m3e/M3Node.tsx` (1973 linhas) — extraído: `Icon` via classe `.msr` (Material Symbols, `fontVariationSettings` FILL/wght), `useRipples`/`rippleSize`/`RIPPLE_GROW 0.42s`, conteúdos por kind (`ButtonContent`, `SwitchContent` 52x32, `CheckboxContent` 18px etc.), `Body` com switch por kind (box/iconButton/fab/topAppBar/searchBar/card/listItem/dialog/snackbar/textField/select/slider/image/divider/bottomNav/navRail/circularProgress/linearProgress/fabMenu/toolbar/carousel/datePicker/timePicker/camera/map/badge), `boxStyle`/`shadowOf` por kind, wrapper `M3Node` com selection ring (outline 2px primary, offset 3px) + scale 0.97 no press, `M3Static` determinístico para tiles.
- `docs/ref-m3e/Preview.tsx` (1575 linhas) — extraído: poses por transição (`slide`/`slideLeft`/`slideUp`/`slideDown`/`fade`/`expand`/`none`), `EASE [0.2,0,0,1]`, `SLIDE_MS 0.42`, spring M3 (`stiffness 360`, `damping 26`), pilha `Entry {id, t}` com `back` reverso, `Tappable` com hit-areas por slot (`tab:i`, `icon`, `railToggle`), `Screen` em bezel, swipe direcional e toggle buttons.
- `docs/ref-m3e/Toolbar.tsx` (438 linhas) — extraído: `Pill` flutuante (`surfaceContainerLow`, radius 28, sombra), `Segmented` select/hand, pill de zoom com %/fit, undo/redo, tidy, preview (`play_arrow`), prompt (`auto_awesome`), share; variante mobile compacta.
- `docs/ref-m3e/Inspector.tsx` (490 linhas) — extraído: `variantsOf` por kind (card tonal/elevated/outlined, textField outlined/filled, chip outlined/tonal, fab sem text/elevated/outlined, toolbar tonal/filled), `TransitionPicker`, `ActionEditor` (chips de telas + `back` + transições), `AlignSection`.
- `docs/ref-m3e/CardStage.tsx` (372 linhas) — extraído: stage dedicado de card (imagem arrastável para borda/fundo, palavras em 9 posições) — **fora de escopo** desta V2 (fase futura, não portar agora).
- `docs/ref-m3e/PartsPalette.tsx` (95 linhas) — extraído: grid `repeat(auto-fill, minmax(78px, 1fr))` gap 6, `CATEGORIES` actions/navigation/containment/inputs/content/progress, favoritos, busca multilíngue, `Tile` com `paletteIcon`.
- `docs/ref-m3e/agent.md` — extraído: formato `Doc {title,brief,frame,platform,paletteKey,theme,frames[],groups[]}`, `KIND_ORDER` 36 kinds, share `#docz=` deflate-raw base64url, prompt-output, tidy, regras de navegação.
- `m3e-ref/components/Layers.tsx` (baixado do GitHub raw) — extraído: árvore z-order por screen (runs + grupos free), `Reorder.Group/Item` com drag pelo handle (`drag_indicator`), abrir grupo/run, `lock`/`lock_open` por grupo, seleção sincronizada com o stage, dropdown de screen.
- `m3e-ref/components/TapStage.tsx` (baixado do GitHub raw) — extraído: mini stage `de→para` (MiniFrame + seta + ContentBox animada em loop 0.6s), hit-areas por slot, `TransitionPicker` inline, variante `LinkStage` (mini browser) — usado no Inspector para visualizar a ação.
- `m3e-ref/app-Editor.tsx` (4869 linhas, lidas 120–380/4040–4830) — extraído: composição `Toolbar` pill flutuante + paleta esquerda (tabs parts/layers) + canvas central com frames lado a lado (`FRAME_GAP 120`) e label com `FrameSizePicker` + painel direito (abas edit/prompt: `FrameInspector`/`Inspector`/`PromptPanel`) + `Preview` modal + `ShareDialog`; `GRID 4dp`, springs CARRY/OPEN, `HANDLED`/`ROUND`/`WIDE` para resize, seed phone-first com topAppBar + botões + listItems + FAB + bottomNav.
- `src/components/studio/m3/` (30 arquivos: `tokens.ts` com `KIND_SPEC` 26 kinds + `KIND_ORDER` + `CATEGORIES`, `theme.ts` 7 paletas, `M3Node.vue` dispatcher, 24 renderers, `M3Icon.vue`, `m3.css`) — extraído: nosso `m3/` atual cobre ~26 dos 36 kinds (faltam `splitButton`, `fabMenu`, `datePicker`, `timePicker`, `carousel`, `camera`, `map`, `badge`, `linearProgress`/`circularProgress` separados) e não tem `M3Static` determinístico nem `TapStage`.
- `src/views/StudioView.vue` (74 linhas) — extraído: toolbar fina no topo + 3 colunas (paleta/inspector) + strip de telas embaixo; sem layers, sem frame-panel, sem preview modal, sem prompt panel dedicado.
- `StudioStage.vue` (~298 linhas) — extraído: um frame por vez, drag/seleção/caixa/guides/zoom/pan/atalhos OK, render via `M3Node`, preview inline com toggle P (sem modal, sem bezel, sem swipe).
- `PartsPalette.vue` — extraído: tiles 78px com mini-preview + busca + favoritos (já no padrão, manter).
- `StudioInspector.vue` — extraído: campos filtrados por kind + variantsOf + editor de abas/ação (falta `TransitionPicker` visual, `TapStage` mini, `AlignSection`).
- `StudioToolbar.vue` — extraído: barra fina com tidy/undo/redo/fit/prompt/share/PNG/JSON (falta pill flutuante + Segmented + zoom %).
- `src/stores/useStudio.ts` — extraído: persist `nexo.v1.studio`, undo/redo, CRUD de frames/itens, `tidy`; **sem `order`/`lock` manipuláveis** (ordem = posição no array `groups`, sem trazer-frente/enviar-trás por item).
- Seed (`useStudio.seedDoc`) — extraído: phone-first (`pagpix` 412x892 como primeira, `screenId: 'pagpix'`), `+Phone` antes de `+Web`; Checkout Web 1280x800 existe mas é secundária.

## 1. Diagnóstico item-a-item

| Reclamação | O que o m3e tem (arquivo/linha) | O que temos (arquivo/linha) | Gap |
|---|---|---|---|
| 1) Ver o projeto base e os componentes | `KIND_ORDER` 36 kinds (`lib-tokens.ts:1552`), `KIND_SPEC` com `noun/paletteIcon/size/size2/hasFill` + `PALETTE_HIDDEN`, `CATEGORIES` 6 com ícone (`lib-tokens.ts:872`); `M3Node.tsx` renderiza todos incl. `splitButton/fabMenu/carousel/datePicker/timePicker/camera/map/badge/progress` | `m3/tokens.ts` 26 kinds (sem `splitButton/fabMenu/datePicker/timePicker/carousel/camera/map/badge`), `KIND_SPEC` sem `noun/size2/hasFill`, `M3Node.vue` com fallback genérico para kinds ausentes | 10 kinds sem renderer; tiles caem no fallback "kind — label" |
| 2) Como ele compõe a tela | `app-Editor.tsx:4040-4830`: toolbar pill flutuante + paleta esquerda (tabs parts/layers) + canvas com frames lado a lado (`FRAME_GAP 120`) + painel direito abas edit/prompt (`FrameInspector`/`Inspector`/`PromptPanel`) + `Preview` modal + `ShareDialog` | `StudioView.vue:25-31`: `StudioToolbar` fina + 3 colunas + strip de telas embaixo; sem layers, sem frame-panel, sem modal | Recomposição idêntica pendente (toolbar pill, painel com abas, Preview modal) |
| 3) Desktop por padrão | Telas phone 412x892 ou desktop 1280x800 (`PHONE_W/H`, `DESKTOP_W/H`), `FrameSizePicker` (phone/desktop com ícones) no label do frame (`Inspector.tsx:137`), bars esticam e nav vira rail no desktop | Seed phone-first (`screenId: 'pagpix'`), botões `+Phone` antes de `+Web`, sem toggle no label, sem adaptação bar/rail por largura | Default, seed, toggle e adaptação responsiva pendentes |
| 4) Layers (por cima/baixo) | `Layers.tsx`: árvore z-order por screen, drag com handle reordena (frente/trás), abre grupo/run, `lock`, seleção sync, dropdown de screen | `useStudio.ts`: ordem = índice em `groups`, sem `order`/`lock`, sem trazer-frente/enviar-trás por item, sem painel | `order`+`lock` no tipo/store + `LayersPanel.vue` com drag nativo |
| 5) Preview ruim | `Preview.tsx:1021`: modal com bezel phone/desktop, poses + springs, pilha com back reverso, swipe, toggle buttons, escala/peek | `StudioStage.vue:192-196`: toggle P inline no stage, transição CSS simples, sem modal/bezel/swipe/toggle | `PreviewModal.vue` + `TapStage.vue` fiéis |
| 6) Lib de componentes com sentido | Renderers com medidas `KIND_SPEC` + `buttonMetrics`/`chipMetrics`, connected runs (`canJoin`, `R_INNER`), `fabMenu/splitButton/toolbar/tabs` selecionáveis, pickers/carousel/camera/map placeholders, progress variants, `bottomNav/navRail` com tabs reais, Material Symbols, scheme, ripple 0.42s | Renderers simplificados sem connected runs, sem `fabMenu/splitButton/pickers/carousel/camera/map`, tabs sem scroll, ripple CSS simples | Fechar gaps mantendo `share #docz=` compatível |

## 2. Proposta de recomposição

Layout idêntico ao Editor m3e, em ASCII (desktop ≥1280; <768 empilha: paleta vira drawer, painel vira folha):

```
┌──────────────────────────────────────────────────────────────┐
│  (toolbar pill FLUTUANTE, centralizada, sobre o stage)       │
│  [V|H] [− 70% +|fit] [↩ ↪] [+tela] [Tidy] [▶ Preview] [✨] [⇪] │
├────────┬───────────────────────────────────────┬─────────────┤
│PALETA  │  STAGE (frames lado a lado, gap 120)  │ PAINEL DIR. │
│busca   │ ┌ Checkout Web ── [desktop|phone]о┐   │ [edit|prompt│
│Actions │ │ ▓▓▓ topAppBar …                │   │ Inspector / │
│ Navega…│ │ [card][card]  [button][button]  │   │ Layers /    │
│ Contai…│ │ bottomNav 3 tabs               │   │ Frame       │
│ Inputs │ └────────────────────────────────┘   │             │
│ Conten…│ ┌ Pagamento Pix ── [phone|desktop]о┐ │             │
│ Progre…│ │ …                                │ │             │
│fav ★   │ └────────────────────────────────┘ │             │
├────────┴───────────────────────────────────────┴─────────────┤
│ strip telas (miniaturas + +Phone/+Web + renomear/duplicar)   │
└──────────────────────────────────────────────────────────────┘
[Preview MODAL] moldura phone 412 (R40) / desktop 1280 (R28) + bezel,
tap-through com transição + back + swipe + toggle; [PromptPanel] ao lado.
```

Regras: frames lado a lado com gap 120 e label com toggle phone/desktop (`FrameSizePicker` compacto); bars esticam à largura do frame e `bottomNav` vira `navRail` em telas desktop quando o seed/usuário optar (mesma regra do original: rail em desktop, nav em phone); painel direito com abas `edit` (Inspector/Layers/Frame conforme seleção) e `prompt` (`PromptPanel` existente); Preview sempre modal (nunca inline).

## 3. Matriz arquivos-alvo

| Arquivo | Novo/Alterar | O que fazer | Depende de |
|---|---|---|---|
| `src/components/studio/LayersPanel.vue` | novo | Árvore z-order por screen (runs + free), drag HTML5 nativo reordena, abrir grupo/run, lock, seleção sync, dropdown de screen | `types/studio.ts` (order+lock) |
| `src/components/studio/FramePanel.vue` | novo | Nome, nota, toggle phone/desktop, bg/place/swipe, duplicar/remover, preview da tela, mini prompt da tela | `useStudio` |
| `src/components/studio/PreviewModal.vue` | novo | Modal com moldura phone/desktop, tap-through com transições CSS, histórico back, swipe básico (pointer), toggle buttons | `M3Node`, `theme` |
| `src/components/studio/TapStage.vue` | novo | Mini stage `de→seta→para` com ContentBox animada + `TransitionPicker` (port do `TapStage.tsx`) para o Inspector | `PreviewModal` (poses) |
| `src/views/StudioView.vue` | alterar | Recomposição idêntica ao Editor: toolbar pill flutuante, paleta + layers na esquerda (tabs), stage frames gap 120, painel direito com abas edit/prompt, Preview modal | Layers/Frame/Preview |
| `src/components/studio/StudioStage.vue` | alterar | Renderizar TODOS os frames lado a lado (gap 120), label com toggle, bars esticadas, rail no desktop; manter drag/seleção/atalhos | FramePanel |
| `src/stores/useStudio.ts` | alterar | `order` implícito manipulável (`trazerFrente/enviarTras/paraFrente/paraTras`), `lock` por grupo, `setFramePreset`, seed desktop-first | `types/studio` |
| `src/types/studio.ts` | alterar | `StudioGroup.order: number`, `StudioGroup.locked?: boolean`, `StudioFrame.preset?: 'phone'\|'desktop'` (sem quebrar `#docz=`) | — |
| `src/components/studio/m3/tokens.ts` | alterar | Adicionar specs `splitButton/fabMenu/datePicker/timePicker/carousel/camera/map/badge/linearProgress/circularProgress` + `noun/size2/hasFill` | `agent.md` |
| `src/components/studio/StudioToolbar.vue` | alterar | Virar pill flutuante (`surfaceContainerLow`, radius 28) + Segmented V/H + zoom %/fit + tidy + preview + prompt + share | `m3.css` |
| `src/components/studio/StudioInspector.vue` | alterar | `TransitionPicker` visual + `TapStage` mini + `AlignSection` básico + variantsOf já existente | `TapStage.vue` |
| Seed studio (`useStudio.seedDoc`) | alterar | Desktop-first: Checkout Web 1280x800 como primeira (`screenId: 'checkout'`), Pagamento Pix phone como segunda, x lado a lado gap 120 | `useStudio` |

## 4. Ordem 6 fases p/ Forja

- **Fase 1 — fundação order+lock+LayersPanel** (`types/studio.ts` order/lock, `useStudio` 4 ações z + lock + persist, `LayersPanel.vue` com drag nativo + seleção sync). Done verificável: arrastar linha no Layers muda a sobreposição no stage e persiste após reload. `vue-tsc --noEmit` + `vite build` + commit pequeno.
- **Fase 2 — FramePanel + desktop-default + toggle + seed Checkout Web** (`FramePanel.vue`, toggle phone/desktop no label, `setFramePreset`, seed desktop-first com frames gap 120). Done: nova tela nasce desktop 1280x800; toggle troca medidas com transição; seed abre no Checkout Web. Build + commit.
- **Fase 3 — recomposição StudioView idêntica ao Editor** (`StudioView.vue`, `StudioToolbar.vue` pill flutuante, `StudioStage.vue` multi-frame gap 120, painel com abas edit/prompt). Done: screenshot lado a lado com o m3e mostra mesma disposição; drag/paleta/atalhos intactos. Build + commit.
- **Fase 4 — PreviewModal + TapStage tap-through/swipe/toggle** (`PreviewModal.vue`, `TapStage.vue`, Inspector com mini stage + TransitionPicker). Done: tap navega com slide/fade/expand/none, back reverte, swipe troca telas irmãs, toggle flipa estado. Build + commit.
- **Fase 5 — gaps renderers + runs + Symbols + ripple** (`tokens.ts` 10 specs, renderers `M3SplitButton/M3FabMenu/M3Pickers/M3Carousel/M3CameraMap/M3Badge/M3Progress`, connected runs simplificado, ripple 0.42s). Done: paleta sem fallback genérico; botões/chips lado a lado fundem raios. Build + commit.
- **Fase 6 — polish share-compat + prompt + a11y + regressão** (round-trip `#docz=` com o m3e original 1x cada direção, `PromptPanel` com cover, foco/aria/teclado/reduced-motion, regressão UX2+NEXO). Done: link abre lá e cá; zero botão fake; build verde + commit.

## 5. Critérios da Lupa

Lado a lado com `https://lnkiai.github.io/m3e-canvas/` (mesma seed): layers com drag reordena o z no stage e persiste; nova tela nasce desktop 1280x800; toggle phone/desktop no label troca medidas; Preview modal em moldura navega com transição correta + back reverso + swipe; tiles e runs reconhecíveis sem ler texto; share `#docz=` abre no m3e original e link m3e abre no Studio (1x cada); `vue-tsc --noEmit` + `vite build` verdes; foco visível, aria-labels por kind, teclado completo, `prefers-reduced-motion` sem animação; zero botão fake em Studio/NEXO.
