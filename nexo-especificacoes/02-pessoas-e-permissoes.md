# 02 — Pessoas e permissões

## Papéis

| Papel | Responsabilidade | Permissão típica |
|---|---|---|
| Product Manager | problema, escopo, métricas | editar e aprovar G0/G1/G2 |
| UX | jornada, telas, acessibilidade | editar experiência |
| Arquiteto/TL | NFR, contratos e ADR | aprovar G3 |
| Dev/QA | viabilidade, testes, execução | editar G4/G5 |

## Ações autorizáveis

`visualizar`, `comentar`, `propor`, `editar`, `aprovar`, `publicar`, `administrar`.

## Regras

- Permissão é por projeto, objeto e ação; não apenas por cargo global.
- Quem propõe não deve ser o único aprovador de uma decisão crítica.
- Aprovação registra identidade, data, versão, observação e condições.
- Um usuário com acesso de leitura nunca recebe conteúdo sensível por RAG.

## Critérios de aceite

- Um projeto novo nasce com matriz de papéis configurável.
- Toda tentativa negada aparece em auditoria.
- O Canvas oculta ações indisponíveis sem ocultar a razão de forma ambígua.
