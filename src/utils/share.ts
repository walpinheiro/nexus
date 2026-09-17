// Share-link: serializa o estado do canvas em hash URL (base64 de JSON).
// Sem dependência externa: JSON -> encodeURIComponent -> btoa (com fallback unicode).

export interface ShareState {
  v: 1
  nos: { id: string; x: number; y: number; z: number }[]
  sel: string | null
  zoom: number
  pan: [number, number]
}

function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64decode(s: string): string {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(norm)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeShare(state: ShareState): string {
  return b64encode(JSON.stringify(state))
}

export function decodeShare(hash: string): ShareState | null {
  try {
    const limpo = hash.startsWith('#') ? hash.slice(1) : hash
    const obj = JSON.parse(b64decode(limpo)) as ShareState
    if (obj && obj.v === 1 && Array.isArray(obj.nos)) return obj
    return null
  } catch {
    return null
  }
}
