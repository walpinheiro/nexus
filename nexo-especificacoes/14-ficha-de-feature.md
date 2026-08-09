# 14 — Ficha de feature

## Schema funcional

- Narrativa: como `[persona]`, quero `[capacidade]` para `[benefício]`.
- Gatilho, pré-condições, fluxo feliz e alternativos.
- Dados: origem, edição, visualização, retenção e classificação.
- Regras, permissões, telas e integrações.
- Estados UI: carregando, vazio, sucesso, erro, sem permissão.
- Critérios BDD, decisões pendentes e dependências.

## Definição de pronto da feature

Todos os critérios são testáveis; regras têm fonte; a experiência possui estados; integrações e permissões foram discutidas; decisões não resolvidas não estão mascaradas como requisito.

## Modelo normativo de critério

```yaml
id: AC-001
title: "Criar cobrança Pix válida"
given: "fatura aberta pertence ao cliente autenticado"
when: "cliente solicita pagamento por Pix"
then: "retorna QR Code, código copiável e expiração"
test_layer: request | component | e2e | contract
priority: must
source_refs: [rule-id, decision-id]
```

Feature com ação mutável DEVE declarar autorização; feature com integração externa DEVE declarar timeout, falha e fallback; feature com tela DEVE cobrir loading, vazio, erro, sucesso e, quando aplicável, sem permissão.
