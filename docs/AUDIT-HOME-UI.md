# Auditoria da interface Home

## Achados

- O badge do projeto herdava uma regra genérica de `span` da faixa de próxima ação, sobrescrevendo a cor de texto do `VBadge` e reduzindo o contraste sobre o fundo primário.
- O resumo de gates era calculado a partir do `localStorage` em um `computed` que dependia somente do ID do projeto. Mudanças de status em memória podiam deixar a Home desatualizada em relação à Sidebar.
- A chamada “Pronto para avançar” sugeria aprovação quando o gate atual ainda estava em revisão. O CTA genérico “Continuar” também não dizia qual ação ocorreria.
- O estado de todos os gates aprovados caía no fallback G5, apresentando uma próxima etapa inexistente.

## Ajustes

- A Home agora lê os gates reativos do mesmo store usado pela Sidebar, conta apenas status `aprovado` e calcula o total pela ordem oficial dos gates.
- O destaque acompanha o estado real: revisão pendente, gate disponível, dependência pendente ou todos aprovados. O texto do CTA identifica a ação e o gate.
- Quando todos os gates estão aprovados, a Home informa a conclusão e oferece o backlog sem inventar outro gate.
- O badge usa a variante primária do kit sem receber a regra de texto da faixa. Os estilos responsivos permitem quebra e truncamento controlados em telas estreitas.

## Verificação visual

Validado em 320 px, 390 px e 1440 px. Não houve overflow horizontal nem cortes no cabeçalho, título do gate ou CTA. Em 320 px o cabeçalho empilha e o cartão permanece dentro da viewport; em 390 px o cartão mantém a contagem e a ação visíveis; em 1440 px o badge mantém texto branco legível sobre o fundo primário. A contagem `2 de 6` e o estado de revisão do G2 conferiram com a Sidebar. A captura da validação está em [home-sidebar-auditoria.jpg](home-sidebar-auditoria.jpg).

O branch de conclusão foi revisado no código para exibir todos os gates aprovados e direcionar ao backlog quando o store não tiver gates pendentes; os dados de status não foram alterados para simular esse estado durante a QA visual.

## Assistente de criação

- A escolha entre novo e existente usa `VTabs` do kit, e o seletor técnico de provedor saiu do cadastro porque esse fluxo não chama um modelo. A sugestão de título é descrita como derivada das respostas e só entra no campo quando a pessoa escolhe “Usar sugestão”.
- Cada etapa destaca a pergunta como título e apresenta o helper uma vez. A validação segue o contrato G0: contexto com 30 caracteres; objetivo e público obrigatórios; métrica obrigatória na revisão final.
- O helper do primeiro passo explicita o mínimo de 30 caracteres exigido pelo contexto G0.
- O botão principal de criação aparece apenas na revisão, exige título e mantém os campos revisados. Voltar preserva as respostas. Cancelar e o controle de fechar do diálogo ficam disponíveis como ações secundárias.
- O diálogo usa o corpo de rolagem do kit sem um segundo contêiner de scroll.
- Na QA do wizard, os cinco passos concluíram, Voltar preservou a resposta e “Criar projeto” apareceu somente na revisão final. A captura está em [wizard-g0-auditoria.jpg](wizard-g0-auditoria.jpg).
- O percentual do cabeçalho e a barra usam o mesmo cálculo. No primeiro dos cinco passos, ambos exibem 20%.
