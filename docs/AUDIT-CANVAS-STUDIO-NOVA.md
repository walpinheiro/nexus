# Auditoria Canvas e Studio com Nova Kit

Atualizado em 4 de outubro de 2026. O Canvas e o Studio usam `vueui-nova-kit@1.0.0-rc.4` para controles operacionais. Os adaptadores de compatibilidade preservam os tipos e o formato persistido do Studio; os nós, arestas e a prancheta continuam sendo superfícies de edição próprias do NEXO.

## Cobertura

| Área | Componentes/fluxos | Kit utilizado | Estado |
| --- | --- | --- | --- |
| Canvas | Ações, campos, selects, busca e abas principais | `VButton`, `VTextInput`, `VSelect`, `VSearchField`, `VTabs`, `VToolbar`, `VToolbarGroup` | Migrado; a toolbar permanece visível e centralizada no topo do canvas, com controles quadrados compactos e popovers ancorados para filtros e tipo de conexão. |
| Grafo | Seleção/movimento dos nós, handles, arestas, minimapa, pan/zoom, layout e exportação | Ações dos nós por `VButton` via `NovaAction`; estados semânticos usam tokens Nova | Superfície customizada necessária: o kit não fornece um editor de grafo com nós arrastáveis, portas e zoom. |
| Inspetor | Abas, ações, campos, selects e confirmação de ações | `VTabs`, `VButton`, `VTextInput`, `VTextarea`, `VSelect`, `VDialog` | Migrado; largura e conteúdo adaptam-se à janela sem rolagem horizontal do painel. |
| Studio | Toolbar, paleta, inspetor, camadas, novo frame, preview e diálogos de prompt | Componentes Nova por `NovaAction`, `NovaField`, `NovaSelect`, `NovaTextarea`, `VTabs` e `VDialog` | Migrado; atalhos, seleção e edição na prancheta mantêm seus contratos. |
| Renderizadores M3E | Botão, FAB, checkbox, chip/badge, card, diálogo, campos, busca, select, tabs, rádio, switch, slider, snackbar e pickers | Equivalentes do kit (`VButton`, `VBadge`, `VCard`, `VCheckbox`, `VDialog`, `VTextInput`, `VSearchField`, `VSelect`, `VTabs`, `VRadioGroup`, `VSwitch`, `VSlider`, `VAlert`) | Adaptadores atualizados; kinds persistidos continuam iguais. |
| Presença | Convites e perfis demonstrativos locais | Ações `VButton`; lista local customizada não modal | É somente estado de demonstração no navegador, não presença em tempo real nem colaboração remota. |
| IA do Studio | Geração de rascunho e metadados | Ações e campos Nova; modelo reportado como `local · template-ptbr` | Heurística/template local explícito. Não chama OpenAI, Gemini, DeepSeek ou Ollama e não reivindica geração remota. |

`M3Dialog` e `M3Pickers` são desenhados dentro da prancheta como conteúdo do protótipo. Um `VDialog` global escaparia da prancheta e alteraria a representação editável; eles usam cartões e controles Nova inline. Os modais operacionais do aplicativo usam `VDialog`.

## Geometria e acessibilidade do Canvas

As dimensões reais dos nós são observadas com `ResizeObserver` e usadas em enquadramento, minimapa, layout explícito e cálculo das quatro portas. A geometria de viewport calcula o centro livre e o zoom de enquadramento com os espaços ocupados pelo inspetor; ao reduzir a janela, o nó selecionado é recentrado dentro da área visível. Os lados são persistidos opcionalmente como `origemHandle` e `destinoHandle`, mantendo compatibilidade com arestas antigas sem esses campos. No modo Conectar, arrastar termina na porta atingida ou infere a porta mais próxima quando solto no corpo do nó. Com Conectar ativo, o modo teclado inicia/termina com Enter ou Espaço, anuncia origem/destino e cancela com Escape; nomes acessíveis apresentam esquerda, direita, superior e inferior. A geometria de arestas continua no SVG e um grupo de botões acessíveis expõe a seleção por teclado com rótulos dos nós de origem e destino.

O comando Organizar é explícito, registra uma única alteração de layout no histórico e espaça cada linha pela altura medida dos nós. Selecionar um nó mantém os parâmetros de rota, inclusive `view=canvas`. Estados visuais de arestas e conexões usam tokens semânticos Nova; não dependem de uma paleta escura fixa.

## Limitações visíveis

- Exportação PNG do Studio ainda desenha cartões genéricos por item e não rasteriza a renderização real de cada componente M3E. O arquivo pode servir como inventário visual, não como captura fiel da prancheta.
- Presença é um roster local demonstrativo; não há serviço de colaboração ou estado online remoto.
- Geração AI é local e baseada em template. A interface não anuncia provedores cloud como fonte da geração.
- Pré-visualizações preservam os temas e estilos definidos pelo documento M3E. Controles do NEXO usam os tokens de contraste claro do Nova Kit.

## Verificação repetível

```powershell
npm run build
npx vite-node scripts/test-canvas-geometry.mjs
npx vite-node scripts/test-canvas-connections.mjs
npm run test:determinism
```

Os testes de geometria cobrem portas nas quatro laterais, alturas diferentes, inferência de lado, curvas de aresta e conversão coordenada tela/prancheta nos níveis de zoom suportados. O teste de conexões verifica que tentativas repetidas não duplicam uma aresta e que a identidade inclui as portas. As dimensões medidas pelo `ResizeObserver` usam border-box, o mesmo sistema de coordenadas das portas dos nós. `test:determinism` verifica que a saída do Studio mantém determinismo e os contratos existentes.

Validação manual confirmada no Canvas: a toolbar fica centralizada no topo (12px em workspace amplo; 64px quando o canvas tem até 720px de largura para evitar os controles globais), sem abrir/fechar como FAB. Seus botões têm área quadrada de 32px no layout estreito e 34px no amplo; o inspetor mantém os botões de centralizar e fechar em 32×32px. O canvas reserva espaço com base no limite inferior medido da toolbar, e a toolbar quebra em grupos quando o workspace é estreito. O popover de conexão apresenta as seis opções abaixo da barra; os filtros abrem pelo ícone de funil. Escape fecha a lista sem perder a seleção do inspetor. Selecionar nós mantém `view=canvas`; a seleção fica centralizada na área livre. Organização enquadra os nós medidos e só altera posições quando acionada.

Para repetir a inspeção Studio, abrir `/studio`, criar frame, editar item, abrir preview/diálogos, criar e reabrir um link compartilhado e exportar JSON/PNG. A validação de compartilhamento usa URL do router em modo history e round-trip pelo hash; colaboração remota e exportação PNG fiel continuam fora da cobertura real.
