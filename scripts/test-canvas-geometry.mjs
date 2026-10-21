import assert from 'node:assert/strict'
import { adjustCanvasZoom, clientToWorld, edgePath, edgePathToPoint, facingHandles, fitViewportToBounds, handlePoint, layoutMeasuredNodes, nearestHandle, usableCanvasRect } from '../src/components/canvas/geometry'

const viewport = usableCanvasRect(1200, 800, { left: 64, right: 376, top: 64, bottom: 16 })
assert.deepEqual(viewport, { left: 64, top: 64, right: 824, bottom: 784, width: 760, height: 720, centerX: 444, centerY: 424 })
const fitted = fitViewportToBounds(1200, 800, { x: 100, y: 100, width: 1000, height: 600 }, { left: 64, right: 376, top: 64, bottom: 16 })
assert.ok(fitted)
assert.equal(fitted.zoom, 0.67)
assert.ok(Math.abs(fitted.panX + 600 * fitted.zoom - viewport.centerX) < 1e-9, 'fit centers the graph in the unobstructed horizontal viewport')
assert.ok(Math.abs(fitted.panY + 400 * fitted.zoom - viewport.centerY) < 1e-9, 'fit centers the graph in the unobstructed vertical viewport')
assert.equal(fitViewportToBounds(120, 80, { x: 0, y: 0, width: 10, height: 10 }, { left: 120 }), null, 'fit skips a fully occluded viewport')
const mobileFit = fitViewportToBounds(390, 844, { x: 0, y: 0, width: 2000, height: 1500 }, { left: 12, right: 12, top: 64, bottom: 844 * 0.7 + 12 })
assert.ok(mobileFit && mobileFit.zoom < 0.4, 'mobile fit can use a scale below the regular zoom-out floor')
assert.ok(adjustCanvasZoom(mobileFit.zoom, -0.15) < mobileFit.zoom, 'zooming out stays monotonic after a small mobile fit')

const source = { x: 100, y: 80, width: 280, height: 316 }
const target = { x: 540, y: 150, width: 280, height: 244 }
assert.deepEqual(handlePoint(source, 'r'), { x: 380, y: 238 })
assert.deepEqual(handlePoint(source, 'b'), { x: 240, y: 396 })
assert.deepEqual(handlePoint(target, 't'), { x: 680, y: 150 })
assert.deepEqual(handlePoint(target, 'b'), { x: 680, y: 394 })
assert.equal(nearestHandle(source, { x: 240, y: 397 }), 'b')
assert.equal(nearestHandle(source, { x: 99, y: 180 }), 'l')
assert.equal(nearestHandle(source, { x: 381, y: 180 }), 'r')
assert.equal(nearestHandle(source, { x: 200, y: 79 }), 't')
assert.deepEqual(facingHandles(source, target), ['r', 'l'])
assert.deepEqual(facingHandles(source, { x: 100, y: 600, width: 280, height: 200 }), ['b', 't'])
assert.deepEqual(facingHandles(source, { x: 100, y: -300, width: 280, height: 200 }), ['t', 'b'])

const layoutInput = [
  { id: 'a', x: 100, y: 0, z: 3 }, { id: 'b', x: 500, y: 0, z: 2 }, { id: 'c', x: 0, y: 50, z: 1 },
  { id: 'd', x: 100, y: 100, z: 4 }, { id: 'e', x: 500, y: 100, z: 5 }, { id: 'f', x: 0, y: 200, z: 6 }, { id: 'g', x: 0, y: 300, z: 7 }
]
const originalPositions = layoutInput.map(({ id, x, y }) => ({ id, x, y }))
const layout = layoutMeasuredNodes(layoutInput, {
  a: { width: 280, height: 190 }, b: { width: 300, height: 320 }, c: { width: 260, height: 250 },
  d: { width: 310, height: 180 }, e: { width: 290, height: 210 }, f: { width: 280, height: 230 }, g: { width: 280, height: 170 }
})
assert.deepEqual(layout.map(({ id, x, y }) => ({ id, x, y })), [
  { id: 'a', x: 120, y: 160 }, { id: 'b', x: 490, y: 160 }, { id: 'c', x: 850, y: 160 },
  { id: 'd', x: 120, y: 544 }, { id: 'e', x: 490, y: 544 }, { id: 'f', x: 850, y: 544 }, { id: 'g', x: 120, y: 838 }
])
assert.equal(layout[1].z, 2, 'organize preserves node z-order')
assert.deepEqual(layoutInput.map(({ id, x, y }) => ({ id, x, y })), originalPositions, 'computing a layout does not mutate persisted positions')
assert.deepEqual(layoutMeasuredNodes([], {}), [])

for (const side of ['l', 'r', 't', 'b']) {
  const start = handlePoint(source, side)
  for (const targetSide of ['l', 'r', 't', 'b']) {
    const path = edgePath(source, target, side, targetSide)
    assert.ok(path.startsWith(`M ${start.x} ${start.y} C `), `edge starts at selected ${side} anchor`)
    const end = handlePoint(target, targetSide)
    assert.ok(path.endsWith(` ${end.x} ${end.y}`), `edge ends at target ${targetSide} handle center`)
  }
  const live = edgePathToPoint(source, { x: 900, y: 600 }, side)
  assert.ok(live.startsWith(`M ${start.x} ${start.y} C `), `live preview starts at selected ${side} anchor`)
  assert.ok(live.endsWith(' 900 600'), 'live preview reaches pointer coordinate')
}

for (const zoom of [0.4, 0.75, 1, 1.5, 2]) {
  const world = { x: 470, y: 292 }
  const viewport = { left: 37, top: 91 }
  const pan = { x: -120, y: 64 }
  const client = { x: viewport.left + pan.x + world.x * zoom, y: viewport.top + pan.y + world.y * zoom }
  const actual = clientToWorld(client, viewport, pan, zoom)
  assert.ok(Math.abs(actual.x - world.x) < 1e-9, `world x round-trip at zoom ${zoom}`)
  assert.ok(Math.abs(actual.y - world.y) < 1e-9, `world y round-trip at zoom ${zoom}`)
}

console.log('Canvas geometry: measured ports, side inference, edge anchors and zoom coordinates passed.')
