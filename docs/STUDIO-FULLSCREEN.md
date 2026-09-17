# NEXO — STUDIO-FULLSCREEN (Studio em tela toda)

## 1. Rota/layout

- Rota `/studio-full` (name `studio`, componente `StudioView.vue`) ganha `meta: { layout: 'studio' }` em `src/router/index.ts`; nenhuma outra rota muda path, name ou props.
- `src/App.vue` (hoje 16 linhas, `<script setup>` fixo com `Topbar` + `Sidebar` + `main > router-view`) passa a usar `useRoute` e renderiza dois ramos: quando `route.meta.layout === 'studio'`, renderiza `<router-view>` puro em container `100vw/100vh` sem `Sidebar` (220px) e sem `Topbar` (64px); caso contrário mantém o shell atual idêntico.
- Manter `<script setup>` em `App.vue` (só adiciona `useRoute` + `computed isStudio`); `Topbar`/`Sidebar` com `v-if="!isStudio"`, nunca `v-show` (para saírem do DOM e do tab-order).
- Pinia/stores continuam: mesma app, mesmo `pinia`, mesmos `useStudio/useGraph/useProjects` — só o shell muda, nenhum dado é recarregado ao entrar/sair do Studio.
- Query `?from=` indica a origem: valores `backlog|canvas|gates/G2|studio` (para gates, usar `gates/G2` com o id, ex. `?from=gates/G2`); links "Studio" em `BacklogView`/`CanvasView`/`GateView` passam `?from` com a origem atual (path + gate quando aplicável).
- Fallback: sem `?from` válido, voltar vai para `/backlog`.
- Rotas NEXO inalteradas além da meta na rota studio; deep-link `/studio-full` e share `#docz=` continuam resolvendo para o mesmo `StudioView`.

## 2. Transição

- `<transition name="studio" mode="out-in">` em `App.vue` envolvendo o ramo shell vs. ramo studio (não dentro das views).
- CSS (em `src/assets/main.css`, junto aos tokens existentes, sem arquivo global novo além destas classes):
  - `.studio-enter-active, .studio-leave-active { transition: opacity 300ms ease, transform 300ms ease; }`
  - `.studio-enter-from, .studio-leave-to { opacity: 0; }`
  - `.studio-enter-from .studio-panel, .studio-leave-to .studio-panel { transform: scale(0.98); }` (o painel do Studio carrega classe `studio-panel`; o fade é no container, o scale só no painel).
- `prefers-reduced-motion`: já há regra global em `main.css` zerando transições para `0.01ms` — reusar, sem duplicar; garantir que as classes `.studio-*` estejam cobertas pelo seletor existente (`*` já cobre, só não usar `!important` conflitante).
- `body overflow hidden` no modo studio via `watch` em `route.meta.layout` em `App.vue` (`document.body.style.overflow = isStudio ? 'hidden' : ''`), restaurando ao sair (inclusive em unmount).
- Foco: ao entrar no studio, `focus()` no stage (`tabindex="-1"` + `.focus()` em `nextTick` após a transição); ao sair, o foco retorna ao link/botão Studio que originou a navegação (guardar a ref via `history.state` no clique de origem ou ler `?from` e focar o primeiro link Studio correspondente; fallback: focar o `main` do shell).
- Transição reversa idêntica na saída (mesmo `name="studio"`, `mode="out-in"` cobre os dois sentidos).

## 3. Botão voltar

- Header próprio do Studio no topo de `StudioView.vue` (acima da toolbar pill, altura ~48px, fundo `surface`, borda inferior `border`): pill à esquerda com botão hambúrguer "três tracinhos" (Lucide `menu` — **adicionar `Menu` ao mapa de `src/components/common/LucideIcon.vue`**, que hoje tem 20 ícones e não tem `menu`; `X` já existe) que abre dropdown (`role="menu"`); + logo NEXO mini (texto `NEXO` 800 18px com X em gradiente, mesma marca do Topbar) + `Studio` + nome do projeto atual (`useProjects.atual?.titulo`); + botão `ChevronLeft` "Voltar" (`name="chevL"` já existe no mapa) que volta para `?from` ou `/backlog`; + texto auxiliar `voltando para Gates G2` quando `from` é gate (label dinâmico).
- Dropdown do hambúrguer (posicionado abaixo do botão, `role="menu"`, itens `role="menuitem"`): `Voltar para [origem]` (label dinâmico de `?from`: Backlog / Canvas / Gates G2 / Studio) + `Ir para Backlog` + `Ir para Gates G2` + `Ir para Canvas`; cada item é `router.push` real (zero item fake); `X` (Lucide, já no mapa) fecha o dropdown.
- Botão `ChevronLeft Voltar`: `router.push(fromParaRota(?from))` com fallback `/backlog`; preserva `history` (push, não replace, para o navegador voltar corretamente).
- `Esc`: fecha o dropdown se aberto; se fechado, volta para a origem (handler `keydown` no `StudioView` com prioridade sobre os atalhos do stage — checar `event.target` não é input/textarea e que PreviewModal/NewFrameDialog não estão abertos antes de voltar).
- Foco gerenciado: abrir o menu foca o primeiro item; `Esc` retorna o foco ao botão hambúrguer; setas cima/baixo navegam entre itens (roving leve sem lib); `aria-haspopup="menu"` e `aria-expanded` no botão hambúrguer, `aria-label` PT-BR em tudo.

## 4. Preservar

- Todo o chrome V2/V3 intacto: toolbar pill flutuante, paleta com tiles, `LayersPanel`, `FramePanel`, painel direito com abas edit/prompt, `PreviewModal`, `NewFrameDialog`, prompts e share — **SÓ muda o shell** (`App.vue` + meta da rota); `StudioView.vue` mantém 100% dos componentes atuais, só adiciona o header próprio no topo.
- Novos links `?from` não quebram deep-link nem share `#docz=` (query e hash coexistem: `?from=` é lido para navegação, `#docz=`/`#doc=` para o documento; ao copiar share-link dentro do fullscreen, preservar `?from` quando houver).
- Compatível com chrome-parity pendente: header próprio usa apenas classes Tailwind `nexo-*` existentes (surface, border, primary, muted) + `LucideIcon`, sem CSS global novo exceto a transição `.studio-*` do item 2.
- `lucide-vue-next ^1.0.0` já instalado (`package.json`); só adicionar o import `Menu` ao mapa existente.

## 5. Ordem 3 fases p/ Forja

- **Fase 1 — shell fullscreen + transição** (`App.vue`: `useRoute` + `v-if` shell + `<transition name="studio">` + watch `body overflow`; `router/index.ts`: `meta: { layout: 'studio' }` na rota `/studio-full`; `main.css`: classes `.studio-enter/leave` 300ms + cobertura reduced-motion). Done: `/studio-full` abre sem Sidebar 220px nem Topbar 64px, com fade+scale; sair restaura shell e scroll. `vue-tsc --noEmit` + `vite build` + commit pequeno.
- **Fase 2 — header próprio + menu + ?from** (`StudioView.vue`: header com pill hambúrguer + logo mini + Voltar chevL + nome do projeto + texto origem + dropdown 4 itens + navegação `?from`/fallback `/backlog`; `LucideIcon.vue`: adicionar `Menu`; `BacklogView`/`CanvasView`/`GateView`: links Studio passam `?from` atual). Done: hambúrguer abre menu com 4 itens reais; Voltar retorna a `?from` (origem exibida no header); sem `?from` vai a `/backlog`. Build + commit.
- **Fase 3 — Esc + foco + a11y + regressão** (Esc com prioridade, focus stage ao entrar / botão origem ao sair, `aria-haspopup/menu/expanded`, focus trap leve no dropdown, reduced-motion verificado, regressão V2/V3: toolbar, paleta, layers, preview, share, prompts). Done: Esc volta quando menu fechado; foco entra/sai correto; zero regressão no chrome. Build + commit.

## 6. Critérios da Lupa

- Entrar em `/studio-full`: nem Sidebar 220px nem Topbar 64px visíveis (só header próprio do Studio + chrome V2/V3).
- Transição fade + scale 300ms na entrada e na saída (ou instantânea com `prefers-reduced-motion`).
- Hambúrguer abre menu com 4 itens (`Voltar para [origem]` + Backlog + Gates G2 + Canvas), todos navegando de verdade.
- Voltar vai para `?from` (teste: de `/gates/G2` → Studio com `?from=gates/G2` → Voltar retorna a `/gates/G2`; sem `?from` → `/backlog`).
- `Esc` volta para a origem quando o dropdown está fechado (e fecha o dropdown quando aberto).
- Foco no stage ao entrar; foco no botão/link de origem ao sair.
- Deep-link `/studio-full` e share `#docz=` intactos (abrem o mesmo documento, com ou sem `?from`).
- Chrome V2/V3 (toolbar pill, paleta tiles, layers drag, FramePanel, PreviewModal tap-through, prompts) funciona igual ao modo com shell.
- `vue-tsc --noEmit` + `vite build` verdes; zero botão fake (menu, Voltar, toggle moldura e atalhos todos com efeito real).
