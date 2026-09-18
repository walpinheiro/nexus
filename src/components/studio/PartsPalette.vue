<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { CATEGORIES } from './m3/tokens'
import { paletteOf } from './m3/theme'
import M3Node from './m3/M3Node.vue'
import M3Icon from './m3/M3Icon.vue'
import type { StudioItem } from '@/types/studio'

const studio = useStudio()
const busca = ref('')
const recolhidas = ref<Set<string>>(new Set())

function alternarCat(id: string) {
  if (recolhidas.value.has(id)) recolhidas.value.delete(id)
  else recolhidas.value.add(id)
}

const scheme = computed(() => paletteOf(studio.doc.paletteKey, false))

interface Tile {
  kind: string
  rotulo: string
  categoria: string
  item: StudioItem
}

const tiles = computed<Tile[]>(() => {
  const out: Tile[] = []
  const rotulos: Record<string, string> = {
    button: 'Botão',
    iconButton: 'Icon',
    fab: 'FAB',
    extendedFab: 'FAB ext.',
    chip: 'Chip',
    toolbar: 'Toolbar',
    topAppBar: 'Top bar',
    bottomNav: 'Nav bar',
    navRail: 'Nav rail',
    tabs: 'Abas',
    searchBar: 'Busca',
    card: 'Card',
    listItem: 'Item',
    dialog: 'Dialog',
    snackbar: 'Snack',
    box: 'Box',
    textField: 'Campo',
    select: 'Select',
    switch: 'Switch',
    checkbox: 'Check',
    radio: 'Radio',
    slider: 'Slider',
    text: 'Texto',
    image: 'Imagem',
    divider: 'Divisor',
    loadingIndicator: 'Loading'
  }
  const catDe: Record<string, string> = {
    button: 'actions',
    iconButton: 'actions',
    fab: 'actions',
    extendedFab: 'actions',
    chip: 'actions',
    toolbar: 'actions',
    topAppBar: 'navigation',
    bottomNav: 'navigation',
    navRail: 'navigation',
    tabs: 'navigation',
    searchBar: 'navigation',
    card: 'containment',
    listItem: 'containment',
    dialog: 'containment',
    snackbar: 'containment',
    box: 'containment',
    textField: 'inputs',
    select: 'inputs',
    switch: 'inputs',
    checkbox: 'inputs',
    radio: 'inputs',
    slider: 'inputs',
    text: 'content',
    image: 'content',
    divider: 'content',
    loadingIndicator: 'progress'
  }
  const defaults: Record<string, Partial<StudioItem>> = {
    button: { label: 'Botão', variant: 'filled', icon: 'add' },
    iconButton: { icon: 'favorite', variant: 'tonal' },
    fab: { icon: 'add', variant: 'filled' },
    extendedFab: { label: 'Criar', icon: 'edit' },
    chip: { label: 'Chip', variant: 'outlined' },
    toolbar: {},
    topAppBar: { label: 'Título', icon: 'menu' },
    bottomNav: { tabs: [{ icon: 'home', label: 'Início' }, { icon: 'search', label: 'Buscar' }, { icon: 'settings', label: 'Ajustes' }], selected: 0 },
    navRail: { tabs: [{ icon: 'home', label: 'Início' }, { icon: 'search', label: 'Buscar' }], selected: 0 },
    tabs: { tabs: [{ label: 'Aba 1' }, { label: 'Aba 2' }], selected: 0 },
    searchBar: { label: 'Buscar', icon: 'search' },
    card: { label: 'Título', supporting: 'Apoio', variant: 'tonal' },
    listItem: { label: 'Item', supporting: 'Apoio', icon: 'restaurant' },
    dialog: { label: 'Título', supporting: 'Corpo', icon: 'info' },
    snackbar: { label: 'Mensagem', supporting: 'Ação' },
    box: { label: '' },
    textField: { label: 'Rótulo', supporting: 'Ajuda', variant: 'outlined' },
    select: { label: 'Opção', variant: 'outlined' },
    switch: { label: 'Alternar', checked: true },
    checkbox: { label: 'Marcar', checked: false },
    radio: { label: 'Opção', checked: true },
    slider: { value: 40 },
    text: { label: 'Texto' },
    image: {},
    divider: {},
    loadingIndicator: { variant: 'circular', value: 40 }
  }
  const t = busca.value.trim().toLowerCase()
  for (const kind of Object.keys(rotulos)) {
    if (t && !kind.includes(t) && !(rotulos[kind] ?? '').toLowerCase().includes(t)) continue
    out.push({
      kind,
      rotulo: rotulos[kind],
      categoria: catDe[kind],
      item: { id: `tile-${kind}`, kind, x: 0, y: 0, ...(defaults[kind] ?? {}) } as StudioItem
    })
  }
  return out
})

const porCategoria = computed(() => {
  const mapa = new Map<string, { id: string; rotulo: string; icon: string; items: Tile[] }>()
  for (const c of CATEGORIES) mapa.set(c.id, { id: c.id, rotulo: c.rotulo, icon: (c as { icon?: string }).icon ?? 'circle', items: [] })
  for (const t of tiles.value) mapa.get(t.categoria)?.items.push(t)
  return [...mapa.values()].filter((v) => v.items.length > 0)
})

function criarNoCentro(kind: string) {
  const fr = studio.frameAtual()
  if (!fr) return
  studio.criarItem(kind, fr.x + fr.w / 2 - 90, fr.y + fr.h / 2 - 28)
}

function onDragStart(ev: DragEvent, kind: string) {
  ev.dataTransfer?.setData('text/studio-kind', kind)
}
</script>

<template>
  <div class="flex w-60 shrink-0 flex-col border-r border-nexo-border bg-white">
    <div class="p-2">
      <input v-model="busca" placeholder="Buscar part…" aria-label="Buscar part" class="w-full rounded-btn border border-nexo-border px-2 py-1 text-xs" />
    </div>
    <div class="min-h-0 flex-1 overflow-auto p-2 pt-0">
      <section v-for="cat in porCategoria" :key="cat.id" :aria-label="cat.rotulo">
        <button type="button" class="flex w-full items-center gap-1.5 px-1 pb-1 pt-2 text-left text-[11px] font-semibold uppercase tracking-wider text-nexo-muted" :aria-expanded="!recolhidas.has(cat.id)" :aria-label="recolhidas.has(cat.id) ? `Expandir ${cat.rotulo}` : `Recolher ${cat.rotulo}`" @click="alternarCat(cat.id)">
          <M3Icon :name="cat.icon" :size="14" />{{ cat.rotulo }}
          <M3Icon :name="recolhidas.has(cat.id) ? 'chevron_right' : 'expand_more'" :size="14" />
        </button>
        <div v-if="!recolhidas.has(cat.id)" class="grid gap-1.5" style="grid-template-columns: repeat(auto-fill, minmax(78px, 1fr))">
          <div
            v-for="t in cat.items"
            :key="t.kind"
            draggable="true"
            tabindex="0"
            role="button"
            :aria-label="`Adicionar ${t.rotulo}`"
            :title="`${t.rotulo} — arraste para o stage ou duplo-clique`"
            class="cursor-grab overflow-hidden rounded-badge border border-nexo-border bg-white hover:border-nexo-primary"
            @dragstart="onDragStart($event, t.kind)"
            @dblclick="criarNoCentro(t.kind)"
            @keydown.enter="criarNoCentro(t.kind)"
          >
            <div class="flex h-[64px] items-center justify-center overflow-hidden rounded-badge border border-nexo-border bg-nexo-canvas p-1" aria-hidden="true">
              <M3Node :item="t.item" :scheme="scheme" :mini="true" />
            </div>
            <p class="truncate px-1 pb-1 text-center text-[10px] text-nexo-muted">{{ t.rotulo }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
