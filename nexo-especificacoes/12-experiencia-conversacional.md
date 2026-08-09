# 12 — Experiência conversacional

## Fluxo de uma rodada

1. Usuário fornece texto, voz ou seleção do Canvas.
2. IA identifica o contexto do nó e busca fontes permitidas.
3. IA mostra o que entendeu e pergunta até três lacunas de maior impacto.
4. IA propõe uma alteração estruturada, com fatos, inferências e pendências rotulados.
5. Usuário aceita, edita ou rejeita; a decisão cria versão e evento.

## Regras de linguagem

- Perguntas objetivas, sem jargão para usuários de negócio.
- Explicação técnica progressiva quando a audiência é técnica.
- Nunca inventar requisitos para “fechar” um formulário.
- Sempre explicar por que uma pergunta bloqueia avanço ou geração.

## Estados da resposta

`Sugestão`, `Pergunta`, `Alerta de conflito`, `Plano de impacto`, `Artefato pronto para revisão`, `Bloqueio`.

## Critério de aceite

Uma proposta é aplicada apenas com ação explícita; a interface mostra o diff antes de confirmar.
