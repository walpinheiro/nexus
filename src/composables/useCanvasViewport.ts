import { ref, computed } from 'vue'

// Viewport do Canvas: pan por arrasto + zoom por scroll/botões.
// Sem animação (respeita prefers-reduced-motion por construção).
export function useCanvasViewport() {
  const zoom = ref(1)
  const panX = ref(60)
  const panY = ref(30)

  const transform = computed(
    () => `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`
  )

  function zoomIn() {
    zoom.value = Math.min(2, Math.round((zoom.value + 0.15) * 100) / 100)
  }

  function zoomOut() {
    zoom.value = Math.max(0.4, Math.round((zoom.value - 0.15) * 100) / 100)
  }

  function aplicarZoom(fator: number) {
    zoom.value = Math.min(2, Math.max(0.4, Math.round(zoom.value * fator * 100) / 100))
  }

  function mover(dx: number, dy: number) {
    panX.value = Math.round((panX.value + dx) * 10) / 10
    panY.value = Math.round((panY.value + dy) * 10) / 10
  }

  function centralizarEm(wx: number, wy: number, viewW: number, viewH: number) {
    panX.value = Math.round((viewW / 2 - wx * zoom.value) * 10) / 10
    panY.value = Math.round((viewH / 2 - wy * zoom.value) * 10) / 10
  }

  function reset() {
    zoom.value = 1
    panX.value = 60
    panY.value = 30
  }

  return { zoom, panX, panY, transform, zoomIn, zoomOut, aplicarZoom, mover, centralizarEm, reset }
}
