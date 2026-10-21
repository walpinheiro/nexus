import assert from 'node:assert/strict'
import { gerarPromptStudio } from '@/utils/studioPrompt'
import { alvosDoGate, alvosVisiveisDoGate, avaliarGate, quorumGate, segregacaoFuncoesOk } from '@/utils/gates'

// Fixture baseada no seedDoc padrão de src/stores/useStudio.ts
const seedDoc = {
  title: 'Cobranças Pix',
  brief: 'Protótipo de telas do pagamento por Pix (espelha as 4 features NEXO).',
  frame: 'phone',
  platform: 'web',
  paletteKey: 'blue',
  theme: { palette: 'blue', scheme: 'blue', type: 'expressive', radius: 'rounded' },
  frames: [
    { id: 'checkout', name: 'Checkout Web', x: 0, y: 0, w: 1280, h: 800, preset: 'desktop', note: 'Criar cobrança Pix + status de pagamento.' },
    { id: 'pagpix', name: 'Pagamento Pix', x: 1400, y: 0, w: 412, h: 892, preset: 'phone', note: 'Pagar fatura com Pix; abre Checkout Web.' }
  ],
  groups: [
    {
      id: 'g-web',
      x: 28,
      y: 60,
      axis: 'x',
      order: 0,
      items: [{ id: 't1', kind: 'text', label: 'Criar cobrança Pix', size: 28, x: 28, y: 60 }]
    },
    {
      id: 'g-bar',
      x: 1400,
      y: 0,
      axis: 'x',
      order: 1,
      items: [{ id: 'bar1', kind: 'topAppBar', label: 'Pagamento Pix', icon: 'menu', variant: 'filled', x: 1400, y: 0 }]
    },
    {
      id: 'g-list',
      x: 1416,
      y: 112,
      axis: 'y',
      order: 2,
      items: [
        { id: 'c1', kind: 'card', label: 'Pagar fatura com Pix', supporting: 'Pix de forma simples e segura.', variant: 'filled', action: { to: 'checkout', transition: 'slide' }, x: 1416, y: 112 },
        { id: 'c2', kind: 'card', label: 'Confirmação idempotente', supporting: 'Sem transações duplicadas.', variant: 'filled', x: 1416, y: 350 },
        { id: 'c3', kind: 'card', label: 'Status de pagamento', supporting: 'Exibe o status da cobrança.', variant: 'outlined', x: 1416, y: 588 }
      ]
    },
    {
      id: 'g-pay',
      x: 1416,
      y: 700,
      axis: 'x',
      order: 3,
      items: [{ id: 'b1', kind: 'button', label: 'Pagar com Pix', variant: 'filled', size: 380, action: { to: 'checkout', transition: 'slide' }, note: 'Cria cobrança e abre o checkout.', x: 1416, y: 700 }]
    }
  ]
}

console.log('--- Iniciando Testes de Determinismo do Prompt Studio (diff0) ---')

// 1. Execução 2x no seedDoc -> assert diff === 0 (byte-identical)
const promptRun1 = gerarPromptStudio(seedDoc)
const promptRun2 = gerarPromptStudio(seedDoc)
assert.strictEqual(
  promptRun1,
  promptRun2,
  'FALHA: Execuções sucessivas sobre o mesmo seedDoc devem ser byte-identical (diff === 0).'
)
console.log('✓ Asserção 1: Byte-identical em execuções consecutivas (diff === 0).')

// 2. Execução com frames e grupos embaralhados / invertidos -> assert diff === 0
const shuffledDoc = {
  ...seedDoc,
  frames: [...seedDoc.frames].reverse(),
  groups: [...seedDoc.groups].reverse().map((g) => ({
    ...g,
    items: [...g.items].reverse()
  }))
}
const promptShuffled = gerarPromptStudio(shuffledDoc)
assert.strictEqual(
  promptRun1,
  promptShuffled,
  'FALHA: Ordem de frames/grupos/itens não pode alterar o prompt gerado (diff === 0).'
)
console.log('✓ Asserção 2: Determinismo mantido com frames, grupos e itens embaralhados (diff === 0).')

// 3. Asserção: Zero ocorrências de "Author:" ou "android"
const hasAuthor = /Author:/i.test(promptRun1)
const hasAndroid = /android/i.test(promptRun1)
assert.strictEqual(hasAuthor, false, 'FALHA: Prompt gerado não deve conter menção a "Author:".')
assert.strictEqual(hasAndroid, false, 'FALHA: Prompt gerado não deve conter menção a "android".')
console.log('✓ Asserção 3: Zero ocorrências de "Author:" e "android".')

// 4. Asserção: Presença de todos os 5 blocos M3E
const expectedBlocks = [
  '## Colors',
  '## Shape, type and motion',
  '## Layout',
  '## Component styles',
  '## General guidance'
]

for (const block of expectedBlocks) {
  assert.ok(
    promptRun1.includes(block),
    `FALHA: Bloco M3E obrigatório ausente: "${block}"`
  )
}
console.log('✓ Asserção 4: Todos os 5 blocos M3E presentes com sucesso.')

// 5. Elegibilidade de alvo é restrita aos objetos reais e respeita o avanço G0→G1.
const epic = { id: 'ep-real', tipo: 'epico', gate: 'G0', status: 'draft', project_id: 'p-real' }
const otherEpic = { id: 'ep-other', tipo: 'epico', gate: 'G3', status: 'draft', project_id: 'p-real' }
const feature = { id: 'ft-real', tipo: 'feature', gate: 'G2', status: 'draft', project_id: 'p-real', parent_id: 'ep-real' }
const invalidG5 = { id: 'ep-g5', tipo: 'epico', gate: 'G5', status: 'validated', project_id: 'p-real' }
assert.deepEqual(alvosDoGate('G0', [], []), [], 'G0 vazio não pode injetar um épico seed.')
assert.deepEqual(alvosDoGate('G1', [epic], [{ id: 'G0', status: 'rascunho', baselineVersao: null }]), [], 'Épico de G0 só entra em G1 após baseline aprovada.')
assert.deepEqual(alvosDoGate('G1', [epic, otherEpic], [{ id: 'G0', status: 'aprovado', baselineVersao: 1, baselineAlvoId: 'ep-real' }]).map((n) => n.id), ['ep-real'], 'Baseline G0 libera somente o épico real de enquadramento para G1.')
assert.deepEqual(alvosDoGate('G1', [epic], [{ id: 'G0', status: 'aprovado', baselineVersao: 1, baselineAlvoId: 'ep-real' }, { id: 'G1', status: 'aprovado', baselineVersao: 2, baselineAlvoId: 'ep-real' }]).map((n) => n.id), ['ep-real'], 'Gate já aprovado mantém seu alvo de baseline visível e elegível.')
const aprovadoG1 = [{ id: 'G1', status: 'aprovado', baselineVersao: 2, baselineAlvoId: 'ep-real' }]
assert.deepEqual(alvosDoGate('G2', [epic, feature], aprovadoG1).map((n) => n.id), ['ft-real'], 'G2 só lista features filhas do épico aprovado.')
assert.deepEqual(alvosDoGate('G2', [feature], [{ id: 'G1', status: 'aprovado', baselineVersao: 2 }]), [], 'Alvo histórico sem baselineAlvoId não pode ser elegível para aprovação.')
assert.deepEqual(alvosVisiveisDoGate('G2', [feature], [{ id: 'G1', status: 'aprovado', baselineVersao: 2 }]).map((n) => n.id), ['ft-real'], 'Feature legada continua visível para inspeção mesmo se o vínculo de baseline estiver ausente.')
assert.deepEqual(alvosDoGate('G3', [feature], [{ id: 'G2', status: 'aprovado', baselineVersao: 2, baselineAlvoId: 'ft-real' }]).map((n) => n.id), ['ft-real'], 'G3 revisa somente a feature que concluiu G2.')
assert.deepEqual(alvosDoGate('G5', [invalidG5], []).map((n) => n.id), [], 'G5 não aceita épicos como entregáveis.')
assert.equal(segregacaoFuncoesOk('u-owner', 'u-requester', 'u-owner'), false, 'Owner não pode aprovar o próprio objeto.')
assert.equal(segregacaoFuncoesOk('u-owner', 'u-requester', 'u-requester'), false, 'Solicitante não pode aprovar a própria solicitação.')
assert.equal(segregacaoFuncoesOk('u-owner', 'u-requester', 'u-approver'), true, 'Aprovador independente pode seguir para os demais controles.')
assert.deepEqual(quorumGate('G0'), [['PM']])
assert.deepEqual(quorumGate('G1'), [['Negocio'], ['PM']])
assert.deepEqual(quorumGate('G2'), [['PM'], ['UX'], ['TechLead']])
assert.deepEqual(quorumGate('G3'), [['Arquiteto'], ['Seguranca'], ['TechLead']])
assert.deepEqual(quorumGate('G4'), [['PO'], ['Dev'], ['QA']])
assert.deepEqual(quorumGate('G5'), [['Dev'], ['QA'], ['TechLead']])
const votosVersao2 = [{ papel: 'PM', versao: 2 }, { papel: 'UX', versao: 2 }]
const faltaTecnico = quorumGate('G2').filter((group) => !group.some((role) => votosVersao2.some((vote) => vote.papel === role && vote.versao === 2)))
assert.deepEqual(faltaTecnico, [['TechLead']], 'Votos parciais devem deixar explícito o grupo técnico faltante.')
const votosDesatualizados = [{ papel: 'PM', versao: 1 }, { papel: 'UX', versao: 1 }, { papel: 'TechLead', versao: 1 }]
const quorumNaVersaoAtual = quorumGate('G2').filter((group) => !group.some((role) => votosDesatualizados.some((vote) => vote.papel === role && vote.versao === 2)))
assert.equal(quorumNaVersaoAtual.length, 3, 'Votos da versão anterior não satisfazem quorum de versão atualizada.')
const pbiDepBase = { id: 'pbi-dep-check', project_id: 'p-real', tipo: 'pbi', titulo: 'PBI teste', descricao: '', status: 'draft', gate: 'G4', owner: 'u-owner', contribuidores: [], classificacao: 'internal', fonte: 'stated', fonte_refs: [], versao: 1, x: 0, y: 0, z: 0, created_at: '', updated_at: '', feature_id: 'ft-real', escopo_in: ['inclui'], escopo_out: ['exclui'], dependencias: [], estrategia_teste: '', criterios_bdd: [] }
const depCheckSemDecisao = avaliarGate(pbiDepBase, [], 'G4').checks.find((check) => check.codigo === 'PBI-DEP')
assert.equal(depCheckSemDecisao?.ok, false, 'Lista vazia não prova que dependências foram avaliadas.')
const depCheckNenhuma = avaliarGate({ ...pbiDepBase, dependencias_decisao: 'nenhuma', dependencias_justificativa: 'Revisadas histórias do fluxo; nenhuma dependência externa.' }, [], 'G4').checks.find((check) => check.codigo === 'PBI-DEP')
assert.equal(depCheckNenhuma?.ok, true, 'Ausência de dependências exige decisão e justificativa humana explícita.')
const featureBase = { id: 'ft-check', project_id: 'p-real', tipo: 'feature', titulo: 'Feature teste', descricao: 'Permite consultar um extrato de cobrança', status: 'draft', gate: 'G2', owner: 'u-owner', contribuidores: [], classificacao: 'internal', fonte: 'stated', fonte_refs: [], versao: 1, x: 0, y: 0, z: 0, created_at: '', updated_at: '', parent_id: 'ep-real', ator: 'Cliente', beneficio: 'Acompanhar pagamentos', fluxo_feliz: 'Cliente consulta extrato e vê os pagamentos confirmados.', regras_ids: ['r-1'], regras: [{ id: 'r-1', descricao: 'Regra ativa', fonte: 'doc-1', fonte_refs: ['doc-1#regra-1'], status: 'ativa' }], permissoes: [{ recurso: 'extrato', acao: 'consultar', policy: 'somente titular' }], telas_ids: [], telas_estados: [], integracoes: [], criterios_bdd: [] }
const checkFeature = (codigo, overrides = {}) => avaliarGate({ ...featureBase, ...overrides }, [], 'G2').checks.find((check) => check.codigo === codigo)
assert.equal(checkFeature('FTR-006')?.ok, false, 'Integração sem decisão estruturada não pode ficar verde por ausência de dados.')
assert.equal(checkFeature('FTR-006', { descricao: `${featureBase.descricao}; usa PSP externo com timeout e retry`, integracoes: ['PSP com timeout, falha e indisponibilidade'] })?.ok, false, 'Texto livre/strings não substituem campos estruturados de resiliência.')
assert.equal(checkFeature('FTR-006', { integracoes_decisao: 'com_integracoes', integracoes: [{ nome: 'PSP', timeout_ms: 5000, falha: 'Rejeitar a operação e registrar erro', indisponibilidade: 'Exibir indisponibilidade e permitir nova tentativa' }] })?.ok, true, 'Integração estruturada exige nome, timeout positivo e respostas distintas a falha e indisponibilidade.')
assert.equal(checkFeature('FTR-006', { integracoes_decisao: 'nenhuma', integracoes_justificativa: 'Feature sem chamadas ou dependências de serviços externos.' })?.ok, true, 'A análise explícita de nenhuma integração requer justificativa.')
assert.equal(checkFeature('FTR-007', { criterios_bdd: [{ given: 'Dado cliente autenticado', when: 'Quando consulta extrato', then: 'Então vê pagamentos' }] })?.ok, false, 'BDD sem camada e fonte não pode fechar FTR-007.')
assert.equal(checkFeature('FTR-007', { criterios_bdd: [{ given: 'Dado cliente autenticado', when: 'Quando consulta extrato', then: 'Então vê pagamentos confirmados', camada: 'API', fonte: 'US-42' }] })?.ok, true, 'BDD só fecha com conteúdo e metadados estruturados de camada/fonte.')
const checkPbi = (overrides = {}) => avaliarGate({ ...pbiDepBase, ...overrides }, [], overrides.gate || 'G4').checks
assert.equal(checkPbi({ bloqueador_aberto: false, flag: 'Sem bloqueador aberto após revisão de dependências.' }).find((check) => check.codigo === 'PBI-BLOQ')?.ok, true, 'A frase “sem bloqueador” só passa acompanhada de decisão booleana explícita.')
assert.equal(checkPbi({ flag: 'Sem bloqueador aberto após revisão de dependências.' }).find((check) => check.codigo === 'PBI-BLOQ')?.ok, false, 'Texto negativo livre não substitui a decisão explícita de PBI-BLOQ.')
const checkDelivery = (evidencia) => avaliarGate({ ...pbiDepBase, gate: 'G5', status: 'validated', evidencia }, [], 'G5').checks
assert.equal(checkDelivery({ pr_url: 'pull request #42', pr_merged: true, aprovacao_humana: true }).find((check) => check.codigo === 'DON-002')?.ok, false, 'Texto com “pull” não prova link HTTP de PR.')
assert.equal(checkDelivery({ pr_url: 'https://git.example/pr/42', pr_merged: true }).find((check) => check.codigo === 'DON-002')?.ok, false, 'PR exige aprovação humana explicitamente registrada.')
assert.equal(checkDelivery({ checks_ci: ['build passou'], sast_ok: true, policy_ok: true }).find((check) => check.codigo === 'DON-003')?.ok, true, 'CI só passa com resultados declarados e SAST/policy explicitamente aprovados.')
assert.equal(checkDelivery({ checks_ci: ['build passou'] }).find((check) => check.codigo === 'DON-003')?.ok, false, 'CI sem resultados explícitos de SAST/policy não pode ficar verde.')
assert.equal(checkDelivery({ excecao: { prazo: '2099-01-01' } }).find((check) => check.codigo === 'DON-005')?.ok, false, 'Exceção de segurança requer owner, prazo e aceite explícitos.')
console.log('✓ Asserção 5: Alvos elegíveis/inspecionáveis, transições, SoD/quorum, dependências e regressões FTR-006/FTR-007/DON-002/DON-003/DON-005/PBI-BLOQ.')

console.log('--- Todos os testes de determinismo passaram com sucesso (diff0)! ---')
