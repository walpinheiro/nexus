<script setup lang="ts">
import { computed } from 'vue'
import type { GateId, NexoObject } from '@/types/nexo'
import { avaliarGate } from '@/utils/gates'
import LucideIcon from '@/components/common/LucideIcon.vue'

interface Props {
  gateId: GateId
  alvo: NexoObject | null
  alvoId: string
  waivers?: { codigo: string; prazo: string }[]
  podeAprovarDireto?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'solicitar'): void
  (e: 'corrigir', id: string): void
  (e: 'abrir-studio'): void
}>()

interface PassoGuia {
  id: string
  titulo: string
  descricao: string
  checkCodigo?: string
  concluido: boolean
  acaoLabel: string
  tipoAcao: 'corrigir' | 'solicitar' | 'studio'
}

// Avaliação em tempo real dos checks do alvo
const avaliacao = computed(() => {
  if (!props.alvo) return null
  return avaliarGate(props.alvo, props.waivers, props.gateId)
})

function checkEstaOk(codigo?: string): boolean {
  if (!codigo) return false
  if (!avaliacao.value) return false
  const c = avaliacao.value.checks.find((x) => x.codigo === codigo)
  return c ? c.ok : false
}

// Passos normativos das especificações 05 a 10
const passos = computed<PassoGuia[]>(() => {
  const obj = props.alvo

  switch (props.gateId) {
    case 'G0': {
      const temProblema = checkEstaOk('ENQ-001')
      const temPublico = checkEstaOk('ENQ-002')
      const temHipotese = checkEstaOk('ENQ-003')
      const temOwner = checkEstaOk('ENQ-004')
      const temEscopo = checkEstaOk('ENQ-005')
      const temRiscos = checkEstaOk('ENQ-006')
      const todosProntos = temProblema && temPublico && temHipotese && temOwner && temEscopo && temRiscos

      return [
        {
          id: 'g0-p1',
          titulo: '1. Descrever contexto e dor observável',
          descricao: 'Problema mensurável relatado por usuários reais (mín. 20 caracteres).',
          checkCodigo: 'ENQ-001',
          concluido: temProblema,
          acaoLabel: 'Preencher dor',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g0-p2',
          titulo: '2. Identificar público afetado e personas',
          descricao: 'Mapear segmentos de clientes que sofrem com o problema (mín. 1 persona ou ator).',
          checkCodigo: 'ENQ-002',
          concluido: temPublico,
          acaoLabel: 'Adicionar personas',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g0-p3',
          titulo: '3. Formular hipótese e métrica inicial',
          descricao: 'Resultado esperado com critério de refutação e ao menos 1 KPI com meta.',
          checkCodigo: 'ENQ-003',
          concluido: temHipotese,
          acaoLabel: 'Definir hipótese',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g0-p4',
          titulo: '4. Atribuir owner / sponsor',
          descricao: 'Responsável formal pela condução da oportunidade para Gate 1.',
          checkCodigo: 'ENQ-004',
          concluido: temOwner,
          acaoLabel: 'Definir owner',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g0-p5',
          titulo: '5. Mapear restrições e não-objetivos',
          descricao: 'Definição explícita de escopo_in e escopo_out para delimitar o discovery.',
          checkCodigo: 'ENQ-005',
          concluido: temEscopo,
          acaoLabel: 'Definir escopo in/out',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g0-p6',
          titulo: '6. Mapear suposições e riscos críticos',
          descricao: 'Identificar ao menos 1 risco inicial com gravidade e mitigação.',
          checkCodigo: 'ENQ-006',
          concluido: temRiscos,
          acaoLabel: 'Adicionar risco',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g0-p7',
          titulo: '7. Solicitar aprovação ao PM',
          descricao: 'PM avalia o one-pager gerado e registra a baseline de enquadramento.',
          concluido: todosProntos && (obj?.status === 'approved' || obj?.status === 'validated'),
          acaoLabel: 'Solicitar approve',
          tipoAcao: 'solicitar'
        }
      ]
    }

    case 'G1': {
      const temProblema = checkEstaOk('EPC-001')
      const temKpi = checkEstaOk('EPC-002')
      const temEscopo = checkEstaOk('EPC-003')
      const temResultado = checkEstaOk('EPC-004')
      const temRiscos = checkEstaOk('EPC-005')
      const temPrd = checkEstaOk('EPC-006')
      const todosProntos = temProblema && temKpi && temEscopo && temResultado && temRiscos && temPrd

      return [
        {
          id: 'g1-p1',
          titulo: '1. Detalhar problema e contexto do épico',
          descricao: 'Problema orientado a resultado com dor e contexto (mín. 30 caracteres).',
          checkCodigo: 'EPC-001',
          concluido: temProblema,
          acaoLabel: 'Corrigir problema',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g1-p2',
          titulo: '2. Definir KPI mensurável com alvo e responsável',
          descricao: 'Indicador com nome, unidade, alvo temporal e owner.',
          checkCodigo: 'EPC-002',
          concluido: temKpi,
          acaoLabel: 'Adicionar KPI',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g1-p3',
          titulo: '3. Declarar escopo explícito (in e out)',
          descricao: 'Ao menos 1 item dentro do escopo e 1 item explicitamente fora.',
          checkCodigo: 'EPC-003',
          concluido: temEscopo,
          acaoLabel: 'Editar escopo',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g1-p4',
          titulo: '4. Declarar resultado observável',
          descricao: 'Objetivo de negócio claro e verificável sem prescrever implementação.',
          checkCodigo: 'EPC-004',
          concluido: temResultado,
          acaoLabel: 'Definir objetivo',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g1-p5',
          titulo: '5. Mapear risco crítico com mitigação e owner',
          descricao: 'Risco documentado com probabilidade, impacto, mitigação e responsável nominal.',
          checkCodigo: 'EPC-005',
          concluido: temRiscos,
          acaoLabel: 'Completar riscos',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g1-p6',
          titulo: '6. Garantir completude do PRD',
          descricao: 'Ao menos 80% dos campos afirmativos do documento de produto preenchidos.',
          checkCodigo: 'EPC-006',
          concluido: temPrd,
          acaoLabel: 'Completar PRD',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g1-p7',
          titulo: '7. Solicitar aprovação a Negócio e PM',
          descricao: 'Validação de valor, escopo e criação da baseline do PRD.',
          concluido: todosProntos && (obj?.status === 'approved' || obj?.status === 'validated'),
          acaoLabel: 'Solicitar approve',
          tipoAcao: 'solicitar'
        }
      ]
    }

    case 'G2': {
      const temNarrativa = checkEstaOk('FTR-001')
      const temFluxo = checkEstaOk('FTR-002')
      const temRegras = checkEstaOk('FTR-003')
      const temOwner = checkEstaOk('FTR-004')
      const temEstadosTela = checkEstaOk('FTR-005')
      const temResiliencia = checkEstaOk('FTR-006')
      const temBdd = checkEstaOk('FTR-007')
      const todosProntos =
        temNarrativa && temFluxo && temRegras && temOwner && temEstadosTela && temResiliencia && temBdd

      return [
        {
          id: 'g2-p1',
          titulo: '1. Narrativa de benefício do usuário',
          descricao: 'Formato: Como [ator], quero [capacidade] para [benefício].',
          checkCodigo: 'FTR-001',
          concluido: temNarrativa,
          acaoLabel: 'Ajustar narrativa',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g2-p2',
          titulo: '2. Mapear fluxo feliz de interação',
          descricao: 'Sequência observável de ações com entrada e resultado esperado.',
          checkCodigo: 'FTR-002',
          concluido: temFluxo,
          acaoLabel: 'Preencher fluxo',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g2-p3',
          titulo: '3. Regras de negócio vinculadas',
          descricao: 'Regras de negócio com fonte declarada e status ativo.',
          checkCodigo: 'FTR-003',
          concluido: temRegras,
          acaoLabel: 'Vincular regras',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g2-p4',
          titulo: '4. Atribuir owner da feature',
          descricao: 'Responsável formal pela especificação funcional.',
          checkCodigo: 'FTR-004',
          concluido: temOwner,
          acaoLabel: 'Definir owner',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g2-p5',
          titulo: '5. Estados de tela mapeados',
          descricao: 'Cobertura de estados de tela (loading, vazio, erro, sucesso) no Studio.',
          checkCodigo: 'FTR-005',
          concluido: temEstadosTela,
          acaoLabel: 'Abrir no Studio',
          tipoAcao: 'studio'
        },
        {
          id: 'g2-p6',
          titulo: '6. Resiliência de integrações externas',
          descricao: 'Políticas de timeout, falha e indisponibilidade para integrações.',
          checkCodigo: 'FTR-006',
          concluido: temResiliencia,
          acaoLabel: 'Definir resiliência',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g2-p7',
          titulo: '7. Especificar critérios de aceite BDD',
          descricao: 'Cenários Given / When / Then verificáveis e testáveis.',
          checkCodigo: 'FTR-007',
          concluido: temBdd,
          acaoLabel: 'Criar BDDs',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g2-p8',
          titulo: '8. Solicitar aprovação a PM, UX e Tech Lead',
          descricao: 'Revisão conjunta de comportamento funcional e story map.',
          concluido: todosProntos && (obj?.status === 'approved' || obj?.status === 'validated'),
          acaoLabel: 'Solicitar approve',
          tipoAcao: 'solicitar'
        }
      ]
    }

    case 'G3': {
      const temContrato = checkEstaOk('ARC-001')
      const temAdr = checkEstaOk('ARC-002')
      const temOpenApi = checkEstaOk('ARC-003')
      const temPersistencia = checkEstaOk('ARC-004')
      const temIntegEstruturada = checkEstaOk('ARC-005')
      const temDadoPessoal = checkEstaOk('ARC-006')
      const temNfr = checkEstaOk('ARC-007')
      const temSeguranca = checkEstaOk('ARC-008')
      const todosProntos =
        temContrato &&
        temAdr &&
        temOpenApi &&
        temPersistencia &&
        temIntegEstruturada &&
        temDadoPessoal &&
        temNfr &&
        temSeguranca

      return [
        {
          id: 'g3-p1',
          titulo: '1. Formalizar contratos de API ou integrações',
          descricao: 'OpenAPI com endpoints ou integrações declaradas (ou dispensa formal).',
          checkCodigo: 'ARC-001',
          concluido: temContrato,
          acaoLabel: 'Editar contratos',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p2',
          titulo: '2. Registrar decisões arquiteturais (ADR)',
          descricao: 'Vínculo com ADR documentando decisões técnicas e justificativas.',
          checkCodigo: 'ARC-002',
          concluido: temAdr,
          acaoLabel: 'Vincular ADR',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p3',
          titulo: '3. Detalhar OpenAPI (respostas, auth e compatibilidade)',
          descricao: 'Especificação de retornos 2xx/4xx/5xx, tokens/auth e versionamento.',
          checkCodigo: 'ARC-003',
          concluido: temOpenApi,
          acaoLabel: 'Detalhar OpenAPI',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p4',
          titulo: '4. Modelar persistência e migrations',
          descricao: 'Entidade de dados, validações, plano de migration e índices.',
          checkCodigo: 'ARC-004',
          concluido: temPersistencia,
          acaoLabel: 'Modelar dados',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p5',
          titulo: '5. Estruturar integrações e matriz de falhas',
          descricao: 'Timeouts, política de retry, idempotência e fallback de indisponibilidade.',
          checkCodigo: 'ARC-005',
          concluido: temIntegEstruturada,
          acaoLabel: 'Configurar resiliência',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p6',
          titulo: '6. Classificar dados pessoais (LGPD)',
          descricao: 'Identificar categorias de dados, finalidade, retenção e controle de acesso.',
          checkCodigo: 'ARC-006',
          concluido: temDadoPessoal,
          acaoLabel: 'Definir privacidade',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p7',
          titulo: '7. Definir requisitos não-funcionais (NFRs)',
          descricao: 'Métricas de latência, disponibilidade, volumetria e observabilidade.',
          checkCodigo: 'ARC-007',
          concluido: temNfr,
          acaoLabel: 'Adicionar NFRs',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p8',
          titulo: '8. Threat Model e Segurança da Informação',
          descricao: 'Análise STRIDE, matriz de riscos ou exceção de segurança aprovada.',
          checkCodigo: 'ARC-008',
          concluido: temSeguranca,
          acaoLabel: 'Revisar segurança',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p9',
          titulo: '9. Solicitar aprovação a Arquiteto, Tech Lead, Segurança e Dev',
          descricao: 'Aprovação conjunta da arquitetura de solução e contratos.',
          concluido: todosProntos && (obj?.status === 'approved' || obj?.status === 'validated'),
          acaoLabel: 'Solicitar approve',
          tipoAcao: 'solicitar'
        }
      ]
    }

    case 'G4': {
      const temAceite = checkEstaOk('PBI-ACEITE')
      const temOrigem = checkEstaOk('PBI-ORIGEM')
      const temEscopo = checkEstaOk('PBI-ESCOPO')
      const temDep = checkEstaOk('PBI-DEP')
      const temOwner = checkEstaOk('PBI-OWNER')
      const temTeste = checkEstaOk('PBI-TESTE')
      const temContrato = checkEstaOk('PBI-CONTRATO')
      const temBloq = checkEstaOk('PBI-BLOQ')
      const temCompat = checkEstaOk('PBI-COND-COMPAT')
      const temRollback = checkEstaOk('PBI-COND-ROLLBACK')
      const temTela = checkEstaOk('PBI-COND-TELA')
      const temCondTeste = checkEstaOk('PBI-COND-TESTE')

      const todosProntos =
        temAceite &&
        temOrigem &&
        temEscopo &&
        temDep &&
        temOwner &&
        temTeste &&
        temContrato &&
        temBloq &&
        temCompat &&
        temRollback &&
        temTela &&
        temCondTeste

      return [
        {
          id: 'g4-p1',
          titulo: '1. Critérios de aceite BDD verificáveis',
          descricao: 'Cenários Given / When / Then estruturados para teste automatizado.',
          checkCodigo: 'PBI-ACEITE',
          concluido: temAceite,
          acaoLabel: 'Adicionar BDD',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p2',
          titulo: '2. Vínculo à feature de origem e owner',
          descricao: 'Feature pai declarada e responsável pelo PBI nominal.',
          checkCodigo: 'PBI-ORIGEM',
          concluido: temOrigem,
          acaoLabel: 'Vincular feature',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p3',
          titulo: '3. Escopo delimitado (in e out)',
          descricao: 'Itens inclusos e excluídos expressos com clareza.',
          checkCodigo: 'PBI-ESCOPO',
          concluido: temEscopo,
          acaoLabel: 'Delimitar escopo',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p4',
          titulo: '4. Resolução de dependências técnicas',
          descricao: 'Ausência de dependências abertas ou bloqueadoras.',
          checkCodigo: 'PBI-DEP',
          concluido: temDep,
          acaoLabel: 'Checar dependências',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p5',
          titulo: '5. Atribuir owner da unidade de trabalho',
          descricao: 'Engenheiro ou squad responsável pelo desenvolvimento.',
          checkCodigo: 'PBI-OWNER',
          concluido: temOwner,
          acaoLabel: 'Definir owner',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p6',
          titulo: '6. Definir estratégia de testes automatizados',
          descricao: 'Testes de unidade, integração ou ponta-a-ponta especificados.',
          checkCodigo: 'PBI-TESTE',
          concluido: temTeste && temCondTeste,
          acaoLabel: 'Definir testes',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p7',
          titulo: '7. Aprovação de contratos e compatibilidade',
          descricao: 'Contratos versionados com compatibilidade garantida para consumidores.',
          checkCodigo: 'PBI-CONTRATO',
          concluido: temContrato && temCompat,
          acaoLabel: 'Checar contratos',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p8',
          titulo: '8. Plano de rollback e conformidade de telas',
          descricao: 'Salvaguardas de migração reversível e consumo contratual em interfaces.',
          checkCodigo: 'PBI-COND-ROLLBACK',
          concluido: temRollback && temTela && temBloq,
          acaoLabel: 'Validar salvaguardas',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p9',
          titulo: '9. Solicitar aprovação a PO, Dev e QA',
          descricao: 'Validação de ausência de bloqueios para entrada em sprint (DoR).',
          concluido: todosProntos && (obj?.status === 'approved' || obj?.status === 'validated'),
          acaoLabel: 'Solicitar approve',
          tipoAcao: 'solicitar'
        }
      ]
    }

    case 'G5': {
      const temStatus = checkEstaOk('DON-001') || obj?.status === 'validated' || obj?.status === 'published'
      const temPr = checkEstaOk('DON-002')
      const temCi = checkEstaOk('DON-003')
      const temTestesAceite = checkEstaOk('DON-004')
      const temSeguranca = checkEstaOk('DON-005')
      const temObs = checkEstaOk('DON-006')
      const todosProntos = temStatus && temPr && temCi && temTestesAceite && temSeguranca && temObs

      return [
        {
          id: 'g5-p1',
          titulo: '1. Status do item validado para publicação',
          descricao: 'Status promovido a validated ou published após desenvolvimento concluído.',
          checkCodigo: 'DON-001',
          concluido: temStatus,
          acaoLabel: 'Validar status',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g5-p2',
          titulo: '2. Pull Request merged e revisão por pares',
          descricao: 'Código integrado na branch principal com aprovação de pares.',
          checkCodigo: 'DON-002',
          concluido: temPr,
          acaoLabel: 'Vincular PR',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g5-p3',
          titulo: '3. Pipeline CI verde e análise SAST/Policies',
          descricao: 'Suíte de CI executada sem falhas com SAST e compliance aprovados.',
          checkCodigo: 'DON-003',
          concluido: temCi,
          acaoLabel: 'Checar CI',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g5-p4',
          titulo: '4. Aceite funcional e testes automatizados verdes',
          descricao: '100% dos testes verdes e aceite registrado formalmente.',
          checkCodigo: 'DON-004',
          concluido: temTestesAceite,
          acaoLabel: 'Validar testes',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g5-p5',
          titulo: '5. Aprovação de segurança ou exceção com prazo',
          descricao: 'Homologação pela equipe de segurança ou waiver formalizado.',
          checkCodigo: 'DON-005',
          concluido: temSeguranca,
          acaoLabel: 'Checar segurança',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g5-p6',
          titulo: '6. Observabilidade e rastreabilidade ponta-a-ponta',
          descricao: 'Métricas, logs e dashboards vinculados ao commit e especificação.',
          checkCodigo: 'DON-006',
          concluido: temObs,
          acaoLabel: 'Configurar telemetria',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g5-p7',
          titulo: '7. Solicitar aprovação final e entrega (DoD)',
          descricao: 'Registro formal da baseline de publicação e release aprovada por PO, Tech Lead e QA.',
          concluido: todosProntos,
          acaoLabel: 'Solicitar approve',
          tipoAcao: 'solicitar'
        }
      ]
    }

    default:
      return []
  }
})

const passosConcluidos = computed(() => passos.value.filter((p) => p.concluido).length)
const progressoPct = computed(() => {
  if (passos.value.length === 0) return 0
  return Math.round((passosConcluidos.value / passos.value.length) * 100)
})

function executarAcao(passo: PassoGuia) {
  if (passo.tipoAcao === 'solicitar') {
    emit('solicitar')
  } else if (passo.tipoAcao === 'studio') {
    emit('abrir-studio')
  } else {
    emit('corrigir', props.alvoId)
  }
}
</script>

<template>
  <div class="rounded-card border border-nexo-border bg-white p-4 shadow-sm space-y-3">
    <!-- Header do Guia -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-nexo-primary/10 text-nexo-primary font-bold text-xs">
          <LucideIcon name="list-checks" :size="14" />
        </span>
        <h3 class="text-sm font-bold text-nexo-text">Guia de Aprovação · Gate {{ props.gateId }}</h3>
      </div>
      <span class="rounded-badge bg-nexo-canvas px-2 py-0.5 text-[11px] font-semibold text-nexo-muted border border-nexo-border">
        {{ passosConcluidos }}/{{ passos.length }} etapas ({{ progressoPct }}%)
      </span>
    </div>

    <!-- Barra de Progresso -->
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        class="h-full bg-nexo-primary transition-all duration-300"
        :style="{ width: `${progressoPct}%` }"
      />
    </div>

    <p class="text-xs text-nexo-muted">
      Siga o passo a passo normativo abaixo para qualificar o objeto e solicitar o registro de baseline:
    </p>

    <!-- Lista de Passos -->
    <div class="space-y-2 pt-1">
      <div
        v-for="passo in passos"
        :key="passo.id"
        class="flex items-start justify-between gap-3 rounded-card border p-2.5 transition-colors"
        :class="passo.concluido ? 'border-green-200 bg-green-50/40' : 'border-nexo-border/80 bg-nexo-canvas/30'"
      >
        <div class="flex items-start gap-2.5 min-w-0 flex-1">
          <span class="mt-0.5 shrink-0">
            <LucideIcon
              :name="passo.concluido ? 'check-circle-2' : 'circle'"
              :size="16"
              :class="passo.concluido ? 'text-green-600' : 'text-gray-400'"
            />
          </span>
          <div class="min-w-0 flex-1 text-xs">
            <p class="font-semibold" :class="passo.concluido ? 'text-green-950' : 'text-nexo-text'">
              {{ passo.titulo }}
            </p>
            <p class="text-[11px] text-nexo-muted mt-0.5">
              {{ passo.descricao }}
            </p>
          </div>
        </div>

        <div class="shrink-0 flex items-center">
          <span
            v-if="passo.concluido && passo.tipoAcao !== 'solicitar'"
            class="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded"
          >
            Concluído
          </span>
          <button
            v-else
            type="button"
            class="rounded-btn px-3 py-1.5 text-sm font-semibold transition-colors min-h-[32px]"
            :class="passo.tipoAcao === 'solicitar'
              ? 'bg-nexo-primary text-white hover:bg-nexo-primary/90'
              : 'border border-nexo-border bg-white text-nexo-text hover:bg-nexo-canvas'"
            @click="executarAcao(passo)"
          >
            {{ passo.acaoLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
