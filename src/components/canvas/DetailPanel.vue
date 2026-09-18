<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGraph } from '@/stores/useGraph'
import { useUI } from '@/stores/useUI'
import { useUsers } from '@/stores/useUsers'
import { interpretarCopilot } from '@/ai/copilot'
import { calcularImpacto } from '@/utils/impact'
import { gerarPrompt } from '@/utils/prompt'
import { encodeShare, type ShareState } from '@/utils/share'
import { avaliarGate } from '@/utils/gates'
import type { NexoStatus } from '@/types/nexo'
import LucideIcon from '@/components/common/LucideIcon.vue'

const graph = useGraph()
const ui = useUI()
const users = useUsers()

const sel = computed(() => graph.selecionado)
const tab = computed(() => ui.state.painelTab)

// --- Copilot ---
const pergunta = ref('')
const conversa = ref<{ quem: string; texto: string }[]>([
  { quem: 'IA', texto: 'Sou o Copilot local (offline). Pergunte sobre o nó ou digite "ajuda" para ver comandos que criam nós e arestas de verdade.' }
])
const acaoPendente = ref<{ texto: string; executar: () => void } | null>(null)
const pendenciasCopilot = ref<{ noId: string; codigo: string; titulo: string }[]>([])

function abrirPendencia(noId: string) {
  graph.selecionar(noId)
  pendenciasCopilot.value = []
}

function enviarPergunta() {
  const texto = pergunta.value.trim()
  if (!texto) return
  conversa.value.push({ quem: 'Você', texto })
  pergunta.value = ''
  const res = interpretarCopilot(texto, graph.state.nos)
  conversa.value.push({ quem: 'IA', texto: res.texto })
  pendenciasCopilot.value = res.pendencias ?? []
  if (res.acao?.kind === 'criar') {
    const a = res.acao
    acaoPendente.value = {
      texto: `Criar ${a.tipo} "${a.titulo}"`,
      executar: () => {
        const ehPbi = a.tipo === 'pbi'
        const extra: Record<string, unknown> = {}
        if (ehPbi) {
          const ref = a.ligarEm ? graph.noPorId(a.ligarEm) : null
          const fid = ref && (ref.tipo === 'feature' || ref.tipo === 'epico') ? ref.id : ''
          extra['feature_id'] = fid
          extra['escopo_in'] = []
          extra['escopo_out'] = []
          extra['dependencias'] = []
          extra['estrategia_teste'] = ''
        }
        const no = graph.criarNo(
          {
            tipo: a.tipo,
            titulo: a.titulo,
            descricao: a.tipo === 'feature' ? 'Descreva a capacidade e o benefício.' : ehPbi ? `PBI de ${a.ligarEm ? graph.noPorId(a.ligarEm)?.titulo ?? 'feature' : 'feature a vincular'}.` : '',
            gate: a.tipo === 'epico' ? 'G1' : ehPbi ? 'G4' : 'G2',
            ...extra
          },
          users.state.currentUserId
        )
        if (a.ligarEm) graph.criarAresta(a.ligarEm, no.id, a.edgeTipo ?? (ehPbi ? 'realiza' : 'contem'), users.state.currentUserId)
        graph.selecionar(no.id)
        conversa.value.push({ quem: 'IA', texto: `Fato: criado ${a.tipo} "${a.titulo}" (id ${no.id}, gate ${no.gate}). Pendências: ${ehPbi && !extra['feature_id'] ? 'vincule a feature via tab Texto. ' : ''}Veja no Canvas/Backlog.` })
        acaoPendente.value = null
      }
    }
  } else if (res.acao?.kind === 'ligar') {
    const a = res.acao
    acaoPendente.value = {
      texto: `Ligar como ${a.tipo}`,
      executar: () => {
        graph.criarAresta(a.de, a.para, a.tipo, users.state.currentUserId)
        conversa.value.push({ quem: 'IA', texto: `Aresta ${a.tipo} criada.` })
        acaoPendente.value = null
      }
    }
  } else if (res.acao?.kind === 'status') {
    const a = res.acao
    acaoPendente.value = {
      texto: `Aplicar status ${a.status}`,
      executar: () => {
        graph.aplicarStatus(a.alvo, a.status, users.state.currentUserId)
        conversa.value.push({ quem: 'IA', texto: `Status aplicado (nova versão + auditoria).` })
        acaoPendente.value = null
      }
    }
  }
}

// --- Propor alteração (diff versionado) ---
const proporAberto = ref(false)
const campoTitulo = ref('')
const campoDescricao = ref('')
const campoStatus = ref<NexoStatus | ''>('')
const justificativa = ref('')

watch(sel, (n) => {
  campoTitulo.value = n?.titulo ?? ''
  campoDescricao.value = n?.descricao ?? ''
  campoStatus.value = ''
  justificativa.value = ''
  proporAberto.value = false
}, { immediate: true })

const diffPreview = computed(() => {
  const n = sel.value
  if (!n) return []
  const out: { campo: string; de: string; para: string }[] = []
  if (campoTitulo.value && campoTitulo.value !== n.titulo) out.push({ campo: 'titulo', de: n.titulo, para: campoTitulo.value })
  if (campoDescricao.value && campoDescricao.value !== n.descricao) out.push({ campo: 'descricao', de: n.descricao, para: campoDescricao.value })
  if (campoStatus.value && campoStatus.value !== n.status) out.push({ campo: 'status', de: n.status, para: campoStatus.value })
  return out
})

const patchPendente = computed(() => graph.patches.find((p) => p.alvo_id === sel.value?.id && p.status === 'pendente'))

function propor() {
  if (!sel.value || diffPreview.value.length === 0) return
  graph.proporPatch(sel.value.id, diffPreview.value, justificativa.value || 'proposta via painel', users.state.currentUserId)
}

// --- Impacto real ---
const planoLocal = computed(() => graph.plano)
function gerarPlano() {
  if (!sel.value) return
  const nomeOwner = (id: string) => users.state.usuarios.find((u) => u.id === id)?.nome ?? id
  graph.plano = calcularImpacto(sel.value.id, graph.state.nos, graph.state.arestas, nomeOwner)
}
function aprovarItem(id: string) {
  const it = graph.plano?.itens.find((x) => x.id === id)
  if (it) it.aprovado = true
}
function aprovarLote() {
  graph.plano?.itens.forEach((i) => (i.aprovado = true))
}
function aplicarPlano() {
  if (!graph.plano) return
  for (const it of graph.plano.itens) {
    if (!it.aprovado || it.aplicado) continue
    graph.marcarStale(it.id, `impacto de ${graph.plano.origem_id}`, graph.plano.correlation_id)
    it.aplicado = true
  }
  graph.persist()
}
function reverterPlano() {
  if (!graph.plano) return
  for (const it of graph.plano.itens) {
    if (!it.aplicado) continue
    graph.atualizarNo(it.id, { status: it.statusAnterior, causa_stale: null } as Partial<typeof it>, users.state.currentUserId, 'reverteu impacto')
    it.aplicado = false
  }
  graph.persist()
}

// --- Prompt output / share / PNG ---
const promptAberto = ref(false)
const promptEscopo = ref<'tudo' | 'selecao'>('selecao')
const promptAlvo = ref<'vue' | 'ruby'>('vue')
const promptIdioma = ref<'pt' | 'en'>('pt')
const promptTexto = ref('')
function abrirPrompt() {
  promptTexto.value = gerarPrompt(graph.state.nos, graph.state.arestas, sel.value?.id ?? null, {
    alvo: promptAlvo.value,
    escopo: promptEscopo.value,
    idioma: promptIdioma.value
  })
  promptAberto.value = true
}
function atualizarPrompt() {
  promptTexto.value = gerarPrompt(graph.state.nos, graph.state.arestas, sel.value?.id ?? null, {
    alvo: promptAlvo.value,
    escopo: promptEscopo.value,
    idioma: promptIdioma.value
  })
}
async function copiar(texto: string, msg: string) {
  await navigator.clipboard.writeText(texto)
  aviso.value = msg
  setTimeout(() => (aviso.value = ''), 2500)
}
function copiarShare() {
  const st: ShareState = {
    v: 1,
    nos: graph.state.nos.map((n) => ({ id: n.id, x: n.x, y: n.y, z: n.z ?? 0 })),
    sel: graph.state.selecionadoId,
    zoom: 1,
    pan: [0, 0]
  }
  const url = `${location.origin}${location.pathname}#/canvas#${encodeShare(st)}`
  copiar(url, 'Share-link copiado — abre o canvas com este layout.')
}
function exportarPNG() {
  const svg = document.querySelector('[data-export-root]')
  const W = 1400
  const H = 900
  let inner = ''
  for (const n of graph.state.nos) {
    inner += `<g><rect x="${n.x}" y="${n.y}" width="280" height="120" rx="12" fill="#fff" stroke="${n.status === 'stale' ? '#F59E0B' : n.id === graph.state.selecionadoId ? '#1D4ED8' : '#E2E8F0'}" stroke-width="2"/><text x="${n.x + 16}" y="${n.y + 34}" font-family="Inter,sans-serif" font-size="15" font-weight="bold" fill="#0F172A">${esc(n.titulo)}</text><text x="${n.x + 16}" y="${n.y + 58}" font-family="Inter,sans-serif" font-size="12" fill="#64748B">${esc(n.descricao.slice(0, 80))}</text></g>`
  }
  for (const e of graph.state.arestas) {
    const o = graph.noPorId(e.origem_id)
    const d = graph.noPorId(e.destino_id)
    if (!o || !d) continue
    const cor = e.tipo === 'impacta' ? '#D97706' : e.tipo === 'valida' ? '#15803D' : e.tipo === 'restringe' ? '#B91C1C' : e.tipo === 'contem' ? '#64748B' : '#1D4ED8'
    inner += `<path d="M ${o.x + 280} ${o.y + 60} C ${(o.x + 280 + d.x) / 2} ${o.y + 60}, ${(o.x + 280 + d.x) / 2} ${d.y + 60}, ${d.x} ${d.y + 60}" fill="none" stroke="${cor}" stroke-width="2"/>`
  }
  void svg
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1400 900"><rect width="1400" height="900" fill="#F7F8FB"/>${inner}</svg>`
  const blob = new Blob([doc], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    c.toBlob((b) => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = 'nexo-canvas.png'
      a.click()
      aviso.value = 'PNG exportado.'
      setTimeout(() => (aviso.value = ''), 2500)
    }, 'image/png')
  }
  img.src = url
}
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const aviso = ref('')
const gateEval = computed(() => (sel.value ? avaliarGate(sel.value) : null))

function fecharPainel() {
  graph.selecionar(null)
}
function irImpacto() {
  ui.setTab('impacto')
  gerarPlano()
}

// --- Tab Texto (DELTA Passo 4): edição textual via ProposePatch ---
const txtTitulo = ref('')
const txtDescricao = ref('')
const txtFluxo = ref('')
const txtBdd = ref('')
const txtRegras = ref('')

function bddAtualTexto(): string {
  const n = sel.value as unknown as Record<string, unknown> | null
  const arr = n && Array.isArray(n['criterios_bdd']) ? (n['criterios_bdd'] as { given: string; when: string; then: string }[]) : []
  return arr.map((c) => `${c.given} | ${c.when} | ${c.then}`).join('\n')
}

watch(sel, (n) => {
  txtTitulo.value = n?.titulo ?? ''
  txtDescricao.value = n?.descricao ?? ''
  const f = n as unknown as Record<string, unknown> | null
  txtFluxo.value = typeof f?.['fluxo_feliz'] === 'string' ? (f['fluxo_feliz'] as string) : ''
  txtBdd.value = bddAtualTexto()
  txtRegras.value = Array.isArray(f?.['regras_ids']) ? (f['regras_ids'] as string[]).join(', ') : ''
}, { immediate: true })

const bddErros = computed(() => {
  const out: { linha: number; msg: string }[] = []
  txtBdd.value.split('\n').forEach((ln, i) => {
    if (!ln.trim()) return
    if (ln.split('|').length !== 3) out.push({ linha: i + 1, msg: 'use Given | When | Then' })
  })
  return out
})

const txtDiff = computed(() => {
  const n = sel.value
  if (!n) return []
  const out: { campo: string; de: string; para: string }[] = []
  if (txtTitulo.value && txtTitulo.value !== n.titulo && txtTitulo.value.length >= 5 && txtTitulo.value.length <= 140)
    out.push({ campo: 'titulo', de: n.titulo, para: txtTitulo.value })
  if (txtDescricao.value && txtDescricao.value !== n.descricao) out.push({ campo: 'descricao', de: n.descricao, para: txtDescricao.value })
  const f = n as unknown as Record<string, unknown>
  if (n.tipo === 'feature' && txtFluxo.value && txtFluxo.value !== String(f['fluxo_feliz'] ?? ''))
    out.push({ campo: 'fluxo_feliz', de: String(f['fluxo_feliz'] ?? ''), para: txtFluxo.value })
  const atual = bddAtualTexto().trim()
  if (txtBdd.value.trim() !== atual && bddErros.value.length === 0) {
    const linhas = txtBdd.value.split('\n').map((s) => s.trim()).filter(Boolean)
    const previas = (Array.isArray(f['criterios_bdd']) ? (f['criterios_bdd'] as { id: string; given: string }[]) : []).map((c) => c.given)
    const novas = linhas.filter((ln) => !previas.some((g) => ln.startsWith(g.slice(0, 20))))
    const removidas = previas.filter((g) => !linhas.some((ln) => ln.startsWith(g.slice(0, 20))))
    out.push({ campo: 'criterios_bdd', de: `${previas.length} critério(s)`, para: `${linhas.length} critério(s)${novas.length ? ` (+${novas.length})` : ''}${removidas.length ? ` (-${removidas.length})` : ''}` })
  }
  const regrasAtuais = Array.isArray(f['regras_ids']) ? (f['regras_ids'] as string[]).join(', ') : ''
  if (txtRegras.value.trim() !== regrasAtuais.trim()) out.push({ campo: 'regras_ids', de: regrasAtuais || '(vazio)', para: txtRegras.value.trim() || '(vazio)' })
  return out
})

function proporTexto() {
  if (!sel.value || txtDiff.value.length === 0 || patchPendente.value) return
  const n = sel.value
  const mudancas = txtDiff.value.map((d) => {
    if (d.campo === 'criterios_bdd') {
      const linhas = txtBdd.value.split('\n').map((s) => s.trim()).filter(Boolean)
      const previas = (n as unknown as { criterios_bdd?: { id: string; given: string; when: string; then: string; prioridade: string }[] }).criterios_bdd ?? []
      const arr = linhas.map((ln, i) => {
        const [given, when, then] = ln.split('|').map((s) => s.trim())
        const prev = previas.find((p) => p.given === given)
        return { id: prev?.id ?? `AC-${String(i + 1).padStart(3, '0')}`, given, when, then, prioridade: 'must' }
      })
      return { campo: d.campo, de: JSON.stringify(previas), para: JSON.stringify(arr) }
    }
    if (d.campo === 'regras_ids') {
      const arr = txtRegras.value.split(',').map((s) => s.trim()).filter(Boolean)
      return { campo: d.campo, de: d.de, para: JSON.stringify(arr) }
    }
    return { campo: d.campo, de: d.de, para: d.para }
  })
  graph.proporPatch(n.id, mudancas, 'proposta via tab Texto', users.state.currentUserId)
}
</script>

<template>
  <aside class="flex w-panel shrink-0 flex-col border-l border-nexo-border bg-white" aria-label="Painel de detalhe">
    <div v-if="!sel" class="p-4 text-sm text-nexo-muted">
      Selecione um nó no canvas para ver detalhes. Duplo-clique cria um nó no vazio.
    </div>
    <template v-else>
      <div class="flex items-start justify-between p-4 pb-0">
        <h2 class="text-lg font-bold">{{ sel.titulo }}</h2>
        <button type="button" aria-label="Fechar painel" class="p-1 text-nexo-muted hover:text-nexo-text" @click="fecharPainel"><LucideIcon name="x" :size="14" /></button>
      </div>
      <p class="px-4 pt-1 text-sm">
        <span v-if="sel.status === 'approved'" class="inline-flex items-center gap-1 font-semibold text-nexo-approved"><LucideIcon name="check" :size="14" /> Aprovada</span>
        <span v-else-if="sel.status === 'stale'" class="inline-flex items-center gap-1 font-semibold text-nexo-stale"><LucideIcon name="alert" :size="14" /> Desatualizada</span>
        <span v-else class="font-semibold">{{ sel.status }}</span>
        <span class="text-nexo-muted"> · </span>
        <span class="font-semibold text-nexo-primary">Gate {{ sel.gate.replace('G', '') === sel.gate ? sel.gate : sel.gate }}</span>
      </p>

      <div class="mt-2 flex gap-4 border-b border-nexo-border px-4" role="tablist" aria-label="Abas do painel">
        <button
          v-for="t in (['detalhes', 'copilot', 'impacto', 'texto'] as const)"
          :key="t"
          role="tab"
          :aria-selected="tab === t"
          class="pb-2 text-sm capitalize"
          :class="tab === t ? 'font-semibold text-nexo-primary underline decoration-nexo-primary decoration-2 underline-offset-8' : 'text-nexo-muted'"
          @click="ui.setTab(t)"
        >
          {{ t === 'copilot' ? 'Copilot' : t === 'detalhes' ? 'Detalhes' : t === 'impacto' ? 'Impacto' : 'Texto' }}
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-auto p-4">
        <!-- DETALHES -->
        <div v-if="tab === 'detalhes'" role="tabpanel" class="space-y-4">
          <div>
            <h3 class="text-sm font-semibold">Descrição da regra</h3>
            <p class="mt-1 text-[13.5px] leading-relaxed">{{ sel.descricao }}</p>
            <p v-if="sel.id === 'ft-confirmar'" class="mt-2 text-[13.5px] leading-relaxed">
              A confirmação de pagamento via Pix deve ser idempotente. Requisições repetidas com o mesmo identificador de transação (idTx) devem retornar o mesmo resultado da primeira confirmação, sem gerar duplicidade de registros ou efeitos colaterais.
            </p>
          </div>
          <button
            type="button"
            class="w-full rounded-badge border border-nexo-banner-border bg-nexo-stale-bg p-3 text-left"
            @click="irImpacto()"
          >
            <span class="flex items-center gap-2 text-sm font-semibold text-nexo-stale"><LucideIcon name="alert" :size="14" /> Impacto identificado <span class="ml-auto inline-flex"><LucideIcon name="chevR" :size="14" /></span></span>
            <span class="mt-1 block text-[13px] text-nexo-stale">Alterações nesta feature podem impactar 3 features, 2 serviços e 4 PBIs.</span>
          </button>
          <div v-if="gateEval" class="rounded-badge border border-nexo-border p-3 text-xs">
            <p class="font-semibold">Gate {{ sel.gate }} — {{ gateEval.bloqueantesOk ? 'bloqueantes OK' : 'bloqueantes faltando: ' + gateEval.bloqueantesFaltando.join(', ') }}</p>
            <ul class="mt-1 space-y-1">
              <li v-for="c in gateEval.checks" :key="c.codigo" class="flex items-center gap-1"><LucideIcon :name="c.ok ? 'check' : 'x'" :size="12" /> {{ c.codigo }} — {{ c.descricao }}</li>
            </ul>
          </div>
          <div class="space-y-2">
            <button type="button" class="flex w-full items-center justify-center gap-2 rounded-btn border border-nexo-primary px-4 py-3 text-sm font-semibold text-nexo-primary" @click="ui.setTab('copilot')"><LucideIcon name="sparkles" :size="14" /> Perguntar à IA</button>
            <button type="button" class="flex w-full items-center justify-center gap-2 rounded-btn bg-nexo-primary px-4 py-3 text-sm font-semibold text-white" @click="proporAberto = !proporAberto"><LucideIcon name="pencil" :size="14" /> Propor alteração</button>
          </div>
          <div v-if="proporAberto" class="space-y-2 rounded-badge border border-nexo-border p-3">
            <label class="block text-xs">Título<input v-model="campoTitulo" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1 text-sm" /></label>
            <label class="block text-xs">Descrição<textarea v-model="campoDescricao" rows="3" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1 text-sm" /></label>
            <label class="block text-xs">Status
              <select v-model="campoStatus" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1 text-sm">
                <option value="">(manter {{ sel.status }})</option>
                <option v-for="s in (['draft','review','approved','baseline','stale','regenerated','validated','published'] as NexoStatus[])" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>
            <label class="block text-xs">Justificativa<input v-model="justificativa" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1 text-sm" /></label>
            <div v-if="diffPreview.length > 0" class="rounded-badge bg-nexo-canvas p-2 text-xs">
              <p class="font-semibold">Diff (aplica só com Aceitar):</p>
              <ul><li v-for="d in diffPreview" :key="d.campo">{{ d.campo }}: "{{ d.de }}" → "{{ d.para }}"</li></ul>
            </div>
            <button type="button" :disabled="diffPreview.length === 0" class="w-full rounded-btn bg-nexo-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-40" @click="propor()">Propor (cria patch pendente)</button>
          </div>
          <div v-if="patchPendente" class="space-y-2 rounded-badge border border-nexo-primary-border bg-nexo-primary-soft p-3 text-xs">
            <p class="font-semibold">Patch pendente de {{ patchPendente.autor_id }} — {{ patchPendente.criado_em }}</p>
            <ul><li v-for="m in patchPendente.mudancas" :key="m.campo">{{ m.campo }}: "{{ m.de }}" → "{{ m.para }}"</li></ul>
            <p>{{ patchPendente.justificativa }}</p>
            <div class="flex gap-2">
              <button type="button" class="rounded-btn bg-nexo-primary px-3 py-1.5 min-h-[32px] text-sm font-semibold text-white" @click="graph.aceitarPatch(patchPendente.patch_id, users.state.currentUserId)">Aceitar (nova versão)</button>
              <button type="button" class="rounded-btn border border-nexo-border px-3 py-1.5 min-h-[32px] text-sm" @click="graph.rejeitarPatch(patchPendente.patch_id, users.state.currentUserId)">Rejeitar</button>
            </div>
          </div>
          <div class="space-y-2 border-t border-nexo-border pt-3">
            <p class="text-xs font-semibold">Prompt de implementação / compartilhamento</p>
            <div class="flex gap-2">
              <button type="button" class="flex-1 rounded-btn border border-nexo-border px-2 py-2 min-h-[32px] text-sm" @click="abrirPrompt()">Copiar prompt</button>
              <button type="button" class="flex-1 rounded-btn border border-nexo-border px-2 py-2 min-h-[32px] text-sm" @click="copiarShare()">Copiar share-link</button>
              <button type="button" class="flex-1 rounded-btn border border-nexo-border px-2 py-2 min-h-[32px] text-sm" @click="exportarPNG()">Exportar PNG</button>
            </div>
          </div>
        </div>

        <!-- COPILOT -->
        <div v-else-if="tab === 'copilot'" role="tabpanel" class="flex flex-col gap-2">
          <div class="max-h-64 space-y-2 overflow-auto">
            <div v-for="(m, i) in conversa" :key="i" class="rounded-badge p-2 text-[13px]" :class="m.quem === 'IA' ? 'bg-nexo-canvas' : 'bg-nexo-primary-soft'">
              <strong>{{ m.quem }}:</strong> <span class="whitespace-pre-line">{{ m.texto }}</span>
            </div>
          </div>
          <div v-if="acaoPendente" class="flex gap-2">
            <button type="button" class="flex-1 rounded-btn bg-nexo-primary px-3 py-2 text-sm font-semibold text-white" @click="acaoPendente.executar()">Confirmar: {{ acaoPendente.texto }}</button>
            <button type="button" class="rounded-btn border border-nexo-border px-3 py-2 text-sm" @click="acaoPendente = null">Descartar</button>
          </div>
          <ul v-if="pendenciasCopilot.length > 0" class="space-y-1 text-xs" aria-label="Pendências do gate">
            <li v-for="p in pendenciasCopilot.slice(0, 12)" :key="p.noId + p.codigo">
              <button type="button" class="w-full rounded-badge border border-nexo-stale-border bg-nexo-stale-bg px-2 py-1.5 min-h-[32px] text-left text-xs text-nexo-stale" @click="abrirPendencia(p.noId)">
                {{ p.codigo }} em "{{ p.titulo }}" — abrir nó
              </button>
            </li>
          </ul>
          <form class="flex gap-2" @submit.prevent="enviarPergunta">
            <input v-model="pergunta" placeholder='Ex.: criar feature Notificação' aria-label="Perguntar à IA" class="min-w-0 flex-1 rounded-btn border border-nexo-border px-3 py-2 text-sm" />
            <button type="submit" class="rounded-btn bg-nexo-primary px-3 py-2 text-sm font-semibold text-white">Enviar</button>
          </form>
        </div>

        <!-- IMPACTO -->
        <div v-else-if="tab === 'impacto'" role="tabpanel" class="space-y-2">
          <button type="button" class="w-full rounded-btn border border-nexo-border px-3 py-1.5 min-h-[32px] text-sm" @click="gerarPlano()">Calcular impacto de "{{ sel.titulo }}"</button>
          <div v-if="planoLocal" class="space-y-2 text-xs">
            <p class="font-semibold">Plano {{ planoLocal.correlation_id }} — {{ planoLocal.itens.length }} dependente(s)</p>
            <button type="button" class="rounded-btn border border-nexo-border px-3 py-1.5 min-h-[32px] text-sm" @click="aprovarLote()">Aprovar lote</button>
            <ul class="space-y-1">
              <li v-for="it in planoLocal.itens" :key="it.id" class="rounded-badge border border-nexo-border p-2">
                <strong>{{ it.titulo }}</strong> via {{ it.via.join('→') }} · op {{ it.operacao }} · owner {{ it.owner }}
                <span v-if="it.aplicado" class="text-nexo-stale"> · aplicado (stale)</span>
                <button v-if="!it.aprovado" type="button" class="ml-2 underline text-sm px-1 py-1" @click="aprovarItem(it.id)">aprovar</button>
                <span v-else class="ml-2 text-nexo-approved">aprovado</span>
              </li>
            </ul>
            <div class="flex gap-2">
              <button type="button" class="flex-1 rounded-btn bg-nexo-primary px-2 py-1.5 min-h-[32px] text-sm font-semibold text-white" @click="aplicarPlano()">Aplicar aprovados (marca stale)</button>
              <button type="button" class="flex-1 rounded-btn border border-nexo-border px-2 py-1.5 min-h-[32px] text-sm" @click="reverterPlano()">Reverter aplicados</button>
            </div>
          </div>
        </div>

        <!-- TEXTO -->
        <div v-else-if="tab === 'texto'" role="tabpanel" class="space-y-2 text-sm">
          <p v-if="patchPendente" class="rounded-badge bg-nexo-stale-bg px-2 py-1 text-xs text-nexo-stale">Patch pendente — aceite ou rejeite antes de propor de novo.</p>
          <label class="block text-xs">Título (5–140)
            <input v-model="txtTitulo" :disabled="!!patchPendente" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" />
            <span v-if="txtTitulo.length > 0 && (txtTitulo.length < 5 || txtTitulo.length > 140)" class="text-nexo-blocked">OBJ-001: título fora do limite.</span>
          </label>
          <label class="block text-xs">Descrição
            <textarea v-model="txtDescricao" :disabled="!!patchPendente" rows="3" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" />
          </label>
          <label v-if="sel.tipo === 'feature'" class="block text-xs">Fluxo feliz
            <textarea v-model="txtFluxo" :disabled="!!patchPendente" rows="2" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" />
          </label>
          <p v-else class="text-xs text-nexo-muted">Fluxo feliz disponível apenas para features.</p>
          <label class="block text-xs">Critérios BDD (um por linha: Given | When | Then)
            <textarea v-model="txtBdd" :disabled="!!patchPendente" rows="4" class="mt-1 w-full rounded-btn border border-nexo-border p-2 font-mono text-xs" />
          </label>
          <ul v-if="bddErros.length > 0" class="text-xs text-nexo-blocked">
            <li v-for="(e, i) in bddErros" :key="i">linha {{ e.linha }}: {{ e.msg }}</li>
          </ul>
          <label class="block text-xs">regras_ids (CSV)
            <input v-model="txtRegras" :disabled="!!patchPendente" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5" />
          </label>
          <div v-if="txtDiff.length > 0" class="rounded-badge bg-nexo-canvas p-2 text-xs">
            <p class="font-semibold">Diff (aplica só com Aceitar):</p>
            <table class="w-full">
              <thead><tr><th class="text-left">campo</th><th class="text-left">de</th><th class="text-left">para</th></tr></thead>
              <tbody>
                <tr v-for="d in txtDiff" :key="d.campo"><td>{{ d.campo }}</td><td class="pr-2">{{ d.de }}</td><td>{{ d.para }}</td></tr>
              </tbody>
            </table>
          </div>
          <button type="button" :disabled="txtDiff.length === 0 || !!patchPendente" class="w-full rounded-btn bg-nexo-primary px-3 py-2 font-semibold text-white disabled:opacity-40" @click="proporTexto()">Propor</button>
          <div v-if="patchPendente" class="flex gap-2">
            <button type="button" class="flex-1 rounded-btn bg-nexo-primary px-3 py-2 font-semibold text-white" @click="graph.aceitarPatch(patchPendente.patch_id, users.state.currentUserId)">Aceitar (nova versão)</button>
            <button type="button" class="flex-1 rounded-btn border border-nexo-border px-3 py-2" @click="graph.rejeitarPatch(patchPendente.patch_id, users.state.currentUserId)">Rejeitar</button>
          </div>
        </div>
      </div>

      <div v-if="promptAberto" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" role="dialog" aria-modal="true" aria-label="Prompt de implementação" @click.self="promptAberto = false">
        <div class="flex max-h-full w-full max-w-2xl flex-col rounded-card bg-white p-4 shadow-card">
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <label>Escopo <select v-model="promptEscopo" class="rounded-btn border border-nexo-border px-2 py-1" @change="atualizarPrompt"><option value="selecao">Seleção</option><option value="tudo">Tudo</option></select></label>
            <label>Alvo <select v-model="promptAlvo" class="rounded-btn border border-nexo-border px-2 py-1" @change="atualizarPrompt"><option value="vue">Vue 3</option><option value="ruby">API Ruby</option></select></label>
            <label>Idioma <select v-model="promptIdioma" class="rounded-btn border border-nexo-border px-2 py-1" @change="atualizarPrompt"><option value="pt">PT-BR</option><option value="en">EN</option></select></label>
            <button type="button" class="ml-auto text-nexo-muted" @click="promptAberto = false"><LucideIcon name="x" :size="14" /></button>
          </div>
          <textarea v-model="promptTexto" rows="16" class="mt-2 w-full rounded-btn border border-nexo-border p-2 font-mono text-xs" aria-label="Prompt editável" />
          <div class="mt-2 flex gap-2">
            <button type="button" class="flex-1 rounded-btn bg-nexo-primary px-3 py-2 text-sm font-semibold text-white" @click="copiar(promptTexto, 'Prompt copiado.')">Copiar prompt</button>
            <button type="button" class="flex-1 rounded-btn border border-nexo-border px-3 py-2 text-sm" @click="copiar('Copie o agent.md de public/agent.md junto com o prompt.', 'Instrução copiada')">Copiar instrução p/ agente</button>
          </div>
        </div>
      </div>
      <div v-if="aviso" class="border-t border-nexo-border bg-nexo-approved-bg p-2 text-center text-xs text-nexo-approved" role="status">{{ aviso }}</div>
    </template>
  </aside>
</template>
