<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useGate } from '@/stores/useGate'
import { gateDesbloqueado, ORDEM_GATES } from '@/utils/gates'
import { useGraph } from '@/stores/useGraph'
import { useProjects } from '@/stores/useProjects'
import { useUsers } from '@/stores/useUsers'
import { VSidebar, VSelect } from 'vueui-nova-kit'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const $route = useRoute()
const gates = useGate()
const graph = useGraph()
const projects = useProjects()
const users = useUsers()
const router = useRouter()
const projectOptions = computed(() => projects.state.projetos.map((project) => ({ value: project.id, label: project.titulo })))
const featureParaStudio = computed(() => {
  const candidatos = [
    typeof $route.query.feature === 'string' ? $route.query.feature : '',
    typeof $route.query.selecionado === 'string' ? $route.query.selecionado : '',
    graph.state.selecionadoId ?? ''
  ]
  return candidatos.map((id) => graph.noPorId(id)).find((node) => node?.tipo === 'feature') ?? graph.state.nos.find((node) => node.tipo === 'feature')
})
const rotaStudio = computed(() => featureParaStudio.value
  ? `/canvas?view=studio&feature=${encodeURIComponent(featureParaStudio.value.id)}&selecionado=${encodeURIComponent(featureParaStudio.value.id)}`
  : '/canvas?view=studio')
const activeItem = computed(() => $route.path === '/canvas'
  ? $route.query.view === 'studio' ? 'canvas-studio' : $route.query.view === 'canvas' ? 'canvas-graph' : 'canvas'
  : $route.path)
const itensKit = computed(() => [
  { type: 'group' as const, value: 'produto', label: 'Produto', collapsible: false, children: [
    { value: '/', label: 'Visão', icon: 'overview', to: '/' },
    { value: 'canvas', label: 'Canvas', icon: 'canvas', to: '/canvas', defaultOpen: true, children: [
      { value: 'canvas-graph', label: 'Grafo NEXO', icon: 'workflow', to: '/canvas?view=canvas' },
      { value: 'canvas-studio', label: 'Telas (Studio)', icon: 'design', to: rotaStudio.value, disabled: !featureParaStudio.value }
    ] },
    { value: '/backlog', label: 'Backlog', icon: 'inbox', to: '/backlog' }
  ] },
  { type: 'group' as const, value: 'gates', label: 'Gates', defaultOpen: true, children: ORDEM_GATES.map((gid) => ({
    value: `/gates/${gid}`,
    label: `${gid} · ${rotulos[gid]}`,
    icon: estadoGate(gid).icon,
    to: `/gates/${gid}`
  })) },
  { type: 'group' as const, value: 'administracao', label: 'Administração', collapsible: false, children: [
    { value: '/usuarios', label: 'Usuários', icon: 'users', to: '/usuarios' }
  ] }
])

const rotulos: Record<string, string> = {
  G0: 'Enquadramento',
  G1: 'Épicos',
  G2: 'Features',
  G3: 'Arquitetura',
  G4: 'PBIs',
  G5: 'Entrega'
}

function trocarProjeto(id: string) {
  projects.selecionar(id, users.state.currentUserId)
  graph.trocarProjeto(id)
  gates.trocarProjeto(id)
  router.push($route.path === '/canvas' ? '/canvas?view=canvas' : '/backlog')
}

function estadoGate(gid: string): { icon: string; label: string } {
  const g = gates.gates.find((x) => x.id === gid)
  if (!g) return { icon: 'file', label: 'Rascunho' }
  if (g.status === 'aprovado') {
    return Number(g.baselineVersao) > 0 && !!g.baselineAlvoId
      ? { icon: 'check', label: `Aprovado · baseline v${g.baselineVersao}` }
      : { icon: 'alert', label: 'Status aprovado, mas falta uma baseline válida' }
  }
  if (g.status === 'revisao') return { icon: 'clock', label: 'Em revisão' }
  if (!gateDesbloqueado(gid as never, gates.gates)) return { icon: 'lock', label: 'Bloqueado · aguarda aprovação do gate anterior' }
  return { icon: 'file', label: 'Disponível para iniciar' }
}

function selecionarItem(value: string) {
  if (value === 'canvas-graph') {
    router.push('/canvas?view=canvas')
    return
  }
  if (value === 'canvas-studio') {
    router.push(rotaStudio.value)
    return
  }
  if (value === 'canvas') {
    router.push('/canvas')
    return
  }
  router.push(value)
}


</script>

<template>
  <VSidebar id="nexo-primary-navigation" class="nexo-kit-sidebar" variant="workspace" :items="itensKit" :active-item="activeItem" :width="224" :show-search="false" :show-footer="false" :show-collapse-toggle="false" :group-dividers="true" aria-label="Navegação principal" @select="selecionarItem">
    <template #header><RouterLink to="/" class="nexo-sidebar-brand" aria-label="NEXO — Visão do produto"><span class="nexo-brand-mark" aria-hidden="true">X</span><span>NEXO</span></RouterLink></template>
    <template #before-nav>
      <div class="nexo-sidebar-project-context">
        <VSelect class="nexo-sidebar-project-select" :model-value="projects.state.atualId" :options="projectOptions" label="Projeto" size="sm" @update:model-value="trocarProjeto" />
      </div>
    </template>
    <template #item-trailing="{ item }">
      <span v-if="item.value.startsWith('/gates/')" class="sr-only" role="img" :aria-label="estadoGate(item.value.slice(7)).label" :title="estadoGate(item.value.slice(7)).label">
        {{ estadoGate(item.value.slice(7)).label }}
      </span>
    </template>
  </VSidebar>
</template>

<style scoped>
.nexo-kit-sidebar{flex:0 0 224px;width:224px;min-height:0;height:100%;background:var(--v-color-surface);border-right:1px solid var(--v-color-border)}.nexo-kit-sidebar :deep(.v-sidebar__header-slot){height:56px;min-height:56px;margin-bottom:8px;padding:8px 14px;border-bottom:1px solid var(--v-color-border)}.nexo-sidebar-brand{display:flex;min-width:0;align-items:center;gap:9px;color:var(--v-color-text);text-decoration:none;font-size:13px;font-weight:800;letter-spacing:.04em}.nexo-brand-mark{display:grid;place-items:center;width:28px;height:28px;flex:0 0 28px;border-radius:var(--v-radius-8);background:var(--v-color-primary);color:var(--v-color-on-primary);font-weight:800}.nexo-kit-sidebar :deep(.v-sidebar__before-nav){margin-bottom:0}.nexo-sidebar-project-context{width:100%;padding:0 12px}.nexo-sidebar-project-select{width:100%;min-width:0}.nexo-kit-sidebar :deep(.v-sidebar__nav){flex:1;min-height:0;overflow-y:auto;padding-top:8px}.nexo-kit-sidebar :deep(.v-nav-item.v-nav-item--active),.nexo-kit-sidebar :deep(.v-nav-item.v-nav-item--active:hover){background:var(--v-color-primary-100);color:var(--v-color-primary-text);box-shadow:inset 3px 0 0 var(--v-color-primary)}.nexo-kit-sidebar :deep(.v-nav-item.v-nav-item--active .v-nav-item__icon){color:var(--v-color-primary)}.nexo-kit-sidebar :deep(.v-nav-item__label){min-width:0;white-space:nowrap;overflow:visible;text-overflow:clip}
</style>
