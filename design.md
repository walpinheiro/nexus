# NEXO — Guia de Design (implementação Vue + Tailwind, fiel ao protótipo)

> Referência visual normativa: `nexo-interface-proposal-static.png` (+ `nexo-logo.png` para a marca).
> Este arquivo é a especificação visual do front-end estático. Em caso de divergência com o PNG, **vale o PNG**.
> Todo texto de interface em PT-BR.

---

## 1. Tokens de design

### 1.1 Cores

| Token | Valor | Uso |
|---|---|---|
| `bg-canvas` / fundo app | `#F7F8FB` (slate-50-ish) | fundo do Canvas e da app |
| `surface` | `#FFFFFF` | cards, painel direito, topbar, sidebar |
| `primary` (azul primário) | `#1D4ED8` (blue-700) | botões solid, borda do nó selecionado, tab ativa, pill G2 ativo, links do breadcrumb atual |
| `primary-soft` | `#EFF6FF` (blue-50) | fundo do item `Canvas` ativo na sidebar, badge `Feature` azul |
| `text` | `#0F172A` (slate-900) | títulos, texto principal |
| `text-muted` | `#64748B` (slate-500) | descrições, placeholders, contadores |
| `border` | `#E2E8F0` (slate-200) | bordas de cards, divisórias, toolbar |
| `dot-grid` | `#E5E7EB` | pontilhado do fundo do Canvas (radial-gradient) |
| Aprovado / baseline (verde) | texto `#15803D`, fundo `#F0FDF4`, borda `#BBF7D0` | linha `✔ Aprovada · Gate 2`, selo de confirmação |
| Rascunho (neutro) | texto `#475569`, fundo `#F1F5F9`, borda `#E2E8F0` | badge neutra |
| Em revisão (destaque suave) | texto `#1D4ED8`, fundo `#EFF6FF`, borda `#BFDBFE` | badge de review |
| Desatualizado / aviso (âmbar) | texto `#B45309`/`#D97706`, borda `#F59E0B`, fundo `#FFFBEB` | card `Status de pagamento` dashed + badge `Desatualizada`, banner `Impacto alto detectado`, card `Impacto identificado` |
| Bloqueado (vermelho) | texto `#B91C1C`, fundo `#FEF2F2`, borda `#FECACA` | `BlockedReason`, gate bloqueado |
| Badge `Feature` teal (nó `Criar cobrança Pix`) | texto `#0F766E`, fundo `#F0FDF9`/`#ECFDF5` | variação aceita: manter teal só quando o PNG a exibe; padrão é azul |

Tailwind: estender em `tailwind.config.ts` (`colors.nexo.*`) ou usar classes `slate-*`/`blue-*`/`amber-*` equivalentes acima.

### 1.2 Tipografia

- Fonte: `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Títulos de card: `600 15px/1.35`, cor `text`.
- Título do painel (`Confirmação idempotente`): `700 18px`.
- Descrições: `400 13.5px/1.55`, cor `text-muted`.
- Badges/contadores: `500 12px`.
- Breadcrumb: `400 14px`; último nível `600` cor `primary`.

### 1.3 Raios, sombras, espaçamentos

- Cards do Canvas: raio `12px`, borda `1px solid border`, sombra sutil `0 1px 2px rgb(15 23 42 / 0.06), 0 4px 16px rgb(15 23 42 / 0.06)`.
- Badges: raio `8px`, padding `2px 8px`.
- Botões: raio `6px`, altura `44px` no painel direito; fonte `600 14px`.
- Sidebar: largura `220px`. Painel direito: largura `340px`. Toolbar vertical: `~48px` com raio `12px`.
- Cards do Canvas: largura `260–300px`, padding `16px`, gap título→desc `8px`.

---

## 2. Mapeamento pixel-a-pixel do protótipo

Leitura do PNG da esquerda para a direita, de cima para baixo. Cada item indica o componente Vue correspondente (nomes do `docs/PLANO-IMPLEMENTACAO.md`).

### 2.1 Topbar (`Topbar.vue`, altura ~64px, fundo branco, borda inferior `border`)

| Elemento | Especificação |
|---|---|
| Hambúrguer + logo | ícone menu (`IconMenu`, 20px) + palavra `NEXO` em `800 26px`, tracking apertado; `X` com detalhe azul→roxo (ver `nexo-logo.png`; simplificar em SVG/texto, sem rasterizar o PNG) |
| Breadcrumb (`Breadcrumb.vue`) | `Cobranças › Pagamento por Pix › Feature`; separador `›` em `text-muted`; dois primeiros níveis clicáveis (sobe zoom); último em `primary 600` (nível atual) |
| Busca (`SearchPalette.vue`) | campo central `~300px`, placeholder `Buscar no NEXO`, ícone lupa à esq., kbd `⌘K` à dir. (fundo slate-100, raio 6px); abre paleta com `Ctrl/⌘+K`, `/` ou clique |
| Alerta (`ImpactBanner.vue`) | pill âmbar: `⚠ Impacto alto detectado ›`; fundo `#FFFBEB`, borda `#FDE68A`, texto `#B45309 600 13px`; clique seleciona o nó `Status de pagamento` e abre tab Impacto |

### 2.2 Sidebar (`Sidebar.vue`, 220px, fundo branco, borda direita)

- Itens principais com ícone 20px + label 14px, altura 40px, raio 8px: `Visão` (`IconEye`), `Canvas` (`IconCanvas`, **ativo**: fundo `primary-soft`, texto `primary 600`), `Backlog` (`IconBacklog`).
- Seção `GATES` (label `11px uppercase tracking` em `text-muted`): `G1 Épicos`, `G2 Features` (**ativo**: pill circular azul `G2` branco + label `primary 600` + barra lateral azul 3px), `G3 Arquitetura`, `G4 PBIs`. Cada linha: círculo `28px` com sigla + label. (G0/G5 existem nas rotas, mas a sidebar exibe G1–G4 como no PNG.)
- Rodapé: botão circular colapso `<` (borda `border`, 28px).

### 2.3 Toolbar vertical (`CanvasToolbar.vue`)

Coluna branca, raio 12px, borda `border`, ícones 20px empilhados com gap 4px, padding 6px: mão (`IconHand`, ativa em azul), cursor (`IconCursor`), branch/nós (`IconBranch`), comentário (`IconComment`), magic/format (`IconSparkles`-variação), remover (`IconMinus`), expandir (`IconExpand`). Tooltips em PT-BR (`title`).

### 2.4 Canvas (`NexpoCanvas.vue` + `CanvasNode.vue` + `CanvasEdge.vue`)

- Fundo `bg-canvas` com grid pontilhado (`radial-gradient(dot-grid 1px, transparent 1px)`, size 20px).
- **Card padrão** (260–300px, branco, raio 12px, padding 16px):
  - ícone quadrado arredondado 32px no topo (azul-claro p/ `Pagar fatura com Pix`, teal-claro p/ `Criar cobrança Pix`, âmbar-claro p/ `Status de pagamento`, escudo azul p/ `Confirmação idempotente`);
  - título `600 15px text`;
  - descrição `13.5px text-muted` (textos exatos do PNG — ver checklist CAN-1 do plano);
  - rodapé: badge `Feature` (raio 8px) à esq. + contador `👥 N` (`IconUsers` + número, `text-muted 12px`) à dir.
- **Nó selecionado** (`Confirmação idempotente`, centro): borda `2px solid primary` + glow `0 0 0 4px rgb(29 78 216 / 0.12)`; botão `···` no canto superior direito; 4 handles (círculos brancos borda azul, 12px) nos 4 lados.
- **Nó desatualizado** (`Status de pagamento`, abaixo do centro): borda `1.5px dashed #F59E0B`, fundo `#FFFBEB`-claro; badge âmbar `⚠ Desatualizada`; título com ícone `⚠` âmbar à esq.
- **Arestas** (`CanvasEdge.vue`): paths Bézier azuis `#1D4ED8` 2px com handles circulares nas extremidades; tipos futuros: `contém` sólida cinza, `realiza` sólida azul, `consome` sólida azul-clara, `valida` tracejada verde, `restringe` tracejada vermelha, `impacta` tracejada âmbar (legenda na vista Backlog/Gates).

### 2.5 Painel direito (`GatePanel.vue` / painel de detalhe, 340px, branco, borda esquerda)

- Cabeçalho: título `700 18px` + botão `×` (fecha painel, mantém seleção/não — fechar limpa seleção).
- Linha de estado: `✔` verde + `Aprovada` (`600 text`) + `· Gate 2` (`primary 600`).
- Tabs: `Detalhes` (ativa: texto `primary 600` + underline 2px `primary`) / `Copilot` / `Impacto` (`500 text-muted`).
- Corpo Detalhes: subtítulo `Descrição da regra` (`600 14px`) + parágrafo idempotência/idTx (`13.5px/1.6 text`); divisória; card âmbar `Impacto identificado` (ícone `⚠`, título `600`, texto `3 features, 2 serviços e 4 PBIs.`, seta `›` à dir. — clique abre tab Impacto).
- Ações (stack, gap 12px, margem-top 16px): `✨ Perguntar à IA` (`AppButton` outline: borda `primary`, texto `primary`) e `✎ Propor alteração` (solid: fundo `primary`, texto branco). `Propor` abre diff estruturado e só aplica com confirmação explícita (nunca aplica direto).

---

## 3. Guia de ícones (fallback "Cida Icons")

### 3.1 Resultado da pesquisa

Pesquisa realizada em **npm** (`npmjs.com/search?q=cida icons`), **jsDelivr API** (`data.jsdelivr.com/v1/packages`) e CDN jsDelivr: **nenhum pacote público `cida-icons` / `Cida Icons` foi encontrado** (npm retornou 403 na busca; jsDelivr API retornou 400 — sem correspondência). Conclusão: **não existe dependência instalável**; usar **fallback 100% local**.

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
    <!-- paths do ícone -->
  </svg>
</template>
```

Props padrão de todos: `size` (default `20`). Nunca fixar `stroke` em cor — sempre `currentColor` para herdar contexto (ativo azul, muted cinza, âmbar/vermelho nos alertas).

### 3.3 Catálogo (nome → uso → forma sugerida)

| Componente | Uso | Desenho (paths 24×24, stroke 1.5) |
|---|---|---|
| `IconMenu` | hambúrguer topbar | 3 linhas horizontais |
| `IconEye` | sidebar Visão | olho (elipse + círculo pupila) |
| `IconCanvas` | sidebar Canvas (grade 2×2) | 4 quadrados arredondados |
| `IconBacklog` | sidebar Backlog (lista) | 3 linhas + marcadores |
| `IconHand` | toolbar: pan | mão (path simplificado, estilo feather "hand") |
| `IconCursor` | toolbar: selecionar | seta cursor |
| `IconBranch` | toolbar/grafo: relações | 2 círculos + curva (git-branch) |
| `IconComment` | toolbar/comentar | balão |
| `IconFormat` | toolbar varinha/formatar | sparkle/varinha |
| `IconMinus` | toolbar remover | linha horizontal |
| `IconExpand` | toolbar expandir/minimap | 4 setas p/ fora |
| `IconSparkles` | `Perguntar à IA` | 2 estrelas sparkle |
| `IconShield` | nó `Confirmação idempotente` | escudo + check |
| `IconDoc` | nó doc/feature genérica | documento + linhas |
| `IconPlus` | nó `Criar cobrança Pix` | quadrado + `+` |
| `IconWarning` | alertas/stale/impacto | triângulo + `!` |
| `IconUsers` | contador pessoas | 2 silhuetas |
| `IconSearch` | busca | lupa |
| `IconClose` | fechar painel | `×` |
| `IconCheck` | `Aprovada` | círculo + check |
| `IconEdit` | `Propor alteração` | lápis |
| `IconChevronRight` | breadcrumb `›`, alerta `›` | chevron |
| `IconCollapse` | colapso sidebar `<` | chevron-left em círculo |

Qualquer ícone novo segue o mesmo contrato (arquivo `Icon<Nome>.vue`, props `size`, `aria-hidden` por padrão, `aria-label` quando for botão standalone).

### 3.4 Como trocar pelo pacote oficial se surgir

1. Instalar o pacote (`npm i <nome-oficial>`) e mapear: cada `Icon*.vue` passa a reexportar o componente oficial com as mesmas props (`size`), mantendo os nomes — **nenhum import nos views/components muda**.
2. Se o pacote oficial tiver estilo/preenchimento diferente, ajustar só os wrappers (stroke-width/size) até o PNG voltar a bater.
3. Remover os SVGs inline apenas após revisão visual completa do checklist CAN-1/DET-1 do plano.

---

## 4. Estados visuais por gate/estado, responsividade e acessibilidade

### 4.1 Estados (cores + badge + comportamento no Canvas)

| Estado | Badge | Card | Regra |
|---|---|---|---|
| `draft` Rascunho | neutra cinza `Rascunho` | borda `border` normal | editável por quem tem `editar` |
| `review` Em revisão | azul-clara `Em revisão` | borda azul-clara + selo suave | edição restrita; `Aprovar gate` abre checklist |
| `approved` Aprovado | verde `Aprovada` | selo `✔` verde no painel; sem mudança no card | edição direta bloqueada → cria rascunho derivado |
| `baseline` Baseline | verde sólida `Baseline` | igual a aprovado + cadeado sutil | imutável; só nova versão via proposta |
| `stale` Desatualizado | âmbar `⚠ Desatualizada` | dashed âmbar + fundo `#FFFBEB` | exibe causa + nº de dependentes; `Ver impacto` destaca subgrafo |
| `bloqueado` Bloqueado | vermelha `Bloqueado` | borda vermelha + `BlockedReason` (motivo + owner) | qualquer avanço travado até resolver |

Gates usam a mesma linguagem: pill `G1–G4` na sidebar (ativo = azul sólido; com bloqueio = ponto vermelho; aprovado = check verde).

### 4.2 Responsividade

| Breakpoint | Layout |
|---|---|
| `≥1280px` | 3 colunas: sidebar 220px + canvas fluido + painel 340px (protótipo integral) |
| `768–1279px` | sidebar colapsada (ícones) + canvas + painel vira drawer sobre o canvas (abre por seleção, fecha com `×`/Esc) |
| `<768px` | stack: topbar compacta (logo + busca ícone + alerta ícone) → breadcrumb → canvas (scroll horizontal) → detalhe em folha inferior; toolbar vira barra horizontal |

Nenhum conteúdo some: o que colapsa vira drawer/folha com o mesmo conteúdo e foco gerenciado.

### 4.3 Acessibilidade

- **Foco visível**: `outline: 2px solid #1D4ED8; outline-offset: 2px` em todos os interativos (nunca remover sem substituto).
- **ARIA**: nós do Canvas como `role="button"` com `aria-label="<título>, <tipo>, <estado>"`; tabs com `role="tablist/tab/tabpanel"`; banners de impacto com `role="alert"`; badges decorativas com `aria-hidden`.
- **Contraste**: texto normal ≥ 4.5:1 (slate-900/500 sobre branco OK; âmbar `#B45309` sobre `#FFFBEB` OK — não usar amarelo claro como texto).
- **Teclado no Canvas**: `Tab` percorre nós → `Enter` seleciona (abre painel) → `Enter` de novo ou `F2`/duplo-clique-equivalente aprofunda → `Esc` fecha painel/paleta → setas movem seleção entre vizinhos → `⌘K/Ctrl+K` busca.
- **Movimento**: respeitar `prefers-reduced-motion` (desligar transições de zoom/seleção).

---

## 5. Specs de intera��o do canvas (ZERO MOCK � comportamento implementado)

### 5.1 Handles e conex�o
- 4 handles por n� (topo/fundo/esq/dir): c�rculos 12px, borda 2px `#1D4ED8`, fundo branco; invis�veis at� hover/foco/sele��o.
- Arrastar de handle a handle cria aresta do tipo do seletor (contem/realiza/consome/valida/restringe/impacta); linha fantasma tracejada segue o mouse.
- Arestas: B�zier com seta (`marker`); cor por tipo (contem cinza, realiza/consome azul, valida verde, restringe vermelho, impacta �mbar); valida/restringe/impacta tracejadas `6 4`; clique seleciona (hit-area 16px); Delete remove.

### 5.2 Snap, guides e tidy
- Snap em grade 4px no mover/criar; `Ctrl+drag` desliga (valor arredondado 1px).
- Nudge por setas 1px, `Shift+setas` 8px.
- Tidy: reorganiza em grade (3 colunas x 340px, linhas x 300px) com undo.

### 5.3 Minimap e viewport
- Minimap SVG 180x110: ret�ngulos por n� (azul selecionado, �mbar stale, cinza demais); clique recentraliza o viewport.
- Viewport: pan por arrasto do fundo (ferramenta hand ou Space), wheel = pan, `Ctrl+wheel` = zoom 0.4�2, bot�es `+/-/0(fit)`, duplo-clique no vazio cria n�.

### 5.4 Preview, layers e sele��o
- Preview (`P`): clique no n� seleciona + aprofunda (tap-through); badge vis�vel; edi��o continua via teclado s� fora do preview.
- Layers: `z` persistido; ordem de pintura por `z`; a��es frente/tr�s/topo/fundo via store (`reorderZ`); grupos via `grupo` (agrupar/desagrupar multi-sele��o).
- Multi-sele��o: `Shift+clique` alterna; caixa de sele��o por arrasto no fundo (ferramenta select); barra mostra agrupar/desagrupar/limpar.

### 5.5 Painel, prompt e share
- Painel 340px (`DetailPanel`): tabs com `role=tablist`; Propor gera diff expl�cito; Aceitar cria nova vers�o + auditoria.
- Prompt output: seletor todo/sele��o, alvo Vue/Ruby, idioma PT/EN, textarea edit�vel; conte�do 100% derivado do grafo (sem texto fixo al�m de labels).
- Share-link: hash base64url do JSON `{v, nos:[{id,x,y,z}], sel}`; ao abrir, `aplicarLayout` reconstr�i posi��es.
- PNG: snapshot SVG (cards + arestas + cores por tipo) rasterizado em canvas 1400x900 e baixado como `nexo-canvas.png`.
