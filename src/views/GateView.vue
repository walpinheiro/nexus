<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGate } from '@/stores/useGate'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { avaliarGate, gateAnterior, gateDesbloqueado } from '@/utils/gates'
import BlockedReason from '@/components/gates/BlockedReason.vue'
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
  <div class="space-y-3">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold">Gate {{ props.id }}</h1>
      <button type="button" class="ml-auto rounded-btn border border-nexo-border px-3 py-1.5 text-sm" @click="abrirNoCanvas()">Abrir no Canvas</button>
    </div>
    <p v-if="gate" class="text-sm text-nexo-muted">{{ gate.titulo }} · {{ gate.status }}<span v-if="gate.baselineVersao"> · baseline v{{ gate.baselineVersao }} por {{ gate.aprovadoPor }}</span></p>
    <p v-else class="text-sm text-nexo-blocked">Gate desconhecido.</p>
    <BlockedReason
      v-if="bloqueado"
      :gate-id="props.id as GateId"
      :anterior-id="anterior"
      :motivo="motivoBloqueio"
      :anterior-titulo="anterior ? (gates.gates.find((g) => g.id === anterior)?.titulo ?? '') : ''"
    />
    <label class="block text-sm">Objeto do gate
      <select v-model="alvoId" class="ml-2 rounded-btn border border-nexo-border px-2 py-1">
        <option value="">(selecionar)</option>
        <option v-for="n in alvos" :key="n.id" :value="n.id">{{ n.titulo }} ({{ n.status }} v{{ n.versao }})</option>
      </select>
    </label>
    <div v-if="alvoId && graph.noPorId(alvoId)" class="text-xs">
      <p class="font-semibold">Checklist bloqueante (tempo real):</p>
      <ul>
        <li v-for="c in avaliarGate(graph.noPorId(alvoId)!).checks" :key="c.codigo">
          {{ c.ok ? '✔' : '✘' }} {{ c.codigo }} — {{ c.descricao }} [{{ c.severidade }}]
          <span v-if="!c.ok && c.severidade === 'bloqueante'">
            · <button type="button" class="text-nexo-primary underline" @click="corrigirNoObjeto(alvoId)">corrigir no objeto</button>
          </span>
          <span v-else-if="c.severidade === 'aviso' && !c.ok"> · dispensável (ver Backlog)</span>
        </li>
      </ul>
      <p class="mt-1">Aprovador atual: {{ users.currentUser?.nome }} ({{ users.currentUser?.papel }})</p>
    </div>
    <button
      type="button"
      class="rounded-btn bg-nexo-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      :disabled="bloqueado"
      :aria-disabled="bloqueado"
      :title="bloqueado ? motivoBloqueio : 'Aprovar gate'"
      @click="aprovar()"
    >
      Aprovar gate
    </button>
    <p v-if="resultado" class="text-sm" :class="resultado.includes('aprovado') ? 'text-nexo-approved' : 'text-nexo-blocked'">{{ resultado }}</p>
    <div class="text-xs">
      <p class="font-semibold">Tentativas (auditoria de gate):</p>
      <ul>
        <li v-for="(t, i) in gates.tentativas.filter((x) => x.gate === props.id).slice(0, 10)" :key="i">{{ t.em }} — {{ t.atorId }} — {{ t.ok ? 'OK' : 'NEGADA' }} — {{ t.motivo }}</li>
      </ul>
    </div>
  </div>
</template>
