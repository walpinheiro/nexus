# NEXO â€” Guia de Design (implementaÃ§Ã£o Vue + Tailwind, fiel ao protÃ³tipo)

> ReferÃªncia visual normativa: `nexo-interface-proposal-static.png` (+ `nexo-logo.png` para a marca).
> Este arquivo Ã© a especificaÃ§Ã£o visual do front-end estÃ¡tico. Em caso de divergÃªncia com o PNG, **vale o PNG**.
> Todo texto de interface em PT-BR.

---

## 1. Tokens de design

### 1.1 Cores

| Token | Valor | Uso |
|---|---|---|
| `bg-canvas` / fundo app | `#F7F8FB` (slate-50-ish) | fundo do Canvas e da app |
| `surface` | `#FFFFFF` | cards, painel direito, topbar, sidebar |
| `primary` (azul primÃ¡rio) | `#1D4ED8` (blue-700) | botÃµes solid, borda do nÃ³ selecionado, tab ativa, pill G2 ativo, links do breadcrumb atual |
| `primary-soft` | `#EFF6FF` (blue-50) | fundo do item `Canvas` ativo na sidebar, badge `Feature` azul |
| `text` | `#0F172A` (slate-900) | tÃ­tulos, texto principal |
| `text-muted` | `#64748B` (slate-500) | descriÃ§Ãµes, placeholders, contadores |
| `border` | `#E2E8F0` (slate-200) | bordas de cards, divisÃ³rias, toolbar |
| `dot-grid` | `#E5E7EB` | pontilhado do fundo do Canvas (radial-gradient) |
| Aprovado / baseline (verde) | texto `#15803D`, fundo `#F0FDF4`, borda `#BBF7D0` | linha `âœ” Aprovada Â· Gate 2`, selo de confirmaÃ§Ã£o |
| Rascunho (neutro) | texto `#475569`, fundo `#F1F5F9`, borda `#E2E8F0` | badge neutra |
| Em revisÃ£o (destaque suave) | texto `#1D4ED8`, fundo `#EFF6FF`, borda `#BFDBFE` | badge de review |
| Desatualizado / aviso (Ã¢mbar) | texto `#B45309`/`#D97706`, borda `#F59E0B`, fundo `#FFFBEB` | card `Status de pagamento` dashed + badge `Desatualizada`, banner `Impacto alto detectado`, card `Impacto identificado` |
| Bloqueado (vermelho) | texto `#B91C1C`, fundo `#FEF2F2`, borda `#FECACA` | `BlockedReason`, gate bloqueado |
| Badge `Feature` teal (nÃ³ `Criar cobranÃ§a Pix`) | texto `#0F766E`, fundo `#F0FDF9`/`#ECFDF5` | variaÃ§Ã£o aceita: manter teal sÃ³ quando o PNG a exibe; padrÃ£o Ã© azul |

Tailwind: estender em `tailwind.config.ts` (`colors.nexo.*`) ou usar classes `slate-*`/`blue-*`/`amber-*` equivalentes acima.

### 1.2 Tipografia

- Fonte: `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- TÃ­tulos de card: `600 15px/1.35`, cor `text`.
- TÃ­tulo do painel (`ConfirmaÃ§Ã£o idempotente`): `700 18px`.
- DescriÃ§Ãµes: `400 13.5px/1.55`, cor `text-muted`.
- Badges/contadores: `500 12px`.
- Breadcrumb: `400 14px`; Ãºltimo nÃ­vel `600` cor `primary`.

### 1.3 Raios, sombras, espaÃ§amentos

- Cards do Canvas: raio `12px`, borda `1px solid border`, sombra sutil `0 1px 2px rgb(15 23 42 / 0.06), 0 4px 16px rgb(15 23 42 / 0.06)`.
- Badges: raio `8px`, padding `2px 8px`.
- BotÃµes: raio `6px`, altura `44px` no painel direito; fonte `600 14px`.
- Sidebar: largura `220px`. Painel direito: largura `340px`. Toolbar vertical: `~48px` com raio `12px`.
- Cards do Canvas: largura `260â€“300px`, padding `16px`, gap tÃ­tuloâ†’desc `8px`.

---

## 2. Mapeamento pixel-a-pixel do protÃ³tipo

Leitura do PNG da esquerda para a direita, de cima para baixo. Cada item indica o componente Vue correspondente (nomes do `docs/PLANO-IMPLEMENTACAO.md`).

### 2.1 Topbar (`Topbar.vue`, altura ~64px, fundo branco, borda inferior `border`)

| Elemento | Especificação |
|---|---|
| Hambúrguer + logo | ícone menu (`IconMenu`, 20px) + logo vetorial oficial `NexoLogo.vue` (SVG fiel ao `nexo-logo.png`, sem raster; altura 28–32px). X bipartido com chevron azul `#1D4ED8` à esquerda e dois segmentos roxos `#7C3AED` à direita com vão diagonal; letras N, E, O em navy arredondado `#0F172A` |
| Breadcrumb (`Breadcrumb.vue`) | `Cobranças › Pagamento por Pix › Feature`; separador `›` em `text-muted`; dois primeiros níveis clicáveis (sobe zoom); último em `primary 600` (nível atual) |
| Busca (`SearchPalette.vue`) | campo central `~300px`, placeholder `Buscar no NEXO`, ícone lupa à esq., kbd `⌘K` à dir. (fundo slate-100, raio 6px); abre paleta com `Ctrl/⌘+K`, `/` ou clique |
| Alerta (`ImpactBanner.vue`) | pill âmbar: `⚠ Impacto alto detectado ›`; fundo `#FFFBEB`, borda `#FDE68A`, texto `#B45309 600 13px`; clique seleciona o nó `Status de pagamento` e abre tab Impacto |

#### 2.1.1 Especificação da Marca e Logo (`NexoLogo.vue`)
- **Vetorização fiel sem raster**: Proibido usar tags `<img>` apontando para raster `nexo-logo.png`; implementação via SVG inline em `src/components/common/NexoLogo.vue`.
- **Anatomia do símbolo**: Letras `N`, `E`, `O` em tipografia navy rounded (`#0F172A`), peso extra-bold com cantos arredondados; `X` bipartido composto por chevron apontando para a direita em azul primário (`#1D4ED8`) e dois segmentos paralelos à direita em roxo (`#7C3AED`), separados por vão diagonal negativo livre. Letra `O` em squircle concêntrico quase-quadrado arredondado.
- **Aplicação Topbar (64px)**: Header `h-16` (64px), padding `px-4`, logo completo com altura nominal entre **28px e 32px**.
- **Aplicação Studio (48px)**: Header compacto `h-12` (48px), logo versão compacta (`compact: true`) com altura entre **20px e 24px**, seguido pelo label `Studio` em `text-nexo-muted`.
- **Aplicação Favicon**: Arquivo `index.html` com link SVG data-URI reproduzindo fielmente o isotipo do X bipartido (32×32, `#1D4ED8` e `#7C3AED`).

### 2.2 Sidebar (`Sidebar.vue`, 220px, fundo branco, borda direita)

- Itens principais com ícone 20px + label 14px, altura 40px, raio 8px: `Visão` (`IconEye`), `Canvas` (`IconCanvas`, **ativo**: fundo `primary-soft`, texto `primary 600`), `Backlog` (`IconBacklog`).
- Seção `GATES` (label `11px uppercase tracking` em `text-muted`): `G1 Épicos`, `G2 Features` (**ativo**: pill circular azul `G2` branco + label `primary 600` + barra lateral azul 3px), `G3 Arquitetura`, `G4 PBIs`. Cada linha: círculo `28px` com sigla + label. (G0/G5 existem nas rotas, mas a sidebar exibe G1–G4 como no PNG.)
- Rodapé: botão circular colapso `<` (borda `border`, 28px).

### 2.3 Toolbar vertical (`CanvasToolbar.vue`)

Coluna branca, raio 12px, borda `border`, Ã­cones 20px empilhados com gap 4px, padding 6px: mÃ£o (`IconHand`, ativa em azul), cursor (`IconCursor`), branch/nÃ³s (`IconBranch`), comentÃ¡rio (`IconComment`), magic/format (`IconSparkles`-variaÃ§Ã£o), remover (`IconMinus`), expandir (`IconExpand`). Tooltips em PT-BR (`title`).

### 2.4 Canvas (`NexpoCanvas.vue` + `CanvasNode.vue` + `CanvasEdge.vue`)

- Fundo `bg-canvas` com grid pontilhado (`radial-gradient(dot-grid 1px, transparent 1px)`, size 20px).
- **Card padrÃ£o** (260â€“300px, branco, raio 12px, padding 16px):
  - Ã­cone quadrado arredondado 32px no topo (azul-claro p/ `Pagar fatura com Pix`, teal-claro p/ `Criar cobranÃ§a Pix`, Ã¢mbar-claro p/ `Status de pagamento`, escudo azul p/ `ConfirmaÃ§Ã£o idempotente`);
  - tÃ­tulo `600 15px text`;
  - descriÃ§Ã£o `13.5px text-muted` (textos exatos do PNG â€” ver checklist CAN-1 do plano);
  - rodapÃ©: badge `Feature` (raio 8px) Ã  esq. + contador `ðŸ‘¥ N` (`IconUsers` + nÃºmero, `text-muted 12px`) Ã  dir.
- **NÃ³ selecionado** (`ConfirmaÃ§Ã£o idempotente`, centro): borda `2px solid primary` + glow `0 0 0 4px rgb(29 78 216 / 0.12)`; botÃ£o `Â·Â·Â·` no canto superior direito; 4 handles (cÃ­rculos brancos borda azul, 12px) nos 4 lados.
- **NÃ³ desatualizado** (`Status de pagamento`, abaixo do centro): borda `1.5px dashed #F59E0B`, fundo `#FFFBEB`-claro; badge Ã¢mbar `âš  Desatualizada`; tÃ­tulo com Ã­cone `âš ` Ã¢mbar Ã  esq.
- **Arestas** (`CanvasEdge.vue`): paths BÃ©zier azuis `#1D4ED8` 2px com handles circulares nas extremidades; tipos futuros: `contÃ©m` sÃ³lida cinza, `realiza` sÃ³lida azul, `consome` sÃ³lida azul-clara, `valida` tracejada verde, `restringe` tracejada vermelha, `impacta` tracejada Ã¢mbar (legenda na vista Backlog/Gates).

### 2.5 Painel direito (`GatePanel.vue` / painel de detalhe, 340px, branco, borda esquerda)

- CabeÃ§alho: tÃ­tulo `700 18px` + botÃ£o `Ã—` (fecha painel, mantÃ©m seleÃ§Ã£o/nÃ£o â€” fechar limpa seleÃ§Ã£o).
- Linha de estado: `âœ”` verde + `Aprovada` (`600 text`) + `Â· Gate 2` (`primary 600`).
- Tabs: `Detalhes` (ativa: texto `primary 600` + underline 2px `primary`) / `Copilot` / `Impacto` (`500 text-muted`).
- Corpo Detalhes: subtÃ­tulo `DescriÃ§Ã£o da regra` (`600 14px`) + parÃ¡grafo idempotÃªncia/idTx (`13.5px/1.6 text`); divisÃ³ria; card Ã¢mbar `Impacto identificado` (Ã­cone `âš `, tÃ­tulo `600`, texto `3 features, 2 serviÃ§os e 4 PBIs.`, seta `â€º` Ã  dir. â€” clique abre tab Impacto).
- AÃ§Ãµes (stack, gap 12px, margem-top 16px): `âœ¨ Perguntar Ã  IA` (`AppButton` outline: borda `primary`, texto `primary`) e `âœŽ Propor alteraÃ§Ã£o` (solid: fundo `primary`, texto branco). `Propor` abre diff estruturado e sÃ³ aplica com confirmaÃ§Ã£o explÃ­cita (nunca aplica direto).

---

## 3. Guia de Ã­cones (fallback "Cida Icons")

### 3.1 Resultado da pesquisa

Pesquisa realizada em **npm** (`npmjs.com/search?q=cida icons`), **jsDelivr API** (`data.jsdelivr.com/v1/packages`) e CDN jsDelivr: **nenhum pacote pÃºblico `cida-icons` / `Cida Icons` foi encontrado** (npm retornou 403 na busca; jsDelivr API retornou 400 â€” sem correspondÃªncia). ConclusÃ£o: **nÃ£o existe dependÃªncia instalÃ¡vel**; usar **fallback 100% local**.

### 3.2 Fallback oficial: componentes Vue SVG inline

Criar `src/components/common/Icon*.vue`, estilo **outline, 1.5px, 20px, `stroke="currentColor"`**, herdando a cor do texto:

```vue
<!-- Exemplo: src/components/common/IconEye.vue -->
<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 20 });
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <!-- paths do Ã­cone -->
  </svg>
</template>
```

Props padrÃ£o de todos: `size` (default `20`). Nunca fixar `stroke` em cor â€” sempre `currentColor` para herdar contexto (ativo azul, muted cinza, Ã¢mbar/vermelho nos alertas).

### 3.3 CatÃ¡logo (nome â†’ uso â†’ forma sugerida)

| Componente | Uso | Desenho (paths 24Ã—24, stroke 1.5) |
|---|---|---|
| `IconMenu` | hambÃºrguer topbar | 3 linhas horizontais |
| `IconEye` | sidebar VisÃ£o | olho (elipse + cÃ­rculo pupila) |
| `IconCanvas` | sidebar Canvas (grade 2Ã—2) | 4 quadrados arredondados |
| `IconBacklog` | sidebar Backlog (lista) | 3 linhas + marcadores |
| `IconHand` | toolbar: pan | mÃ£o (path simplificado, estilo feather "hand") |
| `IconCursor` | toolbar: selecionar | seta cursor |
| `IconBranch` | toolbar/grafo: relaÃ§Ãµes | 2 cÃ­rculos + curva (git-branch) |
| `IconComment` | toolbar/comentar | balÃ£o |
| `IconFormat` | toolbar varinha/formatar | sparkle/varinha |
| `IconMinus` | toolbar remover | linha horizontal |
| `IconExpand` | toolbar expandir/minimap | 4 setas p/ fora |
| `IconSparkles` | `Perguntar Ã  IA` | 2 estrelas sparkle |
| `IconShield` | nÃ³ `ConfirmaÃ§Ã£o idempotente` | escudo + check |
| `IconDoc` | nÃ³ doc/feature genÃ©rica | documento + linhas |
| `IconPlus` | nÃ³ `Criar cobranÃ§a Pix` | quadrado + `+` |
| `IconWarning` | alertas/stale/impacto | triÃ¢ngulo + `!` |
| `IconUsers` | contador pessoas | 2 silhuetas |
| `IconSearch` | busca | lupa |
| `IconClose` | fechar painel | `Ã—` |
| `IconCheck` | `Aprovada` | cÃ­rculo + check |
| `IconEdit` | `Propor alteraÃ§Ã£o` | lÃ¡pis |
| `IconChevronRight` | breadcrumb `â€º`, alerta `â€º` | chevron |
| `IconCollapse` | colapso sidebar `<` | chevron-left em cÃ­rculo |

Qualquer Ã­cone novo segue o mesmo contrato (arquivo `Icon<Nome>.vue`, props `size`, `aria-hidden` por padrÃ£o, `aria-label` quando for botÃ£o standalone).

### 3.4 Como trocar pelo pacote oficial se surgir

1. Instalar o pacote (`npm i <nome-oficial>`) e mapear: cada `Icon*.vue` passa a reexportar o componente oficial com as mesmas props (`size`), mantendo os nomes â€” **nenhum import nos views/components muda**.
2. Se o pacote oficial tiver estilo/preenchimento diferente, ajustar sÃ³ os wrappers (stroke-width/size) atÃ© o PNG voltar a bater.
3. Remover os SVGs inline apenas apÃ³s revisÃ£o visual completa do checklist CAN-1/DET-1 do plano.

---

## 4. Estados visuais por gate/estado, responsividade e acessibilidade

### 4.1 Estados (cores + badge + comportamento no Canvas)

| Estado | Badge | Card | Regra |
|---|---|---|---|
| `draft` Rascunho | neutra cinza `Rascunho` | borda `border` normal | editÃ¡vel por quem tem `editar` |
| `review` Em revisÃ£o | azul-clara `Em revisÃ£o` | borda azul-clara + selo suave | ediÃ§Ã£o restrita; `Aprovar gate` abre checklist |
| `approved` Aprovado | verde `Aprovada` | selo `âœ”` verde no painel; sem mudanÃ§a no card | ediÃ§Ã£o direta bloqueada â†’ cria rascunho derivado |
| `baseline` Baseline | verde sÃ³lida `Baseline` | igual a aprovado + cadeado sutil | imutÃ¡vel; sÃ³ nova versÃ£o via proposta |
| `stale` Desatualizado | Ã¢mbar `âš  Desatualizada` | dashed Ã¢mbar + fundo `#FFFBEB` | exibe causa + nÂº de dependentes; `Ver impacto` destaca subgrafo |
| `bloqueado` Bloqueado | vermelha `Bloqueado` | borda vermelha + `BlockedReason` (motivo + owner) | qualquer avanÃ§o travado atÃ© resolver |

Gates usam a mesma linguagem: pill `G1â€“G4` na sidebar (ativo = azul sÃ³lido; com bloqueio = ponto vermelho; aprovado = check verde).

### 4.2 Responsividade

| Breakpoint | Layout |
|---|---|
| `â‰¥1280px` | 3 colunas: sidebar 220px + canvas fluido + painel 340px (protÃ³tipo integral) |
| `768â€“1279px` | sidebar colapsada (Ã­cones) + canvas + painel vira drawer sobre o canvas (abre por seleÃ§Ã£o, fecha com `Ã—`/Esc) |
| `<768px` | stack: topbar compacta (logo + busca Ã­cone + alerta Ã­cone) â†’ breadcrumb â†’ canvas (scroll horizontal) â†’ detalhe em folha inferior; toolbar vira barra horizontal |

Nenhum conteÃºdo some: o que colapsa vira drawer/folha com o mesmo conteÃºdo e foco gerenciado.

### 4.3 Acessibilidade

- **Foco visÃ­vel**: `outline: 2px solid #1D4ED8; outline-offset: 2px` em todos os interativos (nunca remover sem substituto).
- **ARIA**: nÃ³s do Canvas como `role="button"` com `aria-label="<tÃ­tulo>, <tipo>, <estado>"`; tabs com `role="tablist/tab/tabpanel"`; banners de impacto com `role="alert"`; badges decorativas com `aria-hidden`.
- **Contraste**: texto normal â‰¥ 4.5:1 (slate-900/500 sobre branco OK; Ã¢mbar `#B45309` sobre `#FFFBEB` OK â€” nÃ£o usar amarelo claro como texto).
- **Teclado no Canvas**: `Tab` percorre nÃ³s â†’ `Enter` seleciona (abre painel) â†’ `Enter` de novo ou `F2`/duplo-clique-equivalente aprofunda â†’ `Esc` fecha painel/paleta â†’ setas movem seleÃ§Ã£o entre vizinhos â†’ `âŒ˜K/Ctrl+K` busca.
- **Movimento**: respeitar `prefers-reduced-motion` (desligar transiÃ§Ãµes de zoom/seleÃ§Ã£o).

---

## 5. Specs de interação do canvas (ZERO MOCK — comportamento implementado)

### 5.1 Handles e conexão
- 4 handles por nó (topo/fundo/esq/dir): círculos 12px, borda 2px `#1D4ED8`, fundo branco; invisíveis até hover/foco/seleção.
- Arrastar de handle a handle cria aresta do tipo do seletor (contem/realiza/consome/valida/restringe/impacta); linha fantasma tracejada segue o mouse.
- Arestas: Bézier com seta (`marker`); cor por tipo (contem cinza, realiza/consome azul, valida verde, restringe vermelho, impacta âmbar); valida/restringe/impacta tracejadas `6 4`; clique seleciona (hit-area 16px); Delete remove.

### 5.2 Snap, guides e tidy
- Snap em grade 4px no mover/criar; `Ctrl+drag` desliga (valor arredondado 1px).
- Nudge por setas 1px, `Shift+setas` 8px.
- Tidy: reorganiza em grade (3 colunas x 340px, linhas x 300px) com undo.

### 5.3 Minimap e viewport
- Minimap SVG 180x110: retângulos por nó (azul selecionado, âmbar stale, cinza demais); clique recentraliza o viewport.
- Viewport: pan por arrasto do fundo (ferramenta hand ou Space), wheel = pan, `Ctrl+wheel` = zoom 0.4–2, botões `+/-/0(fit)`, duplo-clique no vazio cria nó.

### 5.4 Preview, layers e seleção
- Preview (`P`): clique no nó seleciona + aprofunda (tap-through); badge visível; edição continua via teclado só fora do preview.
- Layers: `z` persistido; ordem de pintura por `z`; ações frente/trás/topo/fundo via store (`reorderZ`); grupos via `grupo` (agrupar/desagrupar multi-seleção).
- Multi-seleção: `Shift+clique` alterna; caixa de seleção por arrasto no fundo (ferramenta select); barra mostra agrupar/desagrupar/limpar.

### 5.5 Painel, prompt e share
- Painel 340px (`DetailPanel`): tabs com `role=tablist`; Propor gera diff explícito; Aceitar cria nova versão + auditoria.
- Prompt output: seletor todo/seleção, alvo Vue/Ruby, idioma PT/EN, textarea editável; conteúdo 100% derivado do grafo (sem texto fixo além de labels).
- Share-link: hash base64url do JSON `{v, nos:[{id,x,y,z}], sel}`; ao abrir, `aplicarLayout` reconstrói posições.
- PNG: snapshot SVG (cards + arestas + cores por tipo) rasterizado em canvas 1400x900 e baixado como `nexo-canvas.png`.
