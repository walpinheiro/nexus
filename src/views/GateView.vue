<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGate } from '@/stores/useGate'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { avaliarGate, gateAnterior, gateDesbloqueado } from '@/utils/gates'
import BlockedReason from '@/components/gates/BlockedReason.vue'
import GateAiSession from '@/components/gates/GateAiSession.vue'
import LucideIcon from '@/components/common/LucideIcon.vue'
import type { GateId } from '@/types/nexo'

const props = defineProps<{ id: string }>()
const route = useRoute()
const router = useRouter()
const gates = useGate()
const graph = useGraph()
const users = useUsers()
const gate = computed(() => gates.gates.find((g) => g.id === props.id))
const bloqueado = computed(() => !gateDesbloqueado(props.id as GateId, gates.gates))
const anterior = computed(() => gateAnterior(props.id as GateId))
const motivoBloqueio = computed(() =>
  anterior.value ? `Gate ${props.id} bloqueado: aprove ${anterior.value} primeiro (baseline não registrada).` : `Gate ${props.id} bloqueado.`
)
const alvos = computed(() => graph.state.nos.filter((n) => n.gate === props.id))
const alvoId = ref(typeof route.query.alvo === 'string' ? route.query.alvo : '')
const resultado = ref('')
const sessaoAiAberta = ref(true)

const objetoAlvo = computed(() => (alvoId.value ? graph.noPorId(alvoId.value) ?? null : null))
const pendenciasCount = computed(() => {
  if (!objetoAlvo.value) return 0
  const ev = avaliarGate(objetoAlvo.value, graph.waivers)
  return ev.checks.filter((c) => !c.ok).length
})

function aprovar() {
  if (bloqueado.value) {
    resultado.value = motivoBloqueio.value
    return
  }
  if (!alvoId.value) {
    resultado.value = 'Selecione o objeto do gate.'
    return
  }
  const r = gates.aprovarGate(props.id as GateId, alvoId.value)
  resultado.value = r.motivo
}

function abrirNoCanvas() {
  const id = alvoId.value || alvos.value[0]?.id
  if (!id) return
  graph.selecionar(id)
  router.push(`/canvas?view=canvas&selecionado=${id}`)
}

function corrigirNoObjeto(id: string) {
  graph.selecionar(id)
  router.push(`/canvas?view=canvas&selecionado=${id}&tab=texto`)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Topbar do Gate -->
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold">Gate {{ props.id }}</h1>
      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-btn border border-nexo-primary/40 bg-nexo-primary/10 px-3 py-1.5 text-sm font-semibold text-nexo-primary hover:bg-nexo-primary/20 transition-colors"
          @click="sessaoAiAberta = !sessaoAiAberta"
        >
          <LucideIcon name="sparkles" :size="14" />
          {{ sessaoAiAberta ? 'Ocultar IA' : 'Sessão IA' }}
          <span
            v-if="pendenciasCount > 0"
            class="ml-0.5 rounded-full bg-nexo-blocked px-1.5 py-0.2 text-[10px] font-bold text-white"
          >
            {{ pendenciasCount }}
          </span>
        </button>
        <button
          type="button"
          class="rounded-btn border border-nexo-border px-3 py-1.5 text-sm hover:bg-nexo-surface"
          @click="abrirNoCanvas()"
        >
          Abrir no Canvas
        </button>
        <RouterLink
          :to="{ path: '/studio-full', query: { from: `gates/${props.id}` } }"
          class="rounded-btn border border-nexo-border px-3 py-1.5 text-sm hover:bg-nexo-surface"
        >
          Abrir Studio
        </RouterLink>
      </div>
    </div>

    <p v-if="gate" class="text-sm text-nexo-muted">
      {{ gate.titulo }} · {{ gate.status }}<span v-if="gate.baselineVersao"> · baseline v{{ gate.baselineVersao }} por {{ gate.aprovadoPor }}</span>
    </p>
    <p v-else class="text-sm text-nexo-blocked">Gate desconhecido.</p>

    <!-- Split view: Checklist & Aprovação à esquerda + Sessão IA à direita -->
    <div class="flex flex-col lg:flex-row items-start gap-6">
      <div class="flex-1 min-w-0 space-y-4 w-full">
        <BlockedReason
          v-if="bloqueado"
          :gate-id="props.id as GateId"
          :anterior-id="anterior"
          :motivo="motivoBloqueio"
          :anterior-titulo="anterior ? (gates.gates.find((g) => g.id === anterior)?.titulo ?? '') : ''"
        />

        <label class="block text-sm">
          Objeto do gate
          <select v-model="alvoId" class="ml-2 rounded-btn border border-nexo-border px-2 py-1 bg-white">
            <option value="">(selecionar)</option>
            <option v-for="n in alvos" :key="n.id" :value="n.id">
              {{ n.titulo }} ({{ n.status }} v{{ n.versao }})
            </option>
          </select>
        </label>

        <div v-if="alvoId && graph.noPorId(alvoId)" class="rounded-card border border-nexo-border bg-white p-3 text-xs space-y-2">
          <p class="font-semibold text-nexo-text">Checklist bloqueante (tempo real):</p>
          <ul class="space-y-1">
            <li v-for="c in avaliarGate(graph.noPorId(alvoId)!).checks" :key="c.codigo" class="flex items-center gap-1.5">
              <LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" :class="c.ok ? 'text-green-600' : 'text-red-600'" />
              <span>{{ c.codigo }} — {{ c.descricao }} [{{ c.severidade }}]</span>
              <span v-if="!c.ok && c.severidade === 'bloqueante'">
                · <button type="button" class="text-nexo-primary underline" @click="corrigirNoObjeto(alvoId)">corrigir no objeto</button>
              </span>
              <span v-else-if="c.severidade === 'aviso' && !c.ok" class="text-amber-700"> · dispensável (ver Backlog)</span>
            </li>
          </ul>
          <p class="pt-1 border-t border-nexo-border/60 text-nexo-muted">
            Aprovador atual: <strong class="text-nexo-text">{{ users.currentUser?.nome }} ({{ users.currentUser?.papel }})</strong>
          </p>
        </div>

        <div>
          <button
            type="button"
            class="rounded-btn bg-nexo-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-nexo-primary/90 transition-colors"
            :disabled="bloqueado"
            :aria-disabled="bloqueado"
            :title="bloqueado ? motivoBloqueio : 'Aprovar gate'"
            @click="aprovar()"
          >
            Aprovar gate
          </button>
          <p v-if="resultado" class="mt-2 text-sm" :class="resultado.includes('aprovado') ? 'text-nexo-approved font-semibold' : 'text-nexo-blocked'">
            {{ resultado }}
          </p>
        </div>

        <div class="rounded-card border border-nexo-border bg-white p-3 text-xs space-y-1">
          <p class="font-semibold text-nexo-text">Tentativas (auditoria de gate):</p>
          <ul class="space-y-1 text-nexo-muted">
            <li v-for="(t, i) in gates.tentativas.filter((x) => x.gate === props.id).slice(0, 10)" :key="i">
              {{ t.em }} — {{ t.atorId }} —
              <span :class="t.ok ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'">{{ t.ok ? 'OK' : 'NEGADA' }}</span>
              — {{ t.motivo }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Coluna da Sessão IA -->
      <div v-if="sessaoAiAberta" class="w-full lg:w-[440px] shrink-0 sticky top-3">
        <GateAiSession
          :gate-id="props.id as GateId"
          :alvo-id="alvoId"
          :alvo="objetoAlvo"
          :bloqueado="bloqueado"
          :motivo-bloqueio="motivoBloqueio"
          @fechar="sessaoAiAberta = false"
          @corrigir-no-objeto="corrigirNoObjeto"
        />
      </div>
    </div>
  </div>
</template>
