# Auditoria de IA e gates do NEXO

## Proposta avaliada

As especificações `nexo-especificacoes/05-gate-0-enquadramento.md` a `10-gate-5-entrega.md` definem G0–G5 como etapas sequenciais com critérios verificáveis, evidências, responsáveis e aprovação humana. A IA deve conduzir perguntas curtas por etapa, separar fatos de hipóteses, apontar lacunas e apoiar a elaboração de artefatos. A revisão da IA não substitui os validadores nem a baseline aprovada por papel autorizado.

## Achados

- A sessão já fazia diagnóstico a partir dos validadores dos gates, mas mantinha o histórico apenas em memória. Trocar de alvo ou reabrir a página apagava respostas e decisões.
- O fallback determinístico era apresentado dentro de uma sessão chamada IA. O indicador online/offline ajudava, mas as mensagens não diferenciavam claramente texto de modelo real e coaching local.
- Quando não havia gerador de patch específico, a sessão criava um patch genérico gravando texto livre diretamente em `campoAlvo`. Isso era inseguro para campos estruturados (listas, evidências e objetos) e podia dar aparência de critério atendido sem evidência válida.
- Os patches eram aceitos manualmente e o gate continuava sujeito à validação e governança existentes. Essa separação deve ser mantida: resposta, sugestão e patch aceito não equivalem a aprovação de gate ou baseline.
- G0 fabricava um alvo seed ausente e o G1 ocultava o épico G0 criado para projetos novos, impedindo a transição real para o gate seguinte. A elegibilidade também não era validada dentro do store de aprovação, e o SoD dependia do chamador informar corretamente o proponente.
- A criação no Canvas herdava `project_id`/`parent_id` fixos do seed, o que podia associar itens novos ao projeto errado e criar referências a pais fora do grafo ativo.
- As perguntas existentes carregam código, motivo do bloqueio, exemplo e campo-alvo; permanecem como fonte do roteiro. A ordenação por papel preserva todos os checks.

## Implementado

- Histórico de respostas, perguntas, notas e decisões é persistido no navegador com chave por projeto, gate e objeto. O conteúdo de um alvo não aparece ao selecionar outro alvo ou projeto.
- Ao retornar ao mesmo alvo, a conversa revisada é restaurada. A trilha é limitada às 300 entradas mais recentes por alvo.
- Mensagens de resposta indicam quando o texto veio de IA online ou do coach determinístico local. Falhas de chamada ficam explícitas e oferecem retry; uma indisponibilidade não é apresentada como output de LLM.
- Removida a gravação genérica de texto livre em campos com formato estruturado. Sem um patch tipado específico, a resposta é preservada como registro de revisão e o usuário é orientado a completar o artefato e rodar novamente o diagnóstico.
- O texto do patch esclarece que sua aceitação altera o objeto, mas não aprova o gate nem cria baseline.
- Seleção de alvos é centralizada por gate, baseada em nós reais e testável. G1 passa a oferecer o épico G0 após aprovação versionada; G0 vazio não inventa alvo. Solicitações navegadas entre gates preservam o alvo e projetos com IDs repetidos recarregam o histórico correto.
- O store de aprovação rejeita alvo de outro projeto ou inelegível para a etapa e confere papel do decisor. SoD usa owner e solicitante como verificações independentes, inclusive quando o argumento opcional do proponente é omitido.
- Objetos novos recebem o projeto ativo, pai válido do mesmo projeto (ou pai padrão compatível) e gate padrão coerente com seu tipo.
- O catálogo do G2 foi alinhado: FTR-004 exige owner da feature e política estruturada com recurso/ação/policy; o formulário coleta os dois. FTR-003 só passa com regra vinculada e fonte declarada. Isto não verifica se a fonte é verdadeira ou se a regra está ativa fora do registro fornecido.
- Os checks FTR-006 e FTR-007 eram permissivos: FTR-006 aceitava ausência de dados e frases/strings sem campos verificáveis; FTR-007 aceitava Given/When/Then sem camada ou fonte declaradas.
- Solicitações novas registram versão do alvo e votos separados por papel obrigatório. Quorum atual: G0 PM; G1 Negócio + PM; G2 PM + UX + TechLead; G3 Arquiteto + Segurança + TechLead; G4 PO + Dev + QA; G5 Dev + QA + TechLead. SoD é verificado em cada voto e votos da versão anterior não contam. A fila mostra votos e papéis faltantes.
- Navegação da sessão e ações de botão nas telas principais de Gate usam componentes Nova; o serviço de modelo mostra indisponibilidade e oferece verificação de conexão. Resposta livre é registrada como nota não verificada; output do modelo não gera patch.
- Cada pendência do checklist pode abrir um editor tipado Nova para o código correspondente. O editor gera preview de diff; somente a ação humana de aceitar cria patch de nova versão. Conversa e resposta do modelo não são convertidas em fatos nem patches. Critérios sem formulário não usam fallback genérico.
- FTR-006 agora exige decisão explícita: ou “nenhuma integração” com justificativa, ou uma ou mais integrações com nome, timeout positivo, tratamento de falha e de indisponibilidade. FTR-007 exige Given/When/Then, camada exercitada e fonte/referência declarada. O registro da referência não verifica seu conteúdo.
- G0 coach não oferece mais frases inventadas como resposta clicável nem afirma que texto livre avança o objeto; a conversa é separada do formulário/diff.
- Arestas rejeitam relações entre projetos diferentes e duplicatas de mesmo tipo/origem/destino/handles; handles opcionais preservam conexões em lados escolhidos.
- A associação de baseline G1 do seed de demonstração apontava para `enq-pix`, enquanto as features demonstrativas são filhas de `ep-pix`. Corrigida a referência conhecida do seed e o backfill legado somente nesse projeto; projetos reais sem alvo continuam exigindo revisão humana. Objetos históricos que não correspondem a baseline são listados para inspeção/edição, mas o store bloqueia solicitação/aprovação e a interface deixa essa diferença explícita.
- Os checks G5 agora exigem URL HTTP de PR, merge e aprovação humana explicitamente declarados; estados de CI não pendentes e SAST/policy explicitamente aprovados; exceção de segurança com owner, prazo ISO vigente e aceite. `PBI-BLOQ` requer decisão booleana explícita além da justificativa, para não interpretar frases como “sem bloqueador” por substring.
- O botão “Preencher este critério” abre a aba de pendências e o editor na linha correspondente. A conversa apresenta o provedor/modelo de cada registro salvo (sem inferir do estado atual do servidor) e avisa quando mensagens persistidas são históricas e contradizem o critério atual.

## Pendências

- Persistência segue local ao navegador, seguindo o padrão de armazenamento atual do NEXO; não oferece sincronização multiusuário nem trilha central auditável.
- Os formulários tipados cobrem os critérios com schema registrado; qualquer critério sem schema permanece sem proposta. A classificação de fonte/natureza é declaração humana, não verificação externa. Alguns critérios G5 recebem dados declarados de evidência, mas não integram PR/CI/testes nem verificam seus links/resultados.
- A migração visual para componentes Nova ainda não cobre todos os elementos de formulário/diálogo de Gate; algumas telas usam componentes nativos/estrutura legada.
- A especificação pede origem/cobertura de fontes, hipóteses separadas de fatos e registro de decisões pendentes. A sessão ainda não modela estes elementos como entidades de domínio dedicadas.
- O MVP ainda usa um estado único de aprovação/baseline por gate e projeto. Vários alvos no mesmo gate precisam de um modelo de baseline por objeto para governança de portfólio em produção.
- O MVP local usa armazenamento do navegador e papéis de demonstração. Um sistema de produção exige persistência/identidade central, autorização de servidor, trilha de auditoria imutável e sincronização de evidências.

## Verificação

- `npm run test:determinism` — passou; cobre elegibilidade sem seed, alvo visível mas inelegível, progressão G0→G1, SoD, quorum e versão, dependências e FTR-006/FTR-007/DON-002/DON-003/DON-005/PBI-BLOQ.
- `npm run build` — passou (`vue-tsc --noEmit` e `vite build`, 1950 módulos transformados).

