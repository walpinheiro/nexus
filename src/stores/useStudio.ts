import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { StudioDoc, StudioFrame, StudioGroup, StudioItem } from '@/types/studio'

const KEY = 'nexo.v1.studio'

function rid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function seedDoc(): StudioDoc {
  return {
    title: 'Cobranças Pix',
    brief: 'Protótipo de telas do pagamento por Pix (espelha as 4 features NEXO).',
    frame: 'phone',
    platform: 'web',
    paletteKey: 'blue',
    theme: { palette: 'blue', scheme: 'blue', type: 'expressive', radius: 'rounded' },
    frames: [
      { id: 'checkout', name: 'Checkout Web', x: 0, y: 0, w: 1280, h: 800, preset: 'desktop', note: 'Criar cobrança Pix + status de pagamento.' },
      { id: 'pagpix', name: 'Pagamento Pix', x: 1400, y: 0, w: 412, h: 892, preset: 'phone', note: 'Pagar fatura com Pix; abre Checkout Web.' }
    ],
    groups: [
      {
        id: 'g-web',
        x: 28,
        y: 60,
        axis: 'x',
        order: 0,
        items: [{ id: 't1', kind: 'text', label: 'Criar cobrança Pix', size: 28, x: 28, y: 60 }]
      },
      {
        id: 'g-bar',
        x: 1400,
        y: 0,
        axis: 'x',
        order: 1,
        items: [{ id: 'bar1', kind: 'topAppBar', label: 'Pagamento Pix', icon: 'menu', variant: 'filled', x: 1400, y: 0 }]
      },
      {
        id: 'g-list',
        x: 1416,
        y: 112,
        axis: 'y',
        order: 2,
        items: [
          { id: 'c1', kind: 'card', label: 'Pagar fatura com Pix', supporting: 'Pix de forma simples e segura.', variant: 'filled', action: { to: 'checkout', transition: 'slide' }, x: 1416, y: 112 },
          { id: 'c2', kind: 'card', label: 'Confirmação idempotente', supporting: 'Sem transações duplicadas.', variant: 'filled', x: 1416, y: 350 },
          { id: 'c3', kind: 'card', label: 'Status de pagamento', supporting: 'Exibe o status da cobrança.', variant: 'outlined', x: 1416, y: 588 }
        ]
      },
      {
        id: 'g-pay',
        x: 1416,
        y: 700,
        axis: 'x',
        order: 3,
        items: [{ id: 'b1', kind: 'button', label: 'Pagar com Pix', variant: 'filled', size: 380, action: { to: 'checkout', transition: 'slide' }, note: 'Cria cobrança e abre o checkout.', x: 1416, y: 700 }]
      }
    ]
  }
}

function load(): { doc: StudioDoc; screenId: string } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as { doc: StudioDoc; screenId: string; v?: number }
      if (s.doc && Array.isArray(s.doc.frames)) {
        // web-only (diretriz Bússola): migra docs antigos android → web
        if ((s.doc.platform as string) !== 'web') s.doc.platform = 'web'
        // backfill order: grupos antigos sem order ganham índice estável (sem empates)
        let i = 0
        const vistos = new Set<number>()
        for (const g of s.doc.groups) {
          if (typeof g.order !== 'number') {
            let o = i
            while (vistos.has(o)) o++
            g.order = o
            vistos.add(o)
          } else if (vistos.has(g.order)) {
            let o = g.order + 1
            while (vistos.has(o)) o++
            g.order = o
            vistos.add(o)
          } else {
            vistos.add(g.order)
          }
          i++
        }
        ;(s.doc as unknown as Record<string, unknown>).v = 2
        return s
      }
    }
  } catch {
    // usa seed
  }
  return { doc: seedDoc(), screenId: 'checkout' }
}

export interface StudioSnapshot {
  doc: StudioDoc
  screenId: string
}

export const useStudio = defineStore('studio', () => {
  const loaded = load()
  const doc = ref<StudioDoc>(loaded.doc)
  const screenId = ref<string>(loaded.screenId)
  const selecionados = ref<string[]>([])
  const preview = ref(false)
  const zoom = ref(0.7)
  const pan = ref<[number, number]>([20, 20])
  const undoStack = ref<StudioSnapshot[]>([])
  const redoStack = ref<StudioSnapshot[]>([])

  function persist() {
    localStorage.setItem(KEY, JSON.stringify({ doc: doc.value, screenId: screenId.value }))
  }

  if (localStorage.getItem(KEY) == null) persist()

  function snap(): StudioSnapshot {
    return {
      doc: JSON.parse(JSON.stringify(doc.value)) as StudioDoc,
      screenId: screenId.value
    }
  }

  function pushHistory() {
    undoStack.value.push(snap())
    if (undoStack.value.length > 60) undoStack.value.shift()
    redoStack.value = []
  }

  function undo(): boolean {
    const p = undoStack.value.pop()
    if (!p) return false
    redoStack.value.push(snap())
    doc.value = p.doc
    screenId.value = p.screenId
    selecionados.value = []
    persist()
    return true
  }

  function redo(): boolean {
    const n = redoStack.value.pop()
    if (!n) return false
    undoStack.value.push(snap())
    doc.value = n.doc
    screenId.value = n.screenId
    persist()
    return true
  }

  function frameAtual(): StudioFrame | undefined {
    return doc.value.frames.find((f) => f.id === screenId.value)
  }

  function todosItens(): StudioItem[] {
    return doc.value.groups.flatMap((g) => g.items)
  }

  function itemPorId(id: string): StudioItem | undefined {
    return todosItens().find((i) => i.id === id)
  }

  function adicionarFrame(w: number, h: number, nome: string): StudioFrame {
    pushHistory()
    const maxX = doc.value.frames.reduce((m, f) => Math.max(m, f.x + f.w), 0)
    const preset = w >= 1280 ? 'desktop' : 'phone'
    const f: StudioFrame = { id: rid('fr'), name: nome, x: maxX + 120, y: 0, w, h, preset }
    doc.value.frames.push(f)
    screenId.value = f.id
    persist()
    return f
  }

  function setFramePreset(id: string, preset: 'phone' | 'desktop'): void {
    const f = doc.value.frames.find((x) => x.id === id)
    if (!f) return
    pushHistory()
    f.preset = preset
    if (preset === 'phone') {
      f.w = 412
      f.h = 892
    } else {
      f.w = 1280
      f.h = 800
    }
    persist()
  }

  function gruposOrdenados(): StudioGroup[] {
    return [...doc.value.groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  function reordenarGrupos(idsTopFirst: string[]): void {
    pushHistory()
    const n = idsTopFirst.length
    idsTopFirst.forEach((id, i) => {
      const g = doc.value.groups.find((x) => x.id === id)
      if (g) g.order = n - 1 - i
    })
    persist()
  }

  function trazerFrente(id: string): void {
    const gs = gruposOrdenados()
    const i = gs.findIndex((g) => g.id === id)
    if (i < 0 || i === gs.length - 1) return
    pushHistory()
    const a = doc.value.groups.find((g) => g.id === id)!
    const b = doc.value.groups.find((g) => g.id === gs[i + 1].id)!
    const t = a.order
    a.order = b.order
    b.order = t
    persist()
  }

  function enviarTras(id: string): void {
    const gs = gruposOrdenados()
    const i = gs.findIndex((g) => g.id === id)
    if (i <= 0) return
    pushHistory()
    const a = doc.value.groups.find((g) => g.id === id)!
    const b = doc.value.groups.find((g) => g.id === gs[i - 1].id)!
    const t = a.order
    a.order = b.order
    b.order = t
    persist()
  }

  function paraFrente(id: string): void {
    pushHistory()
    const max = Math.max(...doc.value.groups.map((g) => g.order ?? 0))
    const g = doc.value.groups.find((x) => x.id === id)
    if (g) g.order = max + 1
    persist()
  }

  function paraTras(id: string): void {
    pushHistory()
    const min = Math.min(...doc.value.groups.map((g) => g.order ?? 0))
    const g = doc.value.groups.find((x) => x.id === id)
    if (g) g.order = min - 1
    persist()
  }

  function alternarLock(id: string): void {
    const g = doc.value.groups.find((x) => x.id === id)
    if (!g) return
    pushHistory()
    g.locked = !g.locked
    persist()
  }

  function renomearFrame(id: string, nome: string): void {
    pushHistory()
    const f = doc.value.frames.find((x) => x.id === id)
    if (f) f.name = nome
    persist()
  }

  function duplicarFrame(id: string): void {
    const f = doc.value.frames.find((x) => x.id === id)
    if (!f) return
    pushHistory()
    const maxX = doc.value.frames.reduce((m, x) => Math.max(m, x.x + x.w), 0)
    const nid = rid('fr')
    const dx = maxX + 80 - f.x
    doc.value.frames.push({ ...f, id: nid, name: `${f.name} (cópia)`, x: f.x + dx })
    for (const g of doc.value.groups) {
      const dentro = g.items.filter((i) => i.x >= f.x && i.x < f.x + f.w)
      if (dentro.length === 0) continue
      doc.value.groups.push({
        id: rid('g'),
        x: g.x + dx,
        y: g.y,
        axis: g.axis,
        order: Math.max(...doc.value.groups.map((x) => x.order ?? 0)) + 1,
        items: dentro.map((i) => ({ ...JSON.parse(JSON.stringify(i)), id: rid('it'), x: i.x + dx }))
      })
    }
    screenId.value = nid
    persist()
  }

  function removerFrame(id: string): boolean {
    if (doc.value.frames.length <= 1) return false
    pushHistory()
    doc.value.frames = doc.value.frames.filter((f) => f.id !== id)
    for (const i of todosItens()) {
      if (i.action?.to === id) {
        i.action = { to: 'back', transition: 'none' }
        i.note = `${i.note ?? ''} (destino removido)`.trim()
      }
    }
    if (screenId.value === id) screenId.value = doc.value.frames[0].id
    persist()
    return true
  }

  function criarItemSemHistorico(kind: string, x: number, y: number, props?: Partial<StudioItem>): StudioItem {
    const it: StudioItem = { id: rid('it'), kind, label: rotuloDefault(kind), icon: null, variant: 'filled', x: Math.round(x), y: Math.round(y), ...(props ?? {}) } as StudioItem
    const max = doc.value.groups.reduce((m, g) => Math.max(m, g.order ?? 0), -1)
    doc.value.groups.push({ id: rid('g'), x: it.x, y: it.y, axis: 'x', order: max + 1, items: [it] })
    return it
  }

  function criarItem(kind: string, x: number, y: number, label?: string): StudioItem {
    pushHistory()
    const it: StudioItem = { id: rid('it'), kind, label: label ?? rotuloDefault(kind), icon: null, variant: 'filled', x: Math.round(x), y: Math.round(y) }
    const max = doc.value.groups.reduce((m, g) => Math.max(m, g.order ?? 0), -1)
    doc.value.groups.push({ id: rid('g'), x: it.x, y: it.y, axis: 'x', order: max + 1, items: [it] })
    selecionados.value = [it.id]
    persist()
    return it
  }

  function rotuloDefault(kind: string): string {
    const mapa: Record<string, string> = {
      button: 'Botão',
      fab: '',
      chip: 'Chip',
      topAppBar: 'Título',
      bottomNav: '',
      tabs: '',
      searchBar: 'Buscar',
      card: 'Card',
      listItem: 'Item',
      dialog: 'Diálogo',
      snackbar: 'Mensagem',
      textField: 'Campo',
      select: 'Opção',
      switch: 'Alternar',
      checkbox: 'Marcar',
      radio: 'Opção',
      slider: '',
      text: 'Texto',
      image: '',
      box: '',
      divider: '',
      loadingIndicator: '',
      navRail: '',
      toolbar: '',
      extendedFab: 'Ação'
    }
    return mapa[kind] ?? kind
  }

  function redimensionarItem(id: string, w: number, h: number): void {
    const it = itemPorId(id)
    if (!it) return
    pushHistory()
    it.w = Math.max(16, Math.round(w))
    it.h = Math.max(16, Math.round(h))
    if (it.kind === 'button' || it.kind === 'chip' || it.kind === 'slider' || it.kind === 'textField' || it.kind === 'select' || it.kind === 'divider' || it.kind === 'linearProgress') {
      it.size = it.w
    }
    if (it.kind === 'image' || it.kind === 'box' || it.kind === 'card' || it.kind === 'camera' || it.kind === 'map') {
      it.size = it.w
      it.size2 = it.h
    }
    persist()
  }

  function moverItens(ids: string[], dx: number, dy: number): void {
    for (const id of ids) {
      const it = itemPorId(id)
      if (it) {
        it.x = Math.round(it.x + dx)
        it.y = Math.round(it.y + dy)
      }
    }
    persist()
  }

  function removerItens(ids: string[]): void {
    if (ids.length === 0) return
    pushHistory()
    const set = new Set(ids)
    for (const g of doc.value.groups) g.items = g.items.filter((i) => !set.has(i.id))
    doc.value.groups = doc.value.groups.filter((g) => g.items.length > 0)
    selecionados.value = []
    persist()
  }

  function duplicarItens(ids: string[]): void {
    if (ids.length === 0) return
    pushHistory()
    const novos: string[] = []
    for (const g of doc.value.groups) {
      const cop = g.items
        .filter((i) => ids.includes(i.id))
        .map((i) => ({ ...JSON.parse(JSON.stringify(i)), id: rid('it'), x: i.x + 24, y: i.y + 24 }) as StudioItem)
      g.items.push(...cop)
      novos.push(...cop.map((c) => c.id))
    }
    selecionados.value = novos
    persist()
  }

  function tidy(): void {
    pushHistory()
    const f = frameAtual()
    if (!f) return
    const ESPACO = 16
    const itens = todosItens()
      .filter((i) => i.x >= f.x && i.x < f.x + f.w)
      .sort((a, b) => a.y - b.y || a.x - b.x)
    let y = f.y + 110
    for (const it of itens) {
      if (it.kind === 'topAppBar' || it.kind === 'bottomNav') continue
      it.x = f.x + 16
      it.y = y
      const h = it.h ?? it.size2 ?? 80
      y += h + ESPACO
    }
    persist()
  }

  function importarDoc(novo: StudioDoc): void {
    pushHistory()
    if ((novo.platform as string) !== 'web') novo.platform = 'web'
    doc.value = novo
    screenId.value = novo.frames[0]?.id ?? screenId.value
    selecionados.value = []
    persist()
  }

  return {
    doc,
    screenId,
    selecionados,
    preview,
    zoom,
    pan,
    undoStack,
    redoStack,
    persist,
    pushHistory,
    undo,
    redo,
    frameAtual,
    todosItens,
    itemPorId,
    adicionarFrame,
    setFramePreset,
    gruposOrdenados,
    reordenarGrupos,
    trazerFrente,
    enviarTras,
    paraFrente,
    paraTras,
    alternarLock,
    renomearFrame,
    duplicarFrame,
    removerFrame,
    criarItem,
    criarItemSemHistorico,
    moverItens,
    removerItens,
    duplicarItens,
    tidy,
    redimensionarItem,
    importarDoc
  }
})
