// Share compatível com m3e (#docz= deflate-raw base64url, fallback #doc= JSON).
import type { StudioDoc } from '@/types/studio'

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(norm)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw')
  const stream = new Blob([data.buffer as ArrayBuffer]).stream().pipeThrough(cs)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([data.buffer as ArrayBuffer]).stream().pipeThrough(ds)
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

export async function encodeDoc(doc: StudioDoc): Promise<string> {
  const json = JSON.stringify(doc)
  const bytes = new TextEncoder().encode(json)
  const raw = await deflateRaw(bytes)
  return `#docz=${b64urlEncode(raw)}`
}

export async function decodeDoc(hash: string): Promise<StudioDoc> {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (h.startsWith('docz=')) {
    const raw = b64urlDecode(h.slice(5))
    const out = await inflateRaw(raw)
    const doc = JSON.parse(new TextDecoder().decode(out)) as StudioDoc
    validarShape(doc)
    return doc
  }
  if (h.startsWith('doc=')) {
    const bin = atob(h.slice(4).replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const doc = JSON.parse(new TextDecoder().decode(bytes)) as StudioDoc
    validarShape(doc)
    return doc
  }
  throw new Error('Link inválido: use #docz= (m3e) ou #doc= (JSON).')
}

export function validarShape(doc: StudioDoc): void {
  if (!doc || typeof doc !== 'object') throw new Error('Documento inválido: objeto esperado.')
  if (!Array.isArray((doc as StudioDoc).frames)) throw new Error('Documento inválido: frames ausente.')
  if (!Array.isArray((doc as unknown as { groups?: unknown }).groups) && !Array.isArray((doc as unknown as { items?: unknown }).items))
    throw new Error('Documento inválido: groups/items ausentes.')
  if (typeof (doc as StudioDoc).theme !== 'object') throw new Error('Documento inválido: theme ausente.')
}

export async function readShareHash(hash: string): Promise<{ ok: boolean; doc?: StudioDoc; erro?: string }> {
  try {
    const doc = await decodeDoc(hash)
    return { ok: true, doc }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Hash inválido.' }
  }
}

export function docParaLinkM3E(hash: string): string {
  return `https://lnkiai.github.io/m3e-canvas/${hash}`
}
