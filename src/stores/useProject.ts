import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BreadcrumbItem, NivelZoom, Projeto } from '@/types/nexo'
import { useProjects } from '@/stores/useProjects'

const NIVEIS: NivelZoom[] = ['portfolio', 'projeto', 'epico', 'feature', 'pbi', 'implementacao']

export const useProject = defineStore('project', () => {
  // DELTA Passo 1: visão derivada do projeto atual (useProjects é a fonte).
  // Mantém 'nivel' local + persist eager legado para compatibilidade.
  const nivel = ref<NivelZoom>('feature')

  try {
    const raw = localStorage.getItem('nexo.v1.project')
    if (raw) {
      const s = JSON.parse(raw) as { nivel?: NivelZoom }
      if (s.nivel && NIVEIS.includes(s.nivel)) nivel.value = s.nivel
    }
  } catch {
    // usa default
  }

  const info = computed<{ projeto: Projeto | null }>(() => {
    try {
      return { projeto: useProjects().atual }
    } catch {
      return { projeto: null }
    }
  })

  const state = computed(() => ({
    projetoId: info.value.projeto?.id ?? 'proj-cobrancas',
    projetoTitulo: info.value.projeto?.titulo ?? 'Cobranças',
    epicoId: info.value.projeto?.epicoId ?? 'ep-pix',
    epicoTitulo: info.value.projeto?.epicoTitulo ?? 'Pagamento por Pix',
    nivel: nivel.value
  }))

  const breadcrumb = computed<BreadcrumbItem[]>(() => {
    const idx = NIVEIS.indexOf(nivel.value)
    const s = state.value
    const itens: BreadcrumbItem[] = [
      { rotulo: s.projetoTitulo, nivel: 'projeto', rota: '/' },
      { rotulo: s.epicoTitulo, nivel: 'epico', rota: '/canvas' }
    ]
    if (idx >= NIVEIS.indexOf('feature'))
      itens.push({ rotulo: 'Feature', nivel: 'feature', rota: '/canvas' })
    if (idx >= NIVEIS.indexOf('pbi')) itens.push({ rotulo: 'PBI', nivel: 'pbi', rota: '/backlog' })
    if (idx >= NIVEIS.indexOf('implementacao'))
      itens.push({ rotulo: 'Implementação', nivel: 'implementacao', rota: '/backlog' })
    return itens
  })

  function persist() {
    localStorage.setItem(
      'nexo.v1.project',
      JSON.stringify({
        projetoId: state.value.projetoId,
        projetoTitulo: state.value.projetoTitulo,
        epicoId: state.value.epicoId,
        epicoTitulo: state.value.epicoTitulo,
        nivel: nivel.value
      })
    )
  }

  if (localStorage.getItem('nexo.v1.project') == null) persist()

  function abrirNivel(n: NivelZoom) {
    nivel.value = n
    persist()
  }

  function aprofundar() {
    const i = Math.min(NIVEIS.length - 1, NIVEIS.indexOf(nivel.value) + 1)
    nivel.value = NIVEIS[i]
    persist()
  }

  function subir(n: NivelZoom) {
    nivel.value = n
    persist()
  }

  return { state, breadcrumb, abrirNivel, aprofundar, subir }
})
