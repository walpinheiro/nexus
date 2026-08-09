# 03 — Navegação Canvas

## Objetivo

Permitir leitura executiva e aprofundamento técnico no mesmo espaço, sem menus excessivos.

## Níveis de zoom

| Nível | Elementos visíveis | Ação de aprofundamento |
|---|---|---|
| Portfólio | iniciativas, indicadores, risco | abrir produto |
| Projeto | visão, domínios e épicos | abrir épico |
| Épico | features, regras, dependências | abrir feature |
| Feature | fluxos, telas, APIs, BDD | abrir PBI/artefato |
| PBI | tarefas, aceite, diff, testes | abrir implementação |
| Implementação | arquivos, contrato, preview | abrir repositório/PR |

## Elementos persistentes

- Breadcrumb clicável: `Projeto › Épico › Feature › PBI`.
- Minimap, busca global e filtro por estado, domínio, owner e risco.
- Painel lateral de detalhe/IA; o Canvas não perde foco ao abrir o painel.
- Linhas distinguem relação de composição, dependência, realização e impacto.

## Estados visuais

- Rascunho: neutro.
- Em revisão: destaque suave.
- Aprovado/baseline: confirmação.
- Desatualizado: aviso com causa e quantidade de dependentes.
- Bloqueado: explicita bloqueio e owner.

## Critérios de aceite

- Usuário chega a qualquer artefato em até quatro ações partindo do projeto.
- Breadcrumb e minimap sempre indicam localização.
- Filtros não alteram dados, apenas a vista.
