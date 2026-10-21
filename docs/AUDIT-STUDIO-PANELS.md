# Auditoria do Studio: cabeçalho e painéis

## Ajustes

- O Studio ocupa a largura disponível (`w-full min-w-0`), com a área de edição flexível entre os painéis laterais.
- O cabeçalho mantém o nome do projeto truncado, presença e ação Voltar em uma linha. Quando o Studio abre dentro do Canvas, reserva espaço à direita para a busca flutuante global.
- O controle quadrado “Expandir área de edição” recolhe os dois painéis laterais e a rail; “Mostrar painéis laterais” restaura o layout.
- A paleta mantém o botão de adicionar separado do botão de favorito. O wrapper do tile não desenha uma segunda borda, e o favorito não aciona a inclusão do componente.
- Campos do NovaField sem valor explícito permanecem vazios; um prop booleano ausente não aparece como o texto `false`. Um `false` ligado explicitamente continua disponível para controles booleanos.

## Verificação

- `scripts/test-nova-field-contract.mjs`: cobre o valor de texto existente e o campo sem valor para impedir regressão para `false`.
- Build do projeto: registrado após as alterações desta auditoria.
- A validação visual nos tamanhos 1280 px e 390 px fica a cargo da QA integrada do Studio.
