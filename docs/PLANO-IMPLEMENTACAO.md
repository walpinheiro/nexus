# NEXO — Plano de Implementação (ZERO MOCK — tudo funcional, sem backend)

> Stack: **Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia**, persistência `localStorage` (`nexo.v1.*`), sem backend.
> Fonte funcional: `nexo-especificacoes/` (`01`–`21` + `README.md`).
> Referência visual: `nexo-interface-proposal-static.png` + `nexo-logo.png`.
> Referência de comportamento: `m3e-canvas` (MIT, Next.js+React, static export, localStorage) — **conceitos portados para Vue, sem copiar código React**.
> Regra global: **nenhum botão sem efeito**. Tudo abaixo é implementado e persiste em reload.

---

## 1. Visão / resumo

O **Canvas é o coração do NEXO**: grafo visual de objetos (nós) e relações tipadas (arestas) onde descoberta, aprovação por gates e análise de impacto acontecem no mesmo espaço. A verdade operacional é grafo + schemas; o Canvas é a visão.

### Mapeamento m3e-canvas → NEXO

| m3e-canvas (React) | NEXO (Vue) |
|---|---|
| parts (drag-drop) | nós NEXO (Projeto/Épico/Feature/Regra/PBI/API/Tela/Teste/ADR/Decisão/Risco) com x/y/z persistidos |
| screens (phone+desktop) | níveis de zoom (Portfólio › Projeto › Épico › Feature › PBI › Implementação) |
| magnetic connections | handles nos 4 lados + snap grade 4px (Ctrl+drag desliga) + guias |
| tap-to-navigate + transições | clique seleciona painel sem navegar; duplo-clique/Enter aprofunda zoom + breadcrumb |
| swipe | pan por arrasto do fundo + wheel; Space/hand alterna modo mover |
| toggle buttons | toolbar (select/hand/connect/comment) + tabs do painel (Detalhes/Copilot/Impacto) |
| layers/groups + z-order + reorder | painel de ordem via `z` (frente/trás/topo/fundo) + agrupar/desagrupar multi-seleção |
| theme (4 eixos M3) | tokens `design.md` (cores, raios, sombras, tipografia) |
| prompt output (design inteiro ou 1 tela, notes, alvo Android/Web) | prompt de implementação do PBI/pacote (PT-BR default + EN), todo ou subgrafo, BDD + regras + fontes + pendências, alvo Vue 3 (default) ou API Ruby |
| tidy (snap bars/FAB, join vizinhos, stack 16dp + undo) | botão tidy (grade) + undo/redo (pilha ≥ 50) |
| AI helper opcional BYOK | Copilot local rule-based default (offline, cria nós/arestas); BYOK opcional depois |
| export PNG | export PNG do canvas (snapshot SVG→canvas) |
| share-links | URL hash com estado comprimido (base64) que reconstrói o layout |
| alignment guides | snap 4px + tidy em grade |
| undo/redo | Ctrl+Z / Ctrl+Shift+Z |
| shortcuts (V/H, wheel pan, Ctrl+wheel zoom, +/-/0 fit, Ctrl+Z/Shift+Z, Ctrl+D duplicate, setas nudge Shift=8, Ctrl+drag sem snap, Delete, P preview) | mesmos atalhos implementados no `NexoCanvas` |
| favorites | seleção + filtros + share-link cobrem o caso |
| tudo em localStorage | `nexo.v1.graph/patches/audit/project/gates/users/ui` + `resetSeed` |

### Zoom semântico (de `03-navegacao-canvas.md`)

Portfólio → Projeto → Épico → Feature → PBI → Implementação. Cada nível filtra os mesmos dados locais; filtros nunca alteram dados, só a vista. Breadcrumb navega o zoom de verdade; qualquer artefato é alcançável em ≤ 4 ações do projeto.

### Elementos persistentes (todos funcionais)

- **Breadcrumb clicável** (`Cobranças › Pagamento por Pix › Feature…`): cada nível chama `subir(nivel)` e navega.
- **Minimap clicável**: clique recentraliza o viewport nas coordenadas do mundo.
- **Busca global** (`⌘K/Ctrl+K`, `/`): paleta com resultados reais (título/id/owner); Enter abre o primeiro no canvas.
- **Filtros** (canvas + backlog): estado, owner, texto — só alteram a vista.
- **Painel lateral** (Detalhes/Copilot/Impacto): abre sem tirar foco do canvas; `×`/Esc limpa a seleção.
- **Arestas com estilos distintos + setas**: `contem` cinza sólida, `realiza/consome` azul sólida, `valida` verde tracejada, `restringe` vermelha tracejada, `impacta` âmbar tracejada.

---

## 2. Arquitetura de pastas Vue (implementada)

```
/
├── index.html · vite.config.ts · tailwind.config.ts (tokens nexo) · postcss · tsconfig · package.json
├── public/agent.md                    # instrução p/ agente (botão "Copiar instrução p/ agente")
└── src/
    ├── main.ts                        # Pinia + router + instancia stores (persist eager nexo.v1.*)
    ├── App.vue                        # Topbar + Sidebar + <router-view>
    ├── assets/main.css                # Tailwind + .canvas-dots + foco visível + reduced-motion
    ├── ai/copilot.ts                  # Copilot local rule-based PT-BR (cria/liga/status/pergunta/pendências)
    ├── components/
    │   ├── layout/Topbar.vue          # logo, Breadcrumb, SearchPalette funcional, ImpactBanner
    │   ├── layout/Sidebar.vue         # Visão/Canvas/Backlog + G1–G4 + Usuários + role switcher
    │   ├── layout/Breadcrumb.vue      # navega zoom de verdade
    │   ├── layout/Minimap.vue         # viewport clicável
    │   ├── layout/ImpactBanner.vue    # seleciona ft-status + tab Impacto + /canvas?selecionado=
    │   └── canvas/NexoCanvas.vue      # viewport/pan/zoom/snap/nós/arestas/handles/caixa/tidy/undo/shortcuts/preview
    │   └── canvas/CanvasNode.vue      # card 280px, role=button, handles 4 lados, teclado
    │   └── canvas/CanvasEdge.vue      # Bézier por tipo com seta + seleção/Delete
    │   └── canvas/CanvasToolbar.vue   # 4 ferramentas + zoom/fit/tidy/novo/undo/redo, titles PT-BR
    │   └── canvas/DetailPanel.vue     # Detalhes/Copilot/Impacto + Propor/Aceitar + prompt/share/PNG
    ├── views/ HomeView CanvasView BacklogView GateView UsersView (todas funcionais)
    ├── router/index.ts                # / /canvas /backlog /gates/:id /usuarios (+ ?selecionado=, #hash share)
    ├── stores/ useProject useGraph useGate useUsers useUI (persist eager + resetSeed)
    ├── composables/useCanvasViewport.ts
    ├── types/nexo.ts                  # NexoObject (+x/y/z/grupo), Epic/Feature/PBI/User/Edge, Patch/Audit/Impact/GateCheck
    ├── data/seed.ts                   # Cobranças, ep-pix, 4 features (textos exatos PNG) + positions, 7 usuários
    └── utils/ gates.ts impact.ts prompt.ts share.ts
```

---

## 3. Rotas (todas reais)

| Rota | Função |
|---|---|
| `/` | Visão: contadores reais + seletor de nível de zoom |
| `/canvas` (+ `?selecionado=`, ` #hash` share) | Canvas full + DetailPanel + filtros + Minimap |
| `/backlog` | Tabela hierárquica com filtros, checklist por nó (regras reais) e auditoria |
| `/gates/:id` | Checklist bloqueante real + aprovar (papel + checklist + proponente≠aprovador) + tentativas |
| `/usuarios` | CRUD real + role switcher + matriz de permissão visível |

---

## 4. Modelo de dados (implementado em `types/nexo.ts` + `seed.ts`)

`NexoObject` base (`id/project_id/tipo/titulo/status/gate/owner/classificacao/fonte/versao`) + `x/y/z/grupo` + Epic/Feature (BDD)/PBI/User/Edge + `ProposePatch/PatchMudanca/AuditEvent/ImpactPlan/GateCheck`. Seed com positions replicando o PNG (pagar 120/220, confirmar 480/330, criar 840/220, status 480/590).

---

## 5. Papéis × gates (implementado em `useUsers` + `useGate` + `utils/gates.ts`)

PM aprova G0/G1/G2; UX edita experiência; Arquiteto/TL/Seg aprovam G3; Dev/QA/TL aprovam G4/G5. Regras: `propor` cria patch (nunca aplica direto); aprovação exige papel + 100% bloqueantes + proponente ≠ único aprovador; negada entra em `tentativas` + auditoria; baseline = versão aprovada; edição em aprovado gera nova versão via patch.

---

## 6. Telas fiéis ao PNG (todas funcionais, sem mock)

Topbar (logo NE[X-gradiente]O, breadcrumb, busca funcional, pill impacto funcional), Sidebar 220px, Toolbar com 7+ ações, 4 nós com textos exatos + contadores 3/5/2/2, central com borda azul + handles, stale dashed âmbar, painel 340px com 3 tabs, card impacto, Perguntar à IA + Propor alteração (diff + aceite explícito).

---

## 7. Critérios de aceite por etapa (todos implementados)

- **E1**: scaffold + tipos + seed + stores com persist eager + 5 rotas; `dev` 200, `build` OK.
- **E2**: shell fiel ao PNG; busca navega; pill seleciona ft-status; breadcrumb/Minimap funcionam.
- **E3**: canvas full — pan/zoom/snap/arrastar/duplicar/deletar/conectar/multi-seleção/caixa/agrupar/tidy/undo/redo/shortcuts/preview; `?selecionado=` sincronizado.
- **E4**: painel funcional + Copilot cria nós/arestas/status via texto + ProposePatch/AcceptPatch versionado + auditoria.
- **E5**: prompt output (todo/seleção, Vue/Ruby, PT/EN, editável, copia conteúdo real) + PNG + share-link com reconstrução + `agent.md`.
- **E6**: backlog com filtros + checklist real + auditoria; gates bloqueiam de verdade; usuários CRUD + permissões derivadas.
- **E7**: busca/filtros/zoom/breadcrumb/minimap integrados + a11y (foco, aria, teclado) + `README` de uso (seção 9).

---

## 8. Seed local

Projeto Cobranças, épico Pagamento por Pix (KPI Adoção Pix), 4 features com textos exatos + BDD inicial, 3 arestas, 7 usuários (PM/UX/Arq/TL/Dev/QA/Seg). `resetSeed()` restaura tudo.

---

## 9. Como rodar e verificar (manual, item a item)

```
npm i
npm run dev      # http://127.0.0.1:5173/
npm run build    # vue-tsc --noEmit + vite build
```

1. Reload persiste tudo (nós, posições, patches, auditoria, usuário, UI).
2. Arrastar nó move com snap; Ctrl+drag desliga snap; Delete remove; Ctrl+D duplica; setas nudge (Shift=8px); Ctrl+Z/Shift+Z desfaz/refaz; V/H/P/0/+/- funcionam; duplo-clique no vazio cria nó; handle→handle cria aresta do tipo selecionado.
3. Copilot: "criar feature X" / "ligar A a B como realiza" / "mudar status de X para review" executam após Confirmar; "ajuda" lista comandos.
4. "Copiar prompt" contém títulos/BDD/regras reais do grafo; PNG baixa `nexo-canvas.png`; share-link reconstrói o layout em outra aba.
5. Gate G2 sem BDD bloqueia FTR-007; trocar papel para Dev e tentar aprovar G2 nega; tentativa aparece na auditoria.
6. Impacto: "Calcular impacto" lista dependentes via realiza/consome/valida/restringe; "Aplicar aprovados" marca stale com causa + correlation_id; "Reverter" restaura.
7. Nenhum botão sem efeito: cada controle do canvas, painel, backlog, gates e usuários executa ação real acima.

## Fora de escopo

Backend/Rails, Entra ID, RAG/BYOK em nuvem, Boards/Jira — BYOK é extensão futura do Copilot local, que já cria tudo offline.
