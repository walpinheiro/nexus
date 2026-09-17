<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { STUDIO_KINDS } from '@/types/studio'

const studio = useStudio()
const busca = ref('')

const rotulos: Record<string, string> = {
  button: 'Botão',
  fab: 'FAB',
  chip: 'Chip',
  topAppBar: 'Barra topo',
  bottomNav: 'Nav inferior',
  tabs: 'Abas',
  searchBar: 'Busca',
  card: 'Card',
  listItem: 'Item lista',
  dialog: 'Diálogo',
  snackbar: 'Snackbar',
  textField: 'Campo texto',
  select: 'Dropdown',
  switch: 'Switch',
  checkbox: 'Checkbox',
  radio: 'Radio',
  slider: 'Slider',
  text: 'Texto',
  image: 'Imagem',
  box: 'Caixa',
  divider: 'Divisor',
  loadingIndicator: 'Loading',
  navRail: 'Nav rail',
  toolbar: 'Toolbar',
  extendedFab: 'FAB estendido'
}

const kinds = computed(() =>
  (STUDIO_KINDS as readonly string[]).filter((k) =>
    !busca.value || k.includes(busca.value.toLowerCase()) || (rotulos[k] ?? '').toLowerCase().includes(busca.value.toLowerCase())
  )
)

function criarNoCentro(kind: string) {
  const f = studio.frameAtual()
  if (!f) return
  studio.criarItem(kind, f.x + f.w / 2 - 90, f.y + f.h / 2 - 28)
}

function onDragStart(ev: DragEvent, kind: string) {
  ev.dataTransfer?.setData('text/studio-kind', kind)
}
</script>

<template>
  <div class="flex w-48 shrink-0 flex-col border-r border-nexo-border bg-white">
    <div class="p-2">
      <input v-model="busca" placeholder="Buscar part…" aria-label="Buscar part" class="w-full rounded-btn border border-nexo-border px-2 py-1 text-xs" />
    </div>
    <div class="min-h-0 flex-1 overflow-auto p-2 pt-0">
      <div
        v-for="k in kinds"
        :key="k"
        draggable="true"
        tabindex="0"
        role="button"
        :aria-label="`Adicionar ${rotulos[k] ?? k}`"
        :title="`${rotulos[k] ?? k} — arraste para o stage ou duplo-clique`"
        class="mb-1 cursor-grab rounded-badge border border-nexo-border px-2 py-1.5 text-xs hover:border-nexo-primary hover:text-nexo-primary"
        @dragstart="onDragStart($event, k)"
        @dblclick="criarNoCentro(k)"
        @keydown.enter="criarNoCentro(k)"
      >
        {{ rotulos[k] ?? k }} <span class="text-nexo-muted">· {{ k }}</span>
      </div>
    </div>
  </div>
</template>
