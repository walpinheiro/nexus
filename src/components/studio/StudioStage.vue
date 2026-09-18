<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { paletteOf } from './m3/theme'
import { limitesDe, specOf } from './m3/tokens'
import M3Node from './m3/M3Node.vue'
import StudioToolbar from './StudioToolbar.vue'

const studio = useStudio()
const emit = defineEmits<{
  (e: 'preview'): void
  (e: 'abrir-prompt'): void
  (e: 'abrir-ask'): void
  (e: 'update:ferramenta', v: 'select' | 'hand'): void
}>()
const props = defineProps<{ ferramenta?: 'select' | 'hand' }>()
const caixa = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
let panAtivo = false
let panStart = { x: 0, y: 0, px: 0, py: 0 }
// Middle-pan (CANVAS A): botão do meio move em qualquer ferramenta.
const middlePan = ref(false)

function iniciarPan(ev: PointerEvent) {
  panAtivo = true
  panStart = { x: ev.clientX, y: ev.clientY, px: studio.pan[0], py: studio.pan[1] }
  ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
}
const ferramenta = computed<'select' | 'hand'>({
  get: () => props.ferramenta ?? 'select',
  set: (v) => emit('update:ferramenta', v)
})
const modo = ref<'edit' | 'preview'>('edit')
const historico = ref<string[]>([])
const guides = ref<{ v: number[]; h: number[] }>({ v: [], h: [] })

const f = computed(() => studio.frameAtual())
const itensDaTela = (fid: string) =>
  studio.doc.groups.flatMap((g) => g.items).filter((i) => {
    const fr = studio.doc.frames.find((x) => x.id === fid)
    return fr ? i.x >= fr.x && i.x < fr.x + fr.w : false
  })
const itens = computed(() => {
  const fr = f.value
  if (!fr) return []
  return itensDaTela(fr.id)
})

const transform = computed(() => `translate(${studio.pan[0]}px, ${studio.pan[1]}px) scale(${studio.zoom})`)
const scheme = computed(() => paletteOf(studio.doc.paletteKey, false))
const transicaoAtual = computed(() => {
  const it = studio.itemPorId(studio.selecionados[0] ?? '')
  return it?.action?.transition ?? 'slide'
})

function snap(v: number, semSnap: boolean): number {
  return semSnap ? Math.round(v) : Math.round(v / 4) * 4
}

function paraMundo(ev: { clientX: number; clientY: number }, base: DOMRect): { x: number; y: number } {
  return {
    x: (ev.clientX - base.left - studio.pan[0]) / studio.zoom,
    y: (ev.clientY - base.top - studio.pan[1]) / studio.zoom
  }
}

const dragBase = new Map<string, { x: number; y: number }>()

function onPointerDownFundo(ev: PointerEvent) {
  if ((ev.target as HTMLElement).closest('[data-part],button,input,select,textarea,a')) return
  // Middle-press inicia pan em qualquer ferramenta; suprime caixa e autoscroll.
  if (ev.button === 1) {
    ev.preventDefault()
    middlePan.value = true
    iniciarPan(ev)
    return
  }
  if (ferramenta.value === 'hand') {
    iniciarPan(ev)
    return
  }
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const p = paraMundo(ev, rect)
  caixa.value = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }
}

function onPointerMoveFundo(ev: PointerEvent) {
  if (panAtivo) {
    studio.pan = [panStart.px + (ev.clientX - panStart.x), panStart.py + (ev.clientY - panStart.y)]
    studio.persist()
    return
  }
  if (caixa.value) {
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect()
    const p = paraMundo(ev, rect)
    caixa.value.x2 = p.x
    caixa.value.y2 = p.y
  }
}

function onPointerUpFundo() {
  panAtivo = false
  middlePan.value = false
  if (caixa.value) {
    const c = caixa.value
    const x1 = Math.min(c.x1, c.x2)
    const x2 = Math.max(c.x1, c.x2)
    const y1 = Math.min(c.y1, c.y2)
    const y2 = Math.max(c.y1, c.y2)
    studio.selecionados = itens.value.filter((i) => i.x + 180 >= x1 && i.x <= x2 && i.y + 48 >= y1 && i.y <= y2).map((i) => i.id)
    caixa.value = null
  }
}

function selecionar(id: string, ev: MouseEvent) {
  if (modo.value === 'preview') {
    const it = studio.itemPorId(id)
    if (it?.action?.to && it.action.to !== 'back') {
      historico.value.push(studio.screenId)
      studio.screenId = it.action.to
      studio.persist()
    } else if (it?.action?.to === 'back' && historico.value.length > 0) {
      studio.screenId = historico.value.pop()!
      studio.persist()
    }
    return
  }
  if (ev.shiftKey) {
    studio.selecionados = studio.selecionados.includes(id)
      ? studio.selecionados.filter((x) => x !== id)
      : [...studio.selecionados, id]
  } else {
    studio.selecionados = [id]
  }
}

function onMoverParte(id: string, ev: PointerEvent) {
  if (modo.value === 'preview') return
  ev.stopPropagation()
  const el = ev.currentTarget as HTMLElement
  el.setPointerCapture(ev.pointerId)
  if (dragBase.size === 0) {
    studio.pushHistory()
    const alvos = studio.selecionados.includes(id) ? studio.selecionados : [id]
    studio.selecionados = alvos
    for (const aid of alvos) {
      const it = studio.itemPorId(aid)
      if (it) dragBase.set(aid, { x: it.x, y: it.y })
    }
  }
  const sx = ev.clientX
  const sy = ev.clientY
  const move = (m: PointerEvent) => {
    const dx = (m.clientX - sx) / studio.zoom
    const dy = (m.clientY - sy) / studio.zoom
    const semSnap = m.ctrlKey
    guides.value = { v: [], h: [] }
    // guides: alinha com bordas de irmãos (±4px)
    for (const [aid, base] of dragBase) {
      const nx = snap(base.x + dx, semSnap)
      const ny = snap(base.y + dy, semSnap)
      const it = studio.itemPorId(aid)
      if (it) {
        it.x = nx
        it.y = ny
        for (const o of itens.value) {
          if (o.id === aid) continue
          if (Math.abs(o.x - nx) <= 4) guides.value.v.push(o.x)
          if (Math.abs(o.y - ny) <= 4) guides.value.h.push(o.y)
        }
      }
    }
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    dragBase.clear()
    guides.value = { v: [], h: [] }
    studio.persist()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function grupoDe(itemId: string) {
  return studio.doc.groups.find((g) => g.items.some((i) => i.id === itemId))
}

function tamanhoDe(id: string): { w: number; h: number } {
  const it = studio.itemPorId(id)
  const spec = it ? specOf(it.kind) : undefined
  const w = it?.w ?? it?.size ?? spec?.w ?? 180
  const h = it?.h ?? (it?.kind === 'button' || it?.kind === 'chip' ? 40 : spec?.h ?? 48)
  return { w, h }
}

// SizeHandles: 8 alças (cantos+lados) na part selecionada
const resizeBase = ref<{ id: string; x: number; y: number; w: number; h: number } | null>(null)

function onResizeStart(id: string, dir: string, ev: PointerEvent) {
  ev.stopPropagation()
  ev.preventDefault()
  const it = studio.itemPorId(id)
  if (!it) return
  studio.pushHistory()
  const t = tamanhoDe(id)
  resizeBase.value = { id, x: ev.clientX, y: ev.clientY, w: t.w, h: t.h }
  ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
  const move = (m: PointerEvent) => {
    const b = resizeBase.value
    if (!b) return
    const semSnap = m.ctrlKey
    const dx = (m.clientX - b.x) / studio.zoom
    const dy = (m.clientY - b.y) / studio.zoom
    let nw = b.w
    let nh = b.h
    if (dir.includes('e')) nw = b.w + dx
    if (dir.includes('s')) nh = b.h + dy
    if (dir.includes('w')) nw = b.w - dx
    if (dir.includes('n')) nh = b.h - dy
    const lim = limitesDe(it.kind)
    nw = Math.min(lim.maxW, Math.max(lim.minW, snap(nw, semSnap)))
    nh = Math.min(lim.maxH, Math.max(lim.minH, snap(nh, semSnap)))
    studio.redimensionarItem(id, Math.round(nw), Math.round(nh))
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    resizeBase.value = null
    studio.persist()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

const ALCAS: { dir: string; cursor: string; pos: string }[] = [
  { dir: 'nw', cursor: 'nwse-resize', pos: 'left:-5px;top:-5px' },
  { dir: 'n', cursor: 'ns-resize', pos: 'left:50%;top:-5px;transform:translateX(-50%)' },
  { dir: 'ne', cursor: 'nesw-resize', pos: 'right:-5px;top:-5px' },
  { dir: 'e', cursor: 'ew-resize', pos: 'right:-5px;top:50%;transform:translateY(-50%)' },
  { dir: 'se', cursor: 'nwse-resize', pos: 'right:-5px;bottom:-5px' },
  { dir: 's', cursor: 'ns-resize', pos: 'left:50%;bottom:-5px;transform:translateX(-50%)' },
  { dir: 'sw', cursor: 'nesw-resize', pos: 'left:-5px;bottom:-5px' },
  { dir: 'w', cursor: 'ew-resize', pos: 'left:-5px;top:50%;transform:translateY(-50%)' }
]

function onDrop(ev: DragEvent) {
  const kind = ev.dataTransfer?.getData('text/studio-kind')
  if (!kind) return
  ev.preventDefault()
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const p = paraMundo(ev, rect)
  studio.criarItem(kind, snap(p.x, ev.ctrlKey), snap(p.y, ev.ctrlKey))
}

function onKeydown(ev: KeyboardEvent) {
  const tag = (ev.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (ev.target as HTMLElement)?.isContentEditable) return
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
    ev.preventDefault()
    if (ev.shiftKey) studio.redo()
    else studio.undo()
    return
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') {
    ev.preventDefault()
    studio.duplicarItens(studio.selecionados)
    return
  }
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    studio.removerItens(studio.selecionados)
    return
  }
  if (ev.key === 'p' || ev.key === 'P') alternarPreview()
  else if (ev.key === '0') studio.zoom = 0.7
  else if (ev.key === '+' || ev.key === '=') studio.zoom = Math.min(2, studio.zoom + 0.1)
  else if (ev.key === '-') studio.zoom = Math.max(0.3, studio.zoom - 0.1)
  else if (ev.key === 'Escape') {
    if (modo.value === 'preview') modo.value = 'edit'
    else studio.selecionados = []
  } else if (ev.key.startsWith('Arrow')) {
    const passo = ev.shiftKey ? 8 : 1
    const dx = ev.key === 'ArrowLeft' ? -passo : ev.key === 'ArrowRight' ? passo : 0
    const dy = ev.key === 'ArrowUp' ? -passo : ev.key === 'ArrowDown' ? passo : 0
    studio.pushHistory()
    studio.moverItens(studio.selecionados, dx, dy)
    ev.preventDefault()
  }
}

function alternarPreview() {
  emit('preview')
}

defineExpose({ alternarPreview })
</script>

<template>
  <div
    class="canvas-dots relative min-h-[480px] flex-1 overflow-hidden rounded-card border border-nexo-border"
    :class="middlePan || panAtivo ? 'cursor-grabbing' : ''"
    tabindex="0"
    role="application"
    aria-label="Stage do Studio"
    @keydown="onKeydown"
    @mousedown="($event.button === 1 ? $event.preventDefault() : undefined)"
    @auxclick="($event.button === 1 ? $event.preventDefault() : undefined)"
    @wheel.prevent="
      $event.ctrlKey || $event.metaKey
        ? (studio.zoom = Math.min(2, Math.max(0.3, studio.zoom * ($event.deltaY < 0 ? 1.1 : 0.9))))
        : (studio.pan = [studio.pan[0] - $event.deltaX, studio.pan[1] - $event.deltaY])
    "
  >
    <div class="pointer-events-none absolute left-2 right-2 top-2 z-20 flex justify-center">
      <div class="pointer-events-auto max-w-full overflow-x-auto" style="border-radius: 28px">
        <StudioToolbar v-model:ferramenta="ferramenta" @preview="emit('preview')" @abrir-prompt="emit('abrir-prompt')" @abrir-ask="emit('abrir-ask')" />
      </div>
    </div>
    <div
      class="absolute left-0 top-0"
      :style="{ transform, transformOrigin: '0 0', width: '3000px', height: '1600px' }"
      @pointerdown="onPointerDownFundo"
      @pointermove="onPointerMoveFundo"
      @pointerup="onPointerUpFundo"
      @dragover.prevent
      @drop="onDrop"
    >
      <template v-for="fr in studio.doc.frames" :key="fr.id">
        <div
          class="absolute rounded-card border-2 bg-white"
          :style="{ left: fr.x + 'px', top: fr.y + 'px', width: fr.w + 'px', height: fr.h + 'px', borderColor: fr.id === studio.screenId ? '#1D4ED8' : '#CBD5E1' }"
          @pointerdown.stop="studio.screenId = fr.id; studio.persist()"
        >
          <p class="flex items-center gap-2 p-2 text-xs font-semibold text-nexo-muted">
            {{ fr.name }} · {{ fr.w }}×{{ fr.h }}
            <button
              type="button"
              class="rounded-btn border border-nexo-border bg-white px-1.5 py-0.5 text-[10px]"
              :title="fr.w >= 1280 ? 'Trocar para phone 412x892' : 'Trocar para desktop 1280x800'"
              @click.stop="studio.setFramePreset(fr.id, fr.w >= 1280 ? 'phone' : 'desktop')"
            >
              {{ fr.w >= 1280 ? 'desktop → phone' : 'phone → desktop' }}
            </button>
          </p>
        </div>
        <div
          v-for="it in itensDaTela(fr.id).sort((a, b) => (grupoDe(a.id)?.order ?? 0) - (grupoDe(b.id)?.order ?? 0))"
          :key="it.id"
          data-part
          role="button"
          tabindex="0"
          :aria-label="`${it.kind} ${it.label ?? ''}`"
          class="absolute cursor-move"
          :style="{ left: it.x + 'px', top: it.y + 'px', zIndex: (grupoDe(it.id)?.order ?? 0) + 10 }"
          @pointerdown="onMoverParte(it.id, $event)"
          @click="selecionar(it.id, $event)"
          @dblclick="$event.stopPropagation()"
          @keydown.enter="selecionar(it.id, $event as unknown as MouseEvent)"
        >
          <div
            :class="[
              'm3-ripple',
              modo === 'preview' && transicaoAtual !== 'none' ? `m3-trans-${transicaoAtual}` : '',
              studio.selecionados.includes(it.id) ? 'm3-select-ring' : ''
            ]"
          >
            <M3Node :item="it" :scheme="scheme" :selecionado="studio.selecionados.includes(it.id)" />
          </div>
          <template v-if="studio.selecionados.includes(it.id) && modo !== 'preview'">
            <span
              v-for="a in ALCAS"
              :key="a.dir"
              role="separator"
              :aria-label="`Redimensionar ${a.dir}`"
              :title="`Redimensionar (${a.dir}) — Ctrl desliga snap`"
              class="absolute z-10 h-[10px] w-[10px] rounded-sm border-2 border-nexo-primary bg-white"
              :style="`${a.pos};cursor:${a.cursor}`"
              @pointerdown="onResizeStart(it.id, a.dir, $event)"
            />
          </template>
        </div>
      </template>
      <g v-if="false" />
      <div
        v-for="gx in guides.v"
        :key="'v' + gx"
        class="absolute top-0 h-full w-px bg-nexo-primary"
        :style="{ left: gx + 'px' }"
        aria-hidden="true"
      />
      <div
        v-for="gy in guides.h"
        :key="'h' + gy"
        class="absolute left-0 h-px w-full bg-nexo-primary"
        :style="{ top: gy + 'px' }"
        aria-hidden="true"
      />
      <div
        v-if="caixa"
        class="absolute border border-nexo-primary bg-nexo-primary/10"
        :style="{ left: Math.min(caixa.x1, caixa.x2) + 'px', top: Math.min(caixa.y1, caixa.y2) + 'px', width: Math.abs(caixa.x2 - caixa.x1) + 'px', height: Math.abs(caixa.y2 - caixa.y1) + 'px' }"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
