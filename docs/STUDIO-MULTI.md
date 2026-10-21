# STUDIO-MULTI — Várias pessoas no mesmo Studio, cada uma com sua IA; visual/disposição/output = M3E

Objetivo do usuário: **como no pen.dev, várias pessoas trabalham no mesmo Studio, cada uma com sua IA** — mas **visual, disposição e output do prompt como o M3E** (`docs/M3E-FIEL.md`).

## 1. Direção (o que NÃO muda)

- Layout normativo M3E: icon-rail 44px (9 botões) + painel Parts/Layers/Colors/Shape/Type/Motion/AI + Canvas central (label Phone|Desktop, phone 412x892 bezel, footer zoom pill + Ask an AI + tool pills) + painel direito Edit|Prompt + Preview modal + dialog Ask an AI. Ver `docs/M3E-FIEL.md` §§1–7.
- Sem backend: tudo em `localStorage` (`nexo.v1.*`). Multi-user = **presença simulada local** (mesmo doc compartilhado), sem websocket.
- Sem React/Next. Stack Vue 3 + TS + Tailwind + Pinia. `npm run build` (`vue-tsc --noEmit && vite build`) sempre verde; dev 200 em `/` e `/studio-full`.

## 2. O que implementar (3 frentes paralelas)

### Frente A — Presença multi-user (estilo pen.dev, pele M3E)
- `stores/studioPresence.ts` (novo, persistido `nexo.v1.studio.presence.v1`): roster a partir dos 7 papéis seed (`stores/users.ts`); cada colaborador = `{ userId, name, initials, color, online, cursor: {frameId, x, y} | null, selection: nodeIds[], agent: {provider, model} }`.
- UI mínima sem quebrar o chrome M3E:
  - Avatar-stack no header do Studio (canto direito, antes do menu): círculos com iniciais + anel da cor + dot online; tooltip nome + modelo da IA; botão "Convidar" abre popover com lista dos 7 papéis (toggle online/offline).
  - Faixa de agentes (como a strip "Onyx·GPT / Drift·Claude" do pen.dev) **dentro do dialog Ask an AI + aba Prompt**: seletor "Desenhando como: [avatar Nome — Model]" — o prompt gerado carrega a assinatura do autor sem mudar o formato M3E.
  - Cursores remotos no `StudioStage.vue`: 2–3 cursores simulados (nome + seta na cor do user) que se movem por `requestAnimationFrame` quando há >1 online; nunca interceptam clique (`pointer-events-none`).
  - Feed "Atividade" (tab ou seção colapsada no painel Layers): "Forja · gerou prompt via Claude · há 2 min".
- Seed: 3 online default (ex.: você + 2 papéis), demais offline convidáveis.

### Frente B — Uma IA por pessoa (tubo por autor)
- Estender `AiTube.vue`/`studioDraft.ts`: cada geração registra `{ authorUserId, provider, model, prompt, result, at }`; Undo por autor (10 passos globais mantidos); aba Prompt mostra "gerado por Nome · Model".
- Dialog Ask an AI: seletor de autor (avatar) + provider radio (OpenAI/Claude/Gemini/DeepSeek, como aba AI do M3E) espelhando o provider do autor; "Draft with AI" gera no nome do autor selecionado.
- Sem rede: mantém regras locais (`studioDraft.ts`); provider/model são metadados que entram no prompt gerado (ex.: linha `Author: Nome (Model)` no topo, resto idêntico ao M3E).

### Frente C — Paridade visual/output M3E (trava anti-regressão)
- Nenhuma mudança de disposição: icon-rail, panels, phone, footer pills, Edit|Prompt, Preview, dialog — tudo conforme `M3E-FIEL.md`.
- Output do Prompt tab: mantém radio Android|Web + textbox completo (cores, shape, type, motion, layout, component styles, guidance) + Copy + Edit fullscreen; só acrescenta 1 linha de autoria.
- Lucide no NEXO, `.msr` Material Symbols no Studio (regra vigente). Grep zero de emojis proibidos.

## 3. Critérios de aceite (para a Lupa, via portais)

Portais: `NexoAtual` (http://127.0.0.1:5173, rota `/studio-full`) × `M3EOriginal` (https://lnkiai.github.io/m3e-canvas/).
Comparar lado a lado via `maestri portal snapshot` (+ `screenshot` quando estável) nos estados: inicial, Layers, Colors, AI, Ask an AI aberto, Prompt, Preview aberto, viewport 1440x900:
1. Icon-rail 9 botões, ordem e ícones iguais; panels com mesmo conteúdo/ordem.
2. Phone 412x892 + bezel + seed (TopAppBar, connected buttons, 3 list items, FAB, NavBar) idênticos em ordem.
3. Footer: zoom pill + Ask an AI + tool pills (Select|Hand, Add screen|Preview, Undo|Redo|Clear|Project).
4. Prompt tab: Android|Web + prompt completo + Copy + Edit fullscreen (+ só a linha de autoria a mais).
5. Presença: avatar-stack visível, seletor de autor no Ask an AI, cursores remotos `pointer-events-none`, feed de atividade.
6. `tsc` + `build` verdes, dev 200 nas duas rotas, sem emojis proibidos, sem link `lnkiai.github.io/m3e-canvas` no Studio.

## 4. Execução exigida (todos os terminais)

- **Máximo de subagentes**: cada Engenheiro deve fan-out com a Task tool (`explore`/`general`) em paralelo antes/depois de editar (ex.: um subagente por painel: Parts, Layers, Stage, Inspector/Prompt, AiTube, presence) e só então aplicar edits; Validador deve paralelizar varreduras por rota/estado via portais.
- Ordem: Bussola reparte A→Forja, B→Engenheiro 2 (ou vice-versa), C como trava contínua dos dois; Lupa valida no fim de cada incremento com veredito APROVADO/REPROVADO numerado (arquivo/linha, esperado vs obtido).
