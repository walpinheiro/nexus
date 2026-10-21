<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import ImpactBanner from '@/components/layout/ImpactBanner.vue'
import LucideIcon from '@/components/common/LucideIcon.vue'
import { useUI } from '@/stores/useUI'
import { useGraph } from '@/stores/useGraph'
import { VTopBar, VToolbar, VButton, VDialog, VTextInput } from 'vueui-nova-kit'

defineProps<{ canvasMode?: boolean; sidebarOpen?: boolean }>()
const emit = defineEmits<{ (event: 'toggle-sidebar'): void }>()

const ui = useUI()
const graph = useGraph()
const router = useRouter()
const searchInput = ref<HTMLInputElement | null>(null)
const termo = ref('')
const route = router.currentRoute
const breadcrumbLabel = computed(() => {
  if (route.value.path === '/canvas') {
    if (route.value.query.view === 'studio') return 'Canvas · Telas'
    if (route.value.query.view === 'canvas') return 'Canvas · Grafo NEXO'
    return 'Canvas · Contexto'
  }
  return ({ '/': 'Visão do produto', '/backlog': 'Backlog', '/usuarios': 'Usuários' }[route.value.path] ?? (route.value.path.startsWith('/gates/') ? `Gate ${route.value.params.id}` : 'NEXO'))
})

const resultados = computed(() => {
  const t = termo.value.trim().toLowerCase()
  if (!t) return graph.state.nos.slice(0, 8)
  return graph.state.nos
    .filter((n) => n.titulo.toLowerCase().includes(t) || n.id.includes(t) || n.owner.includes(t))
    .slice(0, 12)
})

function onKeydownGlobal(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  const tag = target?.tagName
  const digitando = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    abrirBusca()
    return
  }
  if (e.key === '/' && !digitando && !ui.state.buscaAberta) {
    e.preventDefault()
    abrirBusca()
    return
  }
  if (e.key === 'Escape' && ui.state.buscaAberta) ui.fecharBusca()
}

function navegarPara(id: string) {
  graph.selecionar(id)
  ui.fecharBusca()
  termo.value = ''
  router.push(`/canvas?selecionado=${id}`)
}

onMounted(() => window.addEventListener('keydown', onKeydownGlobal))
onUnmounted(() => window.removeEventListener('keydown', onKeydownGlobal))

function abrirBusca() {
  ui.abrirBusca()
  requestAnimationFrame(() => searchInput.value?.focus())
}
</script>

<template>
  <VTopBar class="nexo-topbar" :class="canvasMode ? 'nexo-topbar--canvas' : ''" variant="app" bordered aria-label="Navegação do NEXO">
    <template #leading>
      <VButton class="nexo-menu-toggle" variant="ghost" size="sm" aria-label="Abrir ou fechar navegação" :aria-expanded="sidebarOpen" aria-controls="nexo-primary-navigation" @click="emit('toggle-sidebar')"><template #icon><LucideIcon name="menu" :size="16" /></template><template #default><span class="sr-only">Abrir navegação</span></template></VButton>
    </template>
    <div v-if="!canvasMode" class="nexo-topbar-context"><span class="nexo-topbar-page">{{ breadcrumbLabel }}</span></div>
    <template #actions>
      <VToolbar v-if="canvasMode" class="nexo-canvas-toolbar" variant="compact" size="sm" aria-label="Ações do Canvas">
        <VButton class="nexo-search-trigger nexo-canvas-toolbar-action" variant="ghost" size="sm" aria-label="Buscar no NEXO (Ctrl+K)" title="Buscar no NEXO (Ctrl+K)" @click="abrirBusca()"><template #icon><LucideIcon name="search" :size="16" /></template><template #default><span class="sr-only">Buscar</span></template></VButton>
        <ImpactBanner compact />
      </VToolbar>
      <template v-else>
        <VButton class="nexo-search-trigger" variant="outline" size="sm" aria-label="Buscar no NEXO (Ctrl+K)" title="Buscar no NEXO (Ctrl+K)" @click="abrirBusca()"><template #icon><LucideIcon name="search" :size="17" /></template><template #default><span class="nexo-search-label">Buscar</span><kbd>⌘K</kbd></template></VButton><ImpactBanner />
      </template>
    </template>
  </VTopBar>

  <VDialog v-model="ui.state.buscaAberta" title="Buscar no NEXO" description="Pesquise objetos do projeto por título, id ou responsável." size="md" variant="form" confirm-text="Fechar busca" @close="ui.fecharBusca()" @confirm="ui.fecharBusca()">
    <div class="w-full max-w-lg">
      <VTextInput
        ref="searchInput"
        v-model="termo"
        placeholder="Buscar por título, id ou owner… (Enter abre o primeiro)"
        aria-label="Buscar no NEXO" type="search" size="md"
        @keydown.escape="ui.fecharBusca()"
        @keydown.enter="resultados[0] && navegarPara(resultados[0].id)"
      />
      <ul class="mt-2 max-h-64 overflow-auto text-sm" role="listbox" aria-label="Resultados">
        <li v-for="n in resultados" :key="n.id">
          <VButton
            type="button"
            variant="ghost"
            role="option"
            :aria-selected="false"
            class="flex w-full items-center justify-between rounded-badge px-2 py-1.5 text-left hover:bg-nexo-canvas"
            @click="navegarPara(n.id)"
          >
            <span>{{ n.titulo }} <span class="text-nexo-muted">· {{ n.tipo }} · {{ n.gate }}</span></span>
            <span class="text-xs text-nexo-muted">{{ n.status }}</span>
          </VButton>
        </li>
        <li v-if="resultados.length === 0" class="p-2 text-nexo-muted">Nenhum resultado.</li>
      </ul>
    </div>
  </VDialog>
</template>

<style>
.nexo-topbar{height:56px;min-height:56px;padding:0 16px}.nexo-topbar .v-top-bar__leading,.nexo-topbar-context{display:flex;align-items:center;gap:12px}.nexo-topbar-context{min-width:0}.nexo-topbar-page{overflow:hidden;color:var(--v-color-text-muted);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.nexo-search-trigger{gap:8px}.nexo-search-trigger kbd{margin-left:16px;border:1px solid var(--v-color-border);border-radius:4px;padding:1px 4px;color:var(--v-color-text-muted);font-size:10px}.nexo-topbar .nexo-menu-toggle{width:32px;min-width:32px;height:32px;min-height:32px;padding:0;justify-content:center}@media(min-width:721px){.nexo-menu-toggle{display:none}}@media(max-width:720px){.nexo-topbar{padding:0 8px}.nexo-topbar-context{flex:1}.nexo-topbar-page{display:none}.nexo-search-trigger .nexo-search-label,.nexo-search-trigger kbd{display:none}.nexo-topbar .nexo-search-trigger{padding:7px}}
.nexo-workspace--canvas{position:relative}
.nexo-topbar--canvas{position:absolute!important;inset:0 0 auto;height:56px;min-height:56px;padding:0;z-index:30;pointer-events:none;border:0!important;background:transparent!important;box-shadow:none!important}
.nexo-topbar--canvas .v-top-bar__leading{position:absolute;top:8px;left:8px;pointer-events:auto}
.nexo-topbar--canvas .v-top-bar__actions{position:absolute;top:8px;right:12px;pointer-events:auto}
.nexo-topbar--canvas .nexo-canvas-toolbar{display:inline-flex;width:max-content;max-width:calc(100vw - 24px);height:36px;min-height:36px;gap:var(--v-toolbar-gap-compact);padding:0 4px;border:1px solid var(--v-toolbar-border);border-radius:var(--v-toolbar-radius);background:var(--v-toolbar-bg);box-shadow:var(--v-toolbar-shadow);pointer-events:auto}
.nexo-canvas-toolbar .nexo-canvas-toolbar-action,.nexo-canvas-toolbar .nexo-impact-trigger--compact{width:32px;min-width:32px;height:32px;min-height:32px;padding:0;justify-content:center}
.nexo-canvas-toolbar-action .v-button__icon,.nexo-canvas-toolbar .nexo-impact-trigger--compact .v-button__icon{width:16px;height:16px;flex:0 0 16px}
@media(min-width:721px){.nexo-topbar--canvas .v-top-bar__leading{display:none}}
</style>
