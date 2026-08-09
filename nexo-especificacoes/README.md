# NEXO — Biblioteca de Microespecificações

Esta biblioteca separa o blueprint em documentos pequenos, revisáveis e atribuíveis. Cada documento deve ter dono, versão, status e vínculo com o grafo NEXO antes de virar padrão operacional.

| Ordem | Documento | Decisão que orienta |
|---|---|---|
| 01 | [Visão e princípios](01-visao-e-principios.md) | por que o NEXO existe? |
| 02 | [Pessoas e permissões](02-pessoas-e-permissoes.md) | quem pode propor, aprovar e publicar? |
| 03 | [Navegação Canvas](03-navegacao-canvas.md) | como explorar sem perder contexto? |
| 04 | [Modelo de conhecimento](04-modelo-de-conhecimento.md) | quais objetos existem e como se relacionam? |
| 05–10 | [Gates](05-gate-0-enquadramento.md) a [10-gate-5-entrega.md) | o que precisa estar pronto para avançar? |
| 11 | [Agentes e skills](11-agentes-e-skills.md) | qual IA atua em cada momento? |
| 12 | [Experiência conversacional](12-experiencia-conversacional.md) | como IA pergunta, propõe e aprende? |
| 13 | [Ficha de épico](13-ficha-de-epico.md) | como descrever valor e escopo? |
| 14 | [Ficha de feature](14-ficha-de-feature.md) | como detalhar comportamento? |
| 15 | [Ficha de PBI](15-ficha-de-pbi.md) | como preparar trabalho executável? |
| 16 | [Pacote de implementação](16-pacote-de-implementacao.md) | o que gerar para Vue e Ruby? |
| 17 | [Mudança e impacto](17-mudanca-e-impacto.md) | como preservar consistência? |
| 18 | [Arquitetura da plataforma](18-arquitetura-da-plataforma.md) | quais componentes sustentam o produto? |
| 19 | [Segurança e IA responsável](19-seguranca-e-ia-responsavel.md) | como proteger dados e decisões? |
| 20 | [Métricas e MVP](20-metricas-e-mvp.md) | como validar valor e evoluir? |
| 21 | [Protótipo de interface](21-prototipo-de-interface.md) | como a experiência deve se comportar? |

## Convenção de status

`Rascunho` → `Em revisão` → `Aprovado` → `Baseline` → `Substituído`.

Cada microespecificação deve ter um owner de negócio e um owner técnico quando afetar produto e engenharia.

## Convenções normativas

- Palavras **DEVE**, **NÃO DEVE** e **PODE** são normativas.
- Uma validação é `bloqueante`, `aviso` ou `informativa`.
- Exceção bloqueante só é liberada por aprovação registrada, com owner e prazo.
- IDs são imutáveis; títulos podem mudar; versões nunca são apagadas.
