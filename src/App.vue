<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '@/components/layout/Topbar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import { useUI } from '@/stores/useUI'

const route = useRoute()
const ui = useUI()
const isStudio = computed(() => {
  return (route.meta as Record<string, unknown>).layout === 'studio' ||
    route.path === '/studio-full' ||
    route.path === '/studio'
})
const isCanvasFullbleed = computed(() => route.path === '/canvas' && (route.query.view === 'canvas' || route.query.view === 'studio'))
const viewportIsNarrow = ref(false)
const mobileDrawerOpen = ref(false)
const sidebarOpen = computed(() => viewportIsNarrow.value ? mobileDrawerOpen.value : ui.state.sidebarAberta)
let lastViewportIsNarrow: boolean | null = null
function ajustarSidebarViewport() {
  const estreita = window.matchMedia('(max-width: 720px)').matches
  if (lastViewportIsNarrow === estreita) return
  lastViewportIsNarrow = estreita
  viewportIsNarrow.value = estreita
  mobileDrawerOpen.value = false
  if (!estreita && !ui.state.sidebarAberta) ui.alternarSidebar()
}
function alternarSidebar() {
  if (viewportIsNarrow.value) mobileDrawerOpen.value = !mobileDrawerOpen.value
  else ui.alternarSidebar()
}
function fecharSidebar() {
  if (viewportIsNarrow.value) mobileDrawerOpen.value = false
  else if (ui.state.sidebarAberta) ui.alternarSidebar()
}
onMounted(() => {
  ajustarSidebarViewport()
  window.addEventListener('resize', ajustarSidebarViewport)
})
onUnmounted(() => window.removeEventListener('resize', ajustarSidebarViewport))
watch(() => route.fullPath, () => { if (viewportIsNarrow.value) mobileDrawerOpen.value = false })

watch(
  isStudio,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
  },
  { immediate: true }
)
onUnmounted(() => { document.body.style.overflow = '' })
</script>

<template>
  <transition name="studio" mode="out-in">
    <div v-if="isStudio" key="studio" class="h-screen w-screen overflow-hidden">
      <router-view />
    </div>
    <div v-else key="shell" class="nexo-shell flex h-screen flex-row overflow-hidden">
      <button v-if="sidebarOpen && viewportIsNarrow" class="nexo-sidebar-backdrop" aria-label="Fechar navegação" @click="fecharSidebar()" />
      <Sidebar v-if="sidebarOpen" />
      <div class="nexo-workspace flex min-h-0 min-w-0 flex-1 flex-col" :class="isCanvasFullbleed ? 'nexo-workspace--canvas' : ''">
        <Topbar :canvas-mode="isCanvasFullbleed" :sidebar-open="sidebarOpen" @toggle-sidebar="alternarSidebar" />
        <main class="nexo-main min-h-0 min-w-0 flex-1" :class="isCanvasFullbleed ? 'nexo-main--fullbleed overflow-hidden p-0' : 'overflow-auto p-4'">
          <router-view />
        </main>
      </div>
    </div>
  </transition>
</template>

<style>
.nexo-shell{width:100vw}
.nexo-workspace{min-width:0;min-height:0}
.nexo-main--fullbleed{padding:0!important}
.nexo-sidebar-backdrop{display:none}
@media(max-width:720px){
  .nexo-shell{height:100dvh}
  .nexo-sidebar-backdrop{display:block}
  .nexo-sidebar-backdrop{position:fixed;inset:0;z-index:calc(var(--v-z-index-drawer) - 1);border:0;background:var(--v-color-overlay)}
  .nexo-kit-sidebar{position:fixed!important;z-index:var(--v-z-index-drawer)!important;inset:0 auto 0 0;width:min(290px,86vw)!important;height:100dvh!important;overflow-y:auto;box-shadow:var(--v-shadow-lg)}
  .nexo-main:not(.nexo-main--fullbleed){padding:14px!important}
}
</style>
