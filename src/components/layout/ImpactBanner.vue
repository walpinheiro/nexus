<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useUI } from '@/stores/useUI'
import LucideIcon from '@/components/common/LucideIcon.vue'

const graph = useGraph()
const ui = useUI()
const router = useRouter()

function ir() {
  graph.selecionar('ft-status')
  ui.setTab('impacto')
  router.push('/canvas?selecionado=ft-status')
}
</script>

<template>
  <button
    type="button"
    class="flex items-center gap-2 rounded-btn border border-nexo-banner-border bg-nexo-stale-bg px-3 py-2 text-[13px] font-semibold text-nexo-stale"
    role="alert"
    aria-label="Impacto alto detectado — ir para Status de pagamento"
    @click="ir()"
  >
    <LucideIcon name="alert-circle" :size="18" />
    Impacto alto detectado
    <span class="inline-flex" aria-hidden="true"><LucideIcon name="chevR" :size="18" /></span>
  </button>
</template>
