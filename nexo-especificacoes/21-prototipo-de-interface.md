# 21 — Protótipo de interface

## Tela principal

- Barra superior: projeto, busca, modo de visualização, alertas e perfil.
- Coluna esquerda: árvore/atalhos de objetos, filtros e visão de gates.
- Centro: Canvas com nós e relações; zoom revela informação adequada ao nível.
- Direita: painel de contexto com detalhes, conversa IA, diffs e aprovações.
- Rodapé: minimap, status de sincronização e filtros ativos.

## Interações essenciais

| Ação | Resultado |
|---|---|
| Clique no nó | detalhe no painel direito; não navega ainda |
| Duplo clique | entra no nível seguinte do Canvas |
| “Perguntar à IA” | pergunta contextual sobre o nó selecionado |
| “Propor preenchimento” | mostra diff estruturado, nunca aplica direto |
| “Ver impacto” | destaca subgrafo e lista artefatos desatualizados |
| “Aprovar gate” | abre checklist/evidências e registra baseline |

## Primeiro fluxo a prototipar

Criar épico → responder perguntas → aprovar Gate 1 → abrir feature → gerar BDD → visualizar dependências → criar PBI.
