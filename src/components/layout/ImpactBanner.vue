<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useUI } from '@/stores/useUI'

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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3 2.5 19.5h19L12 3z" />
      <line x1="12" y1="9" x2="12" y2="13.5" />
      <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
    </svg>
    Impacto alto detectado
    <span aria-hidden="true">›</span>
  </button>
</template>
