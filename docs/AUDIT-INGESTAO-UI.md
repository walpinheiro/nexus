# Auditoria da importação de projeto existente

## Achado

O parser local exigia um espaço entre o nome do campo e o separador. Assim, `Objetivo:` e `Público:` sem espaço não eram reconhecidos. A Home preenchia então o título com o texto bruto, que podia começar com o rótulo `Objetivo:`.

## Ajuste

- A heurística determinística agora aceita os formatos com ou sem espaço antes de `:` e extrai `reduzir retrabalho em 20%` e `gestores de produto` do texto de exemplo.
- A sugestão de título usa o problema, depois o objetivo e por fim o texto original; remove rótulos de campo no início sem reescrever o resumo. A importação continua salvando o texto completo original em `ingestao.texto`.
- Nenhum valor de objetivo ou público é inventado quando não existe um campo reconhecível.

## Verificação

`npx vite-node scripts/test-ingestao.mjs` passou. O teste cobre a extração do exemplo, o título sem rótulo, um resumo sem campos e a remoção de prefixo quando o título precisa recorrer ao texto original.
