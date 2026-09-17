<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { avaliarGate } from '@/utils/gates'
import LucideIcon from '@/components/common/LucideIcon.vue'

const graph = useGraph()
const users = useUsers()

const alvoId = ref('')
const alvo = computed(() => (alvoId.value ? graph.noPorId(alvoId.value) : undefined))
const checks = computed(() => {
  if (!alvo.value) return []
  const ws = graph.waivers.filter((w) => w.alvoId === alvo.value!.id).map((w) => ({ codigo: w.codigo, prazo: w.prazo }))
  return avaliarGate(alvo.value, ws).checks
})

const dispJust = ref('')
const dispPrazo = ref('')
const msg = ref('')

function definirAlvo(id: string) {
  alvoId.value = id
}

function dispensar(codigo: string) {
  if (!alvo.value) return
  const r = graph.concederDispensa(alvo.value.id, codigo, dispJust.value, users.currentUser?.nome ?? users.state.currentUserId, dispPrazo.value, users.state.currentUserId)
  msg.value = r.motivo
  if (r.ok) {
    dispJust.value = ''
    dispPrazo.value = ''
  }
}

function dispensado(codigo: string): string | null {
  if (!alvo.value) return null
  const w = graph.dispensaVigente(alvo.value.id, codigo)
  return w ? `dispensado por ${w.owner} até ${w.prazo}` : null
}

defineExpose({ definirAlvo })
</script>

<template>
  <div class="space-y-2 text-xs">
    <p class="font-semibold">Checklist (avisos dispensáveis com justificativa):</p>
    <p v-if="!alvo" class="text-nexo-muted">Selecione um objeto no GateView.</p>
    <ul v-else class="space-y-1">
      <li v-for="c in checks" :key="c.codigo" class="rounded-badge border border-nexo-border p-2">
        <LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" /> {{ c.codigo }} — {{ c.descricao }} [{{ c.severidade }}]
        <span v-if="dispensado(c.codigo)" class="ml-1 text-nexo-stale">· {{ dispensado(c.codigo) }}</span>
        <span v-if="c.severidade === 'aviso' && !c.ok && !dispensado(c.codigo)">
          · <input v-model="dispJust" placeholder="justificativa (20+)" class="rounded-btn border border-nexo-border px-1 py-0.5" aria-label="Justificativa da dispensa" />
          <input v-model="dispPrazo" type="date" class="ml-1 rounded-btn border border-nexo-border px-1 py-0.5" aria-label="Prazo da dispensa" />
          <button type="button" class="ml-1 underline" @click="dispensar(c.codigo)">dispensar</button>
        </span>
      </li>
    </ul>
    <p v-if="msg">{{ msg }}</p>
  </div>
</template>
