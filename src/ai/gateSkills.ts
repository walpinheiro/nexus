import type {
  CriterioBdd,
  Epic,
  Feature,
  GateCheck,
  GateId,
  Kpi,
  NexoObject,
  PBI,
  PatchMudanca,
  Role,
  User
} from '@/types/nexo'
import { avaliarGate, aprovadoresDoGate, gateDesbloqueado, gateAnterior } from '@/utils/gates'

export interface PerguntaCheck {
  codigo: string
  campoAlvo: string
  pergunta: string
  porQueBloqueia: string
  exemplo: string
  acaoLabel: string
}

export interface GateSkill {
  id: string
  nome: string
  gate: GateId
  roles: Role[]
  descricao: string
  autonomia: string
  checks: string[]
  perguntas: PerguntaCheck[]
}

export interface FaltaGate {
  codigo: string
  descricao: string
  severidade: 'bloqueante' | 'aviso'
  pergunta: string
  porQueBloqueia: string
  exemplo: string
  acaoLabel: string
  campoAlvo: string
  resolvivelPorIa: boolean
}

export interface GovernancaGate {
  gateId: GateId
  aprovadoresExigidos: Role[]
  usuarioAtual: User | null
  papelOk: boolean
  ehProponente: boolean
  proponenteNome: string
  bloqueadoPorProponente: boolean
  sequenciaOk: boolean
  gateAnteriorId: GateId | null
  motivoSequencia: string
  aptoParaAprovacao: boolean
}

export interface GateChatResult {
  texto: string
  propostaPatch?: {
    alvoId: string
    justificativa: string
    mudancas: PatchMudanca[]
  }
  checksAfetados?: string[]
}

// Catálogo normativo de perguntas e critérios por código de checklist
export const DICIONARIO_PERGUNTAS: Record<string, PerguntaCheck> = {
  'ENQ-001': {
    codigo: 'ENQ-001',
    campoAlvo: 'descricao',
    pergunta: 'Qual é o problema ou oportunidade concreta que estamos resolvendo (mín. 20 caracteres)?',
    porQueBloqueia: 'Iniciativas sem dor observável ou contexto claro não são elegíveis para enquadramento.',
    exemplo: 'Clientes relatam atrito ao tentar pagar faturas Pix fora do horário bancário comercial.',
    acaoLabel: 'Preencher Problema'
  },
  'ENQ-002': {
    codigo: 'ENQ-002',
    campoAlvo: 'descricao',
    pergunta: 'Quem é o público-alvo ou persona diretamente afetada pela dor?',
    porQueBloqueia: 'Sem persona identificada, não é possível validar proposta de valor.',
    exemplo: 'Pequenos e médios varejistas que utilizam checkout web e aplicativo móvel.',
    acaoLabel: 'Definir Público'
  },
  'ENQ-003': {
    codigo: 'ENQ-003',
    campoAlvo: 'descricao',
    pergunta: 'Qual é a hipótese mensurável de sucesso para este enquadramento?',
    porQueBloqueia: 'A hipótese precisa de métrica observável para guiar o avanço para G1.',
    exemplo: 'Aumentar a taxa de conversão em 15% nas primeiras 4 semanas de operação.',
    acaoLabel: 'Inserir Hipótese'
  },
  'ENQ-004': {
    codigo: 'ENQ-004',
    campoAlvo: 'owner',
    pergunta: 'Quem é o sponsor ou owner responsável pelo enquadramento da iniciativa?',
    porQueBloqueia: 'Todo objeto no NEXO exige um responsável formal com papel no projeto.',
    exemplo: 'u-pm (Paula - Product Manager)',
    acaoLabel: 'Definir Owner'
  },
  'EPC-001': {
    codigo: 'EPC-001',
    campoAlvo: 'problema',
    pergunta: 'Cadê o problema e o público do épico descritos com contexto detalhado (mín. 30 caracteres)?',
    porQueBloqueia: 'Épicos sem definição robusta da dor geram decomposição desbalanceada em features.',
    exemplo: 'Usuários finais enfrentam falhas de conciliação quando pagam via Pix em faturas com prazo expirado.',
    acaoLabel: 'Descrever Problema'
  },
  'EPC-002': {
    codigo: 'EPC-002',
    campoAlvo: 'kpis',
    pergunta: 'Cadê o KPI mensurável com nome, unidade, alvo numérico e responsável formal?',
    porQueBloqueia: 'Sem KPI rastreável, o épico não possui critério objetivo de entrega de valor de negócio.',
    exemplo: 'Nome: "Adoção Pix", Unidade: "%", Alvo: "40", Janela: "90d", Responsável: "u-pm"',
    acaoLabel: 'Adicionar KPI'
  },
  'EPC-003': {
    codigo: 'EPC-003',
    campoAlvo: 'escopo_in',
    pergunta: 'O que está explicitamente DENTRO (escopo_in) e FORA (escopo_out) do escopo deste épico?',
    porQueBloqueia: 'Fronteiras difusas causam escopo rastejante (scope creep) entre squads.',
    exemplo: 'Dentro: Geração dinâmica de QR Code. Fora: Estorno manual via painel de atendimento.',
    acaoLabel: 'Definir Escopo In/Out'
  },
  'FTR-001': {
    codigo: 'FTR-001',
    campoAlvo: 'ator',
    pergunta: 'Cadê a narrativa de benefício no formato "Como [ator], quero [capacidade] para [benefício]"?',
    porQueBloqueia: 'A narrativa fundamenta a persona beneficiada e a intenção de valor da funcionalidade.',
    exemplo: 'Como cliente pagador, quero escanear o QR Code Pix para liquidar a fatura instantaneamente.',
    acaoLabel: 'Completar Narrativa'
  },
  'FTR-002': {
    codigo: 'FTR-002',
    campoAlvo: 'fluxo_feliz',
    pergunta: 'Cadê o fluxo feliz detalhado com entrada, ação do usuário e retorno visível (mín. 10 chars)?',
    porQueBloqueia: 'O fluxo feliz orienta o design de telas, estados de interface e contratos de API.',
    exemplo: '1. Usuário clica em Pagar Pix. 2. Sistema exibe QR Code e código copia-e-cola com cronômetro.',
    acaoLabel: 'Estruturar Fluxo Feliz'
  },
  'FTR-004': {
    codigo: 'FTR-004',
    campoAlvo: 'owner',
    pergunta: 'Quem é o responsável/owner formal desta feature?',
    porQueBloqueia: 'Nenhum gate pode ser aprovado com objetos anônimos ou sem liderança.',
    exemplo: 'u-pm (Paula)',
    acaoLabel: 'Atribuir Owner'
  },
  'FTR-007': {
    codigo: 'FTR-007',
    campoAlvo: 'criterios_bdd',
    pergunta: 'Cadê o BDD desta feature? Quais cenários Given/When/Then verificáveis validam o aceite?',
    porQueBloqueia: 'Sem ao menos 1 critério BDD verificável, a squad de engenharia não possui baseline de testes.',
    exemplo: 'Dado que a fatura está aberta, quando o cliente solicita Pix, então o QR Code deve expirar em 15 minutos.',
    acaoLabel: 'Gerar Critérios BDD'
  },
  'FTR-008': {
    codigo: 'FTR-008',
    campoAlvo: 'alternativos',
    pergunta: 'Para fluxos sensíveis/financeiros, cadê os cenários de erro, abuso e fluxos alternativos?',
    porQueBloqueia: 'Operações financeiras sem resiliência a falhas ou webhook duplicado geram perdas operacionais.',
    exemplo: 'PSP fora do ar exibe mensagem amigável com opção de tentar novamente em 30 segundos.',
    acaoLabel: 'Adicionar Alternativos'
  },
  'ARC-001': {
    codigo: 'ARC-001',
    campoAlvo: 'integracoes',
    pergunta: 'Cadê o contrato OpenAPI ou declaração das integrações externas (com timeout e resiliência)?',
    porQueBloqueia: 'Componentes em G3 sem contrato formal quebram governança e compatibilidade de serviços.',
    exemplo: 'Integração: "PSP Pix (Webhook REST com Idempotência via idTx e timeout de 5000ms)"',
    acaoLabel: 'Declarar Integração'
  },
  'ARC-002': {
    codigo: 'ARC-002',
    campoAlvo: 'adr_id',
    pergunta: 'Cadê a ADR (Decisão Arquitetural) formal vinculada que justifica a escolha técnica?',
    porQueBloqueia: 'G3 exige rastreabilidade de decisões estruturais (trade-offs, persistência, mensageria).',
    exemplo: 'adr-pix-idempotencia (Idempotência via Redis e banco relacional ACID)',
    acaoLabel: 'Vincular ADR'
  },
  'PBI-001': {
    codigo: 'PBI-001',
    campoAlvo: 'estrategia_teste',
    pergunta: 'Cadê a Definition of Ready do PBI: critérios de aceite BDD, owner e estratégia de teste definida?',
    porQueBloqueia: 'PBIs incompletos entram na sprint sem critério de pronto gerando retrabalho no G5.',
    exemplo: 'Estratégia de teste: "contrato OpenAPI + teste de integração de webhook + unitário"',
    acaoLabel: 'Completar DoR do PBI'
  },
  'DON-001': {
    codigo: 'DON-001',
    campoAlvo: 'status',
    pergunta: 'Cadê a Definition of Done: evidência de aceite funcional e testes verdes comprovados?',
    porQueBloqueia: 'O gate G5 consolida a publicação apenas com validação técnica e documental concluída.',
    exemplo: 'Status atualizado para validated/published com pull request aprovado e suite verde.',
    acaoLabel: 'Validar Entrega'
  }
}

// Catálogo de Skills especializadas por Gate
export const GATE_SKILLS: Record<GateId, GateSkill[]> = {
  G0: [
    {
      id: 'discovery.facilitator',
      nome: 'Discovery Facilitator',
      gate: 'G0',
      roles: ['PM'],
      descricao: 'Estrutura hipóteses, dores observáveis e enquadramento de novas oportunidades de negócio.',
      autonomia: 'Não define orçamento nem prioridade corporativa isoladamente.',
      checks: ['ENQ-001', 'ENQ-002', 'ENQ-003', 'ENQ-004'],
      perguntas: [
        DICIONARIO_PERGUNTAS['ENQ-001'],
        DICIONARIO_PERGUNTAS['ENQ-002'],
        DICIONARIO_PERGUNTAS['ENQ-003'],
        DICIONARIO_PERGUNTAS['ENQ-004']
      ]
    }
  ],
  G1: [
    {
      id: 'product.outcome_designer',
      nome: 'Product Strategist',
      gate: 'G1',
      roles: ['PM'],
      descricao: 'Mapeia capacidades de negócio, metas de impacto mensuráveis e fronteiras de escopo.',
      autonomia: 'Não inventa metas sem owner e não altera prioridades do portfólio.',
      checks: ['EPC-001', 'EPC-002', 'EPC-003'],
      perguntas: [
        DICIONARIO_PERGUNTAS['EPC-001'],
        DICIONARIO_PERGUNTAS['EPC-002'],
        DICIONARIO_PERGUNTAS['EPC-003']
      ]
    }
  ],
  G2: [
    {
      id: 'quality.bdd_author',
      nome: 'BDD & Quality Analyst',
      gate: 'G2',
      roles: ['PM', 'UX', 'QA'],
      descricao: 'Elabora cenários executáveis Given/When/Then e critérios de aceite para features.',
      autonomia: 'Não aceita critérios sem resultado observável e não aprova baseline sem PM.',
      checks: ['FTR-007', 'FTR-008'],
      perguntas: [DICIONARIO_PERGUNTAS['FTR-007'], DICIONARIO_PERGUNTAS['FTR-008']]
    },
    {
      id: 'ux.flow_designer',
      nome: 'UX Flow Designer',
      gate: 'G2',
      roles: ['PM', 'UX'],
      descricao: 'Especifica fluxos felizes, narrativas de benefício e tratamento de estados de interface.',
      autonomia: 'Não aprova design final sem validação do designer responsável.',
      checks: ['FTR-001', 'FTR-002', 'FTR-004'],
      perguntas: [
        DICIONARIO_PERGUNTAS['FTR-001'],
        DICIONARIO_PERGUNTAS['FTR-002'],
        DICIONARIO_PERGUNTAS['FTR-004']
      ]
    }
  ],
  G3: [
    {
      id: 'architecture.domain_designer',
      nome: 'Domain Architect',
      gate: 'G3',
      roles: ['Arquiteto', 'TechLead'],
      descricao: 'Garante contratos de integração, modelos de dados, idempotência e vínculos com ADRs.',
      autonomia: 'Não quebra contratos públicos nem fecha trade-offs sem consentimento técnico.',
      checks: ['ARC-001', 'ARC-002'],
      perguntas: [DICIONARIO_PERGUNTAS['ARC-001'], DICIONARIO_PERGUNTAS['ARC-002']]
    },
    {
      id: 'security.threat_reviewer',
      nome: 'Security Reviewer',
      gate: 'G3',
      roles: ['Seguranca', 'TechLead'],
      descricao: 'Avalia resiliência, proteção de dados e exceções de conformidade.',
      autonomia: 'Não aprova exceções críticas de segurança sem waiver formalizado.',
      checks: ['ARC-001'],
      perguntas: [DICIONARIO_PERGUNTAS['ARC-001']]
    }
  ],
  G4: [
    {
      id: 'delivery.pbi_planner',
      nome: 'PBI & DoR Planner',
      gate: 'G4',
      roles: ['Dev', 'QA', 'TechLead'],
      descricao: 'Decompõe entregáveis em Definition of Ready com estratégias de testes automatizados.',
      autonomia: 'Não fecha estimativas de squad e não divide itens sem aceite verificável.',
      checks: ['PBI-001'],
      perguntas: [DICIONARIO_PERGUNTAS['PBI-001']]
    }
  ],
  G5: [
    {
      id: 'delivery.dod_inspector',
      nome: 'DoD & Release Inspector',
      gate: 'G5',
      roles: ['Dev', 'QA', 'TechLead'],
      descricao: 'Inspeciona evidências de testes, pipelines verdes e critérios de Definition of Done.',
      autonomia: 'Não realiza merge ou deploy sem validação de testes automatizados.',
      checks: ['DON-001'],
      perguntas: [DICIONARIO_PERGUNTAS['DON-001']]
    }
  ]
}

export function obterSkillsDoGate(gateId: GateId): GateSkill[] {
  return GATE_SKILLS[gateId] ?? []
}

export function obterPerguntasDoCheck(codigoCheck: string): PerguntaCheck | undefined {
  return DICIONARIO_PERGUNTAS[codigoCheck]
}

// Avalia o objeto e retorna as faltas detalhadas com perguntas reflexivas PT-BR
export function diagnosticarFaltasGate(
  objeto: NexoObject,
  _gateId: GateId,
  waivers?: { codigo: string; prazo: string }[]
): {
  checks: GateCheck[]
  faltas: FaltaGate[]
  bloqueantesFaltando: string[]
  aprovado: boolean
} {
  const ev = avaliarGate(objeto, waivers)
  const faltas: FaltaGate[] = []

  for (const c of ev.checks) {
    if (!c.ok) {
      const p = DICIONARIO_PERGUNTAS[c.codigo] ?? {
        codigo: c.codigo,
        campoAlvo: 'descricao',
        pergunta: `O que falta para atender à regra "${c.descricao}"?`,
        porQueBloqueia: `Regra ${c.codigo} não foi atendida pelo objeto.`,
        exemplo: 'Consulte a especificação do gate para o formato esperado.',
        acaoLabel: 'Preencher Dados'
      }

      faltas.push({
        codigo: c.codigo,
        descricao: c.descricao,
        severidade: c.severidade,
        pergunta: p.pergunta,
        porQueBloqueia: p.porQueBloqueia,
        exemplo: p.exemplo,
        acaoLabel: p.acaoLabel,
        campoAlvo: p.campoAlvo,
        resolvivelPorIa: true
      })
    }
  }

  return {
    checks: ev.checks,
    faltas,
    bloqueantesFaltando: ev.bloqueantesFaltando,
    aprovado: ev.bloqueantesOk
  }
}

// Analisa os papéis aprovadores, segregação de funções e cadeado sequencial
export function obterGovernancaGate(
  gateId: GateId,
  user: User | null,
  objeto: NexoObject | null,
  gates: { id: GateId; status: string; baselineVersao?: number | null }[]
): GovernancaGate {
  const aprovadoresExigidos = aprovadoresDoGate(gateId) as Role[]
  const papelOk = user ? aprovadoresExigidos.includes(user.papel) : false
  const seqOk = gateDesbloqueado(gateId, gates)
  const antId = gateAnterior(gateId)

  let motivoSeq = ''
  if (!seqOk && antId) {
    motivoSeq = `Gate ${antId} precisa estar aprovado com baseline versionada para liberar ${gateId}.`
  }

  const proponenteId = objeto?.owner ?? ''
  const ehProponente = Boolean(user && proponenteId && proponenteId === user.id)
  const proponenteNome = proponenteId || 'Não definido'
  const bloqueadoPorProponente = ehProponente

  const aptoParaAprovacao = papelOk && seqOk && !bloqueadoPorProponente

  return {
    gateId,
    aprovadoresExigidos,
    usuarioAtual: user,
    papelOk,
    ehProponente,
    proponenteNome,
    bloqueadoPorProponente,
    sequenciaOk: seqOk,
    gateAnteriorId: antId,
    motivoSequencia: motivoSeq,
    aptoParaAprovacao
  }
}

// Gerador determinístico de propostas de patch estruturadas
export function gerarPropostaPatch(
  objeto: NexoObject,
  codigoCheck: string,
  textoUsuario?: string
): { justificativa: string; mudancas: PatchMudanca[] } | null {
  const mudancas: PatchMudanca[] = []
  const titulo = objeto.titulo || 'Objeto'
  const entrada = (textoUsuario ?? '').trim()

  switch (codigoCheck) {
    case 'FTR-007': {
      // Ao menos 1 critério BDD verificável
      const f = objeto as unknown as Feature
      const atual = JSON.stringify(f.criterios_bdd ?? [])
      const novoId = `AC-${String(Math.floor(Math.random() * 800) + 100).padStart(3, '0')}`

      let given = `que o usuário acessa ${titulo}`
      let when = 'solicita a execução da operação'
      let then = 'o sistema confirma o resultado com sucesso e atualiza o estado'

      if (entrada.length >= 15) {
        given = `que ${entrada}`
        when = 'a ação é processada pelo sistema'
        then = 'a regra de negócio é validada sem exceções'
      }

      const novoBdd: CriterioBdd[] = [
        ...(f.criterios_bdd ?? []),
        {
          id: novoId,
          given,
          when,
          then,
          prioridade: 'must'
        }
      ]

      mudancas.push({
        campo: 'criterios_bdd',
        de: atual,
        para: JSON.stringify(novoBdd, null, 2)
      })

      return {
        justificativa: `[IA Gate G2] Adicionar critério BDD Given/When/Then verificável (${novoId}) para resolver FTR-007`,
        mudancas
      }
    }

    case 'FTR-001': {
      // Narrativa de benefício
      const f = objeto as unknown as Feature
      const deAtor = f.ator ?? ''
      const deDesc = objeto.descricao ?? ''
      const paraAtor = entrada || 'Usuário autenticado'
      const paraDesc = `Permitir que ${paraAtor} execute ${titulo} com segurança e rastreabilidade total.`

      mudancas.push({ campo: 'ator', de: deAtor, para: paraAtor })
      mudancas.push({ campo: 'descricao', de: deDesc, para: paraDesc })

      return {
        justificativa: `[IA Gate G2] Definir ator e narrativa de benefício para resolver FTR-001`,
        mudancas
      }
    }

    case 'FTR-002': {
      // Fluxo feliz
      const f = objeto as unknown as Feature
      const de = f.fluxo_feliz ?? ''
      const para =
        entrada.length >= 10
          ? entrada
          : `1. O usuário seleciona ${titulo}. 2. O sistema valida os parâmetros e pré-condições. 3. Confirma a operação com sucesso.`

      mudancas.push({ campo: 'fluxo_feliz', de, para })
      return {
        justificativa: `[IA Gate G2] Estruturar fluxo feliz observável para resolver FTR-002`,
        mudancas
      }
    }

    case 'FTR-004':
    case 'ENQ-004': {
      // Owner
      const de = objeto.owner ?? ''
      const para = entrada || 'u-pm'
      mudancas.push({ campo: 'owner', de, para })
      return {
        justificativa: `[IA Gate] Atribuir owner responsável formal (${para})`,
        mudancas
      }
    }

    case 'FTR-008': {
      // Alternativos / exceções
      const f = objeto as unknown as Feature
      const de = JSON.stringify(f.alternativos ?? [])
      const novoAlt = entrada || 'Falha de comunicação ou timeout retorna erro amigável com opção de tentar novamente.'
      const para = JSON.stringify([...(f.alternativos ?? []), novoAlt], null, 2)
      mudancas.push({ campo: 'alternativos', de, para })
      return {
        justificativa: `[IA Gate G2] Adicionar cenário alternativo/exceção para resolver FTR-008`,
        mudancas
      }
    }

    case 'EPC-001':
    case 'ENQ-001': {
      // Problema
      const e = objeto as unknown as Epic
      const de = e.problema ?? objeto.descricao ?? ''
      const para =
        entrada.length >= 30
          ? entrada
          : `Clientes e operadores enfrentam atrasos e inconsistências operacionais ao tentar processar ${titulo} sem automação.`
      mudancas.push({ campo: 'problema', de, para })
      if (objeto.descricao !== para) {
        mudancas.push({ campo: 'descricao', de: objeto.descricao, para })
      }
      return {
        justificativa: `[IA Gate] Descrever problema e contexto detalhado (>= 30 chars)`,
        mudancas
      }
    }

    case 'EPC-002': {
      // KPI de Épico
      const e = objeto as unknown as Epic
      const de = JSON.stringify(e.kpis ?? [])
      const novoKpi: Kpi = {
        nome: entrada ? `Impacto em ${entrada}` : `Adoção de ${titulo}`,
        unidade: '%',
        alvo: '40',
        janela: '90d',
        responsavel: objeto.owner || 'u-pm'
      }
      const para = JSON.stringify([...(e.kpis ?? []), novoKpi], null, 2)
      mudancas.push({ campo: 'kpis', de, para })
      return {
        justificativa: `[IA Gate G1] Adicionar KPI mensurável com nome, unidade, alvo e responsável para EPC-002`,
        mudancas
      }
    }

    case 'EPC-003': {
      // Escopo In / Out
      const e = objeto as unknown as Epic
      const deIn = JSON.stringify(e.escopo_in ?? [])
      const deOut = JSON.stringify(e.escopo_out ?? [])
      const paraIn = JSON.stringify(
        [...(e.escopo_in ?? []), `Operação principal e fluxo automatizado de ${titulo}`],
        null,
        2
      )
      const paraOut = JSON.stringify(
        [...(e.escopo_out ?? []), `Suporte legado e customizações pontuais fora do padrão`],
        null,
        2
      )
      mudancas.push({ campo: 'escopo_in', de: deIn, para: paraIn })
      mudancas.push({ campo: 'escopo_out', de: deOut, para: paraOut })
      return {
        justificativa: `[IA Gate G1] Definir fronteiras explícitas de escopo in e out para EPC-003`,
        mudancas
      }
    }

    case 'ARC-001': {
      // Contrato / Integração
      const de = JSON.stringify((objeto as unknown as Feature).integracoes ?? [])
      const novaInteg =
        entrada || `Serviço REST ${titulo} (OpenAPI 3.0 com timeout de 3000ms e política de 3 retentativas)`
      const para = JSON.stringify([...((objeto as unknown as Feature).integracoes ?? []), novaInteg], null, 2)
      mudancas.push({ campo: 'integracoes', de, para })
      return {
        justificativa: `[IA Gate G3] Declarar integração/contrato técnico para resolver ARC-001`,
        mudancas
      }
    }

    case 'ARC-002': {
      // ADR
      const de = String((objeto as unknown as Record<string, unknown>)['adr_id'] ?? '')
      const para = entrada || 'adr-arquitetura-padrao'
      mudancas.push({ campo: 'adr_id', de, para })
      return {
        justificativa: `[IA Gate G3] Vincular ADR formal (${para}) para resolver ARC-002`,
        mudancas
      }
    }

    case 'PBI-001': {
      // DoR PBI
      const p = objeto as unknown as PBI & { criterios_bdd?: CriterioBdd[] }
      const deBdd = JSON.stringify(p.criterios_bdd ?? [])
      const deOwner = p.owner ?? ''
      const deEstrategia = p.estrategia_teste ?? ''

      const paraOwner = p.owner || 'u-dev'
      const paraEstrategia = entrada || 'componente + integracao de contrato'
      const novoBdd =
        p.criterios_bdd && p.criterios_bdd.length > 0
          ? p.criterios_bdd
          : [
              {
                id: 'AC-PBI-01',
                given: `que o componente ${titulo} está carregado`,
                when: 'a requisição é processada',
                then: 'retorna status 200 com payload validado',
                prioridade: 'must'
              }
            ]

      mudancas.push({ campo: 'owner', de: deOwner, para: paraOwner })
      mudancas.push({ campo: 'estrategia_teste', de: deEstrategia, para: paraEstrategia })
      mudancas.push({ campo: 'criterios_bdd', de: deBdd, para: JSON.stringify(novoBdd, null, 2) })

      return {
        justificativa: `[IA Gate G4] Preencher DoR completa: BDD, owner e estratégia de testes para resolver PBI-001`,
        mudancas
      }
    }

    default:
      return null
  }
}

// Processador conversacional local interativo para GateAiSession
export function processarMensagemGate(
  mensagem: string,
  contexto: {
    objeto: NexoObject | null
    gateId: GateId
    user: User | null
    gates: { id: GateId; status: string; baselineVersao?: number | null }[]
    waivers?: { codigo: string; prazo: string }[]
  }
): GateChatResult {
  const msg = mensagem.trim().toLowerCase()
  const { objeto, gateId, user, gates, waivers } = contexto

  if (!objeto) {
    return {
      texto: `Nenhum objeto selecionado no Gate ${gateId}. Por favor, selecione um objeto na lista ao lado para iniciar o diagnóstico e a sessão interativa.`
    }
  }

  const diag = diagnosticarFaltasGate(objeto, gateId, waivers)
  const gov = obterGovernancaGate(gateId, user, objeto, gates)

  // 1. Perguntas de status / o que falta / governança
  if (
    msg.includes('o que falta') ||
    msg.includes('pendencias') ||
    msg.includes('pendências') ||
    msg.includes('status') ||
    msg.includes('ajuda') ||
    msg.includes('como aprovar')
  ) {
    if (diag.aprovado) {
      let txt = `**Fato:** Todos os checks bloqueantes do Gate ${gateId} para "${objeto.titulo}" estão atendidos (100% OK).\n\n`
      if (!gov.sequenciaOk) {
        txt += `**Inferência:** O gate ainda não pode ser aprovado pois o cadeado sequencial está ativo. ${gov.motivoSequencia}\n`
      } else if (!gov.papelOk) {
        txt += `**Inferência:** Seu usuário (${user?.nome}) tem papel ${user?.papel}. Este gate exige um dos papéis: ${gov.aprovadoresExigidos.join(', ')}.\n`
      } else if (gov.bloqueadoPorProponente) {
        txt += `**Inferência:** Você é o proponente deste objeto. Pela regra de governança, o proponente não pode ser o único aprovador. Um segundo usuário com papel ${gov.aprovadoresExigidos.join(', ')} deve aprovar.\n`
      } else {
        txt += `**Ação Recomendada:** Você está habilitado para aprovar este gate! Clique no botão "Aprovar Gate ${gateId}" ao lado para registrar a baseline versionada.\n`
      }
      return { texto: txt }
    }

    const listaFaltas = diag.faltas
      .map(
        (f) =>
          `- **[${f.codigo}] ${f.descricao}** (${f.severidade})\n  *Pergunta da IA:* ${f.pergunta}\n  *Exemplo:* ${f.exemplo}`
      )
      .join('\n\n')

    return {
      texto: `**Diagnóstico do Gate ${gateId} para "${objeto.titulo}":**\n\nIdentificamos ${diag.faltas.length} pendência(s) que impedem a aprovação:\n\n${listaFaltas}\n\n**Como resolver:** Você pode me pedir "gerar BDD", "adicionar KPI", "definir fluxo feliz" ou fornecer as respostas diretamente no chat que eu gerarei a proposta de patch formal para você aceitar.`
    }
  }

  // 2. Pedidos diretos de BDD
  if (msg.includes('bdd') || msg.includes('criterio') || msg.includes('critério') || msg.includes('cenario') || msg.includes('cenário')) {
    const prop = gerarPropostaPatch(objeto, 'FTR-007', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Elaborei um critério BDD verificável Given/When/Then estruturado para "${objeto.titulo}".\n\nVeja a proposta formal de patch abaixo. Revise as alterações e clique em **"Aceitar (nova versão)"** para atualizar o objeto e recalcular o checklist em tempo real.`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['FTR-007']
      }
    }
  }

  // 3. Pedidos de Narrativa ou Fluxo
  if (msg.includes('narrativa') || msg.includes('ator') || msg.includes('beneficio') || msg.includes('benefício')) {
    const prop = gerarPropostaPatch(objeto, 'FTR-001', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Elaborei a narrativa de ator, capacidade e benefício para "${objeto.titulo}". Aceite o patch abaixo para aplicar.`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['FTR-001']
      }
    }
  }

  if (msg.includes('fluxo') || msg.includes('passos') || msg.includes('etapas')) {
    const prop = gerarPropostaPatch(objeto, 'FTR-002', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Estruturei o fluxo feliz passo a passo com entrada, ação e resultado observável para "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['FTR-002']
      }
    }
  }

  // 4. Pedidos de KPI ou Escopo (G1)
  if (msg.includes('kpi') || msg.includes('meta') || msg.includes('métrica') || msg.includes('metrica')) {
    const prop = gerarPropostaPatch(objeto, 'EPC-002', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Mapeei um KPI mensurável com nome, unidade, alvo e responsável para o épico "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['EPC-002']
      }
    }
  }

  if (msg.includes('escopo') || msg.includes('in/out') || msg.includes('fronteira')) {
    const prop = gerarPropostaPatch(objeto, 'EPC-003', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Defini os escopos dentro (escopo_in) e fora (escopo_out) para o épico "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['EPC-003']
      }
    }
  }

  // 5. Pedidos de Arquitetura (G3)
  if (msg.includes('adr') || msg.includes('arquitetura') || msg.includes('decisao') || msg.includes('decisão')) {
    const prop = gerarPropostaPatch(objeto, 'ARC-002', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Vinculei uma ADR técnica para formalizar as decisões arquiteturais de "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['ARC-002']
      }
    }
  }

  if (msg.includes('integracao') || msg.includes('integração') || msg.includes('contrato') || msg.includes('openapi')) {
    const prop = gerarPropostaPatch(objeto, 'ARC-001', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Declarei o contrato de integração com timeout e política de resiliência para "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['ARC-001']
      }
    }
  }

  // 6. Pedidos de PBI / DoR (G4)
  if (msg.includes('pbi') || msg.includes('dor') || msg.includes('ready') || msg.includes('teste')) {
    const prop = gerarPropostaPatch(objeto, 'PBI-001', mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Completei a Definition of Ready do PBI "${objeto.titulo}" com critérios BDD, owner e estratégia de teste.`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: ['PBI-001']
      }
    }
  }

  // 7. Se houver falha pendente na primeira posição, tentar gerar patch para ela usando a entrada do usuário
  if (diag.faltas.length > 0) {
    const primeiraFalta = diag.faltas[0]
    const prop = gerarPropostaPatch(objeto, primeiraFalta.codigo, mensagem)
    if (prop) {
      return {
        texto: `**Proposta Gerada:** Com base na sua resposta, estruturei uma proposta de patch para resolver a pendência **[${primeiraFalta.codigo}] ${primeiraFalta.descricao}** em "${objeto.titulo}".`,
        propostaPatch: {
          alvoId: objeto.id,
          justificativa: prop.justificativa,
          mudancas: prop.mudancas
        },
        checksAfetados: [primeiraFalta.codigo]
      }
    }
  }

  // Fallback
  return {
    texto: `Compreendi sua mensagem sobre "${objeto.titulo}".\n\nPara avançar no Gate ${gateId}, experimente pedir:\n- *"O que falta para aprovar este gate?"*\n- *"Gerar BDD para esta feature"*\n- *"Adicionar KPI e escopo"* (G1)\n- *"Declarar integração e vincular ADR"* (G3)\n- *"Completar DoR com estratégia de teste"* (G4)`
  }
}
