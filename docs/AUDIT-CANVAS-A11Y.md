# Auditoria de acessibilidade do Canvas

## Achados e correções

- Os nós eram expostos como um único `div role="button"` com os quatro botões de conexão como descendentes. Isso criava controles interativos aninhados e deixava a seleção por teclado dependente de uma tecla Enter customizada.
- O nó agora é um `group` e expõe um botão nativo para selecionar, com o mesmo nome acessível e estado `aria-pressed`. Ele só aparece ao receber foco, não captura ponteiro durante drag e mantém Enter/Espaço nativos; Shift+Enter aprofunda o nó. Seleção e arraste por ponteiro, duplo clique e handles continuam no fluxo existente.
- Arestas SVG eram acionáveis somente por clique e não participavam da navegação por teclado. O grupo da aresta agora é botão focável com rótulo e estado pressionado; Enter/Espaço selecionam sem propagar a tecla ao Canvas e o foco recebe destaque visível.

## Validação

- `npm run build`: passou (vue-tsc e Vite, 1.951 módulos).`
