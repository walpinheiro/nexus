# 01 — Visão e princípios

## Objetivo

Transformar uma intenção de negócio em software validável, sem perda de contexto entre negócio, UX, arquitetura, desenvolvimento e QA.

## Proposta de valor

- Pessoas de áreas distintas colaboram no mesmo objeto de trabalho.
- IA conduz descoberta e estrutura conteúdo, mas não toma decisões de negócio sozinha.
- Cada saída é rastreável à decisão que a justificou.
- Mudanças mostram impacto antes de alterar artefatos aprovados.

## Princípios não negociáveis

1. Uma fonte de verdade estruturada, versionada e auditável.
2. Perguntas de alto valor antes de gerar requisitos ou código.
3. Aprovação humana para mudar gate, contrato, dados sensíveis ou código produtivo.
4. Fato, inferência e pendência sempre aparecem distintos.
5. O Canvas é visão; o grafo e os schemas são a verdade operacional.

## Critério de sucesso

Um PBI aprovado possui vínculo contínuo com objetivo, feature, regras, aceite, arquitetura, testes e arquivos de implementação.

## Contrato comum de qualquer objeto

Todo objeto do NEXO DEVE ter `id` imutável, `project_id`, tipo, título (5–140 caracteres), status, gate, owner, contribuidores, classificação (`internal`, `confidential` ou `restricted`), fonte (`stated`, `inferred`, `corporate_standard` ou `pending_decision`), referências de fonte, versão, baseline e timestamps.

### Regras de versão e auditoria

1. Qualquer alteração cria uma nova versão lógica; a anterior continua consultável.
2. Itens aprovados ou em baseline não podem ser editados diretamente: a interface cria um rascunho derivado.
3. A auditoria registra ator, humano/skill, versões anterior e nova, diff, justificativa, validações e fontes.
4. Exclusão é lógica; relações e evidências permanecem preservadas.

### Máquina de estado comum

`draft → review → approved → baseline → stale → regenerated → validated → published`.

O owner pode enviar para revisão; só o aprovador do gate promove para aprovado; o motor de impacto promove baseline para stale; QA/revisor valida; papel publicador publica. Toda transição inválida é bloqueada.

### Validações transversais

| Código | Severidade | Regra |
|---|---|---|
| OBJ-001 | bloqueante | título ausente ou fora do limite |
| OBJ-002 | bloqueante | owner ausente |
| OBJ-003 | bloqueante | conteúdo afirmativo sem fonte marcada |
| OBJ-004 | aviso | sem contribuidores/revisores |
| OBJ-005 | bloqueante | classificação incompatível com fonte ou modelo IA |
| OBJ-006 | bloqueante | transição de estado fora da máquina permitida |
