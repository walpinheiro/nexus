import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuditEvent, Edge, ImpactPlan, NexoObject, NexoStatus, ProposePatch, Waiver } from '@/types/nexo'
import { seedEdges, seedEnquadramento, seedEpico, seedFeatures, seedPbis } from '@/data/seed'
import { useProjects } from '@/stores/useProjects'

const KEY = 'nexo.v1.graph'
const KEY_PATCH = 'nexo.v1.patches'
const KEY_AUDIT = 'nexo.v1.audit'

interface GraphState {
  nos: NexoObject[]
  arestas: Edge[]
  selecionadoId: string | null
}

function loadGraph(): GraphState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as GraphState
      // migração: garante x/y/z em nós antigos
      const coords: Record<string, { x: number; y: number; z: number }> = {
        'enq-pix': { x: 600, y: -100, z: 0 },
        'ft-pagar': { x: 120, y: 220, z: 1 },
        'ft-confirmar': { x: 480, y: 330, z: 2 },
        'ft-criar': { x: 840, y: 220, z: 3 },
        'ft-status': { x: 480, y: 590, z: 4 }
      }
      let i = 0
      for (const n of s.nos) {
        if (typeof n.x !== 'number' || typeof n.y !== 'number') {
          const c = coords[n.id] ?? { x: 120 + (i % 4) * 320, y: 220 + Math.floor(i / 4) * 260, z: i }
          n.x = c.x
          n.y = c.y
          n.z = typeof n.z === 'number' ? n.z : c.z
        }
        // migração sem perda GATES-CHECKS: backfill de campos novos
        const r = n as unknown as Record<string, unknown>
        if (n.tipo === 'pbi' && !Array.isArray(r['criterios_bdd'])) r['criterios_bdd'] = []
        if ((n.tipo === 'feature' || n.tipo === 'pbi') && !Array.isArray(r['permissoes'])) r['permissoes'] = []
        if (n.tipo === 'feature' && !Array.isArray(r['telas_estados'])) r['telas_estados'] = []
        if (!('evidencia' in r)) r['evidencia'] = {}
        if (!('nfrs' in r)) r['nfrs'] = []
        i++
      }
      if (!s.nos.some((n) => n.gate === 'G0' || n.id === 'enq-pix')) {
        s.nos.unshift(seedEnquadramento as NexoObject)
      }
      return s
    }
  } catch {
    // ignora e usa seed
  }
  return {
    nos: [seedEnquadramento as NexoObject, seedEpico as NexoObject, ...(seedFeatures as NexoObject[]), ...(seedPbis as NexoObject[])],
    arestas: seedEdges,
    selecionadoId: 'ft-confirmar'
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // ignora
  }
  return fallback
}

function rid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export interface HistoryEntry {
  nos: NexoObject[]
  arestas: Edge[]
}

export const useGraph = defineStore('graph', () => {
  const state = ref<GraphState>(loadGraph())
  const patches = ref<ProposePatch[]>(loadJson<ProposePatch[]>(KEY_PATCH, []))
  const audit = ref<AuditEvent[]>(loadJson<AuditEvent[]>(KEY_AUDIT, []))
  const waivers = ref<Waiver[]>(loadJson<Waiver[]>('nexo.v1.waivers', []))
  const plano = ref<ImpactPlan | null>(null)

  // undo/redo — pilha >= 50
  const undoStack = ref<HistoryEntry[]>([])
  const redoStack = ref<HistoryEntry[]>([])

  const selecionado = computed<NexoObject | null>(
    () => state.value.nos.find((n) => n.id === state.value.selecionadoId) ?? null
  )

  const features = computed<NexoObject[]>(() => state.value.nos.filter((n) => n.tipo === 'feature'))

  const porId = computed(() => new Map(state.value.nos.map((n) => [n.id, n])))

  function persist() {
    // DELTA Passo 1: espelha para o namespace do projeto atual (migração progressiva).
    try {
      const pid = useProjects().state.atualId
      if (pid) {
        localStorage.setItem(`nexo.v1.graph.${pid}`, JSON.stringify(state.value))
        localStorage.setItem(`nexo.v1.patches.${pid}`, JSON.stringify(patches.value))
        localStorage.setItem(`nexo.v1.audit.${pid}`, JSON.stringify(audit.value))
      }
    } catch {
      // segue com chaves legadas
    }
    localStorage.setItem(KEY, JSON.stringify(state.value))
    localStorage.setItem(KEY_PATCH, JSON.stringify(patches.value))
    localStorage.setItem(KEY_AUDIT, JSON.stringify(audit.value))
    localStorage.setItem('nexo.v1.waivers', JSON.stringify(waivers.value))
  }

  if (localStorage.getItem(KEY) == null) persist()

  function snapshot(): HistoryEntry {
    return {
      nos: JSON.parse(JSON.stringify(state.value.nos)) as NexoObject[],
      arestas: JSON.parse(JSON.stringify(state.value.arestas)) as Edge[]
    }
  }

  function pushHistory() {
    undoStack.value.push(snapshot())
    if (undoStack.value.length > 60) undoStack.value.shift()
    redoStack.value = []
  }

  function undo(): boolean {
    const prev = undoStack.value.pop()
    if (!prev) return false
    redoStack.value.push(snapshot())
    state.value.nos = prev.nos
    state.value.arestas = prev.arestas
    if (state.value.selecionadoId && !porId.value.has(state.value.selecionadoId))
      state.value.selecionadoId = null
    persist()
    return true
  }

  function redo(): boolean {
    const next = redoStack.value.pop()
    if (!next) return false
    undoStack.value.push(snapshot())
    state.value.nos = next.nos
    state.value.arestas = next.arestas
    persist()
    return true
  }

  function registrar(acao: string, detalhe: string, alvoId?: string, atorId = 'u-pm', correlationId?: string) {
    audit.value.unshift({
      id: rid('a'),
      em: new Date().toISOString(),
      ator_id: atorId,
      acao,
      alvo_id: alvoId,
      detalhe,
      correlation_id: correlationId
    })
    if (audit.value.length > 300) audit.value.length = 300
    persist()
  }

  function selecionar(id: string | null) {
    state.value.selecionadoId = id
    persist()
  }

  function noPorId(id: string): NexoObject | undefined {
    return porId.value.get(id)
  }

  function proximoZ(): number {
    return state.value.nos.reduce((m, n) => Math.max(m, n.z ?? 0), 0) + 1
  }

  function slug(t: string): string {
    return (
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'no'
    )
  }

  function criarNo(
    dados: Partial<NexoObject> & { tipo: NexoObject['tipo']; titulo: string },
    atorId = 'u-pm'
  ): NexoObject {
    pushHistory()
    const agora = new Date().toISOString()
    const novoId = `${slug(dados.titulo)}-${Math.random().toString(36).slice(2, 6)}`
    const { id: _ignId, project_id: _ignPid, ...resto } = dados
    void _ignId
    void _ignPid
    const no: NexoObject = {
      id: novoId,
      project_id: dados.project_id ?? 'proj-cobrancas',
      descricao: '',
      status: 'draft',
      gate: 'G2',
      owner: atorId,
      contribuidores: [atorId],
      classificacao: 'internal',
      fonte: 'stated',
      fonte_refs: [],
      versao: 1,
      baseline: null,
      parent_id: 'ep-pix',
      causa_stale: null,
      x: 200 + Math.random() * 400,
      y: 200 + Math.random() * 200,
      z: proximoZ(),
      grupo: null,
      created_at: agora,
      updated_at: agora,
      ...resto
    }
    state.value.nos.push(no)
    registrar('CreateObject', `criou ${no.tipo} "${no.titulo}"`, no.id, atorId)
    persist()
    return no
  }

  function atualizarNo(id: string, patch: Partial<NexoObject>, atorId = 'u-pm', detalhe = 'editou'): boolean {
    const no = porId.value.get(id)
    if (!no) return false
    pushHistory()
    Object.assign(no, patch, { updated_at: new Date().toISOString() })
    registrar('UpdateObject', `${detalhe} "${no.titulo}"`, id, atorId)
    persist()
    return true
  }

  function moverNo(id: string, x: number, y: number): void {
    const no = porId.value.get(id)
    if (!no) return
    no.x = Math.round(x)
    no.y = Math.round(y)
    no.updated_at = new Date().toISOString()
    persist()
  }

  function commitMoverNo(id: string): void {
    pushHistoryUndoOnly()
    const no = porId.value.get(id)
    if (no) registrar('MoveObject', `moveu "${no.titulo}" para (${no.x}, ${no.y})`, id)
    persist()
  }

  // empurra o estado anterior ao history sem duplicar snapshot do mover contínuo:
  // como moverNo não empilha, empilhamos o snapshot pré-move sob demanda —
  // simplificação: empilha estado atual (pós-move) é inútil; então guardamos
  // o snapshot no início do drag via beginDrag().
  let dragSnapshot: HistoryEntry | null = null
  function beginDrag() {
    dragSnapshot = snapshot()
  }
  function pushHistoryUndoOnly() {
    if (dragSnapshot) {
      undoStack.value.push(dragSnapshot)
      if (undoStack.value.length > 60) undoStack.value.shift()
      redoStack.value = []
      dragSnapshot = null
    }
  }

  function duplicarNo(id: string, atorId = 'u-pm'): NexoObject | null {
    const orig = porId.value.get(id)
    if (!orig) return null
    pushHistory()
    const agora = new Date().toISOString()
    const copia = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `${orig.id}-copy-${Math.random().toString(36).slice(2, 5)}`,
      titulo: `${orig.titulo} (cópia)`,
      x: orig.x + 40,
      y: orig.y + 40,
      z: proximoZ(),
      versao: 1,
      baseline: null,
      status: 'draft' as NexoStatus,
      created_at: agora,
      updated_at: agora
    } as NexoObject
    state.value.nos.push(copia)
    registrar('DuplicateObject', `duplicou "${orig.titulo}"`, copia.id, atorId)
    persist()
    return copia
  }

  function removerNo(id: string, atorId = 'u-pm'): boolean {
    const no = porId.value.get(id)
    if (!no) return false
    pushHistory()
    state.value.nos = state.value.nos.filter((n) => n.id !== id)
    const antes = state.value.arestas.length
    state.value.arestas = state.value.arestas.filter((e) => e.origem_id !== id && e.destino_id !== id)
    if (state.value.selecionadoId === id) state.value.selecionadoId = null
    registrar('DeleteObject', `removeu "${no.titulo}" (+${antes - state.value.arestas.length} arestas)`, id, atorId)
    persist()
    return true
  }

  function criarAresta(
    origemId: string,
    destinoId: string,
    tipo: Edge['tipo'] = 'realiza',
    atorId = 'u-pm',
    justificativa = ''
  ): Edge | null {
    if (!porId.value.get(origemId) || !porId.value.get(destinoId)) return null
    if (origemId === destinoId) return null
    pushHistory()
    const o = porId.value.get(origemId)!
    const d = porId.value.get(destinoId)!
    const e: Edge = {
      edge_id: rid('e'),
      origem_id: origemId,
      origem_versao: o.versao,
      destino_id: destinoId,
      destino_versao: d.versao,
      tipo,
      forca: 'required',
      autor_id: atorId,
      justificativa: justificativa || `${o.titulo} ${tipo} ${d.titulo}`
    }
    state.value.arestas.push(e)
    registrar('CreateEdge', `ligou "${o.titulo}" → "${d.titulo}" como ${tipo}`, origemId, atorId)
    persist()
    return e
  }

  function removerAresta(edgeId: string, atorId = 'u-pm'): boolean {
    const e = state.value.arestas.find((x) => x.edge_id === edgeId)
    if (!e) return false
    pushHistory()
    state.value.arestas = state.value.arestas.filter((x) => x.edge_id !== edgeId)
    registrar('DeleteEdge', `removeu aresta ${e.tipo} ${e.origem_id}→${e.destino_id}`, e.origem_id, atorId)
    persist()
    return true
  }

  function proporPatch(
    alvoId: string,
    mudancas: { campo: string; de: string; para: string }[],
    justificativa: string,
    atorId = 'u-pm'
  ): ProposePatch | null {
    const no = porId.value.get(alvoId)
    if (!no || mudancas.length === 0) return null
    const p: ProposePatch = {
      patch_id: rid('p'),
      alvo_id: alvoId,
      autor_id: atorId,
      criado_em: new Date().toISOString(),
      mudancas,
      justificativa,
      status: 'pendente'
    }
    patches.value.unshift(p)
    registrar('PatchProposed', `propôs ${mudancas.length} mudança(s) em "${no.titulo}"`, alvoId, atorId)
    persist()
    return p
  }

  function aceitarPatch(patchId: string, atorId = 'u-pm'): boolean {
    const p = patches.value.find((x) => x.patch_id === patchId)
    const no = p ? porId.value.get(p.alvo_id) : undefined
    if (!p || !no || p.status !== 'pendente') return false
    pushHistory()
    for (const m of p.mudancas) {
      const trimmed = m.para.trim()
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          ;(no as unknown as Record<string, unknown>)[m.campo] = JSON.parse(trimmed)
          continue
        } catch {
          // cai no fallback textual
        }
      }
      ;(no as unknown as Record<string, unknown>)[m.campo] = m.para
    }
    no.versao += 1
    no.updated_at = new Date().toISOString()
    p.status = 'aceito'
    registrar('AcceptPatch', `aceitou patch em "${no.titulo}" → v${no.versao}`, no.id, atorId)
    persist()
    return true
  }

  function rejeitarPatch(patchId: string, atorId = 'u-pm'): boolean {
    const p = patches.value.find((x) => x.patch_id === patchId)
    if (!p || p.status !== 'pendente') return false
    p.status = 'rejeitado'
    registrar('PatchRejected', `rejeitou patch em ${p.alvo_id}`, p.alvo_id, atorId)
    persist()
    return true
  }

  function marcarStale(id: string, causa: string, correlationId: string): boolean {
    const no = porId.value.get(id)
    if (!no) return false
    if (no.status !== 'stale') {
      no.status = 'stale'
      no.causa_stale = causa
      no.updated_at = new Date().toISOString()
      registrar('ObjectMarkedStale', `"${no.titulo}" ficou desatualizado: ${causa}`, id, 'u-pm', correlationId)
      persist()
    }
    return true
  }

  function aplicarStatus(id: string, status: NexoStatus, atorId = 'u-pm'): boolean {
    const no = porId.value.get(id)
    if (!no) return false
    pushHistory()
    no.status = status
    no.versao += 1
    no.updated_at = new Date().toISOString()
    registrar('StatusChanged', `"${no.titulo}" → ${status} (v${no.versao})`, id, atorId)
    persist()
    return true
  }

  function reorderZ(id: string, dir: 'frente' | 'tras' | 'topo' | 'fundo'): void {
    const no = porId.value.get(id)
    if (!no) return
    pushHistory()
    const zs = [...new Set(state.value.nos.map((n) => n.z ?? 0))].sort((a, b) => a - b)
    if (dir === 'topo') no.z = (zs[zs.length - 1] ?? 0) + 1
    else if (dir === 'fundo') no.z = (zs[0] ?? 1) - 1
    else if (dir === 'frente') no.z = no.z + 1
    else no.z = no.z - 1
    persist()
  }

  function agrupar(ids: string[], nome: string): void {
    pushHistory()
    for (const id of ids) {
      const n = porId.value.get(id)
      if (n) n.grupo = nome
    }
    registrar('Group', `agrupou ${ids.length} nó(s) em "${nome}"`)
    persist()
  }

  function desagrupar(ids: string[]): void {
    pushHistory()
    for (const id of ids) {
      const n = porId.value.get(id)
      if (n) n.grupo = null
    }
    registrar('Ungroup', `desagrupou ${ids.length} nó(s)`)
    persist()
  }

  function tidy(): void {
    pushHistory()
    const sel = state.value.nos
    const ordenados = [...sel].sort((a, b) => a.y - b.y || a.x - b.x)
    ordenados.forEach((n, i) => {
      n.x = 120 + (i % 3) * 340
      n.y = 160 + Math.floor(i / 3) * 300
    })
    registrar('Tidy', 'organizou canvas em grade 16px')
    persist()
  }

  function aplicarLayout(nos: { id: string; x: number; y: number; z: number }[]): void {
    pushHistory()
    for (const p of nos) {
      const n = porId.value.get(p.id)
      if (n) {
        n.x = p.x
        n.y = p.y
        n.z = p.z
      }
    }
    persist()
  }

  function trocarProjeto(pid: string): void {
    undoStack.value = []
    redoStack.value = []
    plano.value = null
    const g = loadJson<GraphState>(`nexo.v1.graph.${pid}`, null as unknown as GraphState)
    if (g && Array.isArray(g.nos)) {
      state.value = g
    } else {
      state.value = { nos: [], arestas: [], selecionadoId: null }
    }
    patches.value = loadJson<ProposePatch[]>(`nexo.v1.patches.${pid}`, [])
    audit.value = loadJson<AuditEvent[]>(`nexo.v1.audit.${pid}`, [])
    persist()
  }

  function resetSeed() {
    undoStack.value = []
    redoStack.value = []
    state.value = {
      nos: [seedEpico as NexoObject, ...(seedFeatures as NexoObject[]), ...(seedPbis as NexoObject[])],
      arestas: seedEdges,
      selecionadoId: 'ft-confirmar'
    }
    patches.value = []
    plano.value = null
    registrar('ResetSeed', 'restaurou seed inicial')
    persist()
  }

  function concederDispensa(alvoId: string, codigo: string, justificativa: string, owner: string, prazo: string, atorId = 'u-pm'): { ok: boolean; motivo: string } {
    if (justificativa.trim().length < 20) return { ok: false, motivo: 'Justificativa mínima de 20 caracteres.' }
    if (!owner.trim()) return { ok: false, motivo: 'Owner é obrigatório.' }
    if (!(new Date(prazo).getTime() > Date.now())) return { ok: false, motivo: 'Prazo deve ser data futura.' }
    waivers.value.unshift({ id: rid('w'), alvoId, codigo, justificativa: justificativa.trim(), owner, prazo, em: new Date().toISOString() })
    registrar('WaiverGranted', `${codigo} dispensado em ${alvoId} por ${owner} até ${prazo}: ${justificativa.trim()}`, alvoId, atorId)
    persist()
    return { ok: true, motivo: 'Dispensa registrada.' }
  }

  function dispensaVigente(alvoId: string, codigo: string): Waiver | null {
    const w = waivers.value.find((x) => x.alvoId === alvoId && x.codigo === codigo)
    if (!w) return null
    if (new Date(w.prazo).getTime() <= Date.now()) return null
    return w
  }

  return {
    state,
    patches,
    audit,
    waivers,
    plano,
    undoStack,
    redoStack,
    selecionado,
    features,
    porId,
    persist,
    undo,
    redo,
    selecionar,
    noPorId,
    criarNo,
    atualizarNo,
    moverNo,
    beginDrag,
    commitMoverNo,
    duplicarNo,
    removerNo,
    criarAresta,
    removerAresta,
    proporPatch,
    aceitarPatch,
    rejeitarPatch,
    marcarStale,
    aplicarStatus,
    reorderZ,
    agrupar,
    desagrupar,
    tidy,
    aplicarLayout,
    registrar,
    trocarProjeto,
    concederDispensa,
    dispensaVigente,
    resetSeed
  }
})
