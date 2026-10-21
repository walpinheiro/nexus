# M3E Original — Disposição dos elementos (levantado via Playwright no portal https://lnkiai.github.io/m3e-canvas/)

Levantamento feito navegando de verdade no app original: snapshot inicial, clique em Layers, Colors, AI, Ask an AI (dialog aberto e fechado), Prompt (aba direita com prompt real), Shape, Type, Motion, Preview (modal aberto e fechado). Viewport 1440x900.

## 1. Visão geral — 3 colunas + barras flutuantes

```
┌──────────┬──────────────────────────────┬─────────────────────────┐
│ icon-rail│  CANVAS (main)               │ painel direito          │
│ vertical │  - toolbar pills flutuantes  │ (complementary)         │
│ 44px     │    no topo                   │ - header Edit | Prompt  │
│ + painel │  - phone Home 412x892        │ - conteúdo Edit ou      │
│ Parts/   │    com bezel escura grossa   │   Prompt                │
│ Layers/  │  - footer: zoom pill +       │                         │
│ Colors…  │    Ask an AI + tool pills    │                         │
└──────────┴──────────────────────────────┴─────────────────────────┘
```

## 2. Menu lateral esquerdo = icon-rail + painel (dois elementos)

### 2.1 Icon-rail vertical (e95) — 9 botões de 44px, só ícone

| # | Botão (nome) | Ícone Material Symbol | O que faz (observado) |
|---|---|---|---|
| 1 | Parts | add_box | Abre painel de parts (categorias + tiles). É o default |
| 2 | Layers | layers | Abre árvore z-order da tela |
| 3 | Colors | palette | Abre painel de cor: Brightness Light/Dark, Both, Contrast Standard, Palettes/Custom, 7 seeds (Purple pressionado, Blue, Green, Coral, Amber, Teal, Mono), Dynamic color + texto "When on, the phone uses wallpaper colors and these are the fallback." |
| 4 | Shape | rounded_corner | Corner roundness: Square / Rounded check (pressionado) / Full. Texto: "Changes the default corners of every part at once. A radius you typed on a part stays as it is." |
| 5 | Type | text_fields | Typeface: Aa Roboto check (pressionado) / Aa Roboto Flex / Aa Roboto Serif / Aa System + botão Emphasized (format_bold). Texto: "Headlines and labels use the heavier M3 Expressive styles." |
| 6 | Motion | animation | Motion scheme: Standard (pressionado) / Expressive. Texto: "Expressive is a bouncy spring. It drives the preview transitions and the prompt." + botão "Tap to try" (arrow_forward) |
| 7 | AI | auto_awesome | AI settings: Provider radio (OpenAI check / Claude / Gemini / DeepSeek), Model ID (texto, placeholder gpt-5.6-luna), Base URL (https://api.openai.com/v1), API key (sk-…) + link "Get a key" + "Stored only in this browser and sent straight to the provider." |
| 8 | Language | translate | (não aberto; pelo código-fonte é seletor JA/EN/ZH/KO) |
| 9 | GitHub (link) | — | Abre https://github.com/lnkiai/m3e-canvas em nova aba |

### 2.2 Painel Parts (e127) — quando Parts está ativo

- Header: título "Parts" + botão "Close panel" (left_panel_close) à direita.
- Busca: campo com ícone search + textbox "Search".
- 6 categorias colapsáveis, todas expandidas (expand_less), cada uma com botão header `ícone + Nome + expand_less`:
  - **Actions** (touch_app): Button (buttons_alt), Icon Button (radio_button_checked), FAB (add_circle), Split Button (splitscreen_right), Chip (label).
  - **Navigation** (explore): Top App Bar (toolbar), Navigation Bar (bottom_navigation), Navigation Rail (side_navigation), Toolbar (toolbar), Tabs (tab), Search Bar (search).
  - **Containment** (web_asset): Card (web_asset), List Item (list), Box (check_box_outline_blank), Dialog (chat_bubble), Snackbar (call_to_action).
  - **Inputs** (toggle_on): Text Field (text_fields), Dropdown (arrow_drop_down_circle), Switch (toggle_on), Checkbox (check_box), Radio Button (radio_button_checked), Slider (sliders), Date Picker (calendar_month), Time Picker (schedule).
  - **Content** (notes): Text (title), Image (image), Carousel (view_carousel), Camera (photo_camera), Map (map), Divider (horizontal_rule).
  - **Progress** (progress_activity): Loading (motion_blur), Progress (linear_scale).
- Cada tile = quadrado com **ícone grande do componente + label embaixo** + botão estrela "Add to favorites" (star) no canto. Tiles são arrastáveis para o canvas.

### 2.3 Painel Layers (quando Layers ativo) — árvore z-order

- Header "Layers" + Close panel.
- Lista (list): uma linha por run/grupo, cada linha = handle drag (drag_indicator) + botão com ícone+nome + botão Lock (lock_open) + chevron_right para abrir runs (ex.: "list item × 3", "button × 2" têm chevron).
- Linhas vistas: "bottom_navigation navigation bar", "add_circle edit", "list item × 3" (3 mini-ícones list), "button × 2" (2 mini-ícones buttons_alt), "toolbar Title".

## 3. Canvas central (main e347)

### 3.1 Label da tela (e349) — acima do phone

- Radio Phone (smartphone, checked) | Desktop (desktop_windows) + texto "Home".
- Trocar muda a moldura 412x892 ↔ 1280x800.

### 3.2 Phone Home (e357) — moldura com bezel escura grossa e cantos bem arredondados

De cima para baixo, conteúdo seed:
1. Top App Bar (e361): menu | Title | more_vert.
2. Connected button group (e367): Favorite com star (filled) + Share com share (tonal) — cantos internos shrink, externos pill.
3. Lista de 3 list items (e376): Inbox (inbox + Supporting text + chevron_right), Starred (star + …), Archive (archive + …).
4. FAB edit (e401) flutuante à direita.
5. Navigation Bar (e407): Home (home, selecionado) + Search + Saved (favorite) + Settings (settings). Ativo = pill secondaryContainer + ícone filled + label.

### 3.3 Footer do canvas — 3 grupos

- **Zoom pill** (e425): Zoom out (remove) | "100%" (ou 130%) | Zoom in (add) | Fit (fit_screen).
- **Ask an AI BETA** (e434): pílula à esquerda do centro; abre dialog (ver §5).
- **Tool pills** (sem pill visual única, 3 grupos inline):
  - Select (arrow_selector_tool, checked) | Hand (pan_tool) — radiogroup.
  - Add screen (add_to_photos) | Preview (play_arrow).
  - Undo (undo, disabled) | Redo (redo, disabled) | Clear canvas (delete_sweep) | Project (folder_open).

## 4. Painel direito (complementary e457) — header Edit | Prompt

- Header: radio Edit (tune, checked default) | Prompt (auto_awesome) + Close panel (right_panel_close).
- **Edit**: mostra Inspector do item selecionado; com nada selecionado mostra "ads_click" (ícone de clique).
- **Prompt** (e681): radio Android (android, checked) | Web (language); textbox "Prompt" com o prompt COMPLETO gerado (cores, shape, type, motion, layout por tela, component styles, general guidance); botões "Copy prompt" (content_copy) + "Edit full screen" (open_in_full).

## 5. Dialog "Ask an AI" (e664)

Aberto pelo botão do footer. Contém: título "Ask an AI" + BETA + botão "Copy link" (link); parágrafo explicativo ("Describe what you want and press Draft with AI: the model from the AI tab draws the design on the canvas. Or copy the instruction for an AI agent such as Claude Code; open the link it replies with, or save its JSON and load it with Open project."); textbox "What to build (e.g. an app to save and search recipes)" com foco; linha "Add a key to draft it right here" + botões "Copy the instruction" (content_copy) + "AI settings" (key); botão "Close".

## 6. Preview (modal)

Aberto pelo botão Preview da toolbar. Tela cheia escura: phone Home em moldura; rodapé do modal: Back (arrow_back, disabled na 1ª) | seletor de tela (smartphone Home + chevron_left) | Close (close). Botões invisíveis Home/Search/Saved/Settings navegam com transição; voltar reverte.

## 7. Tokens visuais observados

- Fundo do app: #FEF7FF (surface, medido via getComputedStyle).
- Fonte: Roboto + Material Symbols Rounded (opsz,wght,FILL,GRAD@24,400..700,0..1,0, display=block).
- Icon-rail: botões 44px circulares; ativo = pill secondaryContainer.
- Tiles: quadrados ~78px, ícone 24-28px + label 11-12px; grid 2 colunas por categoria.
- Phone: 412x892, bezel ~12px #111, raio ~40px. Desktop: 1280x800.
- Zoom pill, Ask-an-AI pill, tool pills: radius 20-28px, surfaceContainerLow, sombra leve.
- Transições: slide/fade/expand/none + spring Expressive (stiffness 360, damping 26 — do código-fonte).
