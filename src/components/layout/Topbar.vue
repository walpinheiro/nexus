<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Breadcrumb from '@/components/layout/Breadcrumb.vue'
import ImpactBanner from '@/components/layout/ImpactBanner.vue'
import LucideIcon from '@/components/common/LucideIcon.vue'
import NexoLogo from '@/components/common/NexoLogo.vue'
import { useUI } from '@/stores/useUI'
import { useGraph } from '@/stores/useGraph'
import { useProjects } from '@/stores/useProjects'
import { useGate } from '@/stores/useGate'

const ui = useUI()
const graph = useGraph()
const projects = useProjects()
const gates = useGate()
const router = useRouter()
const searchInput = ref<HTMLInputElement | null>(null)
const termo = ref('')

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

function trocarProjeto(id: string) {
  projects.selecionar(id, 'u-pm')
  graph.trocarProjeto(id)
  gates.trocarProjeto(id)
  router.push('/backlog')
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
  <header class="flex h-16 items-center gap-4 border-b border-nexo-border bg-nexo-surface px-4">
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-btn p-2 text-nexo-text hover:bg-nexo-canvas"
        aria-label="Abrir menu"
        @click="ui.alternarSidebar()"
      >
        <LucideIcon name="menu" :size="18" />
      </button>
      <RouterLink
        to="/"
        class="flex items-center"
        aria-label="NEXO — início"
      >
        <NexoLogo :size="28" />
      </RouterLink>
    </div>

    <label class="flex items-center gap-1 text-xs text-nexo-muted">Projeto
      <select
        :value="projects.state.atualId"
        aria-label="Projeto atual"
        class="max-w-44 rounded-btn border border-nexo-border bg-white px-2 py-1.5 text-xs text-nexo-text"
        @change="trocarProjeto(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="p in projects.state.projetos" :key="p.id" :value="p.id">{{ p.titulo }}</option>
      </select>
    </label>

    <Breadcrumb />

    <div class="ml-auto flex items-center gap-3">
      <button
        type="button"
        class="flex w-[300px] items-center gap-2 rounded-btn border border-nexo-border bg-white px-3 py-2 text-sm text-nexo-muted hover:border-nexo-primary"
        aria-label="Buscar no NEXO (Ctrl+K)"
        @click="abrirBusca()"
      >
        <LucideIcon name="search" :size="18" />
        <span>Buscar no NEXO</span>
        <kbd class="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-xs text-nexo-muted">⌘K</kbd>
      </button>
      <ImpactBanner />
    </div>
  </header>

  <div
    v-if="ui.state.buscaAberta"
    class="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/30 p-8"
    role="dialog"
    aria-modal="true"
    aria-label="Busca global"
    @click.self="ui.fecharBusca()"
  >
    <div class="w-full max-w-lg rounded-card bg-white p-4 shadow-card">
      <input
        ref="searchInput"
        v-model="termo"
        type="text"
        placeholder="Buscar por título, id ou owner… (Enter abre o primeiro)"
        aria-label="Buscar no NEXO"
        class="w-full rounded-btn border border-nexo-border px-3 py-2 text-sm"
        @keydown.escape="ui.fecharBusca()"
        @keydown.enter="resultados[0] && navegarPara(resultados[0].id)"
      />
      <ul class="mt-2 max-h-64 overflow-auto text-sm" role="listbox" aria-label="Resultados">
        <li v-for="n in resultados" :key="n.id">
          <button
            type="button"
            role="option"
            :aria-selected="false"
            class="flex w-full items-center justify-between rounded-badge px-2 py-1.5 text-left hover:bg-nexo-canvas"
            @click="navegarPara(n.id)"
          >
            <span>{{ n.titulo }} <span class="text-nexo-muted">· {{ n.tipo }} · {{ n.gate }}</span></span>
            <span class="text-xs text-nexo-muted">{{ n.status }}</span>
          </button>
        </li>
        <li v-if="resultados.length === 0" class="p-2 text-nexo-muted">Nenhum resultado.</li>
      </ul>
      <button type="button" class="mt-3 text-sm text-nexo-primary" @click="ui.fecharBusca()">Fechar (Esc)</button>
    </div>
  </div>
</template>
