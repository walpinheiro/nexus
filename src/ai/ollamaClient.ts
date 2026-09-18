// Cliente Ollama local (QUEEN-MOTOR O1) — 100% local, sem chave, sem backend.
// Default: { baseUrl: 'http://localhost:11434', model: 'queen' } persistido em nexo.v1.ai.ollama.
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

/** GET /api/tags com timeout 3s — lista modelos locais. Offline → throw OllamaOffline. */
export async function saude(timeoutMs = 3000): Promise<{ ok: boolean; models: string[] }> {
  const cfg = getConfig()
  const url = `${normalizarBase(cfg.baseUrl)}/api/tags`
  let res: Response
  try {
    res = await fetchComTimeout(url, { method: 'GET' }, timeoutMs)
  } catch {
    throw new OllamaOffline()
  }
  if (!res.ok) throw new OllamaOffline(`tags http=${res.status}`)
  try {
    const data = (await res.json()) as { models?: { name?: string }[] }
    const models = Array.isArray(data.models)
      ? data.models.map((m) => String(m?.name ?? '')).filter(Boolean)
      : []
    return { ok: true, models }
  } catch {
    throw new OllamaOffline('tags json inválido')
  }
}

/** POST /api/chat com timeout 60s — retorna texto concatenado. Offline → throw OllamaOffline. */
export async function chat(messages: OllamaMessage[], opts?: { timeoutMs?: number }): Promise<string> {
  const cfg = getConfig()
  const timeoutMs = opts?.timeoutMs ?? 60000
  const url = `${normalizarBase(cfg.baseUrl)}/api/chat`
  let res: Response
  try {
    res = await fetchComTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, messages, stream: false })
      },
      timeoutMs
    )
  } catch {
    throw new OllamaOffline()
  }
  if (!res.ok) throw new OllamaOffline(`chat http=${res.status}`)
  try {
    const data = (await res.json()) as { message?: { content?: string }; response?: string }
    const txt = String(data?.message?.content ?? data?.response ?? '').trim()
    return txt
  } catch {
    throw new OllamaOffline('chat json inválido')
  }
}
