// Cliente dual Ollama / llama.cpp (FIX-REAL-OLLAMA R1) — 100% local, sem chave, sem backend.
// FATO PROVADO PELO DONO: o servidor real em :11434 é llama.cpp (llama-server) servindo
// Ternary-Bonsai-2-27B, NÃO Ollama oficial. Por isso:
// - saude() tenta GET /api/tags (Ollama) e cai para GET /v1/models (llama.cpp/OpenAI-compat).
// - chat() tenta POST /api/chat e cai para POST /v1/chat/completions {model, messages, stream:false}.
// - model é SEMPRE o configurado/eefetivo: o default 'queen' NÃO existe no server real — o id
//   real é lido via /v1/models (ou /api/tags) em runtime e o config é salvo com o model
//   efetivo. NUNCA se envia 'queen' hardcoded no corpo quando o servidor anuncia outro id.
// - Timeout de chat 120s (27B quantizado é lento).
// Erro de rede NUNCA quebra chamadores: lança OllamaOffline para fallback local.

export type ProvedorIaLocal = 'ollama' | 'llama.cpp' | 'local'

export interface OllamaConfig {
  baseUrl: string
  model: string
  provider: ProvedorIaLocal
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const OLLAMA_STORAGE_KEY = 'nexo.v1.ai.ollama'

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'queen',
  provider: 'ollama'
}

function normalizarProvider(v: unknown): ProvedorIaLocal {
  return v === 'ollama' || v === 'llama.cpp' || v === 'local'
    ? v
    : DEFAULT_OLLAMA_CONFIG.provider
}

/** Timeout default de chat: 120s — modelo 27B quantizado é lento (R1). */
export const CHAT_TIMEOUT_MS = 120000

/** Backend LLM efetivo que respondeu (R1/R2 — sem badgeamento silencioso). */
export type LlmBackend = 'ollama' | 'llama.cpp'

export interface ChatResult {
  texto: string
  provider: LlmBackend
  model: string
}

export class OllamaOffline extends Error {
  constructor(msg = 'Ollama offline (fallback local)') {
    super(msg)
    this.name = 'OllamaOffline'
  }
}

function normalizarBase(url: string): string {
  return (url || '').trim().replace(/\/+$/, '')
}

export function getConfig(): OllamaConfig {
  if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_OLLAMA_CONFIG }
  try {
    const raw = window.localStorage.getItem(OLLAMA_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_OLLAMA_CONFIG }
    const p = JSON.parse(raw) as Partial<OllamaConfig>
    return {
      baseUrl: typeof p.baseUrl === 'string' && p.baseUrl.trim() ? p.baseUrl.trim() : DEFAULT_OLLAMA_CONFIG.baseUrl,
      model: typeof p.model === 'string' && p.model.trim() ? p.model.trim() : DEFAULT_OLLAMA_CONFIG.model,
      provider: normalizarProvider(p.provider)
    }
  } catch {
    return { ...DEFAULT_OLLAMA_CONFIG }
  }
}

export function saveConfig(cfg: Partial<OllamaConfig>): OllamaConfig {
  const atual = getConfig()
  const next: OllamaConfig = {
    baseUrl: cfg.baseUrl?.trim() ? cfg.baseUrl.trim() : atual.baseUrl,
    model: cfg.model?.trim() ? cfg.model.trim() : atual.model,
    provider: cfg.provider !== undefined ? normalizarProvider(cfg.provider) : atual.provider
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(OLLAMA_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // segue em memória
    }
  }
  return next
}

/** Provedor padrao configurado, para uso na criacao Novo e Existente. */
export function getProviderPadrao(): ProvedorIaLocal {
  return getConfig().provider
}

async function fetchComTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } catch (e) {
    throw new OllamaOffline(e instanceof Error ? e.message : 'fetch falhou')
  } finally {
    clearTimeout(t)
  }
}

function extrairNomesOllamaTags(data: unknown): string[] {
  const d = data as { models?: { name?: string }[] }
  return Array.isArray(d?.models)
    ? d.models.map((m) => String(m?.name ?? '')).filter(Boolean)
    : []
}

function extrairIdsLlamaCppModels(data: unknown): string[] {
  const d = data as { data?: { id?: string }[] }
  return Array.isArray(d?.data)
    ? d.data.map((m) => String(m?.id ?? '')).filter(Boolean)
    : []
}

/**
 * R1 — lê o id real do modelo no servidor em runtime.
 * Tenta /api/tags (Ollama) e cai para /v1/models (llama.cpp).
 * Retorna null quando o servidor está inalcançável (chamador decide o fallback).
 */
async function listarModelosServidor(
  base: string,
  timeoutMs: number
): Promise<{ models: string[]; provider: LlmBackend } | null> {
  try {
    const res = await fetchComTimeout(`${base}/api/tags`, { method: 'GET' }, timeoutMs)
    if (res.ok) {
      try {
        const models = extrairNomesOllamaTags(await res.json())
        return { models, provider: 'ollama' }
      } catch {
        return { models: [], provider: 'ollama' }
      }
    }
  } catch {
    // cai para /v1/models abaixo
  }
  try {
    const res = await fetchComTimeout(`${base}/v1/models`, { method: 'GET' }, timeoutMs)
    if (!res.ok) return null
    try {
      return { models: extrairIdsLlamaCppModels(await res.json()), provider: 'llama.cpp' }
    } catch {
      return { models: [], provider: 'llama.cpp' }
    }
  } catch {
    return null
  }
}

/**
 * R1 — resolve o model EFETIVO a usar no corpo das requisições.
 * Regra: se o config aponta para um id que o servidor NÃO anuncia (ex.: default
 * 'queen' contra um llama.cpp servindo o gguf do Bonsai), usa o primeiro id
 * real anunciado e persiste no config. NUNCA envia placeholder no corpo.
 * Normaliza: chama /v1/models uma única vez por chamada de chat (evita GET duplo
 * antes de cada POST — o dono provou zero request chegando ao server).
 */
async function resolverModeloEfetivo(base: string, timeoutMs: number): Promise<{ model: string; provider: LlmBackend } | null> {
  const cfg = getConfig()
  const det = await listarModelosServidor(base, timeoutMs)
  if (!det || det.models.length === 0) return null
  // Prefere o id longo exato do gguf (llama.cpp anuncia path completo); evita alias curto.
  const longo = det.models.filter((m) => m.includes('/'))
  const pool = longo.length > 0 ? longo : det.models
  if (pool.includes(cfg.model)) return { model: cfg.model, provider: det.provider }
  const efetivo = pool[0]
  try {
    saveConfig({ model: efetivo })
  } catch {
    // segue com o efetivo em memória
  }
  return { model: efetivo, provider: det.provider }
}

/** GET /api/tags (Ollama) com queda para GET /v1/models (llama.cpp). Offline → throw OllamaOffline. */
export async function saude(
  timeoutMs = 3000
): Promise<{ ok: boolean; models: string[]; provider: LlmBackend }> {
  const cfg = getConfig()
  const base = normalizarBase(cfg.baseUrl)
  const det = await listarModelosServidor(base, timeoutMs)
  if (!det) throw new OllamaOffline()
  // Persiste o model efetivo quando o configurado não existe no server real (R1).
  if (det.models.length > 0 && !det.models.includes(cfg.model)) {
    try {
      saveConfig({ model: det.models[0] })
    } catch {
      // segue em memória
    }
  }
  return { ok: true, models: det.models, provider: det.provider }
}

/** Diagnóstico R5 — prova de vida do LLM no console (dono desconfiou de mock).
 * Registra backend, model, tamanho e prefixo da resposta. Chamado 1x por
 * tentarCompletions/tentativa-/api/chat quando há resposta real; nunca em
 * fallback. Não afeta determinismo (só console). */
function provarVida(result: ChatResult): void {
  try {
    console.info(
      `[LLM-REAL] provider=${result.provider} model=${result.model} chars=${result.texto.length} :: ${result.texto.slice(0, 160)}`
    )
  } catch {
    // console indisponível — segue
  }
}

function extrairTextoOllamaChat(data: unknown): string {
  const d = data as { message?: { content?: string }; response?: string }
  return String(d?.message?.content ?? d?.response ?? '').trim()
}

function extrairTextoLlamaCppCompletions(data: unknown): string {
  // PROVA R5 (server real do dono): o Bonsai responde 200 com
  // choices[0].message.content VAZIO e o conteúdo real em reasoning_content.
  // Sem este fallback, toda resposta parecia "mock vazio".
  const d = data as {
    choices?: { message?: { content?: string; reasoning_content?: string }; text?: string; reasoning_content?: string }[]
  }
  const c = Array.isArray(d?.choices) ? d.choices[0] : undefined
  const msg = c?.message ?? {}
  return String(msg.content || c?.reasoning_content || msg.reasoning_content || c?.text || '').trim()
}

/**
 * Tentativa única POST /v1/chat/completions. Retorna ChatResult quando o texto
 * é não-vazio; null quando vazio/inválido/offline (chamador tenta /api/chat).
 * Lança OllamaOffline apenas em JSON ilegível com HTTP 200 (erro legítimo).
 */
async function tentarCompletions(
  base: string,
  model: string,
  messages: OllamaMessage[],
  timeoutMs: number
): Promise<ChatResult | null> {
  let res: Response
  try {
    res = await fetchComTimeout(
      `${base}/v1/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false })
      },
      timeoutMs
    )
  } catch {
    return null
  }
  if (!res.ok) return null
  let texto: string
  try {
    texto = extrairTextoLlamaCppCompletions(await res.json())
  } catch {
    throw new OllamaOffline('completions json inválido')
  }
  if (!texto) return null
  const result: ChatResult = { texto, provider: 'llama.cpp', model }
  provarVida(result)
  return result
}

/**
 * Chat DUAL com backend e model efetivos — PROVADO contra o server real do dono
 * (llama.cpp servindo gguf Bonsai; /api/* retorna 404, só /v1/* existe).
 * Ordem: POST /v1/chat/completions (llama.cpp) PRIMEIRO → POST /api/chat (Ollama).
 * Model SEMPRE o efetivo de /v1/models (resolvido 1x por chamada; sem GET duplo).
 * Timeout default 120s. Ambos inalcançáveis → throw OllamaOffline.
 */
export async function chatComProvedor(
  messages: OllamaMessage[],
  opts?: { timeoutMs?: number; listTimeoutMs?: number }
): Promise<ChatResult> {
  const cfg = getConfig()
  const base = normalizarBase(cfg.baseUrl)
  const timeoutMs = opts?.timeoutMs ?? CHAT_TIMEOUT_MS
  const listTimeoutMs = Math.min(opts?.listTimeoutMs ?? 8000, timeoutMs)
  const resolvido = await resolverModeloEfetivo(base, listTimeoutMs)
  // Sem lista do servidor (offline ou lista vazia): tenta o model configurado
  // direto no /v1/chat/completions antes de declarar offline — o llama-server
  // pode servir o model mesmo com /v1/models instável.
  const model = resolvido?.model ?? cfg.model

  // Tentativa 1: POST /v1/chat/completions (llama.cpp, formato OpenAI) — server real.
  const viaCompletions = await tentarCompletions(base, model, messages, timeoutMs)
  if (viaCompletions) return viaCompletions
  // null = vazio/offline/http!ok → tenta /api/chat abaixo (prova: /api/tags dá 404
  // no server real, então esta tentativa também deve falhar lá — mantida só p/ Ollama oficial).

  // Tentativa 2: POST /api/chat (Ollama oficial).
  try {
    const res = await fetchComTimeout(
      `${base}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false })
      },
      timeoutMs
    )
    if (!res.ok) throw new OllamaOffline(`chat http=${res.status}`)
    try {
      return { texto: extrairTextoOllamaChat(await res.json()), provider: 'ollama', model }
    } catch {
      throw new OllamaOffline('chat json inválido')
    }
  } catch (e) {
    if (e instanceof OllamaOffline) throw e
    throw new OllamaOffline()
  }
}

/** POST dual com timeout 120s — retorna só o texto (compat). Prefira chatComProvedor. */
export async function chat(messages: OllamaMessage[], opts?: { timeoutMs?: number }): Promise<string> {
  return (await chatComProvedor(messages, opts)).texto
}
