<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useUI } from '@/stores/useUI'
import LucideIcon from '@/components/common/LucideIcon.vue'
import { computed } from 'vue'
import { VButton, VBadge } from 'vueui-nova-kit'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const graph = useGraph()
const ui = useUI()
const router = useRouter()
const alvosStale = computed(() => graph.state.nos.filter((node) => node.status === 'stale'))
const titulo = computed(() => alvosStale.value.length === 1 ? '1 artefato desatualizado' : `${alvosStale.value.length} artefatos desatualizados`)

function ir() {
  const primeiro = alvosStale.value[0]
  if (!primeiro) return
  graph.selecionar(primeiro.id)
  ui.setTab('impacto')
  router.push(`/canvas?selecionado=${encodeURIComponent(primeiro.id)}`)
}
</script>

<template>
  <VButton v-if="alvosStale.length" type="button" class="nexo-impact-trigger" :class="{ 'nexo-impact-trigger--compact': compact }" variant="outline" size="sm" role="alert" :aria-label="`${titulo} — revisar impacto e abrir grafo`" :title="`${titulo} — revisar impacto`" @click="ir()">
    <template #icon><LucideIcon name="alert-circle" :size="compact ? 16 : 17" /></template>
    <template #default><span class="nexo-impact-label" :class="{ 'nexo-impact-label--sr-only': compact }">{{ titulo }}</span><VBadge v-if="!compact" variant="warning" size="xs">Revisar</VBadge></template>
  </VButton>
</template>

<style scoped>
.nexo-impact-trigger{display:flex;align-items:center;gap:8px;border-color:var(--v-color-warning-base);color:var(--v-color-warning-strong);background:var(--v-color-warning-soft)}.nexo-impact-label--sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.nexo-impact-trigger--compact{width:32px;min-width:32px;height:32px;min-height:32px;justify-content:center;padding:0;border-color:transparent;background:transparent;box-shadow:none}
@media(max-width:760px){.nexo-impact-trigger:not(.nexo-impact-trigger--compact) .nexo-impact-label{display:none}.nexo-impact-trigger:not(.nexo-impact-trigger--compact){min-width:38px;padding:8px}}
</style>
