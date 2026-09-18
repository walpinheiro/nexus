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

export interface OllamaConfig {
  baseUrl: string
  model: string
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const OLLAMA_STORAGE_KEY = 'nexo.v1.ai.ollama'

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'queen'
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
      model: typeof p.model === 'string' && p.model.trim() ? p.model.trim() : DEFAULT_OLLAMA_CONFIG.model
    }
  } catch {
    return { ...DEFAULT_OLLAMA_CONFIG }
  }
}

export function saveConfig(cfg: Partial<OllamaConfig>): OllamaConfig {
  const atual = getConfig()
  const next: OllamaConfig = {
    baseUrl: cfg.baseUrl?.trim() ? cfg.baseUrl.trim() : atual.baseUrl,
    model: cfg.model?.trim() ? cfg.model.trim() : atual.model
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
 * 'queen' contra um llama.cpp servindo Ternary-Bonsai-2-27B), usa o primeiro id
 * real anunciado e persiste no config. NUNCA hardcode 'queen' no corpo.
 */
async function resolverModeloEfetivo(base: string, timeoutMs: number): Promise<string> {
  const cfg = getConfig()
  const det = await listarModelosServidor(base, timeoutMs)
  if (!det || det.models.length === 0) return cfg.model
  if (det.models.includes(cfg.model)) return cfg.model
  const efetivo = det.models[0]
  try {
    saveConfig({ model: efetivo })
  } catch {
    // segue com o efetivo em memória
  }
  return efetivo
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

function extrairTextoOllamaChat(data: unknown): string {
  const d = data as { message?: { content?: string }; response?: string }
  return String(d?.message?.content ?? d?.response ?? '').trim()
}

function extrairTextoLlamaCppCompletions(data: unknown): string {
  const d = data as { choices?: { message?: { content?: string }; text?: string }[] }
  const c = Array.isArray(d?.choices) ? d.choices[0] : undefined
  return String(c?.message?.content ?? c?.text ?? '').trim()
}

/**
 * R1 — chat dual com backend e model efetivos.
 * Ordem: POST /api/chat (Ollama) → POST /v1/chat/completions (llama.cpp).
 * Model SEMPRE o efetivo (resolvido via /v1/models ou /api/tags em runtime).
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
  const model = await resolverModeloEfetivo(base, listTimeoutMs)

  // Tentativa 1: POST /api/chat (Ollama oficial). 404/fetch-fail → cai para completions.
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
    if (res.ok) {
      try {
        return { texto: extrairTextoOllamaChat(await res.json()), provider: 'ollama', model }
      } catch {
        throw new OllamaOffline('chat json inválido')
      }
    }
    // !ok (ex.: 404 do llama-server, que não conhece /api/chat) → tenta /v1/chat/completions.
  } catch (e) {
    // Parse real do /api/chat com http 200: erro legítimo, não tenta o outro backend.
    if (e instanceof OllamaOffline && e.message === 'chat json inválido') throw e
    // fetch falhou / timeout / http != ok → tenta /v1/chat/completions abaixo.
  }

  // Tentativa 2: POST /v1/chat/completions (llama.cpp, formato OpenAI).
  try {
    const res = await fetchComTimeout(
      `${base}/v1/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false })
      },
      timeoutMs
    )
    if (!res.ok) throw new OllamaOffline(`completions http=${res.status}`)
    try {
      return { texto: extrairTextoLlamaCppCompletions(await res.json()), provider: 'llama.cpp', model }
    } catch {
      throw new OllamaOffline('completions json inválido')
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
