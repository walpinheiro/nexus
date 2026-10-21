<script setup lang="ts">
import NovaAction from '@/components/common/NovaAction.vue'
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { usePresence } from '@/stores/studioPresence'
import { useUsers } from '@/stores/useUsers'
import M3Icon from './m3/M3Icon.vue'

const props = withDefaults(
  defineProps<{
    featureId?: string
    screenId?: string
    provider?: string
  }>(),
  { featureId: '', screenId: '', provider: '' }
)

const presence = usePresence()
const users = useUsers()

interface TaskAvatar {
  userId: string
  name: string
  initials: string
  color: string
  provider: string
  screenId: string
  mesmaTela: boolean
  online: boolean
}

interface TaskEntry {
  userId: string
  provider: string
  screenId: string
}

const temFiltroTask = computed(() => props.featureId !== '')

// Roster da task via detalhe do feed da presence (mesma fonte do share real
// do StudioView: detalhe carrega feature/provider/screenId; sem store nova).
// Formato: "na feature <fid> · IA <provider> · tela <sid>".
const taskAvatars = computed<TaskAvatar[]>(() => {
  if (!temFiltroTask.value) return []
  const porUsuario = new Map<string, TaskEntry>()
  for (const ev of presence.feed) {
    const m = /na feature (\S+)\s+· IA (\S+)\s+· tela (\S+)/.exec(ev.detalhe ?? '')
    if (!m || m[1] !== props.featureId) continue
    if (!porUsuario.has(ev.actorUserId)) {
      porUsuario.set(ev.actorUserId, {
        userId: ev.actorUserId,
        provider: m[2] ?? '',
        screenId: m[3] ?? ''
      })
    }
  }
  // Garante o usuário atual (share registra via registrarEvento também)
  const atual = users.state.currentUserId
  if (atual && !porUsuario.has(atual)) {
    const agente = presence.agenteDe(atual)
    porUsuario.set(atual, { userId: atual, provider: agente.provider, screenId: props.screenId })
  }
  return [...porUsuario.values()].map((entry: TaskEntry) => {
    const doRoster = presence.roster.find((c) => c.userId === entry.userId)
    const doUsers = users.state.usuarios.find((u) => u.id === entry.userId)
    const nome = doRoster?.name ?? doUsers?.nome ?? entry.userId
    const iniciais =
      doRoster?.initials ??
      (nome
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => (p[0] ?? '').toUpperCase())
        .join('') || entry.userId.slice(0, 2).toUpperCase())
    return {
      userId: entry.userId,
      name: nome,
      initials: iniciais,
      color: doRoster?.color ?? '#334155',
      provider: entry.provider,
      screenId: entry.screenId,
      mesmaTela: props.screenId !== '' && entry.screenId !== '' && entry.screenId === props.screenId,
      online: doRoster?.online ?? false
    }
  })
})
const convidarAberto = ref(false)
const convidarBtn = ref<HTMLButtonElement | null>(null)

function abrirConvidar() {
  convidarAberto.value = true
  nextTick(() => {
    const el = document.querySelector('[data-convidar-item]') as HTMLElement | null
    el?.focus?.()
  })
}

function fecharConvidar(focar = true) {
  convidarAberto.value = false
  if (focar) convidarBtn.value?.focus()
}

function onKeyConvidar(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    fecharConvidar(true)
  }
}

onUnmounted(() => fecharConvidar(false))
</script>

<template>
  <span class="relative flex items-center gap-2">
    <span class="flex items-center" role="group" aria-label="Equipe de demonstração local do Studio">
      <template v-if="temFiltroTask">
        <span
          v-for="(c, i) in taskAvatars.slice(0, 5)"
          :key="c.userId"
          class="relative flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
          :class="c.mesmaTela ? 'ring-2 ring-nexo-primary ring-offset-1 ring-offset-white' : ''"
          :style="{ backgroundColor: c.color, borderColor: c.mesmaTela ? '#ffffff' : c.color, marginLeft: i === 0 ? '0' : '-8px', zIndex: 10 - i }"
          :title="`${c.name} — perfil demonstrativo ${c.provider} — tela ${c.screenId}`"
          :aria-label="`${c.name}, perfil de demonstração ${c.provider}, tela ${c.screenId}`"
        >
          {{ c.initials }}
          <span class="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-green-500" aria-hidden="true" />
        </span>
      </template>
      <template v-else>
        <span
          v-for="(c, i) in presence.onlineUsers.slice(0, 5)"
          :key="c.userId"
          class="relative flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
          :style="{ backgroundColor: c.color, borderColor: c.color, marginLeft: i === 0 ? '0' : '-8px', zIndex: 10 - i }"
          :title="`${c.name} — perfil demonstrativo ${c.agent.model}`"
          :aria-label="`${c.name}, perfil de demonstração local, ${c.agent.model}`"
        >
          {{ c.initials }}
          <span class="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-green-500" aria-hidden="true" />
        </span>
      </template>
    </span>
    <NovaAction
      ref="convidarBtn"
      type="button"
      class="inline-flex items-center gap-1 rounded-btn border border-nexo-border px-2 py-1 text-xs"
      :aria-expanded="convidarAberto"
      aria-haspopup="dialog"
      title="Equipe de demonstração local"
      @click="convidarAberto ? fecharConvidar(false) : abrirConvidar()"
    >
      <M3Icon name="person_add" :size="14" label="Convidar" /> Convidar
    </NovaAction>
    <div
      v-if="convidarAberto"
      role="dialog"
      aria-modal="false"
      aria-label="Convidar colaboradores"
      class="absolute right-0 top-9 z-50 w-64 rounded-card border border-nexo-border bg-white p-1 shadow-card"
      @keydown="onKeyConvidar"
    >
      <p class="px-3 py-2 text-xs font-semibold">Equipe de demonstração (estado local)</p>
      <ul class="max-h-64 overflow-auto">
        <li v-for="c in presence.roster" :key="c.userId">
          <NovaAction
            type="button"
            data-convidar-item
            class="flex w-full items-center gap-2 rounded-badge px-3 py-2 text-left text-sm hover:bg-nexo-canvas"
            :title="c.online ? `Marcar ${c.name} como inativo neste navegador` : `Marcar ${c.name} como ativo neste navegador`"
            :aria-pressed="c.online"
            :aria-label="`${c.name}, perfil de demonstração, ${c.online ? 'ativo localmente' : 'inativo localmente'}`"
            @click="presence.toggleOnline(c.userId)"
          >
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
              :style="{ backgroundColor: c.color }"
              aria-hidden="true"
            >
              {{ c.initials }}
            </span>
            <span class="min-w-0 flex-1 truncate">{{ c.name }}</span>
            <span class="shrink-0 text-[10px]" :class="c.online ? 'text-nexo-approved' : 'text-nexo-muted'">
              {{ c.online ? 'ativo local' : 'inativo local' }}
            </span>
          </NovaAction>
        </li>
      </ul>
      <NovaAction type="button" class="flex w-full items-center gap-1 rounded-badge px-3 py-2 text-left text-xs text-nexo-muted hover:bg-nexo-canvas" @click="fecharConvidar(true)">
        <M3Icon name="close" :size="14" label="Fechar convites" /> Fechar
      </NovaAction>
    </div>
  </span>
</template>
