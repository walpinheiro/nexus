export type CanvasHandle = 'l' | 'r' | 't' | 'b'
export interface CanvasRect { x: number; y: number; width: number; height: number }
export interface CanvasPoint { x: number; y: number }
export interface CanvasInsets { left?: number; right?: number; top?: number; bottom?: number }

export const NODE_WIDTH = 280
export const NODE_DEFAULT_HEIGHT = 190
export const CANVAS_MIN_ZOOM = 0.01
export const CANVAS_MAX_ZOOM = 2

export function adjustCanvasZoom(current: number, delta: number, minZoom = CANVAS_MIN_ZOOM, maxZoom = CANVAS_MAX_ZOOM): number {
  const next = Math.min(maxZoom, Math.max(minZoom, current + delta))
  return Math.round(next * 1000) / 1000
}

export function usableCanvasRect(width: number, height: number, insets: CanvasInsets = {}) {
  const left = Math.min(Math.max(insets.left ?? 0, 0), width)
  const top = Math.min(Math.max(insets.top ?? 0, 0), height)
  const right = Math.min(Math.max(insets.right ?? 0, 0), Math.max(0, width - left))
  const bottom = Math.min(Math.max(insets.bottom ?? 0, 0), Math.max(0, height - top))
  const usableWidth = Math.max(0, width - left - right)
  const usableHeight = Math.max(0, height - top - bottom)
  return {
    left, top, right: width - right, bottom: height - bottom,
    width: usableWidth, height: usableHeight,
    centerX: left + usableWidth / 2,
    centerY: top + usableHeight / 2
  }
}

export function fitViewportToBounds(
  width: number,
  height: number,
  bounds: CanvasRect,
  insets: CanvasInsets = {},
  padding = 60,
  maxZoom = 1.5
): { zoom: number; panX: number; panY: number } | null {
  const usable = usableCanvasRect(width, height, insets)
  const worldWidth = Math.max(1, bounds.width + padding * 2)
  const worldHeight = Math.max(1, bounds.height + padding * 2)
  if (usable.width <= 0 || usable.height <= 0) return null
  const scale = Math.min(usable.width / worldWidth, usable.height / worldHeight, maxZoom)
  if (!Number.isFinite(scale) || scale <= 0) return null
  const zoom = Math.max(CANVAS_MIN_ZOOM, Math.min(maxZoom, Math.floor(scale * 100) / 100))
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  return {
    zoom,
    panX: usable.centerX - centerX * zoom,
    panY: usable.centerY - centerY * zoom
  }
}

export function layoutMeasuredNodes(
  nodes: Array<{ id: string; x: number; y: number; z?: number }>,
  sizes: Record<string, { width: number; height: number }>,
  columns = 3
): Array<{ id: string; x: number; y: number; z: number }> {
  const sorted = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x)
  if (!sorted.length) return []
  const count = Math.max(1, Math.floor(columns))
  const widths = Array.from({ length: count }, (_, col) => Math.max(...sorted.filter((_, i) => i % count === col).map((node) => sizes[node.id]?.width ?? NODE_WIDTH), 0))
  const xs = [120]
  for (let col = 1; col < count; col++) xs[col] = xs[col - 1] + widths[col - 1] + 60

  const result: Array<{ id: string; x: number; y: number; z: number }> = []
  let top = 160
  for (let start = 0; start < sorted.length; start += count) {
    const row = sorted.slice(start, start + count)
    row.forEach((node, col) => result.push({ id: node.id, x: xs[col], y: top, z: node.z ?? 0 }))
    top += Math.max(...row.map((node) => sizes[node.id]?.height ?? NODE_DEFAULT_HEIGHT)) + 64
  }
  return result
}

export function handlePoint(rect: CanvasRect, side: CanvasHandle): CanvasPoint {
  if (side === 'l') return { x: rect.x, y: rect.y + rect.height / 2 }
  if (side === 'r') return { x: rect.x + rect.width, y: rect.y + rect.height / 2 }
  if (side === 't') return { x: rect.x + rect.width / 2, y: rect.y }
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height }
}

export function nearestHandle(rect: CanvasRect, point: CanvasPoint): CanvasHandle {
  const distances: [CanvasHandle, number][] = [
    ['l', Math.abs(point.x - rect.x)], ['r', Math.abs(point.x - (rect.x + rect.width))],
    ['t', Math.abs(point.y - rect.y)], ['b', Math.abs(point.y - (rect.y + rect.height))]
  ]
  return distances.reduce((best, candidate) => candidate[1] < best[1] ? candidate : best)[0]
}

export function facingHandles(source: CanvasRect, target: CanvasRect): [CanvasHandle, CanvasHandle] {
  const dx = target.x + target.width / 2 - (source.x + source.width / 2)
  const dy = target.y + target.height / 2 - (source.y + source.height / 2)
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? ['r', 'l'] : ['l', 'r']
  return dy >= 0 ? ['b', 't'] : ['t', 'b']
}

export function edgePath(source: CanvasRect, target: CanvasRect, sourceSide: CanvasHandle, targetSide: CanvasHandle): string {
  const start = handlePoint(source, sourceSide)
  const end = handlePoint(target, targetSide)
  const distance = Math.max(48, Math.hypot(end.x - start.x, end.y - start.y) * 0.4)
  const vector = (side: CanvasHandle, amount: number): CanvasPoint => {
    if (side === 'l') return { x: -amount, y: 0 }
    if (side === 'r') return { x: amount, y: 0 }
    if (side === 't') return { x: 0, y: -amount }
    return { x: 0, y: amount }
  }
  const a = vector(sourceSide, distance)
  const b = vector(targetSide, distance)
  return `M ${start.x} ${start.y} C ${start.x + a.x} ${start.y + a.y}, ${end.x + b.x} ${end.y + b.y}, ${end.x} ${end.y}`
}

export function edgePathToPoint(source: CanvasRect, target: CanvasPoint, sourceSide: CanvasHandle): string {
  const start = handlePoint(source, sourceSide)
  const distance = Math.max(48, Math.hypot(target.x - start.x, target.y - start.y) * 0.4)
  const vector = (side: CanvasHandle, amount: number): CanvasPoint => {
    if (side === 'l') return { x: -amount, y: 0 }
    if (side === 'r') return { x: amount, y: 0 }
    if (side === 't') return { x: 0, y: -amount }
    return { x: 0, y: amount }
  }
  const control = vector(sourceSide, distance)
  return `M ${start.x} ${start.y} C ${start.x + control.x} ${start.y + control.y}, ${target.x} ${target.y}, ${target.x} ${target.y}`
}

export function clientToWorld(point: CanvasPoint, bounds: { left: number; top: number }, pan: CanvasPoint, zoom: number): CanvasPoint {
  return { x: (point.x - bounds.left - pan.x) / zoom, y: (point.y - bounds.top - pan.y) / zoom }
}
