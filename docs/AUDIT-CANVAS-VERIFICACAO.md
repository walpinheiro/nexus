# Auditoria do Canvas

Revisão de fonte em 4 de outubro de 2026. Esta nota registra a verificação de gestos, acessibilidade das arestas, semântica das ferramentas e cores da barra flutuante.

## Gestos dos nós

`CanvasNode.vue` agora interrompe o `pointerdown` antes que ele chegue ao fundo do canvas, espera ultrapassar 3 px antes de iniciar uma movimentação e encerra o gesto em `pointerup`, `pointercancel`, `lostpointercapture` e desmontagem do nó. Isso evita que arrastar um nó abra a seleção retangular e que um clique com tremor inicie um histórico de movimento incompleto.

Não há no projeto uma infraestrutura de teste de componentes com DOM: os scripts existentes verificam funções puras de geometria/conexão e determinismo. Um teste automatizado do ciclo de ponteiro precisaria adicionar um ambiente DOM ou extrair a máquina de gestos para uma função pura; a verificação mais fiel é testar no app clique, arrasto, cancelamento por toque e perda de captura.

## Acessibilidade das arestas

`CanvasEdge.vue` expõe cada aresta como `<g role="button" tabindex="0">`, com `aria-label`, estado `aria-pressed`, ativação por Enter/Espaço e um `<title>`. O SVG que contém as arestas está sem `aria-hidden`. Pela fonte, os controles deveriam aparecer na árvore acessível; não foi possível confirmar a árvore gerada no navegador nesta auditoria.

Se a captura de acessibilidade continuar omitindo as arestas, dê ao SVG `role="group"` e um rótulo como “Conexões do grafo”, e confirme que o projeto aberto tem arestas renderizadas. Para compatibilidade mais previsível, considere botões HTML transparentes sobre os pontos médios das arestas, mantendo as linhas visuais no SVG. Evite definir o SVG inteiro como `role="img"`, pois isso pode agrupar ou ocultar os controles filhos.

## Portas e pontas das arestas

A geometria usa retângulos medidos para colocar os endpoints no centro das portas. O canvas mede a caixa externa (`offsetWidth`/`offsetHeight`), que é a mesma caixa usada para posicionar nós. As portas compensam a borda de 1 px do nó normal e de 2 px do nó selecionado; as portas laterais usam transformações simétricas. Cada alvo clicável tem 24×24 px, enquanto o círculo visual é 12×12 px. A bolha visual usa posicionamento absoluto dentro do botão para ficar centrada sem depender do espaçamento interno do VButton, e o fundo/borda do hitbox permanecem transparentes. Isso evita a diferença entre caixa de conteúdo e caixa externa, a porta direita deslocada para dentro e o círculo deslocado pelo gap interno do botão.

O marcador `nexo-arrow` usa `refX="9"` em um viewBox de 10 unidades, alinhando a ponta desenhada ao endpoint da curva. A medida era apropriada; o desvio vinha da caixa usada para construir a curva e do posicionamento CSS da porta. Curvas para duas arestas opostas entre o mesmo par de nós ainda percorrem a mesma curva em sentidos contrários e se sobrepõem. Se esse caso ficar comum, desloque as curvas em lados opostos com base no par de endpoints.

## Semântica das ferramentas

- **Mover canvas** funciona também ao arrastar um nó: o gesto chega ao callback do nó e o Canvas atualiza o pan, sem salvar coordenadas do nó.
- **Conectar** bloqueia gestos vazios e indica arraste entre portas, mas as portas iniciam conexão também nos modos Selecionar e Comentar. Defina se conectar é uma ação sempre disponível ou exclusiva dessa ferramenta e ajuste a visibilidade/ativação das portas de acordo.
- **Comentar** seleciona um nó e abre a aba Copilot depois do clique. O botão não abre o Copilot para o nó já selecionado e não cria um comentário. Faça o botão abrir o Copilot imediatamente quando já houver seleção ou renomeie a ação para refletir o fluxo de selecionar um nó e perguntar à IA.

## Relações e cor

O seletor de tipo usa o mesmo ícone para todas as seis relações; os rótulos textuais mantêm as opções legíveis. No desenho das arestas, “realiza” e “consome” compartilham cor sólida e as outras três relações compartilham traço tracejado. Uma pequena legenda ou rótulo de tipo nas arestas reduziria a dependência de cor para entender as relações.

A bolha de ferramentas usa `--v-color-error-base` com o ícone branco herdado do botão primário. Esse tom dá cerca de 3,8:1 de contraste com branco; atende ao contraste mínimo de ícone, embora `--v-color-error-strong` seja mais legível e consistente para uma ação com ícone branco.

## Referências revisadas

- `src/components/canvas/CanvasNode.vue`
- `src/components/canvas/CanvasEdge.vue`
- `src/components/canvas/CanvasToolbar.vue`
- `src/components/canvas/NexoCanvas.vue`
- `src/assets/main.css`
- `tailwind.config.ts`
- `package.json` e `scripts/test-canvas-geometry.mjs`, `scripts/test-canvas-connections.mjs`
