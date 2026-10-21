<script setup lang="ts">
import { computed } from 'vue'
import type { GateId, NexoObject, EvidenciaEntrega } from '@/types/nexo'
import type { GateInfo } from '@/stores/useGate'
import { useGraph } from '@/stores/useGraph'
import LucideIcon from '@/components/common/LucideIcon.vue'
import ArtefatoDoc from '@/components/gates/ArtefatoDoc.vue'
import { montarEntradaStudio, isFeatureProntaParaStudio } from '@/ai/gateParaStudio'
import { useGate } from '@/stores/useGate'
import { exportarGateMarkdown } from '@/utils/exportWiki'
import { montarArtefato } from '@/utils/artefatos'
import { VButton } from 'vueui-nova-kit'

interface Props {
  gateId: GateId
  alvo: NexoObject | null
  gateInfo?: GateInfo | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'preview', telaId: string): void
}>()
const graph = useGraph()
const gatesStore = useGate()

const vinculosTela = computed(() => {
  if (!props.alvo || props.alvo.tipo !== 'feature') return []
  return graph.telasDaFeature(props.alvo.id)
})

const prontaParaStudio = computed(() => {
  if (!props.alvo || props.alvo.tipo !== 'feature') return false
  return isFeatureProntaParaStudio(props.alvo.id, gatesStore.gates)
})

const entradaStudio = computed(() => {
  if (!props.alvo || props.alvo.tipo !== 'feature') return null
  return montarEntradaStudio(props.alvo.id, graph.state.nos)
})

const alvoObj = computed(() => (props.alvo as unknown as Record<string, unknown>) ?? {})

// Dimensões G5 p/ stepper secundário dentro do artefato (dados reais da evidência).
const evidencia = computed(() => ((alvoObj.value['evidencia'] as EvidenciaEntrega & Record<string, unknown>) ?? {}))
const pipelinePassos = computed(() => {
  const ev = evidencia.value
  const checksCi = Array.isArray(ev.checks_ci) ? ev.checks_ci : []
  const ciOk = checksCi.length > 0 && !checksCi.some((c) => /fail|error|blocked/i.test(c)) && ev.sast_ok !== false && ev.policy_ok !== false
  const obs = Array.isArray(ev.observabilidade) ? ev.observabilidade : []
  const rast = Array.isArray(ev.rastreabilidade) ? ev.rastreabilidade : []
  const prOk = Boolean(ev.pr_url && (ev.pr_url.includes('pull') || (ev as Record<string, unknown>)['pr_merged'] === true))
  const testesOk = ev.testes_verdes === true
  const aceiteOk = ev.aceite_registrado === true
  const telemetriaOk = obs.length >= 1 && rast.length >= 1

  return [
    {
      numero: 1,
      titulo: 'Pull Request & Revisão por Pares',
      ok: prOk,
      detalhe: ev.pr_url ? `PR: ${ev.pr_url}` : 'Nenhum PR vinculado'
    },
    {
      numero: 2,
      titulo: 'Pipeline CI & SAST',
      ok: ciOk,
      detalhe: checksCi.length > 0 ? `${checksCi.length} checks (${ev.sast_ok !== false ? 'SAST OK' : 'SAST pendente'})` : 'CI não executada'
    },
    {
      numero: 3,
      titulo: 'Suíte de Testes Automatizados',
      ok: testesOk,
      detalhe: testesOk ? 'Testes unitários e de integração verdes' : 'Testes pendentes de execução'
    },
    {
      numero: 4,
      titulo: 'Aceite Funcional (PO / QA / BDD)',
      ok: aceiteOk,
      detalhe: aceiteOk ? 'Critérios de aceite homologados' : 'Aceite pendente de homologação'
    },
    {
      numero: 5,
      titulo: 'Observabilidade & Rastreabilidade',
      ok: telemetriaOk,
      detalhe: `${obs.length} telemetrias · ${rast.length} rastreabilidades`
    }
  ]
})

// Artefato normativo do gate (motor src/utils/artefatos.ts — única fonte de verdade
// das seções; o VUE só visualiza via ArtefatoDoc e mantém export .md secundário).
// Chamada única para qualquer gate (mesmo padrão de GateAiSession): ctx completo
// com gates+nos+vinculos+regras; o motor decide as seções por gateId.
const artefato = computed(() => {
  if (!props.alvo) return null
  const gatesCtx = gatesStore.gates.map((g) => ({
    id: g.id,
    status: g.status,
    baselineVersao: g.baselineVersao,
    aprovadoPor: g.aprovadoPor ?? undefined,
    aprovadoEm: g.aprovadoEm ?? undefined
  }))
  return montarArtefato(props.alvo, props.gateId, {
    gates: gatesCtx,
    nos: graph.state.nos,
    vinculos: graph.vinculosTela,
    regras: graph.regrasValidacao
  })
})

// A4: G3/G5 100% motor; G4 motor + ações secundárias (release). Legado removido.
// W2: progresso explícito do artefato — percorre secoes[].itens[] e conta como
// vazios os valores cujo texto contém "não informado" / "(vazio)" / "(nenhum"
// (case-insensitive), espelhando os placeholders que o motor emite.
const progressoArtefato = computed(() => {
  const secoes = artefato.value?.secoes ?? []
  let total = 0
  let vazios = 0
  for (const secao of secoes) {
    for (const item of secao.itens ?? []) {
      total += 1
      const texto = (item.valor ?? '').toString().toLowerCase()
      if (texto.includes('não informado') || texto.includes('nao informado') || texto.includes('(vazio)') || texto.includes('(nenhum')) {
        vazios += 1
      }
    }
  }
  const preenchidos = total - vazios
  const percentual = total > 0 ? Math.round((preenchidos / total) * 100) : 0
  return { total, preenchidos, percentual }
})
const mostraAcoesG5 = computed(() => props.gateId === 'G5' && props.alvo != null)

function baixarGateMarkdown() {
  if (!props.alvo) return
  const md = exportarGateMarkdown(props.alvo, props.gateId, {
    gates: gatesStore.gates.map((g) => ({
      id: g.id,
      status: g.status,
      baselineVersao: g.baselineVersao,
      aprovadoPor: g.aprovadoPor ?? undefined,
      aprovadoEm: g.aprovadoEm ?? undefined
    })),
    nos: graph.state.nos
  })
  if (!md) return
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gate-${props.gateId.toLowerCase()}-${props.alvo.id || 'documento'}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="rounded-card border border-nexo-border bg-white p-4 shadow-sm space-y-4">
    <!-- Header do Painel Output (baseline vive dentro do ArtefatoDoc; aqui só título) -->
    <div class="flex items-center justify-between border-b border-nexo-border/60 pb-3">
      <div class="flex items-center gap-2">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-nexo-primary/10 text-nexo-primary font-bold text-xs">
          <LucideIcon name="file-text" :size="14" />
        </span>
        <div>
          <h3 class="text-sm font-bold text-nexo-text">Artefato Formal · Gate {{ props.gateId }}</h3>
          <p class="text-[11px] text-nexo-muted">
            Seções normativas do motor (dados reais do objeto)
          </p>
        </div>
      </div>
    </div>

    <!-- EmptyState se nenhum alvo estiver carregado -->
    <div v-if="!props.alvo" class="rounded border border-dashed border-nexo-border p-6 text-center text-xs text-nexo-muted">
      <LucideIcon name="inbox" :size="24" class="mx-auto mb-2 text-nexo-muted" />
      <p class="font-medium text-nexo-text">Nenhum artefato gerado ainda</p>
      <p class="mt-1">Selecione um objeto do gate acima para visualizar os artefatos formais.</p>
    </div>

    <!-- W2: progresso explícito do artefato (somente quando artefato existir) -->
    <div v-if="artefato" class="rounded border border-nexo-border bg-nexo-canvas/30 px-3 py-2 text-xs text-nexo-text">
      <div class="flex items-center justify-between gap-2">
        <span class="font-semibold">Progresso do artefato</span>
        <span class="text-nexo-muted">{{ progressoArtefato.preenchidos }} de {{ progressoArtefato.total }} campos preenchidos</span>
      </div>
      <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-nexo-border" role="progressbar" :aria-valuenow="progressoArtefato.percentual" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full bg-nexo-primary transition-all" :style="{ width: progressoArtefato.percentual + '%' }"></div>
      </div>
    </div>

    <!-- Artefato normativo G0..G5 via motor (A3+A4); export .md secundário dentro -->
    <ArtefatoDoc
      :artefato="artefato"
      :gate-info="gateInfo"
      @exportar="baixarGateMarkdown()"
    >
      <!-- A3: ações secundárias preservadas do G2 (Studio/preview) vivem dentro do artefato -->
      <template v-if="props.gateId === 'G2'" #acoes-secundarias>
        <div
          class="rounded-card border p-3 text-xs space-y-2 shadow-xs transition-colors"
          :class="prontaParaStudio ? 'border-nexo-approved-border bg-nexo-approved-bg/60' : 'border-nexo-stale-border bg-nexo-stale-bg/50'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <LucideIcon :name="prontaParaStudio ? 'check-circle-2' : 'clock'" :size="15" :class="prontaParaStudio ? 'text-nexo-approved' : 'text-nexo-stale'" />
              <span class="font-bold uppercase tracking-wide text-xs" :class="prontaParaStudio ? 'text-nexo-approved' : 'text-nexo-stale'">
                {{ prontaParaStudio ? 'Pronto para Studio' : 'Pendente de Baseline G2 para Studio' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <VButton
                v-if="vinculosTela.length > 0"
                type="button"
                class="inline-flex min-h-[32px] items-center gap-1 rounded-btn border border-nexo-approved-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-approved shadow-xs hover:bg-nexo-approved-bg transition-colors"
                @click="emit('preview', vinculosTela[0].telaId)"
              >
                <LucideIcon name="eye" :size="12" />
                Preview
              </VButton>
              <RouterLink
                v-if="props.alvo"
                :to="{ path: '/studio-full', query: { feature: props.alvo.id, from: 'gates/G2' } }"
                class="inline-flex min-h-[32px] items-center gap-1 rounded-btn px-3 py-1.5 text-sm font-semibold text-white shadow-xs transition-colors"
                :class="prontaParaStudio ? 'bg-nexo-approved hover:bg-nexo-approved/90' : 'bg-nexo-stale hover:bg-nexo-stale'"
              >
                <LucideIcon :name="vinculosTela.length > 0 ? 'layout' : 'auto_awesome'" :size="12" />
                {{ vinculosTela.length > 0 ? `Ver telas (${vinculosTela.length})` : 'Gerar telas' }}
              </RouterLink>
            </div>
          </div>

          <p class="text-[11px] leading-relaxed" :class="prontaParaStudio ? 'text-nexo-approved' : 'text-nexo-stale'">
            {{ prontaParaStudio
              ? 'Esta feature atingiu baseline formal aprovada no Gate G2. Seus fluxos, exceções e critérios BDD estão prontos para compor o canvas do Studio.'
              : 'Para qualificar esta feature para o Studio com baseline garantida, complete todos os requisitos bloqueantes e obtenha aprovação formal no Gate G2.'
            }}
          </p>

          <div v-if="entradaStudio" class="rounded bg-white p-2.5 border border-nexo-border/70 text-[11px] space-y-1.5">
            <div class="flex items-center justify-between font-semibold text-nexo-text">
              <span>Telas e Estados Prontos para Studio ({{ entradaStudio.telas.length }}):</span>
              <span class="text-xs text-nexo-muted font-normal">{{ entradaStudio.navegacao.length }} transições BDD mapeadas</span>
            </div>
            <ul class="space-y-1 pl-1">
              <li v-for="t in entradaStudio.telas" :key="t.id" class="flex items-center justify-between gap-1.5 text-xs text-nexo-text">
                <div class="flex items-start gap-1.5 min-w-0">
                  <span class="rounded bg-nexo-primary/10 text-nexo-primary px-1 font-mono text-xs font-bold shrink-0">
                    {{ t.origem === 'fluxo_feliz' ? 'passo' : 'exceção' }}
                  </span>
                  <span class="font-medium shrink-0">{{ t.nome }}:</span>
                  <span class="text-nexo-muted truncate">{{ t.descricao }}</span>
                </div>
                <VButton
                  type="button"
                  class="shrink-0 inline-flex min-h-[32px] items-center gap-0.5 text-xs text-nexo-primary hover:underline px-2 py-1.5"
                  @click="emit('preview', t.id)"
                >
                  <LucideIcon name="eye" :size="11" />
                  preview
                </VButton>
              </li>
            </ul>
          </div>
        </div>
      </template>
      <!-- A4: stepper G5 vive dentro do artefato como ação secundária (dados reais) -->
      <template v-if="mostraAcoesG5" #acoes-secundarias>
        <div class="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <div
            v-for="step in pipelinePassos"
            :key="step.numero"
            class="rounded p-2 border text-xs space-y-1 transition-colors"
            :class="step.ok ? 'bg-nexo-approved-bg/70 border-nexo-approved-border text-nexo-approved' : 'bg-white border-nexo-border text-nexo-text'"
          >
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs">Passo {{ step.numero }}</span>
              <LucideIcon :name="step.ok ? 'check-circle-2' : 'alert-circle'" :size="13" :class="step.ok ? 'text-nexo-approved' : 'text-nexo-stale'" />
            </div>
            <p class="font-medium text-xs leading-tight">{{ step.titulo }}</p>
            <p class="text-xs text-nexo-muted truncate" :title="step.detalhe">{{ step.detalhe }}</p>
          </div>
        </div>
        <p class="text-xs text-nexo-muted text-right">
          {{ pipelinePassos.filter((p) => p.ok).length }}/5 concluídos
        </p>
      </template>
    </ArtefatoDoc>
  </div>
</template>
