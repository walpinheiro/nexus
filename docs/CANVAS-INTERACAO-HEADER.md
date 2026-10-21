# Auditoria — Pan botão-do-meio + Header/Logo + Workflow 100% (mapeado no código)

Data: 18/09/2026. Origem: pedido do usuário (Lupa deve garantir; logo não bate; workflow não ocupa 100%).

## A) Pan com botão-do-meio NÃO existe (confirmado no código)

- `src/components/canvas/NexoCanvas.vue:112-124` (`onPointerDownFundo`): só entra em pan se `ui.state.ferramenta === 'hand' || spaceOn`. **Nenhum teste de `ev.button === 1`**, nenhum handler `auxclick`/`mousedown` middle. Clique-do-meio cai no ramo "caixa de seleção" ou dispara autoscroll nativo do browser.
- `src/components/studio/StudioStage.vue:51-62` (`onPointerDownFundo`): idem — só `ferramenta === 'hand'`. Mesmo gap no Studio.
- Sem `preventDefault` do autoscroll, sem cursor `grabbing`, sem pan middle em modo `select`.
- **Esperado**: middle-press no fundo inicia pan em qualquer ferramenta; move atualiza `pan`; up encerra; `preventDefault` anti-autoscroll; `auxclick` suprimido; cursor grabbing durante o gesto; testes nos dois canvas.

## B) Header / Logo divergente do `nexo-logo.png`

- `src/components/layout/Topbar.vue:68`: header `h-16` (64px) — confere com `design.md §2.1` ("altura ~64px"), mas Lupa nunca mediu renderizado (altura real, padding `px-4`, gap).
- `src/components/layout/Topbar.vue:82-90`: logo = texto `NE` + `X` com gradiente `from-[#1D4ED8] to-[#7C3AED]` + `O`, `26px font-extrabold`. PNG real: N/E/O navy arredondado extra-bold; **X bipartido** (chevron azul à esquerda + dois segmentos roxos à direita com vão diagonal); O quase-quadrado arredondado. Gradiente numa letra X única ≠ X bipartido com vão.
- `src/views/StudioView.vue:194,226`: header do Studio é `h-12` (48px) com texto `NEXO Studio 18px` — sem marca, inconsistente com Topbar.
- `index.html`: favicon é letra "N" em SVG inline — sem relação com o PNG.
- `design.md:59` manda "simplificar em SVG/texto, sem rasterizar o PNG" — conflita com a cobrança de fidelidade; decidir: criar `src/components/common/NexoLogo.vue` (SVG fiel ao PNG, sem raster) e usar em Topbar + Studio + favicon, atualizando `design.md`.
- **Lupa deve**: medir header (64px), caixa da logo, screenshot comparada com `nexo-logo.png`, checar favicon e header do Studio.

## C) Workflow (grafo) não ocupa 100% nem é totalmente navegável

- `src/App.vue:28`: `main` com `overflow-auto p-4` — o canvas nunca recebe 100% limpos do viewport.
- `src/views/CanvasView.vue:131-134`: container `flex min-h-0 flex-1`, mas `NexoCanvas` raiz (`NexoCanvas.vue:368`) é `flex h-full min-h-[560px]` e a área do canvas (`NexoCanvas.vue:405-407`) tem **`h-[560px]` fixo** — não `flex-1 w-full h-full`. Resultado: faixa de 560px + espaço morto; em tela grande não preenche largura/altura.
- Espaço interno `2000×1400` fixo (`NexoCanvas.vue:416`) sem resize observer — zoom/fit calculam sobre rect de 560px.
- Interatividade parcial: pan só hand/space (`NexoCanvas.vue:115`); wheel=pan, ctrl+wheel=zoom (`253-261`); `fit`/`+`/`-`/`0` existem; dblclick cria nó (`307`); mas **sem middle-drag**, sem feedback de cursor space, sem pinch touch, guarda `closest('[role="button"],...')` pode engolir drag iniciado em nó.
- **Esperado**: área do grafo = 100% da largura e altura útil do `main` (sem altura fixa; `flex-1 min-h-0 w-full`); canvas reage a: arrasto fundo em hand, space+drag, **middle-drag em qualquer ferramenta**, wheel pan, ctrl+wheel zoom, botões +/-/fit, minimap, dblclick cria nó, setas nudge. Lupa mede `data-export-root` vs `main` (largura/altura %) e exercita cada gesto via portais.

## Critérios de aceite (Lupa via portais `NexoAtual` × `M3EOriginal`)

1. Middle-drag move o pan no Grafo e no Stage do Studio em modo select (pan antes ≠ depois; sem autoscroll).
2. Header NEXO mede 64px; logo nova (SVG fiel) lado a lado com `nexo-logo.png` aprovada visualmente; favicon + header Studio com a mesma marca; `design.md` atualizado.
3. Grafo ocupa ≥98% da largura e altura útil do `main`; todos os gestos acima funcionam; `tsc`+`build` verdes.
