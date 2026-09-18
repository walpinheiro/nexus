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
  return avaliarGate(props.alvo, props.waivers)
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
      const todosProntos = temProblema && temPublico && temHipotese && temOwner

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
          descricao: 'Mapear segmentos de clientes que sofrem com o problema (mín. 1 persona).',
          checkCodigo: 'ENQ-002',
          concluido: temPublico,
          acaoLabel: 'Adicionar personas',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g0-p3',
          titulo: '3. Formular hipótese e métrica inicial',
          descricao: 'Resultado esperado com critério de refutação ou indicador inicial.',
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
          titulo: '5. Solicitar aprovação ao PM',
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
      const todosProntos = temProblema && temKpi && temEscopo

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
          titulo: '4. Solicitar aprovação a Negócio e PM',
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
      const temBdd = checkEstaOk('FTR-007')
      const temOwner = checkEstaOk('FTR-004')
      const todosProntos = temNarrativa && temFluxo && temBdd && temOwner

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
          titulo: '3. Especificar critérios de aceite BDD',
          descricao: 'Cenários Given / When / Then verificáveis e testáveis.',
          checkCodigo: 'FTR-007',
          concluido: temBdd,
          acaoLabel: 'Criar BDDs',
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
          titulo: '5. Solicitar aprovação a PM, UX e Representante Técnico',
          descricao: 'Revisão conjunta de comportamento funcional e story map.',
          concluido: todosProntos && (obj?.status === 'approved' || obj?.status === 'validated'),
          acaoLabel: 'Solicitar approve',
          tipoAcao: 'solicitar'
        }
      ]
    }

    case 'G3': {
      const temApi = checkEstaOk('ARC-001')
      const temAdr = checkEstaOk('ARC-002')
      const todosProntos = temApi && temAdr

      return [
        {
          id: 'g3-p1',
          titulo: '1. Formalizar contratos de integração e APIs',
          descricao: 'Especificação OpenAPI padronizada (2xx/4xx/5xx) e contratos com parceiros.',
          checkCodigo: 'ARC-001',
          concluido: temApi,
          acaoLabel: 'Editar contratos',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p2',
          titulo: '2. Registrar decisões arquiteturais (ADR)',
          descricao: 'Vínculo formal com ADR registrada documentando trade-offs e NFRs.',
          checkCodigo: 'ARC-002',
          concluido: temAdr,
          acaoLabel: 'Vincular ADR',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g3-p3',
          titulo: '3. Solicitar aprovação a Arquiteto, Tech Lead e Segurança',
          descricao: 'Aprovação de contratos, NFRs, modelo de dados e threat model.',
          concluido: todosProntos && (obj?.status === 'approved' || obj?.status === 'validated'),
          acaoLabel: 'Solicitar approve',
          tipoAcao: 'solicitar'
        }
      ]
    }

    case 'G4': {
      const temDoR = checkEstaOk('PBI-001')
      const temOwner = Boolean(obj?.owner)
      const todosProntos = temDoR && temOwner

      return [
        {
          id: 'g4-p1',
          titulo: '1. Fatiamento e Definition of Ready (DoR)',
          descricao: 'PBI delimitado com critérios BDD, escopo e estratégia de testes automatizados.',
          checkCodigo: 'PBI-001',
          concluido: temDoR,
          acaoLabel: 'Ajustar DoR',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p2',
          titulo: '2. Atribuir responsável pelo PBI',
          descricao: 'Dev ou squad owner da unidade de trabalho.',
          concluido: temOwner,
          acaoLabel: 'Definir owner',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g4-p3',
          titulo: '3. Solicitar aprovação a PO, Dev e QA',
          descricao: 'Validação de ausência de bloqueios para entrada em sprint.',
          concluido: todosProntos && (obj?.status === 'approved' || obj?.status === 'validated'),
          acaoLabel: 'Solicitar approve',
          tipoAcao: 'solicitar'
        }
      ]
    }

    case 'G5': {
      const temDoD = checkEstaOk('DON-001') || obj?.status === 'validated' || obj?.status === 'published'
      const statusFinal = obj?.status === 'validated' || obj?.status === 'published'

      return [
        {
          id: 'g5-p1',
          titulo: '1. Executar pipeline de CI e suite de testes',
          descricao: '100% de testes unitários, de componentes e de contrato verdes.',
          concluido: temDoD,
          acaoLabel: 'Verificar CI',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g5-p2',
          titulo: '2. Concluir revisão de Pull Request por pares',
          descricao: 'Aprovação humana de código e conformidade com tokens e acessibilidade.',
          concluido: statusFinal,
          acaoLabel: 'Revisar PR',
          tipoAcao: 'corrigir'
        },
        {
          id: 'g5-p3',
          titulo: '3. Solicitar aprovação final e entrega (DoD)',
          descricao: 'Registro formal da baseline de publicação e release.',
          concluido: statusFinal,
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
            class="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded"
          >
            Concluído
          </span>
          <button
            v-else
            type="button"
            class="rounded-btn px-2.5 py-1 text-xs font-semibold transition-colors"
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
