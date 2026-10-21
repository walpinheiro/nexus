# pen.dev — Levantamento completo (navegação real via Playwright em https://www.pen.dev/ + https://docs.pen.dev)

Data: 18/09/2026. Método: snapshot da home, troca das 3 abas de demo (Website / Mobile App / Socials & Marketing), leitura do texto da página e das docs (interface, .pen format, AI integration, design↔code, installation, AI agents & skills).

## 1. O que é / posicionamento

- pen.dev = "agentic canvas for building bold ideas" (título da página: "pen.dev – An agentic canvas for building bold software").
- H1: "pen.dev is an agentic canvas for building bold ideas." CTA: "Download for Windows" (+ link /downloads).
- Empresa: High Agency Inc. © 2026. Selo "Backed by a16z speedrun".
- Proposta: canvas de design vetorial onde **agentes de IA desenham direto no canvas**; o humano refina manualmente ou dispara agentes; depois exporta de volta para código ("Design with agents, refine every detail on canvas, and ship it back to code", "Start building your ideas today").
- Três histórias (tabs "Choose a story"): Website, Mobile App, Socials & Marketing. Cada uma troca o iframe de demo.
- Seção "Never start from scratch. Import any part of any app onto the canvas." + vídeo demo de import.
- Seção "Made in pen.dev." (galeria).
- Seção "Bring any model to the canvas": Claude, Open AI, Grok, Qwen, Gemini, Kimi, Deepseek, Minimax. Texto: "Use with ChatGPT or Claude subscription, add API keys or connect via MCP, WebMCP or CLI." + "Design with agents directly on the canvas. Refine manually or fire up agents."
- Blocos: "Vibe Shaders. Create stunning visual effects with shaders." / "AI Pen. Draw icons and illustrations with agents." / "Design via MCP in addition to the on-canvas agent. Connect Claude Code, Codex, Hermes, Antigravity, Cursor or any agent to pen.dev through MCP." / "You can also design headlessly with pen.dev CLI."
- Região "All features" ("The design features you expect. Feel like at home.") com ~28 artigos (lista completa no §3).
- Região performance: "Killer performance. 10000 photos, 10GB of content, 60fps, no problem." (pipeline WebGL próprio).
- Header/nav: pen.dev home, Downloads, Pricing, Docs (docs.pen.dev), X, Discord, Sign in (/login), Download (/downloads), Dark mode switch, Open menu, Skip to content.
- Footer: "Built different. Designed to ship.", links X/Discord, OpenVSX, Add to Cursor, Add to VS Code, Sub-processors, Privacy, Terms, EULA.

## 2. Funcionalidade (o que faz)

1. **Canvas vetorial infinito** com frames, grupos, formas, texto, ícones, browser embutido, scripts e refs.
2. **Agentes no canvas**: composer com prompt, seleção vira contexto, anexos (imagem/arquivo), sessões, múltiplos modelos, agentes paralelos (Split Work / Side by Side, 1–6 agentes), variantes (Layout/Style, "Let it cook"), skills via `/` ou SKILL.md próprio, permissões (Allow/Deny, Auto, Dangerously skip), custo/tokens visíveis.
3. **Design ↔ Code (two-way)**: gera código a partir do desenho (React/Next/Vue/Svelte/HTML, Tailwind/CSS Modules/Styled, shadcn/Radix/Chakra/MUI) e importa código existente para o canvas; sync de variáveis CSS ↔ pen.dev; `.pen` no repo junto do código.
4. **Import**: Figma (.fig, copy/paste), qualquer webpage via browser embutido / extensão Chrome / HTML import ("Never start from scratch").
5. **Export**: frame → HTML + Tailwind em 1 clique (painel Code), PNG/JPEG/WEBP/PDF 1x–3x, Copy/Export HTML, share por link.
6. **Sistema de design**: Components (reusable + instances + overrides + nesting + children replace), Slots, Variables + Themes, Libraries, "Build a small design system", Component Slots, design skills embutidas.
7. **Ferramentas de desenho**: Pen tool (paths, curvas, paste SVG), Gradients (linear/radial/angular/mesh), Effects (blur, sombra, layer blur), Shaders/Vibe Shaders em tempo real, AI Pen (ícones/ilustrações por agente), Scale, Measurements, Snapping, Pixel grid, Flex layout (Fill/Hug/Absolute, Gap/Padding), Camadas completas, Slides/Presentation mode.
8. **Performance**: WebGL próprio, milhares de layers a 60fps.
9. **Formato aberto `.pen`**: JSON puro (árvore de objetos com id/type/x/y, layout flex, fills/strokes/effects, variáveis, temas, components/instances/slots) — agentes trabalham nativamente; schema TypeScript público; CLI headless (`pen version`, agentes headless).

## 3. Como funciona (fluxos)

- **Novo design**: Download app (macOS DMG, Windows installer, Linux AppImage/tarball x64+ARM) ou extensão IDE (VS Code/Cursor, "pen.dev: Toggle Design Mode") ou `npm install -g @pen.dev/cli` (Node ≥22.19). Criar/abrir `.pen`; `Cmd/Ctrl+K` abre o chat; pedir ("Create a landing page component with Tailwind CSS"); revisar; `Cmd/Ctrl+S`.
- **Editar com agente**: selecionar layers (viram contexto) → descrever → agente altera; sessões no tab Agent; Stop generation mantém o feito; Undo/Ctrl+Z.
- **Paralelos**: ⚡ Parallel agents, 1–6, Split Work (dividir) ou Side by Side (alternativas); Let it cook (Layout/Style, 2–6 variantes).
- **Skills**: `/` ou Add to context → Pick a skill; SKILL.md próprio via "Add SKILL.md file…".
- **Import web**: abrir página no browser embutido/extensão → colar no canvas como layers editáveis.
- **Export código**: painel Code do frame → Copy/Export HTML → ou pedir ao agente ("Generate Next.js 14 code with Tailwind CSS", "Use shadcn/ui", "Export using Lucide icons").
- **Sync**: `.pen` no repo; prompts de import/export de tokens (`Create pen.dev variables from my globals.css`).
- **Canvas**: Space+drag pan (mouse), 2 dedos/pinch (trackpad), Cmd/Ctrl+scroll zoom; Shift+scroll pan horizontal; Cmd/Ctrl+0 = 100%, Shift+1 = fit, Shift+2 = seleção; clique seleciona (azul = comum, magenta = source, violeta = instância); Cmd/Ctrl+clique = deep select; Shift+clique adiciona; Cmd/Ctrl+A tudo; Enter desce, Shift+Enter sobe; Cmd/Ctrl+G agrupa, Cmd/Ctrl+Option/Alt+G vira frame; Shift+A flex; Fill/Hug/Absolute; Clip Content.
- **Headless/CLI**: `pen` + MCP server `pencil` com tools `get_style`, `read_skill`, `get_app_state`, `execute`, `browser` (só desktop), `spawn_agents` (só com flag).

## 4. Como integra

| Via | Como | Detalhe observado |
|---|---|---|
| Desktop app | Download /downloads (Win/macOS/Linux) | Host do MCP server `pencil`; Settings ⚙️ → MCP lista integrações |
| IDE extension | VS Code/Cursor, OpenVSX, marketplace | Abre `.pen` no IDE; usa o chat do IDE + MCP |
| MCP externo | Settings → MCP, habilitar cliente, restart | Suporta Claude Code CLI, Codex CLI, Gemini CLI, Antigravity 2.0, OpenCode CLI, Kiro CLI, Claude Desktop, ChatGPT desktop/Codex IDE (mesma entrada Codex CLI) |
| ChatGPT/Codex | Mesma config MCP do Codex CLI | Confirmar `pencil` na lista MCP do cliente |
| WebMCP / CLI | Citado na home | "connect via MCP, WebMCP or CLI"; CLI `pen` headless |
| Modelos | Assinatura ChatGPT/Claude, API keys, ou MCP | Providers: OpenAI, Claude, Gemini, DeepSeek (+ Grok, Qwen, Kimi, Minimax na home) |
| Código | `.pen` no workspace + agente com acesso aos dois | Import/export React/Next/Vue/Svelte/Tailwind/shadcn/Lucide etc. |
| Ícones | Built-in: Material Symbols (Outlined/Rounded/Sharp), Lucide, Feather, Phosphor + SVG próprio | No código, pedir a lib ("Generate this design using Lucide icons") |
| Compartilhar | Share by link | Abre a versão atual no browser |

## 5. Visual (disposição observada no demo incorporado)

Demo = app real em iframe com 3 histórias (Website: Landing page / Mobile / Showcase / Wide hero com shader "thermal eclipse"; Mobile App: telas Silver Coffee 390×847 + painel Components com busca e 20+ componentes Default/Dark; Socials: análogo).

- **Esquerda**: tabs Agent | Layers | Slides | Components | Libraries. Abaixo: lista (New Agent / + New) ou busca de componentes; área do agente: "Boards are done. Select one and ask for a change..." + botões de sugestão ("Add a pink glow to the landing", "Lift the mobile off the canvas", "Make the wide hero mono", "Glow the showcase frame"); composer no rodapé (prompt + / + / 1x / 1x / "Claude Opus 5" / Send).
- **Topo do canvas**: "pen.dev", arquivo "meet.cptr — Auto-saved", "Goodies", Share.
- **Toolbar vertical de ferramentas**: move, primitive, More shape tools, pen, text, frame, sticky, hand, variables, keyboard.
- **Zoom**: − / 100% / +.
- **Direita (Properties)**: Frame + Toggle properties + Create Component + Context; Alignment (6 botões); Position (X 320, Y 140, R 0°, Rotate 90°, Flip H/V); Layout (Free/Vertical/Horizontal, W 800 H 600, Fill Width/Height, Clip Content checked); Appearance (Opacity 100%, Corner radius 0, Individual corners); Fill (#FFFFFF, 100%, Remove); Stroke/Efeitos (Add); Code (HTML+Tailwind, Copy/Export HTML, Import Web via Browser); Export (1x, PNG, Export layer).
- **Abaixo**: agentes/modelos (Onyx·GPT 5.6 Sol, Drift·Claude Opus 5, Nova·Kimi K3, Echo·Fable 5, Flare·Gemini 3 Pro).
- Estética: fundo claro, pills arredondadas, tipografia geométrica, acento escuro; dark mode via switch no site.

## 6. O que permite (permissões/capacidades por plano de uso)

- **Gratuito/aberto**: formato `.pen` aberto com schema público; CLI via npm; extensão IDE; docs abertas; share por link; export PNG/JPEG/WEBP/PDF e HTML+Tailwind.
- **Com conta/subscrição**: agentes integrados (ChatGPT/Claude subscription ou API keys próprias); sessões, skills, variantes, permissões granulares, estimativa de custo.
- **Limites/avisos**: `browser` só no desktop; `spawn_agents` só com flag; undo foca canvas (não input); sem modelo = configurar provider; cliente errado = abrir o `.pen` certo e passar o path no prompt; breaking changes possíveis no formato (docs viva).
- **Relevante ao NEXO Studio**: tudo acima é reaproveitável como referência — composer com contexto de seleção, prompts exemplo por stack, tokens/variáveis two-way, formato JSON agente-nativo, e o padrão "desenha → gera código → importa código → sync".
