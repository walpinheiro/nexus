import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuditEvent, Classificacao, Edge, Epic, IngestaoDoc, NexoObject, Projeto } from '@/types/nexo'
import { aplicarSeedCoerenteCriacao, aplicarSeedCoerenteTexto, gatesZerados, seedEdges, seedEnquadramento, seedEpico, seedFeatures, seedGates, seedParcialExistente, seedPbis, seedProjeto } from '@/data/seed'
import type { GateInfo } from '@/stores/useGate'

const KEY = 'nexo.v1.projects'
const GKEY = 'nexo.v1.graph'
const GAKEY = 'nexo.v1.gates'
const PKEY = 'nexo.v1.patches'
const AKEY = 'nexo.v1.audit'
const TKEY = 'nexo.v1.gateAttempts'
const PROJKEY = 'nexo.v1.project'
const legacyKeys = [GKEY, GAKEY, PKEY, AKEY, TKEY, PROJKEY]

interface ProjectsState {
  projetos: Projeto[]
  atualId: string
  eventos: AuditEvent[]
}

function slug(t: string): string {
  return (
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'projeto'
  )
}

function rid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export interface CriarProjetoInput {
  titulo: string
  contexto: string
  publico: string
  objetivo: string
  metricaNome: string
  restricoes: string[]
  naoObjetivos: string[]
  owner: string
  classificacao: Classificacao
}

export interface CriarProjetoExistenteInput {
  titulo: string
  owner: string
  ingestao: IngestaoDoc
  contextoParcial?: Partial<Epic>
}

export interface RespostasWizardCriacao {
  // OPCIONAL e ignorado: owner sempre deriva do usuario logado (atorId).
  // Passos: problema, objetivo, usuarios, escopo e metrica.
  // Campos opcionais carregam título/classificação revisados; callers antigos
  // podem omiti-los e seguem pela compatibilidade legada.
  titulo?: string
  classificacao?: Classificacao
  usuario?: string
  problema: string
  objetivo: string
  usuarios: string
  escopo: string
  metrica?: string
  naoObjetivos?: string
}

export interface CriarProjetoResult {
  ok: boolean
  erros: { campo: string; codigo: string; mensagem: string }[]
  projeto?: Projeto
}

export interface ConcluirIngestaoPayload {
  projetoId: string
  epicoId: string
}

export interface ConcluirIngestaoResult {
  ok: boolean
  erros: CriarProjetoResult['erros']
  projetoId?: string
  epicoId?: string
  rotaGate?: string
}

function graphKey(pid: string): string {
  return `${GKEY}.${pid}`
}
function gatesKey(pid: string): string {
  return `${GAKEY}.${pid}`
}
function patchesKey(pid: string): string {
  return `${PKEY}.${pid}`
}
function auditKey(pid: string): string {
  return `${AKEY}.${pid}`
}
function tentKey(pid: string): string {
  return `${TKEY}.${pid}`
}

function ler<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // ignora
  }
  return null
}

function escrever(key: string, valor: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(valor))
    const back = localStorage.getItem(key)
    return back != null
  } catch {
    return false
  }
}

export const useProjects = defineStore('projects', () => {
  const state = ref<ProjectsState>(carregarOuSeed())

  const atual = computed<Projeto | null>(
    () => state.value.projetos.find((p) => p.id === state.value.atualId) ?? null
  )

  function persist() {
    escrever(KEY, state.value)
  }

  function registrarGlobal(acao: string, detalhe: string, atorId: string): void {
    state.value.eventos.unshift({
      id: rid('a'),
      em: new Date().toISOString(),
      ator_id: atorId,
      acao,
      detalhe
    })
    if (state.value.eventos.length > 100) state.value.eventos.length = 100
    persist()
  }

  function carregarOuSeed(): ProjectsState {
    const existente = ler<ProjectsState>(KEY)
    if (existente && Array.isArray(existente.projetos) && existente.projetos.length > 0) return existente
    // Migração sem perda: chaves legadas viram namespace proj-cobrancas.
    const legado = ler<{ nos: NexoObject[]; arestas: Edge[]; selecionadoId: string | null }>(GKEY)
    if (legado) {
      const ok = migrarLegado()
      if (ok) {
        const apos = ler<ProjectsState>(KEY)
        if (apos) return apos
      }
      // falha na migração: preserva legado, cria índice apontando para ele via cópia em memória
      return {
        projetos: [
          {
            id: seedProjeto.id,
            titulo: seedProjeto.titulo,
            descricao: 'Cobranças via Pix',
            epicoId: seedEpico.id,
            epicoTitulo: seedEpico.titulo,
            owner: 'u-pm',
            classificacao: 'internal',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          }
        ],
        atualId: seedProjeto.id,
        eventos: []
      }
    }
    // Perfil novo: seed Cobranças em namespaces.
    const p: Projeto = {
      id: seedProjeto.id,
      titulo: seedProjeto.titulo,
      descricao: 'Cobranças via Pix',
      epicoId: seedEpico.id,
      epicoTitulo: seedEpico.titulo,
      owner: 'u-pm',
      classificacao: 'internal',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    }
    escrever(graphKey(p.id), {
      nos: [seedEnquadramento as NexoObject, seedEpico as NexoObject, ...(seedFeatures as NexoObject[]), ...(seedPbis as NexoObject[])],
      arestas: seedEdges,
      selecionadoId: 'ft-confirmar'
    })
    escrever(gatesKey(p.id), seedGates as GateInfo[])
    escrever(patchesKey(p.id), [])
    escrever(auditKey(p.id), [
      {
        id: 'a-seed',
        em: '2026-01-01T00:00:00.000Z',
        ator_id: 'u-pm',
        acao: 'SeedLoaded',
        detalhe: 'seed Cobranças carregado'
      }
    ])
    escrever(tentKey(p.id), [])
    const st: ProjectsState = { projetos: [p], atualId: p.id, eventos: [] }
    escrever(KEY, st)
    return st
  }

  function migrarLegado(): boolean {
    try {
      const g = ler<{ nos: NexoObject[]; arestas: Edge[]; selecionadoId: string | null }>(GKEY)
      if (!g) return false
      const ga = ler<GateInfo[]>(GAKEY) ?? (seedGates as GateInfo[])
      const pa = ler<unknown[]>(PKEY) ?? []
      const au = ler<AuditEvent[]>(AKEY) ?? []
      const te = ler<unknown[]>(TKEY) ?? []
      const pid = seedProjeto.id
      const okg = escrever(graphKey(pid), g)
      const okga = escrever(gatesKey(pid), ga)
      const okp = escrever(patchesKey(pid), pa)
      const oka = escrever(auditKey(pid), au)
      const okt = escrever(tentKey(pid), te)
      if (!(okg && okga && okp && oka && okt)) return false
      // verificação de leitura antes de remover o legado
      const conf = ler<{ nos: NexoObject[] }>(graphKey(pid))
      if (!conf || !Array.isArray(conf.nos)) return false
      const st: ProjectsState = {
        projetos: [
          {
            id: pid,
            titulo: seedProjeto.titulo,
            descricao: 'Cobranças via Pix (migrado sem perda)',
            epicoId: seedEpico.id,
            epicoTitulo: seedEpico.titulo,
            owner: 'u-pm',
            classificacao: 'internal',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: new Date().toISOString()
          }
        ],
        atualId: pid,
        eventos: [
          {
            id: rid('a'),
            em: new Date().toISOString(),
            ator_id: 'u-pm',
            acao: 'LegacyMigrated',
            detalhe: 'chaves legadas migradas para namespace proj-cobrancas'
          }
        ]
      }
      if (!escrever(KEY, st)) return false
      for (const k of legacyKeys) {
        try {
          localStorage.removeItem(k)
        } catch {
          // mantém as demais
        }
      }
      return true
    } catch {
      return false
    }
  }

  function selecionar(id: string, atorId = 'u-pm'): boolean {
    if (!state.value.projetos.some((p) => p.id === id)) return false
    state.value.atualId = id
    registrarGlobal('ProjectSelected', `projeto atual: ${id}`, atorId)
    return true
  }

  function validarG0(input: CriarProjetoInput): CriarProjetoResult['erros'] {
    const erros: CriarProjetoResult['erros'] = []
    if (input.contexto.trim().length < 30 || !input.publico.trim() || !input.objetivo.trim() || !input.metricaNome.trim()) {
      erros.push({ campo: 'g0', codigo: 'G0-001', mensagem: 'Contexto (30+), público, objetivo e métrica são obrigatórios (G0-001).' })
    }
    if (input.restricoes.length === 0 || input.naoObjetivos.length === 0) {
      erros.push({ campo: 'escopo', codigo: 'G0-002', mensagem: 'Registre ao menos 1 restrição e 1 não-objetivo, ou prossiga com pendência (G0-002).' })
    }
    if (!input.owner.trim()) {
      erros.push({ campo: 'owner', codigo: 'G0-003', mensagem: 'Owner é obrigatório (G0-003).' })
    }
    return erros
  }

  function criarProjeto(input: CriarProjetoInput, atorId: string, preservarCamposRevisados = false): CriarProjetoResult {
    // G0-002 é aviso alto: bloqueia apenas G0-001 e G0-003.
    const todos = validarG0(input)
    const bloqueantes = todos.filter((e) => e.codigo !== 'G0-002')
    if (bloqueantes.length > 0) return { ok: false, erros: bloqueantes }
    const agora = new Date().toISOString()
    const id = `${slug(input.titulo || input.objetivo)}-${Math.random().toString(36).slice(2, 6)}`
    const epicoId = `ep-${Math.random().toString(36).slice(2, 6)}`
    const epico: Epic = {
      id: epicoId,
      project_id: id,
      tipo: 'epico',
      titulo: input.objetivo.slice(0, 140) || 'Novo épico',
      descricao: input.contexto,
      status: 'draft',
      gate: 'G0',
      owner: input.owner,
      contribuidores: [input.owner],
      classificacao: input.classificacao,
      fonte: 'stated',
      fonte_refs: [],
      versao: 1,
      baseline: null,
      parent_id: null,
      causa_stale: null,
      x: 480,
      y: 200,
      z: 0,
      grupo: null,
      created_at: agora,
      updated_at: agora,
      problema: preservarCamposRevisados ? input.contexto : `${input.contexto} Público: ${input.publico}.`,
      objetivo: input.objetivo,
      kpis: [{ nome: input.metricaNome, unidade: '-', alvo: 'a definir', janela: '90d', responsavel: input.owner }],
      personas: [input.publico],
      escopo_in: preservarCamposRevisados ? input.restricoes : input.restricoes.length > 0 ? ['Escopo a detalhar'] : [],
      escopo_out: input.naoObjetivos,
      riscos: todos.some((e) => e.codigo === 'G0-002') ? ['Escopo incompleto (G0-002): completar restrições/não-objetivos'] : []
    }
    const projeto: Projeto = {
      id,
      titulo: input.titulo || input.objetivo.slice(0, 60),
      descricao: input.contexto.slice(0, 200),
      epicoId,
      epicoTitulo: epico.titulo,
      owner: input.owner,
      classificacao: input.classificacao,
      createdAt: agora,
      updatedAt: agora
    }
    escrever(graphKey(id), { nos: [epico], arestas: [], selecionadoId: epicoId })
    escrever(gatesKey(id), gatesZerados())
    escrever(patchesKey(id), [])
    const pendencia = todos.some((e) => e.codigo === 'G0-002') ? ' Pendência G0-002 registrada.' : ''
    escrever(auditKey(id), [
      { id: rid('a'), em: agora, ator_id: atorId, acao: 'ProjectCreated', alvo_id: epicoId, detalhe: `projeto "${projeto.titulo}" criado.${pendencia}` }
    ])
    escrever(tentKey(id), [])
    state.value.projetos.push(projeto)
    state.value.atualId = id
    registrarGlobal('ProjectCreated', `projeto "${projeto.titulo}" (${id})`, atorId)
    return { ok: true, erros: todos.filter((e) => e.codigo === 'G0-002'), projeto }
  }

  function criarProjetoExistente(input: CriarProjetoExistenteInput, atorId: string): CriarProjetoResult {
    const erros: CriarProjetoResult['erros'] = []
    if (!input.titulo.trim()) {
      erros.push({ campo: 'titulo', codigo: 'G0-001', mensagem: 'Título é obrigatório (G0-001).' })
    }
    if (!input.owner.trim()) {
      erros.push({ campo: 'owner', codigo: 'G0-003', mensagem: 'Owner é obrigatório (G0-003).' })
    }
    const textoIngestao = input.ingestao?.texto?.trim() ?? ''
    if (textoIngestao.length === 0) {
      erros.push({ campo: 'ingestao', codigo: 'G0-004', mensagem: 'Ingestão com texto vazio não gera contexto parcial (G0-004).' })
    }
    if (erros.length > 0) return { ok: false, erros }
    const agora = new Date().toISOString()
    const id = `${slug(input.titulo)}-${Math.random().toString(36).slice(2, 6)}`
    const epicoId = `ep-${Math.random().toString(36).slice(2, 6)}`
    const parcial = input.contextoParcial ?? {}
    const fonteRef = input.ingestao.repoUrl || input.ingestao.wikiUrl || input.ingestao.arquivoNome || 'texto'
    const epico: Epic = {
      id: epicoId,
      project_id: id,
      tipo: 'epico',
      titulo: parcial.titulo || input.titulo.slice(0, 140),
      descricao: parcial.descricao ?? textoIngestao.slice(0, 500),
      status: parcial.status ?? 'draft',
      gate: parcial.gate ?? 'G0',
      owner: parcial.owner ?? input.owner,
      contribuidores: parcial.contribuidores ?? [input.owner],
      classificacao: parcial.classificacao ?? 'internal',
      fonte: parcial.fonte ?? 'inferred',
      fonte_refs: parcial.fonte_refs ?? [`${input.ingestao.fonte}:${fonteRef}`],
      versao: 1,
      baseline: parcial.baseline ?? null,
      parent_id: parcial.parent_id ?? null,
      causa_stale: parcial.causa_stale ?? null,
      x: parcial.x ?? 480,
      y: parcial.y ?? 200,
      z: parcial.z ?? 0,
      grupo: parcial.grupo ?? null,
      created_at: agora,
      updated_at: agora,
      problema: parcial.problema ?? '',
      objetivo: parcial.objetivo ?? '',
      kpis: parcial.kpis ?? [],
      personas: parcial.personas ?? [],
      escopo_in: parcial.escopo_in ?? [],
      escopo_out: parcial.escopo_out ?? [],
      riscos: parcial.riscos ?? []
    }
    // Item6 (caller real Existente): coerência Pix no épico criado —
    // aplicarSeedCoerenteCriacao preenche padrões quando vazio + menção Pix.
    aplicarSeedCoerenteCriacao(epico, [])
    const projeto: Projeto = {
      id,
      titulo: input.titulo.slice(0, 60),
      descricao: textoIngestao.slice(0, 200),
      epicoId,
      epicoTitulo: epico.titulo,
      owner: input.owner,
      classificacao: epico.classificacao,
      createdAt: agora,
      updatedAt: agora
    }
    escrever(graphKey(id), { nos: [epico], arestas: [], selecionadoId: epicoId })
    escrever(gatesKey(id), gatesZerados())
    escrever(patchesKey(id), [])
    escrever(auditKey(id), [
      { id: rid('a'), em: agora, ator_id: atorId, acao: 'ProjectCreated', alvo_id: epicoId, detalhe: `projeto existente "${projeto.titulo}" criado a partir de ingestão ${input.ingestao.fonte}.` }
    ])
    escrever(tentKey(id), [])
    state.value.projetos.push(projeto)
    state.value.atualId = id
    registrarGlobal('ProjectCreated', `projeto existente "${projeto.titulo}" (${id})`, atorId)
    return { ok: true, erros: [], projeto }
  }

  // FIXTIPOS-MOTOR (fora de VUE): conclusão do fluxo Existente a partir do
  // payload do IngestaoDialog { projetoId, epicoId }. Usa seedParcialExistente
  // de seed.ts (épico+feature parciais com fonte ingestão, sem renomear ids
  // atuais), persiste a análise da ingestão no namespace isolado do projeto
  // (graphKey/gatesKey próprios, sem zerar banco), troca o projeto atual e
  // devolve a rota do Gate G0 com alvo=epicoId e modo=wizard. criarProjeto
  // atual NÃO é alterado.
  function concluirIngestaoExistente(payload: ConcluirIngestaoPayload, atorId: string): ConcluirIngestaoResult {
    const projetoId = payload.projetoId?.trim() ?? ''
    const epicoId = payload.epicoId?.trim() ?? ''
    if (!projetoId || !epicoId) {
      return { ok: false, erros: [{ campo: 'ingestao', codigo: 'G0-004', mensagem: 'Payload de ingestão sem projetoId/epicoId (G0-004).' }] }
    }
    const projeto = state.value.projetos.find((p) => p.id === projetoId)
    if (!projeto) {
      return { ok: false, erros: [{ campo: 'projeto', codigo: 'G0-001', mensagem: 'Projeto da ingestão não encontrado.' }] }
    }
    if (projeto.epicoId !== epicoId) {
      return { ok: false, erros: [{ campo: 'epico', codigo: 'G0-001', mensagem: 'epicoId do payload diverge do projeto.' }] }
    }
    // PRESERVA a análise do usuário: se o épico já existe no namespace
    // (gravado pela ingestão com problema/objetivo/personas do usuário),
    // mantém os campos do usuário e só completa vazios via coerência.
    // Só usa o seed de reembolso quando o namespace está vazio — NUNCA
    // sobrescreve a análise do usuário com o seed reembolso.
    const epicoBase = {
      ...seedParcialExistente.epico,
      project_id: projetoId,
      id: epicoId,
      owner: projeto.owner,
      contribuidores: [projeto.owner]
    }
    const featureParcial = {
      ...seedParcialExistente.feature,
      project_id: projetoId,
      parent_id: epicoId
    }
    try {
      const raw = ler<{ nos: NexoObject[]; arestas: Edge[]; selecionadoId: string | null }>(graphKey(projetoId))
      const nosAtuais = Array.isArray(raw?.nos) ? raw!.nos : []
      const existente = nosAtuais.find((n) => n.id === epicoId)
      const base = existente ?? (epicoBase as NexoObject)
      const rec = base as unknown as Record<string, unknown>
      const analiseProblema = typeof rec['problema'] === 'string' ? (rec['problema'] as string) : ''
      const analiseObjetivo = typeof rec['objetivo'] === 'string' ? (rec['objetivo'] as string) : ''
      const coerencia = aplicarSeedCoerenteTexto(analiseProblema, analiseObjetivo)
      const epicoFinal = {
        ...base,
        project_id: projetoId,
        id: epicoId,
        owner: projeto.owner,
        contribuidores: [projeto.owner],
        problema: analiseProblema.trim() ? analiseProblema : coerencia.problema,
        objetivo: analiseObjetivo.trim() ? analiseObjetivo : coerencia.objetivo
      }
      const semEpico = nosAtuais.filter((n) => n.id !== epicoId)
      const semFeature = semEpico.filter((n) => n.id !== featureParcial.id)
      const nos = [...semFeature, epicoFinal as NexoObject, featureParcial as NexoObject]
      const ok = escrever(graphKey(projetoId), { nos, arestas: Array.isArray(raw?.arestas) ? raw!.arestas : [], selecionadoId: epicoId })
      if (!ok) {
        return { ok: false, erros: [{ campo: 'ingestao', codigo: 'G0-004', mensagem: 'Falha ao persistir análise da ingestão no projeto.' }] }
      }
      if (!ler(gatesKey(projetoId))) escrever(gatesKey(projetoId), gatesZerados())
    } catch {
      return { ok: false, erros: [{ campo: 'ingestao', codigo: 'G0-004', mensagem: 'Falha ao persistir análise da ingestão no projeto.' }] }
    }
    // Troca para o projeto (namespace isolado) e monta a rota do Gate G0
    // com alvo=epicoId e modo=wizard.
    state.value.atualId = projetoId
    registrarGlobal('ProjectSelected', `projeto atual: ${projetoId} (ingestão concluída)`, atorId)
    return {
      ok: true,
      erros: [],
      projetoId,
      epicoId,
      rotaGate: `/gates/G0?alvo=${encodeURIComponent(epicoId)}&modo=wizard`
    }
  }

  function removerProjeto(id: string, confirmacao: string, atorId: string): { ok: boolean; motivo: string } {
    const p = state.value.projetos.find((x) => x.id === id)
    if (!p) return { ok: false, motivo: 'Projeto não encontrado.' }
    if (confirmacao !== p.titulo) return { ok: false, motivo: 'Digite o nome exato do projeto para confirmar.' }
    if (state.value.projetos.length <= 1) return { ok: false, motivo: 'Não é possível remover o último projeto.' }
    for (const k of [graphKey(id), gatesKey(id), patchesKey(id), auditKey(id), tentKey(id), `nexo.v1.gateRequests.${id}`]) {
      try {
        localStorage.removeItem(k)
      } catch {
        // segue
      }
    }
    state.value.projetos = state.value.projetos.filter((x) => x.id !== id)
    if (state.value.atualId === id) state.value.atualId = state.value.projetos[0].id
    registrarGlobal('ProjectRemoved', `projeto "${p.titulo}" removido`, atorId)
    return { ok: true, motivo: 'Projeto removido.' }
  }

  function resetCobrancas(): void {
    escrever(graphKey(seedProjeto.id), {
      nos: [seedEpico as NexoObject, ...(seedFeatures as NexoObject[]), ...(seedPbis as NexoObject[])],
      arestas: seedEdges,
      selecionadoId: 'ft-confirmar'
    })
    escrever(gatesKey(seedProjeto.id), seedGates as GateInfo[])
    escrever(patchesKey(seedProjeto.id), [])
    escrever(auditKey(seedProjeto.id), [
      { id: rid('a'), em: new Date().toISOString(), ator_id: 'u-pm', acao: 'SeedLoaded', detalhe: 'seed Cobranças restaurado (projetos do usuário preservados)' }
    ])
    escrever(tentKey(seedProjeto.id), [])
    if (!state.value.projetos.some((p) => p.id === seedProjeto.id)) {
      state.value.projetos.unshift({
        id: seedProjeto.id,
        titulo: seedProjeto.titulo,
        descricao: 'Cobranças via Pix',
        epicoId: seedEpico.id,
        epicoTitulo: seedEpico.titulo,
        owner: 'u-pm',
        classificacao: 'internal',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: new Date().toISOString()
      })
    }
    persist()
  }

  function criarProjetoComIA(respostas: RespostasWizardCriacao, atorId: string): CriarProjetoResult {
    // New callers include reviewed fields. Treat their answers as authoritative:
    // validate and persist them literally rather than applying the legacy
    // seed-coherence/default path below.
    if (respostas.titulo !== undefined || respostas.classificacao !== undefined) {
      const tituloRevisado = respostas.titulo?.trim() ?? ''
      if (!tituloRevisado) {
        return { ok: false, erros: [{ campo: 'titulo', codigo: 'G0-001', mensagem: 'Título é obrigatório (G0-001).' }] }
      }
      const linhas = (texto: string | undefined) => (texto ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      return criarProjeto({
        titulo: tituloRevisado,
        contexto: respostas.problema?.trim() ?? '',
        publico: respostas.usuarios?.trim() ?? '',
        objetivo: respostas.objetivo?.trim() ?? '',
        metricaNome: respostas.metrica?.trim() ?? '',
        restricoes: linhas(respostas.escopo),
        naoObjetivos: linhas(respostas.naoObjetivos),
        owner: atorId,
        classificacao: respostas.classificacao ?? 'internal'
      }, atorId, true)
    }

    // Compatibilidade para callers antigos sem título/classificação revisados.
    // Mantém os defaults e as coerências históricas somente nesse caminho.
    const problema = respostas.problema?.trim() ?? ''
    const objetivo = respostas.objetivo?.trim() ?? ''
    const usuarios = respostas.usuarios?.trim() ?? ''
    const escopo = respostas.escopo ?? ''
    const metrica = respostas.metrica?.trim() ?? ''
    const naoObjetivosTxt = respostas.naoObjetivos ?? ''
    const titulo = (objetivo || problema).slice(0, 60) || 'Novo projeto'
    const classificacao = respostas.classificacao ?? 'internal'
    const contextoBase = `${problema} ${objetivo}`.trim() || 'Novo projeto'
    const coerencia = aplicarSeedCoerenteTexto(contextoBase, objetivo || contextoBase)
    const contextoBruto = coerencia.problema
    const objetivoBruto = coerencia.objetivo.length >= 10 ? coerencia.objetivo : `${coerencia.objetivo} ${coerencia.problema}`.trim().slice(0, 200)
    // G0-001 exige contexto 30+: completa curto com objetivo + público.
    // Sem G0-001 bloquear: wizard de 10 chars por passo sempre passa.
    const contexto = contextoBruto.trim().length >= 30
      ? contextoBruto
      : `${contextoBruto} ${objetivoBruto} Público: ${usuarios || 'Cliente com fatura aberta'}.`.trim().slice(0, 500)
    const objetivoFinal = objetivoBruto
    const restricoes = escopo
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    const naoObjetivos = naoObjetivosTxt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    const input: CriarProjetoInput = {
      titulo: titulo || objetivoFinal.slice(0, 60) || 'Novo projeto',
      contexto,
      publico: usuarios || 'Cliente com fatura aberta',
      objetivo: objetivoFinal,
      metricaNome: metrica || 'Adoção inicial',
      restricoes: restricoes.length > 0 ? restricoes : ['Escopo a detalhar'],
      naoObjetivos: naoObjetivos.length > 0 ? naoObjetivos : ['Fora do padrão a definir'],
      owner: atorId,
      classificacao
    }
    const resultado = criarProjeto(input, atorId)
    // Item6 (caller real Novo): coerência Pix pós-criação no épico gravado.
    if (resultado.ok && resultado.projeto) {
      try {
        const raw = ler<{ nos: NexoObject[]; arestas: Edge[]; selecionadoId: string | null }>(graphKey(resultado.projeto.id))
        const nos = Array.isArray(raw?.nos) ? raw!.nos : []
        const epicoNo = nos.find((n) => n.id === resultado.projeto!.epicoId)
        if (epicoNo && epicoNo.tipo === 'epico') {
          aplicarSeedCoerenteCriacao(epicoNo as unknown as Epic, [])
          escrever(graphKey(resultado.projeto.id), { nos, arestas: Array.isArray(raw?.arestas) ? raw!.arestas : [], selecionadoId: raw?.selecionadoId ?? epicoNo.id })
        }
      } catch {
        // coerência é melhor-esforço: criação já OK
      }
    }
    return resultado
  }

  return { state, atual, persist, selecionar, criarProjeto, criarProjetoComIA, criarProjetoExistente, concluirIngestaoExistente, removerProjeto, resetCobrancas, graphKey, gatesKey, patchesKey, auditKey, tentKey }
})
