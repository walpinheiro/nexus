<script setup lang="ts">
import NovaAction from '@/components/common/NovaAction.vue'
import { ref, computed, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGraph } from '@/stores/useGraph'
import { useProject } from '@/stores/useProject'
import { useUI } from '@/stores/useUI'
import { useUsers } from '@/stores/useUsers'
import CanvasNode from '@/components/canvas/CanvasNode.vue'
import CanvasEdge from '@/components/canvas/CanvasEdge.vue'
import CanvasToolbar from '@/components/canvas/CanvasToolbar.vue'
import type { Edge } from '@/types/nexo'
import { adjustCanvasZoom, CANVAS_MAX_ZOOM, clientToWorld, edgePathToPoint, fitViewportToBounds, handlePoint, layoutMeasuredNodes, nearestHandle, NODE_DEFAULT_HEIGHT, NODE_WIDTH, usableCanvasRect, type CanvasHandle, type CanvasRect } from './geometry'

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
const toolbarRef = ref<HTMLDivElement | null>(null)
const espacoRef = ref<HTMLDivElement | null>(null)
const liveMessage = ref('')
const medidasNos = reactive<Record<string, { width: number; height: number }>>({})
const elementosNos = new Map<string, HTMLElement>()
let nodeObserver: ResizeObserver | null = null
let viewportObserver: ResizeObserver | null = null

// seleção múltipla + caixa + conexão + aresta
const multiSel = ref<string[]>([])
const caixa = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
const conexao = ref<{ de: string; tipo: Edge['tipo']; mx: number; my: number; origemHandle: CanvasHandle; teclado: boolean } | null>(null)
const tipoConexao = ref<Edge['tipo']>('realiza')
const ladoRotulo: Record<CanvasHandle, string> = { l: 'esquerda', r: 'direita', t: 'superior', b: 'inferior' }
const arestaSel = ref<string | null>(null)

// teclas modificadoras globais
let spaceOn = false
let shiftOn = false
let ctrlOn = false
let panAtivo = false
let panStart = { x: 0, y: 0, px: 0, py: 0 }
let panNoStart: { panX: number; panY: number } | null = null

function tamanhoNo(id: string) {
  return medidasNos[id] ?? { width: NODE_WIDTH, height: NODE_DEFAULT_HEIGHT }
}
function organizarNosMedidos() {
  graph.aplicarLayout(layoutMeasuredNodes(graph.state.nos, medidasNos))
}
function rectNo(id: string): CanvasRect | null {
  const no = graph.noPorId(id)
  if (!no) return null
  const size = tamanhoNo(id)
  return { x: no.x, y: no.y, width: size.width, height: size.height }
}
function refNo(id: string, el: Element | null) {
  const anterior = elementosNos.get(id)
  if (anterior === el) return
  if (anterior) nodeObserver?.unobserve(anterior)
  if (!el || !(el instanceof HTMLElement)) {
    elementosNos.delete(id)
    delete medidasNos[id]
    return
  }
  elementosNos.set(id, el)
  nodeObserver?.observe(el)
  medidasNos[id] = { width: el.offsetWidth || NODE_WIDTH, height: el.offsetHeight || NODE_DEFAULT_HEIGHT }
}

function viewportInsets() {
  const width = canvasRef.value?.clientWidth ?? window.innerWidth
  const height = canvasRef.value?.clientHeight ?? window.innerHeight
  const mobile = width <= 720
  const canvasTop = canvasRef.value?.getBoundingClientRect().top ?? 0
  const toolbarTopInset = toolbarRef.value
    ? toolbarRef.value.getBoundingClientRect().bottom - canvasTop + 12
    : (mobile ? 104 : 64)
  if (graph.state.selecionadoId) {
    return mobile
      ? { left: 12, right: 12, top: Math.max(64, toolbarTopInset), bottom: height * 0.6 + 12 }
      : { left: 64, right: 376, top: Math.max(64, toolbarTopInset), bottom: 16 }
  }
  return { left: 64, right: 64, top: Math.max(64, toolbarTopInset), bottom: mobile ? 16 : 88 }
}

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
const caminhoConexao = computed(() => {
  const c = conexao.value
  if (!c) return ''
  const rect = rectNo(c.de)
  return rect ? edgePathToPoint(rect, { x: c.mx, y: c.my }, c.origemHandle) : ''
})

// ?selecionado= reflete seleção (default ft-confirmar)
onMounted(() => {
  nodeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const id = [...elementosNos.entries()].find(([, el]) => el === entry.target)?.[0]
      if (id && entry.target instanceof HTMLElement) {
        // Keep measurements in border-box coordinates, matching refNo() and the node's ports.
        medidasNos[id] = { width: entry.target.offsetWidth || NODE_WIDTH, height: entry.target.offsetHeight || NODE_DEFAULT_HEIGHT }
      }
    }
  })
  viewportObserver = new ResizeObserver(() => {
    const id = graph.state.selecionadoId
    if (id) void nextTick(() => centralizarNo(id))
  })
  if (canvasRef.value) viewportObserver.observe(canvasRef.value)
  if (toolbarRef.value) viewportObserver.observe(toolbarRef.value)
  for (const el of elementosNos.values()) nodeObserver.observe(el)
  const q = route.query.selecionado
  if (typeof q === 'string' && graph.noPorId(q)) graph.selecionar(q)
  else if (!graph.state.selecionadoId) graph.selecionar('ft-confirmar')
  void nextTick(() => {
    const selectedId = typeof q === 'string' && graph.noPorId(q) ? q : graph.state.selecionadoId
    if (selectedId) centralizarNo(selectedId)
    else fit()
  })
  window.addEventListener('keydown', onGlobalKeyDown, true)
  window.addEventListener('keyup', onGlobalKeyUp, true)
  canvasRef.value?.addEventListener('wheel', onWheelNative, { passive: false })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeyDown, true)
  window.removeEventListener('keyup', onGlobalKeyUp, true)
  canvasRef.value?.removeEventListener('wheel', onWheelNative)
  nodeObserver?.disconnect()
  viewportObserver?.disconnect()
  elementosNos.clear()
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

watch(
  () => graph.state.selecionadoId,
  (id) => {
    const atual = route.query.selecionado
    if ((id ?? null) !== (typeof atual === 'string' ? atual : null)) {
      router.replace({
        path: '/canvas',
        query: { ...route.query, view: route.query.view ?? 'canvas', selecionado: id ?? undefined }
      })
    }
  }
)
watch(
  () => route.query.selecionado,
  (value) => {
    if (typeof value !== 'string' || !graph.noPorId(value)) return
    if (graph.state.selecionadoId !== value) graph.selecionar(value)
    void nextTick(() => centralizarNo(value))
  }
)

function paraMundo(ev: PointerEvent | MouseEvent | WheelEvent): { x: number; y: number } {
  const rect = canvasRef.value!.getBoundingClientRect()
  return clientToWorld({ x: ev.clientX, y: ev.clientY }, rect, { x: panX.value, y: panY.value }, zoom.value)
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
  if (ui.state.ferramenta === 'connect') return
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
      .filter((n) => n.x + tamanhoNo(n.id).width >= x1 && n.x <= x2 && n.y + tamanhoNo(n.id).height >= y1 && n.y <= y2)
      .map((n) => n.id)
    caixa.value = null
  }
}

// --- nós ---
const dragBase = new Map<string, { x: number; y: number }>()

function onMoverNo(id: string, dx: number, dy: number) {
  if (ui.state.ferramenta === 'hand') {
    if (!panNoStart) panNoStart = { panX: panX.value, panY: panY.value }
    panX.value = panNoStart.panX + dx
    panY.value = panNoStart.panY + dy
    return
  }
  if (ui.state.ferramenta !== 'select') return
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
  if (ui.state.ferramenta === 'hand') {
    panNoStart = null
    return
  }
  if (dragBase.size === 0) return
  dragBase.clear()
  graph.commitMoverNo(id)
}

function onSelecionarNo(id: string) {
  arestaSel.value = null
  if (ui.state.ferramenta === 'hand') return
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
  void nextTick(() => centralizarNo(id))
  if (ui.state.ferramenta === 'comment') ui.setTab('copilot')
}

function onAprofundar() {
  project.aprofundar()
}

function onIniciarConexao(id: string, lado: CanvasHandle, ev: PointerEvent) {
  if (ui.state.ferramenta !== 'connect') return
  const p = paraMundo(ev)
  conexao.value = { de: id, tipo: tipoConexao.value, mx: p.x, my: p.y, origemHandle: lado, teclado: false }
  liveMessage.value = ''
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
    const hit = document.elementFromPoint(u.clientX, u.clientY) as HTMLElement | null
    const handle = hit?.closest<HTMLElement>('[data-handle]')
    const nodeEl = handle?.closest<HTMLElement>('[data-nodo]') ?? hit?.closest<HTMLElement>('[data-nodo]')
    const para = nodeEl?.getAttribute('data-nodo')
    if (para && para !== id) {
      const targetRect = rectNo(para)
      const targetSide = handle?.dataset.handle as CanvasHandle | undefined
        ?? (targetRect ? nearestHandle(targetRect, paraMundo(u)) : 'l')
      completarConexao(para, targetSide)
    } else {
      conexao.value = null
    }
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function iniciarConexaoTeclado(id: string, lado: CanvasHandle) {
  const rect = rectNo(id)
  if (!rect) return
  const point = handlePoint(rect, lado)
  conexao.value = { de: id, tipo: tipoConexao.value, mx: point.x, my: point.y, origemHandle: lado, teclado: true }
  liveMessage.value = `Conexão iniciada em ${graph.noPorId(id)?.titulo ?? id}, lado ${ladoRotulo[lado]}. Escolha o handle de outro nó e pressione Enter. Escape cancela.`
}

function ativarHandleTeclado(id: string, lado: CanvasHandle) {
  if (ui.state.ferramenta !== 'connect') return
  if (!conexao.value) {
    iniciarConexaoTeclado(id, lado)
    return
  }
  if (conexao.value.teclado && conexao.value.de !== id) completarConexao(id, lado)
}

function completarConexao(destinoId: string, destinoHandle: CanvasHandle) {
  const ativa = conexao.value
  if (!ativa || ativa.de === destinoId) return
  const aresta = graph.criarAresta(ativa.de, destinoId, ativa.tipo, users.state.currentUserId, '', {
    origemHandle: ativa.origemHandle,
    destinoHandle
  })
  if (aresta) liveMessage.value = `Conexão criada entre ${graph.noPorId(ativa.de)?.titulo ?? ativa.de} e ${graph.noPorId(destinoId)?.titulo ?? destinoId}.`
  conexao.value = null
}

// --- ações ---
function zoomIn() {
  zoom.value = adjustCanvasZoom(zoom.value, 0.15)
}
function zoomOut() {
  zoom.value = adjustCanvasZoom(zoom.value, -0.15)
}
function fit() {
  const el = canvasRef.value
  if (!el || graph.state.nos.length === 0) return
  const rect = el.getBoundingClientRect()
  const left = Math.min(...graph.state.nos.map((n) => n.x))
  const top = Math.min(...graph.state.nos.map((n) => n.y))
  const right = Math.max(...graph.state.nos.map((n) => n.x + tamanhoNo(n.id).width))
  const bottom = Math.max(...graph.state.nos.map((n) => n.y + tamanhoNo(n.id).height))
  const fit = fitViewportToBounds(rect.width, rect.height, { x: left, y: top, width: right - left, height: bottom - top }, viewportInsets())
  if (!fit) return
  zoom.value = fit.zoom
  panX.value = fit.panX
  panY.value = fit.panY
}
function navegarPara(x: number, y: number) {
  const el = canvasRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const usable = usableCanvasRect(rect.width, rect.height, viewportInsets())
  panX.value = usable.centerX - x * zoom.value
  panY.value = usable.centerY - y * zoom.value
}
function centralizarNo(id: string) {
  const rect = rectNo(id)
  const el = canvasRef.value
  if (!rect || !el) return
  const fit = fitViewportToBounds(el.clientWidth, el.clientHeight, rect, viewportInsets(), 16, zoom.value)
  if (!fit) return
  zoom.value = fit.zoom
  panX.value = fit.panX
  panY.value = fit.panY
}
function onWheelNative(ev: WheelEvent) {
  ev.preventDefault()
  if (ev.ctrlKey || ev.metaKey) {
    const f = ev.deltaY < 0 ? 1.1 : 0.9
    zoom.value = adjustCanvasZoom(zoom.value * f, 0, undefined, CANVAS_MAX_ZOOM)
  } else {
    panX.value -= ev.deltaX
    panY.value -= ev.deltaY
  }
}
function adicionarNo() {
  const el = canvasRef.value
  const rect = el?.getBoundingClientRect()
  const usable = rect ? usableCanvasRect(rect.width, rect.height, viewportInsets()) : null
  const cx = rect && usable ? (usable.centerX - panX.value) / zoom.value - NODE_WIDTH / 2 : 300
  const cy = rect && usable ? (usable.centerY - panY.value) / zoom.value - NODE_DEFAULT_HEIGHT / 2 : 200
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
  if (ui.state.ferramenta === 'connect') return
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
  const target = ev.target as HTMLElement
  const tag = target?.tagName
  if (target?.closest('.canvas-floating-tools') || tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
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
    if (conexao.value) {
      conexao.value = null
      liveMessage.value = 'Conexão cancelada.'
      ev.preventDefault()
      return
    }
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

defineExpose({ fit, navegarPara, centralizarNo, zoomIn, zoomOut, medidasNos })
</script>

<template>
  <div class="h-full min-h-0 w-full min-w-0 flex-1">
    <div class="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <div v-if="multiSel.length > 0 || ui.state.preview" class="absolute left-14 top-2 z-30 flex min-h-0 flex-wrap items-center gap-2 text-xs">
        <span v-if="multiSel.length > 0" class="rounded-badge bg-nexo-primary-soft px-2 py-1 text-nexo-primary">
          {{ multiSel.length }} selecionados (Shift+clique, caixa) —
          <NovaAction type="button" class="underline" @click="graph.agrupar(multiSel, 'grupo-' + Date.now().toString(36))">agrupar</NovaAction>
          ·
          <NovaAction type="button" class="underline" @click="graph.desagrupar(multiSel)">desagrupar</NovaAction>
          ·
          <NovaAction type="button" class="underline" @click="multiSel = []">limpar</NovaAction>
        </span>
        <span v-if="ui.state.preview" class="rounded-badge bg-nexo-approved-bg px-2 py-1 text-nexo-approved">
          Preview (P) — clique navega sem editar
        </span>
      </div>

      <div
        ref="canvasRef"
        class="canvas-dots relative h-full min-h-0 w-full min-w-0 flex-1 overflow-clip"
        :class="middlePan || panAtivo ? 'cursor-grabbing' : ''"
        tabindex="0"
        role="application"
        aria-label="Canvas NEXO — arraste o fundo para mover, Ctrl+scroll para zoom"
        @keydown="onKeydownCanvas"
        @mousedown="($event.button === 1 ? $event.preventDefault() : undefined)"
        @auxclick="($event.button === 1 ? $event.preventDefault() : undefined)"
      >
        <p class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</p>
        <div class="sr-only" role="group" aria-label="Conexões do grafo">
          <button
            v-for="edge in graph.state.arestas.filter((item) => graph.noPorId(item.origem_id) && graph.noPorId(item.destino_id))"
            :key="edge.edge_id"
            type="button"
            class="focus:not-sr-only focus:fixed focus:left-24 focus:top-24 focus:z-[70] focus:rounded-btn focus:border focus:border-nexo-primary focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
            :aria-label="`${edge.tipo}: ${graph.noPorId(edge.origem_id)?.titulo ?? edge.origem_id} para ${graph.noPorId(edge.destino_id)?.titulo ?? edge.destino_id}`"
            :aria-pressed="arestaSel === edge.edge_id"
            @click.stop="arestaSel = edge.edge_id; liveMessage = `Conexão ${edge.tipo} selecionada.`"
          >
            {{ edge.tipo }}: {{ graph.noPorId(edge.origem_id)?.titulo ?? edge.origem_id }} → {{ graph.noPorId(edge.destino_id)?.titulo ?? edge.destino_id }}
          </button>
        </div>
        <div ref="toolbarRef" class="canvas-toolbar-position absolute left-1/2 top-3 z-[60] max-w-[calc(100%-2rem)] -translate-x-1/2" @pointerdown.stop @wheel.stop>
          <CanvasToolbar
            v-model:tipo-conexao="tipoConexao"
            @zoom-in="zoomIn"
            @zoom-out="zoomOut"
            @fit="fit"
            @tidy="organizarNosMedidos()"
            @undo="graph.undo()"
            @redo="graph.redo()"
            @adicionar="adicionarNo"
          />
        </div>
        <div
          ref="espacoRef"
          class="absolute left-0 top-0"
          :style="{ transform, transformOrigin: '0 0', width: '2000px', height: '1400px' }"
          @pointerdown="onPointerDownFundo"
          @pointermove="onPointerMoveFundo"
          @pointerup="onPointerUpFundo"
          @dblclick="onDuploCliqueVazio"
        >
          <svg class="absolute left-0 top-0" width="2000" height="1400">
            <defs>
              <marker id="nexo-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="context-stroke" stroke-width="1.5" />
              </marker>
            </defs>
            <CanvasEdge
              v-for="e in graph.state.arestas.filter((a) => graph.noPorId(a.origem_id) && graph.noPorId(a.destino_id))"
              :key="e.edge_id"
              :aresta="e"
                :origem="graph.noPorId(e.origem_id)!"
              :destino="graph.noPorId(e.destino_id)!"
              :origem-size="tamanhoNo(e.origem_id)"
              :destino-size="tamanhoNo(e.destino_id)"
              :selecionada="arestaSel === e.edge_id"
              @selecionar-aresta="arestaSel = $event"
            />
            <path
              v-if="conexao && graph.noPorId(conexao.de)"
              :d="caminhoConexao"
              fill="none"
              stroke="var(--v-color-primary)"
              stroke-width="2"
              stroke-dasharray="6 4"
            />
          </svg>

          <div
            v-for="n in nosFiltrados"
            :key="n.id"
            :ref="(el) => refNo(n.id, el as Element | null)"
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
              @ativar-handle="ativarHandleTeclado"
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

<style scoped>
.canvas-dots {
  container-type: inline-size;
}

@container (max-width: 720px) {
  .canvas-toolbar-position {
    top: 64px;
    max-width: calc(100% - 32px);
  }
}
</style>
