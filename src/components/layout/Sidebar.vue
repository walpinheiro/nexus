<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useUI } from '@/stores/useUI'
import { useUsers } from '@/stores/useUsers'
import { useGate } from '@/stores/useGate'
import { gateAnterior, gateDesbloqueado, ORDEM_GATES } from '@/utils/gates'
import LucideIcon from '@/components/common/LucideIcon.vue'

const $route = useRoute()
const ui = useUI()
const users = useUsers()
const gates = useGate()

const rotulos: Record<string, string> = {
  G0: 'Enquadramento',
  G1: 'Épicos',
  G2: 'Features',
  G3: 'Arquitetura',
  G4: 'PBIs',
  G5: 'Entrega'
}

function estadoGate(gid: string): 'bloqueado' | 'aprovado' | 'ativo' | 'rascunho' {
  const g = gates.gates.find((x) => x.id === gid)
  if (!g) return 'rascunho'
  if (!gateDesbloqueado(gid as never, gates.gates)) return 'bloqueado'
  if (g.status === 'aprovado') return 'aprovado'
  return 'rascunho'
}

function ehAtivo(gid: string): boolean {
  return ($route.params.id === gid) || ($route.path === '/canvas' && gid === 'G2')
}

function tooltip(gid: string): string {
  const est = estadoGate(gid)
  if (est === 'bloqueado') {
    const ant = gateAnterior(gid as never)
    return `Aprove ${ant} primeiro — ver Gate ${ant}`
  }
  const g = gates.gates.find((x) => x.id === gid)
  if (est === 'aprovado') return `Aprovado · baseline v${g?.baselineVersao ?? '?'} por ${g?.aprovadoPor ?? '?'}` 
  if (g?.status === 'revisao') return 'Em revisão — aguardando aprovação'
  return 'Rascunho — preencha o checklist'
}

</script>

<template>
  <aside
    v-if="ui.state.sidebarAberta"
    class="flex w-sidebar shrink-0 flex-col border-r border-nexo-border bg-nexo-surface"
    aria-label="Navegação principal"
  >
    <nav class="space-y-1 p-3">
      <RouterLink
        to="/"
        class="flex h-10 items-center gap-3 rounded-badge px-3 text-sm"
        :class="$route.path === '/' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : 'text-nexo-text hover:bg-nexo-canvas'"
        :aria-current="$route.path === '/' ? 'page' : undefined"
      >
        <LucideIcon name="eye" :size="18" />
        Visão
      </RouterLink>
      <RouterLink
        to="/canvas?view=canvas"
        class="flex h-10 items-center gap-3 rounded-badge px-3 text-sm"
        :class="$route.path === '/canvas' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : 'text-nexo-text hover:bg-nexo-canvas'"
        :aria-current="$route.path === '/canvas' ? 'page' : undefined"
      >
        <LucideIcon name="layout" :size="18" />
        Canvas
      </RouterLink>
      <RouterLink
        to="/backlog"
        class="flex h-10 items-center gap-3 rounded-badge px-3 text-sm"
        :class="$route.path === '/backlog' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : 'text-nexo-text hover:bg-nexo-canvas'"
        :aria-current="$route.path === '/backlog' ? 'page' : undefined"
      >
        <LucideIcon name="inbox" :size="18" />
        Backlog
      </RouterLink>
    </nav>

    <div class="border-t border-nexo-border p-3">
      <p class="px-3 text-[11px] font-semibold uppercase tracking-wider text-nexo-muted">Gates</p>
      <nav class="mt-1 space-y-1" aria-label="Gates">
        <RouterLink
          v-for="gid in ORDEM_GATES"
          :key="gid"
          :to="`/gates/${gid}`"
          :title="tooltip(gid)"
          class="relative flex h-10 items-center gap-3 rounded-badge px-3 text-sm"
          :class="estadoGate(gid) === 'bloqueado' ? 'bg-nexo-draft-bg text-nexo-draft' : estadoGate(gid) === 'aprovado' ? 'text-nexo-approved' : ehAtivo(gid) ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : 'text-nexo-text hover:bg-nexo-canvas'"
        >
          <span
            v-if="ehAtivo(gid)"
            class="absolute left-0 top-1 h-8 w-[3px] rounded bg-nexo-primary"
            aria-hidden="true"
          />
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
            :class="ehAtivo(gid) ? 'bg-nexo-primary text-white' : estadoGate(gid) === 'aprovado' ? 'bg-nexo-approved text-white' : estadoGate(gid) === 'bloqueado' ? 'bg-nexo-draft text-white' : 'border border-nexo-border text-nexo-muted'"
          >
            {{ gid }}
          </span>
          {{ rotulos[gid] }}
          <span class="ml-auto inline-flex" aria-hidden="true">
            <LucideIcon v-if="estadoGate(gid) === 'bloqueado'" name="lock" :size="18" />
            <LucideIcon v-else-if="estadoGate(gid) === 'aprovado'" name="check" :size="18" />
          </span>
        </RouterLink>
      </nav>
      <RouterLink to="/usuarios" class="mt-2 flex h-10 items-center gap-3 rounded-badge px-3 text-sm" :class="$route.path === '/usuarios' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : 'text-nexo-text hover:bg-nexo-canvas'">
        <span class="flex h-7 w-7 items-center justify-center rounded-full border border-nexo-border text-xs font-bold text-nexo-muted">U</span>
        Usuários
      </RouterLink>
    </div>

    <div class="mt-auto space-y-2 p-3">
      <label class="block text-[11px] font-semibold uppercase tracking-wider text-nexo-muted" for="role-switch">Papel atual
        <select id="role-switch" :value="users.state.currentUserId" class="mt-1 w-full rounded-btn border border-nexo-border bg-white px-2 py-1.5 text-xs normal-case" @change="users.trocarUsuario(($event.target as HTMLSelectElement).value)">
          <option v-for="u in users.state.usuarios" :key="u.id" :value="u.id">{{ u.nome }} — {{ u.papel }}</option>
        </select>
      </label>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full border border-nexo-border text-nexo-muted hover:text-nexo-primary"
        aria-label="Recolher barra lateral"
        @click="ui.alternarSidebar()"
      >
        <LucideIcon name="chevL" :size="18" />
      </button>
    </div>
  </aside>
</template>
