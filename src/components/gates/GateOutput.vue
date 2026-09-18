<script setup lang="ts">
import { computed } from 'vue'
import type { GateId, NexoObject, Epic, Feature, PBI, IntegracaoSpec, NfrSpec, EvidenciaEntrega, ExcecaoSeguranca, RiscoEstruturado } from '@/types/nexo'
import type { GateInfo } from '@/stores/useGate'
import { useGraph } from '@/stores/useGraph'
import { avaliarGate } from '@/utils/gates'
import LucideIcon from '@/components/common/LucideIcon.vue'
import { montarEntradaStudio, isFeatureProntaParaStudio } from '@/ai/gateParaStudio'
import { useGate } from '@/stores/useGate'
import { exportarGateMarkdown } from '@/utils/exportWiki'

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

const avaliacao = computed(() => {
  if (!props.alvo) return null
  return avaliarGate(props.alvo, graph.waivers, props.gateId)
})

const epico = computed(() => {
  if (props.alvo?.tipo === 'epico') return props.alvo as Epic
  return graph.state.nos.find((n) => n.tipo === 'epico') as Epic | undefined
})

const featuresDoEpico = computed(() => {
  return graph.state.nos.filter((n) => n.tipo === 'feature') as Feature[]
})

const pbisDaFeature = computed(() => {
  if (!props.alvo) return []
  return graph.state.nos.filter((n) => {
    if (n.tipo !== 'pbi') return false
    const p = n as unknown as PBI
    return p.feature_id === props.alvo?.id || p.id === props.alvo?.id
  }) as PBI[]
})

const problema = computed(() => (alvoObj.value['problema'] as string) || props.alvo?.descricao || '')

const personas = computed(() => {
  const p = alvoObj.value['personas']
  return Array.isArray(p) ? (p as string[]) : []
})

const objetivo = computed(() => (alvoObj.value['objetivo'] as string) || '')

const riscos = computed<(string | RiscoEstruturado)[]>(() => {
  const r = alvoObj.value['riscos']
  if (!Array.isArray(r)) return []
  return r as (string | RiscoEstruturado)[]
})

const criteriosBdd = computed(() => {
  const f = props.alvo as unknown as Record<string, unknown> | null
  if (!f || !Array.isArray(f['criterios_bdd'])) return []
  return f['criterios_bdd'] as { id?: string; given: string; when: string; then: string; prioridade?: string }[]
})

const fluxoFeliz = computed(() => {
  const f = props.alvo as unknown as Record<string, unknown> | null
  return typeof f?.['fluxo_feliz'] === 'string' ? (f['fluxo_feliz'] as string) : ''
})

const adrId = computed(() => {
  const f = props.alvo as unknown as Record<string, unknown> | null
  return typeof f?.['adr_id'] === 'string' ? (f['adr_id'] as string) : ''
})

// Dimensões G3
const openapi = computed(() => alvoObj.value['openapi'] as Record<string, string> | undefined)
const contratoDispensa = computed(() => (alvoObj.value['contrato_dispensa'] as string) || '')
const persistencia = computed(() => alvoObj.value['persistencia'] as Record<string, string> | undefined)
const nfrs = computed(() => (Array.isArray(alvoObj.value['nfrs']) ? (alvoObj.value['nfrs'] as NfrSpec[]) : []))
const seguranca = computed(() => alvoObj.value['seguranca'] as { threat?: string; matriz?: string } | undefined)
const excecaoSeg = computed(() => alvoObj.value['excecao_seg'] as ExcecaoSeguranca | undefined)
const dadoPessoal = computed(() => alvoObj.value['dado_pessoal'] as Record<string, string> | undefined)
const integracoesDetalhadas = computed<IntegracaoSpec[]>(() => {
  const raw = alvoObj.value['integracoes']
  if (!Array.isArray(raw)) return []
  return raw.map((item) => (typeof item === 'string' ? { nome: item } : (item as IntegracaoSpec)))
})

// Dimensões G5 (Pipeline 5 passos dinâmico)
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
    <!-- Header do Painel Output -->
    <div class="flex items-center justify-between border-b border-nexo-border/60 pb-3">
      <div class="flex items-center gap-2">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-nexo-primary/10 text-nexo-primary font-bold text-xs">
          <LucideIcon name="file-text" :size="14" />
        </span>
        <div>
          <h3 class="text-sm font-bold text-nexo-text">Output Formal · Gate {{ props.gateId }}</h3>
          <p class="text-[11px] text-nexo-muted">
            Artefatos consolidados e derivados do grafo do projeto
          </p>
        </div>
      </div>

      <!-- Ações do Output e Baseline -->
      <div class="flex items-center gap-3">
        <button
          v-if="props.alvo"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-btn border border-nexo-border bg-white px-2.5 py-1 text-xs font-semibold text-nexo-text hover:bg-slate-50 transition-colors shadow-xs"
          :title="`Exportar markdown do Gate ${props.gateId}`"
          @click="baixarGateMarkdown()"
        >
          <LucideIcon name="download" :size="13" />
          <span>Exportar .md</span>
        </button>

        <!-- Badge de Baseline registrada -->
        <div v-if="props.gateInfo?.baselineVersao" class="text-right">
          <span class="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
            <LucideIcon name="shield-check" :size="12" /> Baseline v{{ props.gateInfo.baselineVersao }}
          </span>
          <p class="text-[10px] text-nexo-muted mt-0.5">
            Aprovado por {{ props.gateInfo.aprovadoPor }}
            <span v-if="props.gateInfo.aprovadoEm"> em {{ new Date(props.gateInfo.aprovadoEm).toLocaleDateString() }}</span>
          </p>
        </div>
        <div v-else>
          <span class="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            <LucideIcon name="clock" :size="12" /> Baseline Pendente
          </span>
        </div>
      </div>
    </div>

    <!-- EmptyState se nenhum alvo estiver carregado -->
    <div v-if="!props.alvo" class="rounded border border-dashed border-nexo-border p-6 text-center text-xs text-nexo-muted">
      <LucideIcon name="inbox" :size="24" class="mx-auto mb-2 text-nexo-muted" />
      <p class="font-medium text-nexo-text">Nenhum artefato gerado ainda</p>
      <p class="mt-1">Selecione um objeto do gate acima para visualizar os artefatos formais.</p>
    </div>

    <!-- Conteúdo Específico por Gate -->
    <div v-else class="space-y-3 text-xs">
      <!-- 1. G0: ONE-PAGER DE ENQUADRAMENTO -->
      <div v-if="props.gateId === 'G0'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">One-Pager de Enquadramento</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div>
              <span class="font-semibold text-nexo-text">Contexto & Dor Observável:</span>
              <p class="text-nexo-muted mt-0.5">{{ problema || 'Sem descrição cadastrada.' }}</p>
            </div>
            <div>
              <span class="font-semibold text-nexo-text">Público Afetado / Personas:</span>
              <p class="text-nexo-muted mt-0.5">
                {{ personas.length > 0 ? personas.join(', ') : 'Nenhuma persona definida.' }}
              </p>
            </div>
            <div>
              <span class="font-semibold text-nexo-text">Hipótese & Métrica Inicial:</span>
              <p class="text-nexo-muted mt-0.5">{{ objetivo || 'Sem hipótese refutável cadastrada.' }}</p>
            </div>
            <div>
              <span class="font-semibold text-nexo-text">Sponsor / Owner:</span>
              <p class="text-nexo-muted mt-0.5">{{ props.alvo.owner || 'Não atribuído' }}</p>
            </div>
          </div>

          <div class="border-t border-nexo-border/60 pt-2 text-[11px]">
            <span class="font-semibold text-nexo-text">Riscos Iniciais & Fronteiras:</span>
            <div v-if="riscos.length > 0" class="mt-1 flex flex-wrap gap-1.5">
              <span
                v-for="(r, idx) in riscos"
                :key="idx"
                class="rounded bg-red-100 text-red-800 px-2 py-0.5 text-[10px]"
              >
                <template v-if="typeof r === 'string'">{{ r }}</template>
                <template v-else>
                  <strong>{{ r.mitigacao || 'Risco' }}:</strong> Impacto {{ r.impacto || 'médio' }} · Prob. {{ r.probabilidade || 'média' }} ({{ r.owner || 'sem owner' }})
                </template>
              </span>
            </div>
            <p v-else class="text-nexo-muted mt-0.5 italic">
              Sem riscos críticos declarados no momento — preencha no Canvas para formalizar.
            </p>
          </div>
        </div>

        <div>
          <p class="font-semibold text-nexo-text text-xs mb-1.5">Features Vinculadas (Descoberta):</p>
          <ul v-if="featuresDoEpico.length > 0" class="space-y-1">
            <li v-for="f in featuresDoEpico" :key="f.id" class="flex items-center justify-between rounded border border-nexo-border/60 bg-white p-2">
              <span class="font-medium text-nexo-text">{{ f.titulo }}</span>
              <span class="text-[10px] text-nexo-muted">{{ f.status }} v{{ f.versao }}</span>
            </li>
          </ul>
          <p v-else class="text-nexo-muted italic text-[11px]">
            Nenhuma feature vinculada no momento.
          </p>
        </div>
      </div>

      <!-- 2. G1: PRD / PERSONAS / MÉTRICAS -->
      <div v-else-if="props.gateId === 'G1'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">PRD · Especificação de Épico</p>
          <div class="text-[11px] space-y-1.5">
            <div>
              <span class="font-semibold text-nexo-text">Outcome de Negócio:</span>
              <p class="text-nexo-muted">{{ objetivo || 'Não definido' }}</p>
            </div>
            <div>
              <span class="font-semibold text-nexo-text">Personas Atendidas:</span>
              <p class="text-nexo-muted">{{ personas.length > 0 ? personas.join(', ') : 'Sem personas' }}</p>
            </div>
          </div>

          <!-- Tabela de KPIs -->
          <div class="border-t border-nexo-border/60 pt-2">
            <span class="font-semibold text-nexo-text text-[11px]">Métricas de Sucesso (KPIs):</span>
            <div v-if="Array.isArray(epico?.kpis) && epico.kpis.length > 0" class="mt-1 space-y-1">
              <div v-for="k in epico.kpis" :key="k.nome" class="flex items-center justify-between rounded bg-white p-1.5 border border-nexo-border/60 text-[11px]">
                <span class="font-semibold text-nexo-text">{{ k.nome }}</span>
                <span class="text-nexo-primary font-bold">Meta: {{ k.alvo }} {{ k.unidade }} (em {{ k.janela }})</span>
                <span class="text-[10px] text-nexo-muted">Resp: {{ k.responsavel }}</span>
              </div>
            </div>
            <p v-else class="text-nexo-muted italic text-[11px] mt-0.5">Sem KPIs registrados.</p>
          </div>

          <!-- Escopo In / Out -->
          <div class="grid grid-cols-2 gap-2 border-t border-nexo-border/60 pt-2 text-[11px]">
            <div class="rounded bg-green-50/60 p-2 border border-green-200">
              <span class="font-bold text-green-900 block mb-1">Dentro do Escopo (In):</span>
              <ul v-if="Array.isArray(epico?.escopo_in) && epico.escopo_in.length > 0" class="list-disc list-inside space-y-0.5 text-green-950">
                <li v-for="item in epico.escopo_in" :key="item">{{ item }}</li>
              </ul>
              <span v-else class="text-green-800 italic">Nenhum item delimitado.</span>
            </div>
            <div class="rounded bg-red-50/60 p-2 border border-red-200">
              <span class="font-bold text-red-900 block mb-1">Fora do Escopo (Out):</span>
              <ul v-if="Array.isArray(epico?.escopo_out) && epico.escopo_out.length > 0" class="list-disc list-inside space-y-0.5 text-red-950">
                <li v-for="item in epico.escopo_out" :key="item">{{ item }}</li>
              </ul>
              <span v-else class="text-red-800 italic">Nenhum item excluído.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. G2: STORY MAP / BDD -->
      <div v-else-if="props.gateId === 'G2'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">Story Map & Cenários BDD</p>

          <div class="text-[11px] space-y-1">
            <span class="font-semibold text-nexo-text">Fluxo Feliz:</span>
            <p class="text-nexo-muted bg-white p-2 rounded border border-nexo-border/60">
              {{ fluxoFeliz || 'Sem fluxo feliz documentado.' }}
            </p>
          </div>

          <div class="border-t border-nexo-border/60 pt-2">
            <span class="font-semibold text-nexo-text text-[11px] block mb-1.5">Cenários Given / When / Then (BDD):</span>
            <div v-if="criteriosBdd.length > 0" class="space-y-1.5">
              <div
                v-for="(c, i) in criteriosBdd"
                :key="i"
                class="rounded bg-white p-2 border border-nexo-border/80 text-[11px] space-y-0.5"
              >
                <div class="flex items-center justify-between text-[10px] text-nexo-muted">
                  <span class="font-bold text-nexo-primary">{{ c.id || `AC-00${i+1}` }}</span>
                  <span class="uppercase tracking-wide">{{ c.prioridade || 'must' }}</span>
                </div>
                <p><strong class="text-nexo-text">Given:</strong> <span class="text-nexo-muted">{{ c.given }}</span></p>
                <p><strong class="text-nexo-text">When:</strong> <span class="text-nexo-muted">{{ c.when }}</span></p>
                <p><strong class="text-nexo-text">Then:</strong> <span class="text-nexo-muted">{{ c.then }}</span></p>
              </div>
            </div>
            <div v-else class="rounded bg-white p-3 text-center border border-dashed border-nexo-border text-[11px] text-nexo-muted">
              Sem critérios BDD cadastrados ainda. Crie via IA na aba 'Chat Interativo' ou na aba 'Texto' do Canvas.
            </div>
          </div>
        </div>

        <!-- Bloco Pronto-pra-Studio (V3) -->
        <div
          class="rounded-card border p-3 text-xs space-y-2 shadow-xs transition-colors"
          :class="prontaParaStudio ? 'border-green-300 bg-green-50/60' : 'border-amber-300 bg-amber-50/50'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <LucideIcon :name="prontaParaStudio ? 'check-circle-2' : 'clock'" :size="15" :class="prontaParaStudio ? 'text-green-700' : 'text-amber-700'" />
              <span class="font-bold uppercase tracking-wide text-[11px]" :class="prontaParaStudio ? 'text-green-900' : 'text-amber-900'">
                {{ prontaParaStudio ? 'Pronto para Studio' : 'Pendente de Baseline G2 para Studio' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="vinculosTela.length > 0"
                type="button"
                class="inline-flex items-center gap-1 rounded-btn border border-green-600 bg-white px-2.5 py-1 text-[11px] font-semibold text-green-800 shadow-xs hover:bg-green-50 transition-colors"
                @click="emit('preview', vinculosTela[0].telaId)"
              >
                <LucideIcon name="eye" :size="12" />
                Preview
              </button>
              <RouterLink
                v-if="props.alvo"
                :to="{ path: '/studio-full', query: { feature: props.alvo.id, from: 'gates/G2' } }"
                class="inline-flex items-center gap-1 rounded-btn px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs transition-colors"
                :class="prontaParaStudio ? 'bg-green-700 hover:bg-green-800' : 'bg-amber-600 hover:bg-amber-700'"
              >
                <LucideIcon :name="vinculosTela.length > 0 ? 'layout' : 'auto_awesome'" :size="12" />
                {{ vinculosTela.length > 0 ? `Ver telas (${vinculosTela.length})` : 'Gerar telas' }}
              </RouterLink>
            </div>
          </div>

          <p class="text-[11px] leading-relaxed" :class="prontaParaStudio ? 'text-green-900' : 'text-amber-900'">
            {{ prontaParaStudio
              ? 'Esta feature atingiu baseline formal aprovada no Gate G2. Seus fluxos, exceções e critérios BDD estão prontos para compor o canvas do Studio.'
              : 'Para qualificar esta feature para o Studio com baseline garantida, complete todos os requisitos bloqueantes e obtenha aprovação formal no Gate G2.'
            }}
          </p>

          <div v-if="entradaStudio" class="rounded bg-white p-2.5 border border-nexo-border/70 text-[11px] space-y-1.5">
            <div class="flex items-center justify-between font-semibold text-nexo-text">
              <span>Telas & Estados Prontos para Studio ({{ entradaStudio.telas.length }}):</span>
              <span class="text-[10px] text-nexo-muted font-normal">{{ entradaStudio.navegacao.length }} transições BDD mapeadas</span>
            </div>
            <ul class="space-y-1 pl-1">
              <li v-for="t in entradaStudio.telas" :key="t.id" class="flex items-center justify-between gap-1.5 text-[10px] text-nexo-text">
                <div class="flex items-start gap-1.5 min-w-0">
                  <span class="rounded bg-nexo-primary/10 text-nexo-primary px-1 font-mono text-[9px] font-bold shrink-0">
                    {{ t.origem === 'fluxo_feliz' ? 'passo' : 'exceção' }}
                  </span>
                  <span class="font-medium shrink-0">{{ t.nome }}:</span>
                  <span class="text-nexo-muted truncate">{{ t.descricao }}</span>
                </div>
                <button
                  type="button"
                  class="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-nexo-primary hover:underline px-1 py-0.5"
                  @click="emit('preview', t.id)"
                >
                  <LucideIcon name="eye" :size="11" />
                  preview
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 4. G3: ARTEFATO ARQUITETURAL COMPLETO (OpenAPI, Persistência, Integrações, NFRs, Threat Model, ADRs) -->
      <div v-else-if="props.gateId === 'G3'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3.5 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">Artefato Arquitetural e Contratos (Gate G3)</p>
            <span v-if="avaliacao?.bloqueantesOk" class="inline-flex items-center gap-1 rounded bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold">
              <LucideIcon name="check" :size="10" /> Todos os Critérios G3 Aprovados
            </span>
          </div>

          <!-- 1. OpenAPI & Contratos de Interface -->
          <div class="rounded bg-white p-3 border border-nexo-border/80 text-[11px] space-y-1.5">
            <div class="flex items-center justify-between">
              <strong class="text-nexo-text flex items-center gap-1.5">
                <LucideIcon name="file-code" :size="13" class="text-nexo-primary" />
                Contratos de Interface & OpenAPI (ARC-001, ARC-003)
              </strong>
              <span v-if="contratoDispensa" class="rounded bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 font-semibold">
                Dispensa: {{ contratoDispensa }}
              </span>
            </div>
            <div v-if="openapi" class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[10px]">
              <div class="rounded bg-nexo-canvas/40 p-1.5 border border-nexo-border/40">
                <span class="font-semibold text-nexo-text">Respostas HTTP:</span>
                <p class="text-nexo-muted font-mono mt-0.5">2xx: {{ openapi['v2xx'] || 'Não informado' }} · 4xx: {{ openapi['v4xx'] || 'Não informado' }} · 5xx: {{ openapi['v5xx'] || 'Não informado' }}</p>
              </div>
              <div class="rounded bg-nexo-canvas/40 p-1.5 border border-nexo-border/40">
                <span class="font-semibold text-nexo-text">Autenticação & Escopo:</span>
                <p class="text-nexo-muted mt-0.5">{{ openapi['auth'] || 'Não informado' }}</p>
              </div>
              <div class="rounded bg-nexo-canvas/40 p-1.5 border border-nexo-border/40">
                <span class="font-semibold text-nexo-text">Compatibilidade & Versão:</span>
                <p class="text-nexo-muted mt-0.5">{{ openapi['compat'] || 'Não informado' }}</p>
              </div>
              <div class="rounded bg-nexo-canvas/40 p-1.5 border border-nexo-border/40">
                <span class="font-semibold text-nexo-text">Consumidores Homologados:</span>
                <p class="text-nexo-muted mt-0.5">{{ openapi['consumidor'] || 'Não informado' }}</p>
              </div>
            </div>
            <p v-else-if="!contratoDispensa" class="text-nexo-muted italic text-[10px] pt-1">
              Contrato OpenAPI não detalhado. Especificar códigos 2xx/4xx/5xx, auth e consumidores no nó.
            </p>
          </div>

          <!-- 2. Modelagem de Persistência & Migrations -->
          <div class="rounded bg-white p-3 border border-nexo-border/80 text-[11px] space-y-1.5">
            <strong class="text-nexo-text flex items-center gap-1.5">
              <LucideIcon name="database" :size="13" class="text-nexo-primary" />
              Modelagem de Persistência & Migrations (ARC-004)
            </strong>
            <div v-if="persistencia" class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
              <div><strong class="text-nexo-text">Entidade:</strong> <span class="text-nexo-muted">{{ persistencia['entidade'] || 'Não informada' }}</span></div>
              <div><strong class="text-nexo-text">Migration:</strong> <span class="text-nexo-muted font-mono">{{ persistencia['migration'] || 'Não informada' }}</span></div>
              <div><strong class="text-nexo-text">Índices:</strong> <span class="text-nexo-muted">{{ persistencia['indice'] || 'Não informado' }}</span></div>
              <div><strong class="text-nexo-text">Plano de Dados:</strong> <span class="text-nexo-muted">{{ persistencia['plano_dados'] || 'Não informado' }}</span></div>
            </div>
            <p v-else class="text-nexo-muted italic text-[10px]">
              Persistência não detalhada ou operação sem estado persistido declarada.
            </p>
          </div>

          <!-- 3. Integrações Estruturadas & Matriz de Resiliência/Falhas -->
          <div class="rounded bg-white p-3 border border-nexo-border/80 text-[11px] space-y-1.5">
            <strong class="text-nexo-text flex items-center gap-1.5">
              <LucideIcon name="network" :size="13" class="text-nexo-primary" />
              Integrações Estruturadas & Matriz de Falhas (ARC-005)
            </strong>
            <div v-if="integracoesDetalhadas.length > 0" class="space-y-1.5">
              <div
                v-for="(item, idx) in integracoesDetalhadas"
                :key="idx"
                class="rounded bg-nexo-canvas/40 p-2 border border-nexo-border/50 text-[10px] space-y-1"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-nexo-text">{{ item.nome }}</span>
                  <span class="text-nexo-muted">Owner: {{ item.owner_externo || 'Não informado' }}</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-1 text-nexo-muted">
                  <span>Timeout: <strong class="text-nexo-text">{{ item.timeout_ms ? `${item.timeout_ms}ms` : 'Não informado' }}</strong></span>
                  <span>Retry: <strong class="text-nexo-text">{{ item.retry !== false && item.retry != null ? 'Sim' : (item.retry === false ? 'Não' : 'Não informado') }}</strong></span>
                  <span>Idempotência: <strong class="text-nexo-text">{{ item.idempotente !== false && item.idempotente != null ? 'Sim' : (item.idempotente === false ? 'Não' : 'Não informado') }}</strong></span>
                  <span>SLA Indisponível: <strong class="text-nexo-text">{{ item.indisponibilidade || 'Não informado' }}</strong></span>
                </div>
              </div>
            </div>
            <p v-else class="text-nexo-muted italic text-[10px]">
              Nenhuma integração estruturada cadastrada para este nó técnico.
            </p>
          </div>

          <!-- 4. Requisitos Não-Funcionais (NFRs) -->
          <div class="rounded bg-white p-3 border border-nexo-border/80 text-[11px] space-y-1.5">
            <strong class="text-nexo-text flex items-center gap-1.5">
              <LucideIcon name="gauge" :size="13" class="text-nexo-primary" />
              Requisitos Não-Funcionais Mensuráveis (ARC-007)
            </strong>
            <div v-if="nfrs.length > 0" class="space-y-1">
              <div v-for="(nfr, idx) in nfrs" :key="idx" class="flex items-center justify-between rounded bg-nexo-canvas/40 px-2 py-1 text-[10px]">
                <span class="font-medium text-nexo-text">{{ nfr.medida }}</span>
                <span class="text-nexo-primary font-bold">Meta: {{ nfr.alvo }}</span>
                <span class="text-nexo-muted">Telemetria: {{ nfr.observabilidade }}</span>
              </div>
            </div>
            <p v-else class="text-nexo-muted italic text-[10px]">
              Nenhum NFR específico cadastrado (ex: latência p95 &lt; 200ms, disponibilidade 99.9%).
            </p>
          </div>

          <!-- 5. Threat Model, Segurança e Governança LGPD -->
          <div class="rounded bg-white p-3 border border-nexo-border/80 text-[11px] space-y-1.5">
            <strong class="text-nexo-text flex items-center gap-1.5">
              <LucideIcon name="shield-alert" :size="13" class="text-nexo-primary" />
              Threat Model, Segurança & Dados Pessoais (ARC-006, ARC-008)
            </strong>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
              <div class="rounded bg-nexo-canvas/40 p-2 border border-nexo-border/40">
                <span class="font-semibold text-nexo-text">Threat Model & Riscos:</span>
                <p class="text-nexo-muted mt-0.5">
                  {{ seguranca?.threat || 'Não informado' }}
                </p>
                <span v-if="excecaoSeg" class="mt-1 inline-block text-[9px] text-amber-800 font-semibold">
                  Exceção Segurança vigente até {{ excecaoSeg.prazo }} (aprovado por {{ excecaoSeg.owner }})
                </span>
              </div>
              <div class="rounded bg-nexo-canvas/40 p-2 border border-nexo-border/40">
                <span class="font-semibold text-nexo-text">Classificação LGPD / Dado Pessoal:</span>
                <p class="text-nexo-muted mt-0.5">
                  {{ dadoPessoal?.classificacao ? `${dadoPessoal.classificacao} · Retenção: ${dadoPessoal.retencao || 'Não informada'}` : 'Não informado' }}
                </p>
              </div>
            </div>
          </div>

          <!-- 6. ADRs Vinculadas -->
          <div class="rounded bg-white p-2.5 border border-nexo-border/80 text-[11px] flex items-center justify-between">
            <span class="font-semibold text-nexo-text flex items-center gap-1.5">
              <LucideIcon name="file-text" :size="13" class="text-nexo-primary" />
              Decisão Arquitetural Vinculada (ARC-002):
            </span>
            <span v-if="adrId" class="rounded bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-bold">
              ADR: {{ adrId }}
            </span>
            <span v-else class="text-nexo-muted italic text-[10px]">
              Sem ADR vinculada a este nó
            </span>
          </div>
        </div>
      </div>

      <!-- 5. G4: PBIs / DoR / RELEASE -->
      <div v-else-if="props.gateId === 'G4'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">Backlog de PBIs (Definition of Ready)</p>

          <div v-if="pbisDaFeature.length > 0" class="space-y-1.5">
            <div
              v-for="p in pbisDaFeature"
              :key="p.id"
              class="rounded bg-white p-2.5 border border-nexo-border/80 text-[11px] space-y-1"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-nexo-text">{{ p.titulo }}</span>
                <span class="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] text-nexo-muted">{{ p.status }}</span>
              </div>
              <p class="text-nexo-muted">{{ p.descricao }}</p>
              <p class="text-[10px] text-nexo-primary font-medium">Estratégia de Teste: {{ p.estrategia_teste || 'Componente e integração' }}</p>
            </div>
          </div>
          <div v-else class="rounded bg-white p-3 text-center border border-dashed border-nexo-border text-[11px] text-nexo-muted">
            Sem PBIs vinculados a esta feature no momento.
          </div>
        </div>
      </div>

      <!-- 6. G5: PIPELINE DINÂMICO DE ENTREGA & EVIDÊNCIAS DoD -->
      <div v-else-if="props.gateId === 'G5'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3.5 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">Pipeline de Entrega & Evidências DoD (Gate G5)</p>
            <div class="flex items-center gap-2">
              <span
                class="font-bold uppercase text-[10px] px-2 py-0.5 rounded"
                :class="props.alvo.status === 'validated' || props.alvo.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
              >
                Status: {{ props.alvo.status }}
              </span>
              <span class="text-[10px] font-bold rounded bg-white px-2 py-0.5 border border-nexo-border text-nexo-text">
                {{ pipelinePassos.filter((p) => p.ok).length }}/5 Concluídos
              </span>
            </div>
          </div>

          <!-- Stepper Dinâmico dos 5 Passos -->
          <div class="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <div
              v-for="step in pipelinePassos"
              :key="step.numero"
              class="rounded p-2 border text-[11px] space-y-1 transition-colors"
              :class="step.ok ? 'bg-green-50/70 border-green-200 text-green-950' : 'bg-white border-nexo-border text-nexo-text'"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-[10px]">Passo {{ step.numero }}</span>
                <LucideIcon :name="step.ok ? 'check-circle-2' : 'alert-circle'" :size="13" :class="step.ok ? 'text-green-600' : 'text-amber-500'" />
              </div>
              <p class="font-medium text-[10px] leading-tight">{{ step.titulo }}</p>
              <p class="text-[9px] text-nexo-muted truncate" :title="step.detalhe">{{ step.detalhe }}</p>
            </div>
          </div>

          <!-- Detalhamento Real das Evidências Técnicas -->
          <div class="space-y-2 pt-1 text-[11px]">
            <!-- Pull Request -->
            <div class="rounded bg-white p-2.5 border border-nexo-border/80 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <LucideIcon name="git-pull-request" :size="14" class="text-nexo-primary" />
                <span class="font-semibold text-nexo-text">Pull Request (DON-002):</span>
                <span v-if="evidencia.pr_url" class="font-mono text-[10px] text-nexo-primary underline truncate max-w-xs">{{ evidencia.pr_url }}</span>
                <span v-else class="text-nexo-muted italic text-[10px]">Nenhum PR associado à evidência</span>
              </div>
              <span
                class="rounded text-[10px] font-bold px-1.5 py-0.2 uppercase"
                :class="evidencia.pr_url ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-nexo-muted'"
              >
                {{ evidencia.pr_url ? 'Merged & Revisado' : 'Pendente' }}
              </span>
            </div>

            <!-- Checks de CI e SAST -->
            <div class="rounded bg-white p-2.5 border border-nexo-border/80 space-y-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <LucideIcon name="check-circle" :size="14" class="text-nexo-primary" />
                  <span class="font-semibold text-nexo-text">Pipeline CI & SAST (DON-003):</span>
                </div>
                <span class="text-[10px] text-nexo-muted">
                  SAST: <strong :class="evidencia.sast_ok !== false ? 'text-green-700' : 'text-red-700'">{{ evidencia.sast_ok !== false ? 'Aprovado' : 'Pendente' }}</strong>
                </span>
              </div>
              <div v-if="Array.isArray(evidencia.checks_ci) && evidencia.checks_ci.length > 0" class="flex flex-wrap gap-1 pt-0.5">
                <span
                  v-for="(chk, idx) in evidencia.checks_ci"
                  :key="idx"
                  class="rounded bg-nexo-canvas px-1.5 py-0.5 text-[9px] font-mono text-nexo-text border border-nexo-border/60"
                >
                  ✓ {{ chk }}
                </span>
              </div>
              <p v-else class="text-nexo-muted italic text-[10px]">
                Nenhum check de CI cadastrado na evidência.
              </p>
            </div>

            <!-- Testes e Aceite -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div class="rounded bg-white p-2.5 border border-nexo-border/80 flex items-center justify-between">
                <div>
                  <span class="font-semibold text-nexo-text block">Testes Automatizados (DON-004):</span>
                  <span class="text-[10px] text-nexo-muted">{{ evidencia.testes_verdes ? '100% da suite passando' : 'Testes pendentes de execução' }}</span>
                </div>
                <span class="rounded px-1.5 py-0.2 text-[10px] font-bold" :class="evidencia.testes_verdes ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'">
                  {{ evidencia.testes_verdes ? 'Verde' : 'Incompleto' }}
                </span>
              </div>
              <div class="rounded bg-white p-2.5 border border-nexo-border/80 flex items-center justify-between">
                <div>
                  <span class="font-semibold text-nexo-text block">Aceite Homologado (DON-004):</span>
                  <span class="text-[10px] text-nexo-muted">{{ evidencia.aceite_registrado ? 'Critérios validados por QA/PO' : 'Aguardando homologação formal' }}</span>
                </div>
                <span class="rounded px-1.5 py-0.2 text-[10px] font-bold" :class="evidencia.aceite_registrado ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'">
                  {{ evidencia.aceite_registrado ? 'Aprovado' : 'Pendente' }}
                </span>
              </div>
            </div>

            <!-- Observabilidade & Rastreabilidade -->
            <div class="rounded bg-white p-2.5 border border-nexo-border/80 space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-nexo-text">Telemetria & Rastreabilidade (DON-006):</span>
                <span class="text-[10px] text-nexo-muted">
                  {{ (evidencia.observabilidade?.length ?? 0) }} métricas · {{ (evidencia.rastreabilidade?.length ?? 0) }} rastreabilidades
                </span>
              </div>
              <div class="flex flex-wrap gap-1 text-[9px]">
                <span v-for="(obs, idx) in (evidencia.observabilidade || [])" :key="`o-${idx}`" class="rounded bg-blue-50 text-blue-900 px-1.5 py-0.5 border border-blue-200">
                  telemetria: {{ obs }}
                </span>
                <span v-for="(rst, idx) in (evidencia.rastreabilidade || [])" :key="`r-${idx}`" class="rounded bg-slate-100 text-slate-800 px-1.5 py-0.5 border border-slate-200">
                  grafo: {{ rst }}
                </span>
                <span v-if="(!evidencia.observabilidade || evidencia.observabilidade.length === 0) && (!evidencia.rastreabilidade || evidencia.rastreabilidade.length === 0)" class="text-nexo-muted italic text-[10px]">
                  Sem dashboards ou cadeia de rastreabilidade cadastrados no pacote.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
