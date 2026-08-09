# 07 — Gate 2: Features

## Pergunta

Como uma pessoa usa a capacidade e como saberemos que funcionou?

## Conteúdo obrigatório

- Ator, benefício, gatilho e pré-condições.
- Fluxo feliz, alternativas, erros, cancelamentos e estados vazios.
- Regras, dados, permissões, telas e integrações percebidas.
- Critérios de aceite BDD e dependências.

## Saídas

Story map, user stories, sitemap, fluxo de telas, descrição de estados e cenários Given/When/Then.

## Aprovação

PM/BA, UX e representante técnico concordam sobre comportamento e lacunas críticas. Questões sem resposta ficam registradas como decisão pendente, não escondidas na IA.

## Schema e validações

O schema de feature contém ator, narrativa de benefício, gatilho, pré-condições, fluxo feliz, alternativos, regras, permissões, telas, integrações e critérios de aceite.

| Código | Severidade | Regra |
|---|---|---|
| FTR-001 | bloqueante | narrativa contém ator, capacidade e benefício |
| FTR-002 | bloqueante | fluxo feliz tem entrada, ação e resultado observável |
| FTR-003 | bloqueante | regra vinculada tem fonte e não está arquivada |
| FTR-004 | bloqueante | alteração de dados possui permissão/policy |
| FTR-005 | aviso | tela sem estados loading, vazio, erro e sucesso |
| FTR-006 | bloqueante | integração externa tem timeout, falha e indisponibilidade |
| FTR-007 | bloqueante | critério possui resultado verificável |
| FTR-008 | aviso alto | ação financeira/sensível sem cenário de abuso/erro |

G2 passa somente com fluxo feliz, exceção relevante, BDD, ator, regras e owner. Cada critério carrega `id`, Given, When, Then, prioridade, camada de teste e fontes.
