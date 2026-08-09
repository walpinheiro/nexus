# 10 — Gate 5: Geração, revisão e entrega

## Pergunta

O comportamento aprovado foi implementado e comprovado?

## Entrada

PBI pronto, contratos e decisões de arquitetura aprovados.

## Pipeline

1. Gerar pacote em workspace isolado.
2. Validar schema, lint, testes e segurança.
3. Exibir diff, fontes e artefatos impactados.
4. Abrir revisão/PR; humano aprova merge.
5. Registrar evidência de aceite e publicação.

## Saídas

Vue SFCs, APIs Ruby, migrations, specs, contrato, telemetria, evidências de CI e link do PR.

## Regra

“Código gerado” não equivale a “entregue”; a passagem requer revisão, testes e aceite funcional.

## Definition of Done e exceções

G5 valida PR merged, checks obrigatórios de CI, evidência de aceite, testes vinculados verdes, segurança aprovada ou exceção vigente, observabilidade aplicável e rastreabilidade atualizada. Falha de SAST, teste ou policy bloqueia a entrega. Exceção só é válida com justificativa, risco aceito, aprovador habilitado, prazo e plano de retorno.
