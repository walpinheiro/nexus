<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useProject } from '@/stores/useProject'
import { useUI } from '@/stores/useUI'
import { useUsers } from '@/stores/useUsers'
import CanvasNode from '@/components/canvas/CanvasNode.vue'
import CanvasEdge from '@/components/canvas/CanvasEdge.vue'
import CanvasToolbar from '@/components/canvas/CanvasToolbar.vue'
import type { Edge } from '@/types/nexo'

const graph = useGraph()
const project = useProject()
const ui = useUI()
const users = useUsers()
const route = useRoute()
const router = useRouter()

// viewport
const zoom = ref(1)
const panX = ref(40)
const panY = ref(20)
const canvasRef = ref<HTMLDivElement | null>(null)
const espacoRef = ref<HTMLDivElement | null>(null)

// seleção múltipla + caixa + conexão + aresta
const multiSel = ref<string[]>([])
const caixa = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
const conexao = ref<{ de: string; tipo: Edge['tipo']; mx: number; my: number } | null>(null)
const tipoConexao = ref<Edge['tipo']>('realiza')
const arestaSel = ref<string | null>(null)

// teclas modificadoras globais
let spaceOn = false
let shiftOn = false
let ctrlOn = false
let panAtivo = false
let panStart = { x: 0, y: 0, px: 0, py: 0 }

const W_NO = 280
const H_NO = 190

const nosFiltrados = computed(() => {
  const t = ui.state.buscaTexto.trim().toLowerCase()
  const fe = ui.state.filtroEstado
  const fo = ui.state.filtroOwner
  return [...graph.state.nos]
    .filter((n) => {
      if (t && !(n.titulo.toLowerCase().includes(t) || n.id.includes(t) || n.owner.includes(t))) return false
      if (fe && n.status !== fe) return false
      if (fo && n.owner !== fo) return false
      return true
    })
    .sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
})

const transform = computed(() => `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`)

// ?selecionado= reflete seleção (default ft-confirmar)
onMounted(() => {
  const q = route.query.selecionado
  if (typeof q === 'string' && graph.noPorId(q)) graph.selecionar(q)
  else if (!graph.state.selecionadoId) graph.selecionar('ft-confirmar')
  window.addEventListener('keydown', onGlobalKeyDown, true)
  window.addEventListener('keyup', onGlobalKeyUp, true)
  canvasRef.value?.addEventListener('wheel', onWheelNative, { passive: false })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeyDown, true)
  window.removeEventListener('keyup', onGlobalKeyUp, true)
  canvasRef.value?.removeEventListener('wheel', onWheelNative)
})

function onGlobalKeyDown(e: KeyboardEvent) {
  if (e.key === ' ') spaceOn = true
  if (e.key === 'Shift') shiftOn = true
  if (e.key === 'Control' || e.key === 'Meta') ctrlOn = true
}
function onGlobalKeyUp(e: KeyboardEvent) {
  if (e.key === ' ') spaceOn = false
  if (e.key === 'Shift') shiftOn = false
  if (e.key === 'Control' || e.key === 'Meta') ctrlOn = false
}

import { watch } from 'vue'
watch(
  () => graph.state.selecionadoId,
  (id) => {
    const atual = route.query.selecionado
    if ((id ?? null) !== (typeof atual === 'string' ? atual : null)) {
      router.replace({ path: '/canvas', query: id ? { selecionado: id } : {} })
    }
  }
)

function paraMundo(ev: PointerEvent | MouseEvent | WheelEvent): { x: number; y: number } {
  const rect = espacoRef.value!.getBoundingClientRect()
  return {
    x: (ev.clientX - rect.left - panX.value) / zoom.value,
    y: (ev.clientY - rect.top - panY.value) / zoom.value
  }
}

function snap(v: number, semSnap: boolean): number {
  if (semSnap) return Math.round(v)
  return Math.round(v / 4) * 4
}

// --- pan do fundo / caixa de seleção ---
// Middle-pan (CANVAS A): botão do meio move em qualquer ferramenta.
const middlePan = ref(false)

function iniciarPan(ev: PointerEvent) {
  panAtivo = true
  panStart = { x: ev.clientX, y: ev.clientY, px: panX.value, py: panY.value }
  ;(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId)
}

function onPointerDownFundo(ev: PointerEvent) {
  if ((ev.target as HTMLElement).closest('[role="button"], button, input, textarea, select, a')) return
  if (conexao.value) return
  // Middle-press inicia pan em qualquer ferramenta; suprime caixa e autoscroll.
  if (ev.button === 1) {
    ev.preventDefault()
    middlePan.value = true
    iniciarPan(ev)
    return
  }
  const querPan = ui.state.ferramenta === 'hand' || spaceOn
  if (!querPan) {
    const p = paraMundo(ev)
    caixa.value = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }
    return
  }
  iniciarPan(ev)
}
function onPointerMoveFundo(ev: PointerEvent) {
  if (conexao.value) {
    const p = paraMundo(ev)
    conexao.value.mx = p.x
    conexao.value.my = p.y
    return
  }
  if (caixa.value) {
    const p = paraMundo(ev)
    caixa.value.x2 = p.x
    caixa.value.y2 = p.y
    return
  }
  if (!panAtivo) return
  panX.value = panStart.px + (ev.clientX - panStart.x)
  panY.value = panStart.py + (ev.clientY - panStart.y)
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
    multiSel.value = graph.state.nos
      .filter((n) => n.x + W_NO >= x1 && n.x <= x2 && n.y + H_NO >= y1 && n.y <= y2)
      .map((n) => n.id)
    caixa.value = null
  }
}

// --- nós ---
const dragBase = new Map<string, { x: number; y: number }>()

function onMoverNo(id: string, dx: number, dy: number) {
  if (dragBase.size === 0) {
    graph.beginDrag()
    const alvos = multiSel.value.includes(id) ? multiSel.value : [id]
    for (const aid of alvos) {
      const n = graph.noPorId(aid)
      if (n) dragBase.set(aid, { x: n.x, y: n.y })
    }
  }
  const semSnap = ctrlOn
  for (const [aid, base] of dragBase) {
    graph.moverNo(aid, snap(base.x + dx / zoom.value, semSnap), snap(base.y + dy / zoom.value, semSnap))
  }
}
function onFimMoverNo(id: string) {
  dragBase.clear()
  graph.commitMoverNo(id)
}

function onSelecionarNo(id: string) {
  arestaSel.value = null
  if (ui.state.preview) {
    graph.selecionar(id)
    project.aprofundar()
    return
  }
  if (shiftOn) {
    if (multiSel.value.includes(id)) multiSel.value = multiSel.value.filter((x) => x !== id)
    else multiSel.value = [...multiSel.value, id]
    return
  }
  multiSel.value = []
  graph.selecionar(id)
  if (ui.state.ferramenta === 'comment') ui.setTab('copilot')
}

function onAprofundar() {
  project.aprofundar()
}

function onIniciarConexao(id: string, _lado: string, ev: PointerEvent) {
  const p = paraMundo(ev)
  conexao.value = { de: id, tipo: tipoConexao.value, mx: p.x, my: p.y }
  const move = (m: PointerEvent) => {
    const q = paraMundo(m)
    if (conexao.value) {
      conexao.value.mx = q.x
      conexao.value.my = q.y
    }
  }
  const up = (u: PointerEvent) => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    const el = document.elementFromPoint(u.clientX, u.clientY)?.closest?.('[data-nodo]')
    const para = el?.getAttribute('data-nodo')
    if (para && para !== id) {
      graph.criarAresta(id, para, conexao.value?.tipo ?? 'realiza', users.state.currentUserId)
    }
    conexao.value = null
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// --- ações ---
function zoomIn() {
  zoom.value = Math.min(2, Math.round((zoom.value + 0.15) * 100) / 100)
}
function zoomOut() {
  zoom.value = Math.max(0.4, Math.round((zoom.value - 0.15) * 100) / 100)
}
function fit() {
  const el = canvasRef.value
  if (!el || graph.state.nos.length === 0) return
  const rect = el.getBoundingClientRect()
  const xs = graph.state.nos.map((n) => n.x)
  const ys = graph.state.nos.map((n) => n.y)
  const minX = Math.min(...xs) - 60
  const minY = Math.min(...ys) - 60
  const maxX = Math.max(...xs.map((x) => x + W_NO)) + 60
  const maxY = Math.max(...ys.map((y) => y + H_NO)) + 60
  const z = Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY), 1.5)
  zoom.value = Math.round(z * 100) / 100
  panX.value = (rect.width - (maxX - minX) * zoom.value) / 2 - minX * zoom.value
  panY.value = (rect.height - (maxY - minY) * zoom.value) / 2 - minY * zoom.value
}
function navegarPara(x: number, y: number) {
  const el = canvasRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  panX.value = rect.width / 2 - x * zoom.value
  panY.value = rect.height / 2 - y * zoom.value
}
function onWheelNative(ev: WheelEvent) {
  ev.preventDefault()
  if (ev.ctrlKey || ev.metaKey) {
    const f = ev.deltaY < 0 ? 1.1 : 0.9
    zoom.value = Math.min(2, Math.max(0.4, Math.round(zoom.value * f * 100) / 100))
  } else {
    panX.value -= ev.deltaX
    panY.value -= ev.deltaY
  }
}
function adicionarNo() {
  const el = canvasRef.value
  const rect = el?.getBoundingClientRect()
  const cx = rect ? (rect.width / 2 - panX.value) / zoom.value - W_NO / 2 : 300
  const cy = rect ? (rect.height / 2 - panY.value) / zoom.value - H_NO / 2 : 200
  const no = graph.criarNo(
    {
      tipo: 'feature',
      titulo: 'Nova feature',
      descricao: 'Descreva a capacidade e o benefício.',
      gate: 'G2',
      x: snap(cx, false),
      y: snap(cy, false)
    },
    users.state.currentUserId
  )
  graph.selecionar(no.id)
}
function duplicarSelecionado() {
  const id = graph.state.selecionadoId
  if (!id) return
  const c = graph.duplicarNo(id, users.state.currentUserId)
  if (c) graph.selecionar(c.id)
}
function deletarSelecionado() {
  if (arestaSel.value) {
    graph.removerAresta(arestaSel.value, users.state.currentUserId)
    arestaSel.value = null
    return
  }
  const ids = multiSel.value.length > 0 ? multiSel.value : graph.state.selecionadoId ? [graph.state.selecionadoId] : []
  for (const id of ids) graph.removerNo(id, users.state.currentUserId)
  multiSel.value = []
}
function nudge(dx: number, dy: number) {
  const ids = multiSel.value.length > 0 ? multiSel.value : graph.state.selecionadoId ? [graph.state.selecionadoId] : []
  if (ids.length === 0) return
  graph.beginDrag()
  for (const id of ids) {
    const n = graph.noPorId(id)
    if (n) graph.moverNo(id, n.x + dx, n.y + dy)
  }
  graph.commitMoverNo(ids[0])
}
function onDuploCliqueVazio(ev: MouseEvent) {
  if ((ev.target as HTMLElement).closest('[data-nodo], button, a')) return
  const p = paraMundo(ev)
  const no = graph.criarNo(
    {
      tipo: 'feature',
      titulo: 'Nova feature',
      descricao: 'Descreva a capacidade e o benefício.',
      gate: 'G2',
      x: snap(p.x - 140, ctrlOn),
      y: snap(p.y - 60, ctrlOn)
    },
    users.state.currentUserId
  )
  graph.selecionar(no.id)
}

function onKeydownCanvas(ev: KeyboardEvent) {
  const tag = (ev.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (ev.target as HTMLElement)?.isContentEditable) return
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
    ev.preventDefault()
    if (ev.shiftKey) graph.redo()
    else graph.undo()
    return
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') {
    ev.preventDefault()
    duplicarSelecionado()
    return
  }
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    deletarSelecionado()
    return
  }
  if (ev.key === 'Escape') {
    graph.selecionar(null)
    multiSel.value = []
    arestaSel.value = null
    return
  }
  if (ev.key === 'v' || ev.key === 'V') ui.setFerramenta('select')
  else if (ev.key === 'h' || ev.key === 'H') ui.setFerramenta('hand')
  else if (ev.key === 'p' || ev.key === 'P') ui.alternarPreview()
  else if (ev.key === '0') fit()
  else if (ev.key === '+' || ev.key === '=') zoomIn()
  else if (ev.key === '-' || ev.key === '_') zoomOut()
  else if (ev.key.startsWith('Arrow')) {
    const passo = ev.shiftKey ? 8 : 1
    if (ev.key === 'ArrowLeft') nudge(-passo, 0)
    else if (ev.key === 'ArrowRight') nudge(passo, 0)
    else if (ev.key === 'ArrowUp') nudge(0, -passo)
    else if (ev.key === 'ArrowDown') nudge(0, passo)
    ev.preventDefault()
  }
}

defineExpose({ fit, navegarPara, zoomIn, zoomOut })
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-1 gap-0">
    <CanvasToolbar
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @fit="fit"
      @tidy="graph.tidy()"
      @undo="graph.undo()"
      @redo="graph.redo()"
      @adicionar="adicionarNo"
    />

    <div class="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <div class="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <label class="flex items-center gap-1">
          Tipo da próxima conexão
          <select v-model="tipoConexao" class="rounded-btn border border-nexo-border bg-white px-2 py-1">
            <option value="contem">contém</option>
            <option value="realiza">realiza</option>
            <option value="consome">consome</option>
            <option value="valida">valida</option>
            <option value="restringe">restringe</option>
            <option value="impacta">impacta</option>
          </select>
        </label>
        <span v-if="multiSel.length > 0" class="rounded-badge bg-nexo-primary-soft px-2 py-1 text-nexo-primary">
          {{ multiSel.length }} selecionados (Shift+clique, caixa) —
          <button type="button" class="underline" @click="graph.agrupar(multiSel, 'grupo-' + Date.now().toString(36))">agrupar</button>
          ·
          <button type="button" class="underline" @click="graph.desagrupar(multiSel)">desagrupar</button>
          ·
          <button type="button" class="underline" @click="multiSel = []">limpar</button>
        </span>
        <span v-if="ui.state.preview" class="rounded-badge bg-nexo-approved-bg px-2 py-1 text-nexo-approved">
          Preview (P) — clique navega sem editar
        </span>
      </div>

      <div
        ref="canvasRef"
        class="canvas-dots relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-card border border-nexo-border"
        :class="middlePan || panAtivo ? 'cursor-grabbing' : ''"
        tabindex="0"
        role="application"
        aria-label="Canvas NEXO — arraste o fundo para mover, Ctrl+scroll para zoom"
        @keydown="onKeydownCanvas"
        @mousedown="($event.button === 1 ? $event.preventDefault() : undefined)"
        @auxclick="($event.button === 1 ? $event.preventDefault() : undefined)"
      >
        <div
          ref="espacoRef"
          class="absolute left-0 top-0"
          :style="{ transform, transformOrigin: '0 0', width: '2000px', height: '1400px' }"
          @pointerdown="onPointerDownFundo"
          @pointermove="onPointerMoveFundo"
          @pointerup="onPointerUpFundo"
          @dblclick="onDuploCliqueVazio"
        >
          <svg class="absolute left-0 top-0" width="2000" height="1400" aria-hidden="true">
            <defs>
              <marker id="nexo-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#1D4ED8" stroke-width="1.5" />
              </marker>
            </defs>
            <CanvasEdge
              v-for="e in graph.state.arestas.filter((a) => graph.noPorId(a.origem_id) && graph.noPorId(a.destino_id))"
              :key="e.edge_id"
              :aresta="e"
                :origem="graph.noPorId(e.origem_id)!"
              :destino="graph.noPorId(e.destino_id)!"
              :selecionada="arestaSel === e.edge_id"
              @selecionar-aresta="arestaSel = $event"
            />
            <path
              v-if="conexao && graph.noPorId(conexao.de)"
              :d="`M ${graph.noPorId(conexao.de)!.x + 280} ${graph.noPorId(conexao.de)!.y + 95} C ${(graph.noPorId(conexao.de)!.x + 280 + conexao.mx) / 2} ${graph.noPorId(conexao.de)!.y + 95}, ${(graph.noPorId(conexao.de)!.x + 280 + conexao.mx) / 2} ${conexao.my}, ${conexao.mx} ${conexao.my}`"
              fill="none"
              stroke="#1D4ED8"
              stroke-width="2"
              stroke-dasharray="6 4"
            />
          </svg>

          <div
            v-for="n in nosFiltrados"
            :key="n.id"
            :data-nodo="n.id"
            class="absolute"
            :style="{ left: n.x + 'px', top: n.y + 'px', zIndex: (n.z ?? 0) + 10 }"
          >
            <CanvasNode
              :no="n"
              :selecionado="graph.state.selecionadoId === n.id || multiSel.includes(n.id)"
              :teal="n.id === 'ft-criar'"
              :preview="ui.state.preview"
              @selecionar="onSelecionarNo"
              @aprofundar="onAprofundar"
              @iniciar-conexao="onIniciarConexao"
              @mover="onMoverNo"
              @fim-mover="onFimMoverNo"
            />
          </div>

          <div
            v-if="caixa"
            class="absolute border border-nexo-primary bg-nexo-primary/10"
            :style="{
              left: Math.min(caixa.x1, caixa.x2) + 'px',
              top: Math.min(caixa.y1, caixa.y2) + 'px',
              width: Math.abs(caixa.x2 - caixa.x1) + 'px',
              height: Math.abs(caixa.y2 - caixa.y1) + 'px'
            }"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
