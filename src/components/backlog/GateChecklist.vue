<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { avaliarGate } from '@/utils/gates'
import LucideIcon from '@/components/common/LucideIcon.vue'
import { VBadge, VButton, VDatePicker, VTextInput } from 'vueui-nova-kit'

const props = defineProps<{ alvoId: string }>()
const graph = useGraph()
const users = useUsers()

const alvo = computed(() => (props.alvoId ? graph.noPorId(props.alvoId) : undefined))
const checks = computed(() => {
  if (!alvo.value) return []
  const ws = graph.waivers.filter((w) => w.alvoId === alvo.value!.id).map((w) => ({ codigo: w.codigo, prazo: w.prazo }))
  return avaliarGate(alvo.value, ws).checks
})

const dispJust = ref('')
const dispPrazo = ref<Date | null>(null)
const msg = ref('')

function prazoLocalIso(date: Date | null): string {
  if (!date) return ''
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function dispensar(codigo: string) {
  if (!alvo.value) return
  const r = graph.concederDispensa(alvo.value.id, codigo, dispJust.value, users.currentUser?.nome ?? users.state.currentUserId, prazoLocalIso(dispPrazo.value), users.state.currentUserId)
  msg.value = r.motivo
  if (r.ok) {
    dispJust.value = ''
    dispPrazo.value = null
  }
}

function dispensado(codigo: string): string | null {
  if (!alvo.value) return null
  const w = graph.dispensaVigente(alvo.value.id, codigo)
  return w ? `dispensado por ${w.owner} até ${w.prazo}` : null
}

function prazoExpirado(codigo: string): string | null {
  if (!alvo.value) return null
  const check = checks.value.find((item) => item.codigo === codigo)
  return check?.dispensaExpirada ? (check.prazoDispensaExpirada ?? 'data não informada') : null
}

</script>

<template>
  <div class="min-w-0 space-y-3 text-sm">
    <div class="min-w-0">
      <p class="font-semibold text-nexo-text">{{ alvo?.titulo ?? 'Item' }}</p>
      <p class="text-xs text-nexo-text">{{ alvo ? `${alvo.gate} · ${alvo.tipo === 'epico' && alvo.gate === 'G0' ? 'Enquadramento' : alvo.tipo}` : 'Selecione um item para ver seus critérios.' }}</p>
    </div>
    <ul v-if="alvo" class="space-y-2">
      <li v-for="c in checks" :key="c.codigo" class="rounded-btn border border-nexo-border p-3">
        <div class="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 flex-1 text-xs text-nexo-text">
            <p class="font-semibold">{{ c.codigo }} · {{ c.descricao }}</p>
            <p v-if="dispensado(c.codigo)" class="mt-1 text-nexo-text">{{ dispensado(c.codigo) }}</p>
          <p v-else-if="prazoExpirado(c.codigo)" class="mt-1 text-nexo-text" role="status">Dispensa vencida em {{ prazoExpirado(c.codigo) }}. Registre uma nova justificativa e prazo para renová-la.</p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <VBadge :variant="c.severidade === 'bloqueante' ? 'danger' : 'warning'" size="xs">{{ c.severidade === 'bloqueante' ? 'Bloqueante' : 'Aviso' }}</VBadge>
            <VBadge :variant="c.ok ? 'success' : 'outlined'" size="xs"><LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" /> {{ c.ok ? 'Atendido' : 'Pendente' }}</VBadge>
          </div>
        </div>
        <div v-if="c.severidade === 'aviso' && !c.ok && !dispensado(c.codigo)" class="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
          <VTextInput v-model="dispJust" label="Justificativa (mín. 20 caracteres)" :counter="200" placeholder="Explique por que este aviso será dispensado" />
          <VDatePicker v-model="dispPrazo" label="Prazo" size="sm" :min="new Date()" />
          <VButton type="button" variant="outline" size="sm" :disabled="dispJust.trim().length < 20 || !dispPrazo || dispPrazo.getTime() <= Date.now()" @click="dispensar(c.codigo)">Conceder dispensa</VButton>
        </div>
      </li>
    </ul>
    <p v-if="msg" class="rounded-btn border border-nexo-border px-3 py-2 text-xs text-nexo-text" role="status">{{ msg }}</p>
  </div>
</template>
