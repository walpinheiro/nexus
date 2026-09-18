<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import M3Icon from './m3/M3Icon.vue'

const studio = useStudio()
const abertos = ref<Set<string>>(new Set())
const arrastando = ref<string | null>(null)
const telaFiltro = ref<string>('atual')

const telas = computed(() => studio.doc.frames)
const telaAlvo = computed(() => (telaFiltro.value === 'atual' ? (studio.frameAtual() ?? null) : (studio.doc.frames.find((f) => f.id === telaFiltro.value) ?? null)))

const gruposDaTela = computed(() => {
  const f = telaAlvo.value
  if (!f) return []
  return studio.doc.groups
    .filter((g) => g.items.some((i) => i.x >= f.x && i.x < f.x + f.w))
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
})

function alternar(id: string) {
  if (abertos.value.has(id)) abertos.value.delete(id)
  else abertos.value.add(id)
}

function selecionar(ids: string[], add: boolean) {
  studio.selecionados = add ? [...new Set([...studio.selecionados, ...ids])] : ids
}

function onDragStart(ev: DragEvent, id: string) {
  arrastando.value = id
  ev.dataTransfer!.effectAllowed = 'move'
  ev.dataTransfer!.setData('text/studio-group', id)
}

function onDrop(ev: DragEvent, alvoId: string | null) {
  ev.preventDefault()
  const id = ev.dataTransfer?.getData('text/studio-group') ?? arrastando.value
  arrastando.value = null
  if (!id) return
  studio.pushHistory()
  const atual = gruposDaTela.value.map((g) => g.id)
  const sem = atual.filter((x) => x !== id)
  const pos = alvoId ? sem.indexOf(alvoId) : sem.length
  sem.splice(pos < 0 ? sem.length : pos, 0, id)
  studio.reordenarGrupos(sem)
}

function rotulo(g: { items: { kind: string; label?: string }[] }): string {
  const p = g.items[0]
  if (!p) return 'grupo'
  if (g.items.length > 1) return `${p.kind} × ${g.items.length}`
  return p.label || p.kind
}
</script>

<template>
  <div class="flex h-full flex-col" aria-label="Layers">
    <div class="border-b border-nexo-border p-2">
      <label class="block text-xs">Tela
        <select v-model="telaFiltro" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1 text-xs" aria-label="Filtrar layers por tela">
          <option value="atual">Tela atual</option>
          <option v-for="f in telas" :key="f.id" :value="f.id">{{ f.name }} ({{ f.w }}×{{ f.h }})</option>
        </select>
      </label>
    </div>
    <div class="min-h-0 flex-1 overflow-auto p-2">
      <p v-if="gruposDaTela.length === 0" class="p-4 text-center text-xs text-nexo-muted">Sem layers nesta tela.</p>
      <ul v-else class="space-y-1">
        <li
          v-for="g in gruposDaTela"
          :key="g.id"
          draggable="true"
          @dragstart="onDragStart($event, g.id)"
          @dragover.prevent
          @drop="onDrop($event, g.id)"
        >
          <div
            class="flex h-10 items-center gap-1.5 rounded-badge px-2 text-xs"
            :class="g.items.some((i) => studio.selecionados.includes(i.id)) ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : 'bg-nexo-canvas'"
          >
            <span class="cursor-grab text-nexo-muted" title="Arrastar para reordenar (z)" aria-hidden="true">
              <M3Icon name="drag_indicator" :size="16" />
            </span>
            <button type="button" class="min-w-0 flex-1 truncate text-left" @click="selecionar(g.items.map((i) => i.id), false)">
              {{ rotulo(g) }}
            </button>
            <button
              type="button"
              :aria-label="g.locked ? 'Destravar grupo' : 'Travar grupo'"
              :aria-pressed="!!g.locked"
              :title="g.locked ? 'Destravar' : 'Travar'"
              class="text-nexo-muted"
              @click="studio.alternarLock(g.id)"
            >
              <M3Icon :name="g.locked ? 'lock' : 'lock_open'" :size="16" :fill="!!g.locked" />
            </button>
            <button
              v-if="g.items.length > 1"
              type="button"
              :aria-expanded="abertos.has(g.id)"
              :aria-label="abertos.has(g.id) ? 'Recolher parts' : 'Expandir parts'"
              @click="alternar(g.id)"
            >
              <M3Icon name="chevron_right" :size="16" />
            </button>
          </div>
          <ul v-if="abertos.has(g.id)" class="ml-6 mt-1 space-y-1">
            <li v-for="it in g.items" :key="it.id">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-badge px-2 py-1 text-left text-xs"
                :class="studio.selecionados.includes(it.id) ? 'bg-nexo-primary-soft text-nexo-primary' : 'hover:bg-nexo-canvas'"
                @click="selecionar([it.id], $event.shiftKey)"
              >
                <M3Icon :name="it.icon ?? 'circle'" :size="14" />
                <span class="truncate">{{ it.label || it.kind }}</span>
              </button>
            </li>
          </ul>
        </li>
      </ul>
      <div class="h-8" @dragover.prevent @drop="onDrop($event, null)" />
    </div>
    <div class="flex gap-1 border-t border-nexo-border p-2 text-xs">
      <button type="button" class="flex-1 rounded-btn border border-nexo-border px-2 py-1" title="Trazer seleção para frente" @click="studio.selecionados.forEach((id) => { const g = studio.doc.groups.find((x) => x.items.some((i) => i.id === id)); if (g) studio.trazerFrente(g.id) })">Frente</button>
      <button type="button" class="flex-1 rounded-btn border border-nexo-border px-2 py-1" title="Enviar seleção para trás" @click="studio.selecionados.forEach((id) => { const g = studio.doc.groups.find((x) => x.items.some((i) => i.id === id)); if (g) studio.enviarTras(g.id) })">Trás</button>
    </div>
  </div>
</template>
