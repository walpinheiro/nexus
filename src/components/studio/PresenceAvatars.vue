<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue'
import { usePresence } from '@/stores/studioPresence'
import { useUsers } from '@/stores/useUsers'
import M3Icon from './m3/M3Icon.vue'

const presence = usePresence()
const users = useUsers()
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
    <span class="flex items-center" role="group" aria-label="Colaboradores online no Studio">
      <span
        v-for="(c, i) in presence.onlineUsers.slice(0, 5)"
        :key="c.userId"
        class="relative flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
        :style="{ backgroundColor: c.color, borderColor: c.color, marginLeft: i === 0 ? '0' : '-8px', zIndex: 10 - i }"
        :title="`${c.name} — ${c.agent.model}`"
        :aria-label="`${c.name}, online, desenhando com ${c.agent.model}`"
      >
        {{ c.initials }}
        <span class="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-green-500" aria-hidden="true" />
      </span>
    </span>
    <button
      ref="convidarBtn"
      type="button"
      class="inline-flex items-center gap-1 rounded-btn border border-nexo-border px-2 py-1 text-xs"
      :aria-expanded="convidarAberto"
      aria-haspopup="dialog"
      title="Convidar colaboradores"
      @click="convidarAberto ? fecharConvidar(false) : abrirConvidar()"
    >
      <M3Icon name="person_add" :size="14" label="Convidar" /> Convidar
    </button>
    <div
      v-if="convidarAberto"
      role="dialog"
      aria-modal="false"
      aria-label="Convidar colaboradores"
      class="absolute right-0 top-9 z-50 w-64 rounded-card border border-nexo-border bg-white p-1 shadow-card"
      @keydown="onKeyConvidar"
    >
      <p class="px-3 py-2 text-xs font-semibold">Colaboradores ({{ presence.onlineUsers.length }} online)</p>
      <ul class="max-h-64 overflow-auto">
        <li v-for="c in presence.roster" :key="c.userId">
          <button
            type="button"
            data-convidar-item
            class="flex w-full items-center gap-2 rounded-badge px-3 py-2 text-left text-sm hover:bg-nexo-canvas"
            :title="c.online ? `Colocar ${c.name} offline` : `Convidar ${c.name}`"
            :aria-pressed="c.online"
            :aria-label="`${c.name}, ${users.state.usuarios.find((u) => u.id === c.userId)?.papel ?? ''}, ${c.online ? 'online' : 'offline'}`"
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
              {{ c.online ? 'online' : 'offline' }}
            </span>
          </button>
        </li>
      </ul>
      <button type="button" class="flex w-full items-center gap-1 rounded-badge px-3 py-2 text-left text-xs text-nexo-muted hover:bg-nexo-canvas" @click="fecharConvidar(true)">
        <M3Icon name="close" :size="14" label="Fechar convites" /> Fechar
      </button>
    </div>
  </span>
</template>
