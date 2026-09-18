import type { Edge, Epic, Feature, GateId, IngestaoDoc, MapaRegrasValidacao, PBI, TelaVinculo, User } from '@/types/nexo'
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
  descricao:
    'Definição estratégica e discovery de cobranças via Pix: pagar fatura com QR Code, criar cobrança com expiração, confirmar via webhook idempotente e acompanhar status.',
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
  problema:
    'Clientes sem cartão nem limite precisam pagar faturas em dia com rapidez e segurança, sem fila nem boleto.',
  objetivo: 'Permitir pagamento de faturas via Pix com confirmação idempotente e status visível',
  kpis: [
    { nome: 'Adoção Pix', unidade: '%', alvo: '40', janela: '90d', responsavel: 'u-pm' },
    { nome: 'Confirmações sem duplicidade', unidade: '%', alvo: '99.9', janela: '90d', responsavel: 'u-dev' }
  ],
  personas: ['Cliente com fatura aberta', 'Operador de cobrança'],
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
  descricao:
    'Permitir que clientes autenticados paguem faturas via Pix com QR Code, confirmação idempotente por idTx e status visível, com rapidez e segurança.',
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
  problema:
    'Clientes sem cartão nem limite precisam pagar faturas em dia com rapidez e segurança, sem fila nem boleto.',
  objetivo: 'Permitir pagamento de faturas via Pix com confirmação idempotente e status visível',
  kpis: [
    { nome: 'Adoção Pix', unidade: '%', alvo: '40', janela: '90d', responsavel: 'u-pm' },
    { nome: 'Confirmações sem duplicidade', unidade: '%', alvo: '99.9', janela: '90d', responsavel: 'u-dev' }
  ],
  personas: ['Cliente com fatura aberta', 'Operador de cobrança'],
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

// ONDA2 Y2 — seed declarativo de regras de validação por tela (SEM mock:
// cada regra deriva de criterios_bdd/alternativos REAIS da feature ft-pagar):
// - ft-pagar AC-001 given "fatura aberta pertence ao cliente autenticado"
//   → ft-pagar-t1.faturaId obrigatório (sem fatura não há pagamento).
// - ft-pagar AC-001 then "retorna QR Code, código copiável e expiração"
//   → ft-pagar-t2.qrCode obrigatório + qrExpiracao custom nao-expirado
//   (QR expirado→erro: espelha o alternativo de ft-criar "QR Code expirado
//   permite regenerar nova cobrança").
// - ft-pagar alternativo "PSP fora do ar exibe erro com tentar de novo"
//   → ft-pagar-alt1.tentarNovamente obrigatório (ação de retry presente).
// Outras features/telas: carregarRegras() retorna [] (VUE trata como sem regras).
export const seedRegrasValidacao: MapaRegrasValidacao = {
  'ft-pagar-t1': [
    {
      campoId: 'faturaId',
      mensagemSucesso: 'Fatura identificada com sucesso.',
      regras: [
        {
          id: 'rv-ft-pagar-t1-faturaId-obrigatorio',
          campoId: 'faturaId',
          tipo: 'obrigatorio',
          mensagemErro: 'Informe a fatura a pagar (obrigatório — AC-001).',
          mensagemSucesso: 'Fatura identificada com sucesso.'
        },
        {
          id: 'rv-ft-pagar-t1-faturaId-formato',
          campoId: 'faturaId',
          tipo: 'regex',
          parametro: '^[A-Za-z0-9-]{3,}$',
          mensagemErro: 'Fatura inválida: use ao menos 3 caracteres alfanuméricos.',
          mensagemSucesso: 'Fatura identificada com sucesso.'
        }
      ]
    },
    {
      campoId: 'valor',
      mensagemSucesso: 'Valor válido para pagamento.',
      regras: [
        {
          id: 'rv-ft-pagar-t1-valor-obrigatorio',
          campoId: 'valor',
          tipo: 'obrigatorio',
          mensagemErro: 'Informe o valor a pagar (obrigatório).',
          mensagemSucesso: 'Valor válido para pagamento.'
        },
        {
          id: 'rv-ft-pagar-t1-valor-positivo',
          campoId: 'valor',
          tipo: 'custom',
          parametro: 'positivo',
          mensagemErro: 'Valor deve ser maior que zero.',
          mensagemSucesso: 'Valor válido para pagamento.'
        }
      ]
    }
  ],
  'ft-pagar-t2': [
    {
      campoId: 'qrCode',
      mensagemSucesso: 'QR Code válido gerado.',
      regras: [
        {
          id: 'rv-ft-pagar-t2-qrCode-obrigatorio',
          campoId: 'qrCode',
          tipo: 'obrigatorio',
          mensagemErro: 'QR Code ausente: regenere a cobrança (AC-001).',
          mensagemSucesso: 'QR Code válido gerado.'
        },
        {
          id: 'rv-ft-pagar-t2-qrCode-tamanho',
          campoId: 'qrCode',
          tipo: 'min',
          parametro: 10,
          mensagemErro: 'QR Code inválido: código copia-e-cola incompleto.',
          mensagemSucesso: 'QR Code válido gerado.'
        }
      ]
    },
    {
      campoId: 'qrExpiracao',
      mensagemSucesso: 'QR Code dentro da validade.',
      regras: [
        {
          id: 'rv-ft-pagar-t2-qrExpiracao-obrigatorio',
          campoId: 'qrExpiracao',
          tipo: 'obrigatorio',
          mensagemErro: 'Expiração do QR ausente: regenere a cobrança.',
          mensagemSucesso: 'QR Code dentro da validade.'
        },
        {
          id: 'rv-ft-pagar-t2-qrExpiracao-vigente',
          campoId: 'qrExpiracao',
          tipo: 'custom',
          parametro: 'nao-expirado',
          mensagemErro: 'QR expirado: gere uma nova cobrança para continuar.',
          mensagemSucesso: 'QR Code dentro da validade.'
        }
      ]
    }
  ],
  'ft-pagar-alt1': [
    {
      campoId: 'tentarNovamente',
      mensagemSucesso: 'Nova tentativa registrada.',
      regras: [
        {
          id: 'rv-ft-pagar-alt1-retry-obrigatorio',
          campoId: 'tentarNovamente',
          tipo: 'obrigatorio',
          mensagemErro: 'PSP fora do ar: confirme "tentar de novo" para prosseguir.',
          mensagemSucesso: 'Nova tentativa registrada.'
        }
      ]
    },
    {
      campoId: 'emailAviso',
      mensagemSucesso: 'Aviso será enviado a este e-mail.',
      regras: [
        {
          id: 'rv-ft-pagar-alt1-email-formato',
          campoId: 'emailAviso',
          tipo: 'email',
          mensagemErro: 'E-mail de aviso inválido: confira o formato.',
          mensagemSucesso: 'Aviso será enviado a este e-mail.'
        }
      ]
    }
  ]
}

export const seedFeatures: Feature[] = [
  {
    ...base,
    id: 'ft-pagar',
    tipo: 'feature',
    titulo: 'Pagar fatura com Pix',
    descricao:
      'Permite ao cliente autenticado pagar fatura aberta via Pix: confirma pagamento e retorna QR Code com código copiável e expiração, com retry seguro quando PSP falha.',
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
    beneficio: 'pagar com rapidez sem cartão e com comprovante imediato',
    gatilho: 'cliente escolhe Pix na fatura aberta',
    precondicoes: ['cliente autenticado', 'fatura aberta pertence ao cliente autenticado'],
    fluxo_feliz: 'cliente escolhe Pix e confirma pagamento que retorna QR Code com expiração',
    alternativos: ['PSP fora do ar exibe erro com tentar de novo sem duplicar cobrança'],
    regras_ids: ['RG-PAGAR-001'],
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
      'Garante que confirmações de pagamento Pix via webhook com idTx sejam processadas apenas uma vez, evitando baixa duplicada e devolvendo o mesmo resultado em reenvios.',
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
    beneficio: 'não duplicar confirmações nem baixar fatura duas vezes',
    gatilho: 'webhook do PSP com idTx da cobrança Pix',
    precondicoes: ['idTx presente', 'cobrança Pix criada com QR Code válido'],
    fluxo_feliz: 'primeira confirmação baixa a fatura com comprovante; repetidas retornam o mesmo resultado',
    alternativos: ['webhook duplicado retorna o mesmo resultado sem novo efeito'],
    regras_ids: ['RG-CONFIRMAR-001'],
    telas_ids: telasSeedDaFeature('ft-confirmar'),
    integracoes: ['PSP (webhook com idTx, timeout 5s, retry em falha e indisponibilidade)'],
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
    descricao:
      'Gera uma cobrança Pix para fatura aberta válida e disponibiliza QR Code com código copiável e expiração, permitindo regenerar nova cobrança quando expirar.',
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
    beneficio: 'obter QR Code válido com expiração para pagar',
    gatilho: 'solicitação de pagamento por Pix na fatura aberta',
    precondicoes: ['cliente autenticado', 'fatura pertence ao cliente autenticado'],
    fluxo_feliz: 'solicitação válida cria cobrança e retorna QR Code com expiração',
    alternativos: ['QR Code expirado permite regenerar nova cobrança'],
    regras_ids: ['RG-CRIAR-001'],
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
    descricao:
      'Exibe ao cliente autenticado o status atualizado da cobrança Pix (pendente, paga com idTx e horário, ou expirada), refletindo a confirmação idempotente.',
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
    ator: 'cliente com cobrança Pix',
    beneficio: 'acompanhar pagamento com idTx e horário atualizados',
    gatilho: 'cliente abre status da cobrança Pix criada',
    precondicoes: ['cliente autenticado', 'cobrança Pix criada pertence ao cliente'],
    fluxo_feliz: 'consulta exibe status atualizado da cobrança com idTx',
    alternativos: ['cobrança expirada exibe opção de regenerar nova cobrança'],
    regras_ids: ['RG-STATUS-001'],
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

// W5 seedParcialExistente — épico + feature PARCIAIS honestos (fonte 'inferred',
// derivados de ingestão de texto; ids NOVOS sem colidir com o seed atual).
const baseParcial = {
  ...base,
  fonte: 'inferred' as const,
  fonte_refs: ['ingestao-parcial-001']
}

export const seedEpicoParcial: Epic = {
  ...baseParcial,
  id: 'ep-parcial-reembolso',
  tipo: 'epico',
  titulo: 'Reembolso via Pix (parcial — inferido)',
  descricao:
    'Épico PARCIAL inferido de ingestão de texto: intenção de reembolso via Pix mencionada sem critérios completos. Problema/objetivo/KPIs abaixo são inferências honestas e parciais, pendentes de validação com o dono.',
  status: 'draft',
  gate: 'G1',
  owner: 'u-pm',
  contribuidores: ['u-pm'],
  versao: 1,
  baseline: null,
  parent_id: null,
  x: 600,
  y: 200,
  z: 0,
  problema: 'Trecho ingerido sugere fricção em reembolsos (parcial: sem volume nem segmento confirmados).',
  objetivo: 'Esboçar reembolso via Pix para validação posterior (parcial: escopo e SLA indefinidos).',
  kpis: [
    { nome: 'Tempo de reembolso (parcial)', unidade: 'dias', alvo: 'a definir', janela: 'a definir', responsavel: 'u-pm' }
  ],
  personas: ['Cliente aguardando reembolso (parcial)'],
  escopo_in: ['Reembolso via Pix (parcial)'],
  escopo_out: ['Boleto e cartão (parcial, a confirmar)'],
  riscos: ['Risco parcial inferido: regra de compensação indefinida — validar com negócio']
}

export const seedFeatureParcial: Feature = {
  ...baseParcial,
  id: 'ft-parcial-reembolso',
  tipo: 'feature',
  titulo: 'Solicitar reembolso via Pix (parcial — inferida)',
  descricao:
    'Feature PARCIAL inferida do épico ep-parcial-reembolso: solicitação de reembolso mencionada sem fluxo completo. Critérios BDD e integrações pendentes de definição.',
  status: 'draft',
  gate: 'G2',
  owner: 'u-pm',
  contribuidores: ['u-pm'],
  versao: 1,
  baseline: null,
  parent_id: 'ep-parcial-reembolso',
  x: 600,
  y: 340,
  z: 1,
  ator: 'cliente com pagamento Pix (parcial)',
  beneficio: 'pedir reembolso sem fricção (parcial, a validar)',
  gatilho: 'cliente solicita reembolso de pagamento Pix (inferido)',
  precondicoes: ['pagamento Pix existente (parcial, a confirmar)'],
  fluxo_feliz: 'cliente solicita reembolso e acompanha status (parcial: passos detalhados indefinidos)',
  alternativos: ['regra de recusa/estorno indefinida (parcial)'],
  regras_ids: [],
  telas_ids: [],
  integracoes: [],
  criterios_bdd: [
    {
      id: 'AC-PARCIAL-001',
      given: 'pagamento Pix existente (parcial)',
      when: 'cliente solicita reembolso (inferido)',
      then: 'sistema registra pedido com status pendente (parcial, a validar)',
      prioridade: 'must'
    }
  ]
}

export const seedIngestaoParcial: IngestaoDoc = {
  fonte: 'texto',
  texto: 'Relato parcial do atendimento: alguns clientes pedem reembolso do Pix pago a maior, sem detalhar prazo nem canal de confirmação. Intenção registrada como parcial para discovery.',
  projetoId: 'proj-cobrancas'
}

export const seedParcialExistente: {
  epico: Epic
  feature: Feature
  ingestao: IngestaoDoc
} = {
  epico: seedEpicoParcial,
  feature: seedFeatureParcial,
  ingestao: seedIngestaoParcial
}

// seedCoerentePix — coerência Pix (puros, sem Date/Math.random, PT-BR, sem emoji).
// Percorre seedEpico + seedFeatures: se título/descrição/problema menciona Pix
// (case-insensitive 'pix'), garante preenchimento padrão quando vazio.
// NÃO renomeia ids, não remove campos, não quebra vínculos.
const PROBLEMA_PADRAO_PIX =
  'Clientes sem cartão precisam pagar faturas via Pix com rapidez e segurança comprovadas.'
const OBJETIVO_PADRAO_PIX = 'Permitir pagamento de faturas via Pix com confirmação idempotente'
const PERSONA_PADRAO_PIX = 'Cliente com fatura aberta'

function mencionaPix(...textos: Array<string | null | undefined>): boolean {
  return textos.some((t) => (t ?? '').toLowerCase().includes('pix'))
}

function textoVazio(valor: string | null | undefined): boolean {
  return (valor ?? '').trim().length === 0
}

export function seedCoerentePix(): { epicoId: string; aplicados: string[] } {
  const aplicados: string[] = []
  const epicoId = seedEpico.id
  if (mencionaPix(seedEpico.titulo, seedEpico.descricao, seedEpico.problema)) {
    let aplicouEpico = false
    if (textoVazio(seedEpico.problema)) {
      seedEpico.problema = PROBLEMA_PADRAO_PIX
      aplicouEpico = true
    }
    if (textoVazio(seedEpico.objetivo)) {
      seedEpico.objetivo = OBJETIVO_PADRAO_PIX
      aplicouEpico = true
    }
    if (seedEpico.personas.length === 0) {
      seedEpico.personas = [PERSONA_PADRAO_PIX]
      aplicouEpico = true
    }
    if (aplicouEpico) aplicados.push(seedEpico.id)
  }
  for (const f of seedFeatures) {
    const rec = f as unknown as Record<string, unknown>
    const problemaAtual = typeof rec['problema'] === 'string' ? (rec['problema'] as string) : undefined
    if (!mencionaPix(f.titulo, f.descricao, problemaAtual)) continue
    let aplicou = false
    if (typeof rec['problema'] !== 'string' || textoVazio(rec['problema'] as string)) {
      rec['problema'] = PROBLEMA_PADRAO_PIX
      aplicou = true
    }
    if (typeof rec['objetivo'] !== 'string' || textoVazio(rec['objetivo'] as string)) {
      rec['objetivo'] = OBJETIVO_PADRAO_PIX
      aplicou = true
    }
    if (!Array.isArray(rec['personas']) || (rec['personas'] as unknown[]).length === 0) {
      rec['personas'] = [PERSONA_PADRAO_PIX]
      aplicou = true
    }
    if (f.criterios_bdd.length === 0) {
      f.criterios_bdd = [
        {
          id: 'AC-SEED-001',
          given: 'fatura aberta com cobrança Pix pertence ao cliente autenticado',
          when: 'cliente paga a fatura via Pix',
          then: 'sistema confirma o pagamento Pix com comprovante e expiração resolvida',
          prioridade: 'must'
        }
      ]
      aplicou = true
    }
    if (aplicou) aplicados.push(f.id)
  }
  return { epicoId, aplicados }
}

// aplicarSeedCoerenteTexto — núcleo puro da coerência Pix reutilizável na
// criação (Novo via criarProjetoComIA, Existente via criarProjetoExistente):
// preenche problema/objetivo padrão Pix quando vazio + menção Pix.
// CALLERS REAIS: useProjects.ts (Novo pós-criação e Existente). Não renomeia
// ids, não remove campos, puro/determinístico, PT-BR, sem emoji.
export function aplicarSeedCoerenteTexto(
  problema: string | null | undefined,
  objetivo: string | null | undefined
): { problema: string; objetivo: string; aplicou: boolean } {
  let aplicou = false
  let p = problema ?? ''
  let o = objetivo ?? ''
  if (textoVazio(p)) {
    p = PROBLEMA_PADRAO_PIX
    aplicou = true
  }
  if (textoVazio(o) && mencionaPix(p)) {
    o = OBJETIVO_PADRAO_PIX
    aplicou = true
  }
  return { problema: p, objetivo: o, aplicou }
}

// aplicarSeedCoerenteCriacao — mesma lógica de preenchimento padrão Pix do
// seedCoerentePix (problema/objetivo/personas/BDD quando vazio + menção Pix),
// mas operando nos OBJETOS PASSADOS (épico+features da criação Novo/Existente,
// não no seed global). CALLERS REAIS: criarProjetoComIA (Novo, pós-criação no
// namespace) e criarProjetoExistente (Existente, no épico criado) em
// src/stores/useProjects.ts — sem código morto. Retorna ids aplicados.
// Não renomeia ids, não remove campos, puro/determinístico, PT-BR, sem emoji.
export function aplicarSeedCoerenteCriacao(epico: Epic, features: Feature[]): string[] {
  const aplicados: string[] = []
  if (mencionaPix(epico.titulo, epico.descricao, epico.problema)) {
    let aplicouEpico = false
    if (textoVazio(epico.problema)) {
      epico.problema = PROBLEMA_PADRAO_PIX
      aplicouEpico = true
    }
    if (textoVazio(epico.objetivo)) {
      epico.objetivo = OBJETIVO_PADRAO_PIX
      aplicouEpico = true
    }
    if (epico.personas.length === 0) {
      epico.personas = [PERSONA_PADRAO_PIX]
      aplicouEpico = true
    }
    if (aplicouEpico) aplicados.push(epico.id)
  }
  for (const f of features) {
    const rec = f as unknown as Record<string, unknown>
    const problemaAtual = typeof rec['problema'] === 'string' ? (rec['problema'] as string) : undefined
    if (!mencionaPix(f.titulo, f.descricao, problemaAtual)) continue
    let aplicou = false
    if (typeof rec['problema'] !== 'string' || textoVazio(rec['problema'] as string)) {
      rec['problema'] = PROBLEMA_PADRAO_PIX
      aplicou = true
    }
    if (typeof rec['objetivo'] !== 'string' || textoVazio(rec['objetivo'] as string)) {
      rec['objetivo'] = OBJETIVO_PADRAO_PIX
      aplicou = true
    }
    if (!Array.isArray(rec['personas']) || (rec['personas'] as unknown[]).length === 0) {
      rec['personas'] = [PERSONA_PADRAO_PIX]
      aplicou = true
    }
    if (f.criterios_bdd.length === 0) {
      f.criterios_bdd = [
        {
          id: 'AC-SEED-001',
          given: 'fatura aberta com cobrança Pix pertence ao cliente autenticado',
          when: 'cliente paga a fatura via Pix',
          then: 'sistema confirma o pagamento Pix com comprovante e expiração resolvida',
          prioridade: 'must'
        }
      ]
      aplicou = true
    }
    if (aplicou) aplicados.push(f.id)
  }
  return aplicados
}
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
