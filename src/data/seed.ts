import type { Edge, Epic, Feature, GateId, PBI, TelaVinculo, User } from '@/types/nexo'
import type { GateInfo } from '@/stores/useGate'

// Seed local — textos das 4 features EXATOS do nexo-interface-proposal-static.png.
// Positions x/y replicam o layout do PNG (viewport ~1200x760, card 280px).

export const seedProjeto = { id: 'proj-cobrancas', titulo: 'Cobranças' }

const base = {
  project_id: 'proj-cobrancas',
  classificacao: 'internal' as const,
  fonte: 'stated' as const,
  fonte_refs: [] as string[],
  causa_stale: null,
  grupo: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
}

export const seedEnquadramento: Epic = {
  ...base,
  id: 'enq-pix',
  tipo: 'epico',
  titulo: 'Enquadramento: Cobranças via Pix',
  descricao: 'Definição estratégica e discovery de pagamentos de faturas via Pix com rapidez e segurança.',
  status: 'approved',
  gate: 'G0',
  owner: 'u-pm',
  contribuidores: ['u-pm', 'u-ux'],
  versao: 1,
  baseline: 1,
  parent_id: null,
  x: 600,
  y: -100,
  z: 0,
  problema: 'Clientes sem cartão precisam pagar faturas com rapidez e segurança.',
  objetivo: 'Permitir pagamento de faturas via Pix',
  kpis: [{ nome: 'Adoção Pix', unidade: '%', alvo: '40', janela: '90d', responsavel: 'u-pm' }],
  personas: ['Cliente com fatura'],
  escopo_in: ['Pagar, criar e confirmar cobrança via Pix'],
  escopo_out: ['Boleto e cartão'],
  riscos: [
    {
      probabilidade: 'alta',
      impacto: 'alto',
      mitigacao: 'retry com idempotência + fallback manual',
      owner: 'u-dev'
    }
  ]
}

export const seedEpico: Epic = {
  ...base,
  id: 'ep-pix',
  tipo: 'epico',
  titulo: 'Pagamento por Pix',
  descricao: 'Permitir que clientes paguem faturas via Pix com rapidez e segurança.',
  status: 'approved',
  gate: 'G1',
  owner: 'u-pm',
  contribuidores: ['u-pm', 'u-ux', 'u-arq'],
  versao: 1,
  baseline: 1,
  parent_id: null,
  x: 600,
  y: 40,
  z: 0,
  problema: 'Clientes sem cartão precisam pagar faturas com rapidez e segurança.',
  objetivo: 'Permitir pagamento de faturas via Pix',
  kpis: [{ nome: 'Adoção Pix', unidade: '%', alvo: '40', janela: '90d', responsavel: 'u-pm' }],
  personas: ['Cliente com fatura'],
  escopo_in: ['Pagar, criar e confirmar cobrança via Pix'],
  escopo_out: ['Boleto e cartão'],
  riscos: [
    {
      probabilidade: 'alta',
      impacto: 'alto',
      mitigacao: 'retry com idempotência + fallback manual',
      owner: 'u-dev'
    }
  ]
}

export const seedFeatures: Feature[] = [
  {
    ...base,
    id: 'ft-pagar',
    tipo: 'feature',
    titulo: 'Pagar fatura com Pix',
    descricao: 'Permite ao cliente pagar uma fatura utilizando Pix de forma simples e segura.',
    status: 'approved',
    gate: 'G2',
    owner: 'u-pm',
    contribuidores: ['u-pm', 'u-ux', 'u-dev'],
    versao: 1,
    baseline: 1,
    parent_id: 'ep-pix',
    x: 120,
    y: 220,
    z: 1,
    ator: 'cliente com fatura aberta',
    beneficio: 'pagar com rapidez sem cartão',
    gatilho: 'fatura aberta',
    precondicoes: ['cliente autenticado'],
    fluxo_feliz: 'cliente escolhe Pix e confirma pagamento',
    alternativos: ['PSP fora do ar exibe erro com tentar de novo'],
    regras_ids: [],
    telas_ids: telasSeedDaFeature('ft-pagar'),
    integracoes: [],
    criterios_bdd: [
      {
        id: 'AC-001',
        given: 'fatura aberta pertence ao cliente autenticado',
        when: 'cliente solicita pagamento por Pix',
        then: 'retorna QR Code, código copiável e expiração',
        prioridade: 'must'
      }
    ]
  },
  {
    ...base,
    id: 'ft-confirmar',
    tipo: 'feature',
    titulo: 'Confirmação idempotente',
    descricao:
      'Garante que confirmações de pagamento Pix sejam processadas apenas uma vez, evitando transações duplicadas.',
    status: 'approved',
    gate: 'G2',
    owner: 'u-pm',
    contribuidores: ['u-pm', 'u-ux', 'u-arq', 'u-dev', 'u-qa'],
    versao: 1,
    baseline: 1,
    parent_id: 'ep-pix',
    x: 480,
    y: 330,
    z: 2,
    ator: 'sistema de cobranças',
    beneficio: 'não duplicar confirmações',
    gatilho: 'webhook do PSP',
    precondicoes: ['idTx presente'],
    fluxo_feliz: 'primeira confirmação baixa a fatura; repetidas retornam o mesmo resultado',
    alternativos: ['webhook duplicado retorna o mesmo resultado sem novo efeito'],
    regras_ids: [],
    telas_ids: telasSeedDaFeature('ft-confirmar'),
    integracoes: ['PSP (webhook com idTx)'],
    criterios_bdd: [
      {
        id: 'AC-010',
        given: 'confirmação com idTx já processado',
        when: 'PSP reenvia o webhook',
        then: 'sistema retorna o resultado original sem duplicar registros',
        prioridade: 'must'
      }
    ]
  },
  {
    ...base,
    id: 'ft-criar',
    tipo: 'feature',
    titulo: 'Criar cobrança Pix',
    descricao: 'Gera uma cobrança via Pix e disponibiliza o QR Code para o pagador.',
    status: 'approved',
    gate: 'G2',
    owner: 'u-pm',
    contribuidores: ['u-pm', 'u-dev'],
    versao: 1,
    baseline: 1,
    parent_id: 'ep-pix',
    x: 840,
    y: 220,
    z: 3,
    ator: 'cliente com fatura aberta',
    beneficio: 'obter QR Code válido',
    gatilho: 'solicitação de pagamento por Pix',
    precondicoes: ['fatura pertence ao cliente autenticado'],
    fluxo_feliz: 'retorna QR Code, código copiável e expiração',
    alternativos: ['QR Code expirado permite regenerar nova cobrança'],
    regras_ids: [],
    telas_ids: telasSeedDaFeature('ft-criar'),
    integracoes: [],
    criterios_bdd: [
      {
        id: 'AC-020',
        given: 'fatura aberta válida',
        when: 'cliente cria cobrança Pix',
        then: 'sistema gera QR Code com expiração',
        prioridade: 'must'
      }
    ]
  },
  {
    ...base,
    id: 'ft-status',
    tipo: 'feature',
    titulo: 'Status de pagamento',
    descricao: 'Exibe o status do pagamento da cobrança para o cliente.',
    status: 'stale',
    gate: 'G2',
    owner: 'u-pm',
    contribuidores: ['u-dev', 'u-qa'],
    versao: 2,
    baseline: 1,
    parent_id: 'ep-pix',
    causa_stale: 'regra de confirmação alterada',
    x: 480,
    y: 590,
    z: 4,
    ator: 'cliente',
    beneficio: 'acompanhar pagamento',
    gatilho: 'cobrança criada',
    precondicoes: [],
    fluxo_feliz: 'exibe status atualizado da cobrança',
    alternativos: [],
    regras_ids: [],
    telas_ids: telasSeedDaFeature('ft-status'),
    integracoes: [],
    criterios_bdd: [
      {
        id: 'AC-030',
        given: 'cobrança confirmada com idTx',
        when: 'cliente abre o status',
        then: 'exibe pago com idTx e horário',
        prioridade: 'must'
      }
    ]
  }
]

export const seedPbis: PBI[] = [
  {
    ...base,
    id: 'pbi-idtx',
    tipo: 'pbi',
    titulo: 'Dedup por idTx no webhook',
    descricao: 'Garante que o webhook do PSP com idTx repetido retorna o resultado original sem duplicar.',
    status: 'draft',
    gate: 'G4',
    owner: 'u-dev',
    contribuidores: ['u-dev', 'u-qa'],
    versao: 1,
    baseline: null,
    parent_id: 'ep-pix',
    causa_stale: null,
    x: 840,
    y: 590,
    z: 5,
    feature_id: 'ft-confirmar',
    escopo_in: ['dedup por idTx'],
    escopo_out: ['reprocessamento manual'],
    dependencias: [],
    estrategia_teste: 'contrato + request',
    criterios_bdd: [
      {
        id: 'AC-PBI-001',
        given: 'webhook com idTx já processado',
        when: 'PSP reenvia a confirmação',
        then: 'sistema retorna o resultado original sem duplicar',
        prioridade: 'must'
      }
    ]
  },
  {
    ...base,
    id: 'pbi-status',
    tipo: 'pbi',
    titulo: 'Polling de status pós-confirmação',
    descricao: 'Atualiza a tela de status após a confirmação idempotente.',
    status: 'draft',
    gate: 'G4',
    owner: 'u-dev',
    contribuidores: ['u-dev'],
    versao: 1,
    baseline: null,
    parent_id: 'ep-pix',
    causa_stale: null,
    x: 120,
    y: 590,
    z: 6,
    feature_id: 'ft-status',
    escopo_in: ['polling de status'],
    escopo_out: ['push realtime'],
    dependencias: ['pbi-idtx'],
    estrategia_teste: 'componente + e2e',
    criterios_bdd: [
      {
        id: 'AC-PBI-010',
        given: 'confirmação idempotente concluída',
        when: 'cliente abre a tela de status',
        then: 'exibe o status atualizado sem recarregar',
        prioridade: 'must'
      }
    ]
  },
  {
    ...base,
    id: 'pbi-entrega-pix',
    tipo: 'pbi',
    titulo: 'Entrega Cobrança Pix em produção',
    descricao: 'Publica a cobrança Pix com PR merged, CI verde, aceite e observabilidade.',
    status: 'draft',
    gate: 'G5',
    owner: 'u-dev',
    contribuidores: ['u-dev', 'u-qa'],
    versao: 1,
    baseline: null,
    parent_id: 'ep-pix',
    causa_stale: null,
    x: 480,
    y: 850,
    z: 7,
    feature_id: 'ft-confirmar',
    escopo_in: ['publicação da cobrança Pix'],
    escopo_out: ['novas features'],
    dependencias: [],
    estrategia_teste: 'e2e + contrato',
    criterios_bdd: [
      {
        id: 'AC-G5-001',
        given: 'PR merged com CI verde',
        when: 'publica a cobrança Pix',
        then: 'aceite registrado com observabilidade ativa',
        prioridade: 'must'
      }
    ]
  }
]

export const seedEdges: Edge[] = [
  {
    edge_id: 'e1',
    origem_id: 'ft-pagar',
    origem_versao: 1,
    destino_id: 'ft-confirmar',
    destino_versao: 1,
    tipo: 'consome',
    forca: 'required',
    autor_id: 'u-pm',
    justificativa: 'pagar fatura consome confirmação'
  },
  {
    edge_id: 'e2',
    origem_id: 'ft-criar',
    origem_versao: 1,
    destino_id: 'ft-confirmar',
    destino_versao: 1,
    tipo: 'consome',
    forca: 'required',
    autor_id: 'u-pm',
    justificativa: 'criar cobrança consome confirmação'
  },
  {
    edge_id: 'e3',
    origem_id: 'ft-confirmar',
    origem_versao: 1,
    destino_id: 'ft-status',
    destino_versao: 2,
    tipo: 'impacta',
    forca: 'required',
    autor_id: 'u-pm',
    justificativa: 'mudança na confirmação impacta status'
  },
  {
    edge_id: 'e4',
    origem_id: 'pbi-idtx',
    origem_versao: 1,
    destino_id: 'ft-confirmar',
    destino_versao: 1,
    tipo: 'realiza',
    forca: 'required',
    autor_id: 'u-dev',
    justificativa: 'PBI realiza a confirmação idempotente'
  },
  {
    edge_id: 'e5',
    origem_id: 'pbi-status',
    origem_versao: 1,
    destino_id: 'ft-status',
    destino_versao: 2,
    tipo: 'realiza',
    forca: 'required',
    autor_id: 'u-dev',
    justificativa: 'PBI realiza o status de pagamento'
  }
]

// ONDA1 W2 — backfill declarativo feature↔tela (documentação do vínculo seed):
// - telas_ids das 4 features seed era [] (GAP Lupa V5: frame Studio sem dono).
// - Os ids abaixo são DERIVADOS do montarEntradaStudio (gateParaStudio.ts): fluxo_feliz
//   vira `${featureId}-t1..tN` (máx 3 passos), cada alternativo vira `${featureId}-altN`.
//   Verificado por execução real: ft-pagar→[t1,t2,alt1], ft-confirmar→[t1,t2,alt1],
//   ft-criar→[t1,t2,alt1], ft-status→[t1] (sem alternativos, 1 passo só).
// - SEM criar telas físicas: são vínculos declarativos — frames reais só passam a
//   existir no Studio quando gerarNoCanvas() roda (e aí vincula de novo, idempotente).
// - telas_ids espelha os telaIds desta tabela para compat com gates (FTR-005).
export const seedVinculosTela: TelaVinculo[] = [
  { telaId: 'ft-pagar-t1', featureId: 'ft-pagar', origem: 'fluxo_feliz', passoRef: 't1' },
  { telaId: 'ft-pagar-t2', featureId: 'ft-pagar', origem: 'fluxo_feliz', passoRef: 't2' },
  { telaId: 'ft-pagar-alt1', featureId: 'ft-pagar', origem: 'alternativo', passoRef: 'alt1' },
  { telaId: 'ft-confirmar-t1', featureId: 'ft-confirmar', origem: 'fluxo_feliz', passoRef: 't1' },
  { telaId: 'ft-confirmar-t2', featureId: 'ft-confirmar', origem: 'fluxo_feliz', passoRef: 't2' },
  { telaId: 'ft-confirmar-alt1', featureId: 'ft-confirmar', origem: 'alternativo', passoRef: 'alt1' },
  { telaId: 'ft-criar-t1', featureId: 'ft-criar', origem: 'fluxo_feliz', passoRef: 't1' },
  { telaId: 'ft-criar-t2', featureId: 'ft-criar', origem: 'fluxo_feliz', passoRef: 't2' },
  { telaId: 'ft-criar-alt1', featureId: 'ft-criar', origem: 'alternativo', passoRef: 'alt1' },
  { telaId: 'ft-status-t1', featureId: 'ft-status', origem: 'fluxo_feliz', passoRef: 't1' }
]

export function telasSeedDaFeature(featureId: string): string[] {
  return seedVinculosTela.filter((v) => v.featureId === featureId).map((v) => v.telaId)
}

export const seedUsers: User[] = [
  { id: 'u-pm', nome: 'Paula (PM)', papel: 'PM', projeto_ids: ['proj-cobrancas'] },
  { id: 'u-po', nome: 'Paulo (PO)', papel: 'PO', projeto_ids: ['proj-cobrancas'] },
  { id: 'u-neg', nome: 'Nina (Negócio)', papel: 'Negocio', projeto_ids: ['proj-cobrancas'] },
  { id: 'u-ux', nome: 'Ursula (UX)', papel: 'UX', projeto_ids: ['proj-cobrancas'] },
  { id: 'u-arq', nome: 'Aldo (Arquiteto)', papel: 'Arquiteto', projeto_ids: ['proj-cobrancas'] },
  { id: 'u-tl', nome: 'Tina (Tech Lead)', papel: 'TechLead', projeto_ids: ['proj-cobrancas'] },
  { id: 'u-dev', nome: 'Diego (Dev)', papel: 'Dev', projeto_ids: ['proj-cobrancas'] },
  { id: 'u-qa', nome: 'Quésia (QA)', papel: 'QA', projeto_ids: ['proj-cobrancas'] },
  { id: 'u-sec', nome: 'Sônia (Segurança)', papel: 'Seguranca', projeto_ids: ['proj-cobrancas'] }
]

export const seedGates: GateInfo[] = [
  { id: 'G0', titulo: 'Enquadramento', status: 'aprovado', baselineVersao: 1, aprovadoPor: 'u-pm', aprovadoEm: '2026-01-01T00:00:00.000Z' },
  { id: 'G1', titulo: 'Épicos', status: 'aprovado', baselineVersao: 1, aprovadoPor: 'u-pm', aprovadoEm: '2026-01-01T00:00:00.000Z' },
  { id: 'G2', titulo: 'Features', status: 'revisao' },
  { id: 'G3', titulo: 'Arquitetura', status: 'rascunho' },
  { id: 'G4', titulo: 'PBIs', status: 'rascunho' },
  { id: 'G5', titulo: 'Entrega', status: 'rascunho' }
]

export function gatesZerados(): GateInfo[] {
  const titulos: Record<GateId, string> = {
    G0: 'Enquadramento',
    G1: 'Épicos',
    G2: 'Features',
    G3: 'Arquitetura',
    G4: 'PBIs',
    G5: 'Entrega'
  }
  return (Object.keys(titulos) as GateId[]).map((id) => ({ id, titulo: titulos[id], status: 'rascunho' as const }))
}

// Pacote multi-projeto (DELTA Passo 1): projeto Cobranças completo.
export function seedMultiProjeto(): {
  projetoId: string
  projetoTitulo: string
  epicoId: string
  epicoTitulo: string
  nos: (Epic | Feature | PBI)[]
  arestas: Edge[]
  gates: GateInfo[]
} {
  return {
    projetoId: seedProjeto.id,
    projetoTitulo: seedProjeto.titulo,
    epicoId: seedEpico.id,
    epicoTitulo: seedEpico.titulo,
    nos: [seedEnquadramento, seedEpico, ...seedFeatures, ...seedPbis],
    arestas: seedEdges,
    gates: seedGates
  }
}
