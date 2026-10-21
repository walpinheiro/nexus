import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useProjects } from '@/stores/useProjects'
import { chaveStorageRevisao, decodificarHistoricoRevisao } from '@/utils/gateReview'
import type { GateId } from '@/types/nexo'

export interface GateReviewEntry {
  id: string
  autor: 'usuario' | 'coach'
  tipo: 'resposta' | 'pergunta' | 'decisao' | 'nota'
  codigo?: string
  texto: string
  natureza?: 'fato' | 'hipotese' | 'evidencia' | 'decisao-pendente'
  referencia?: string
  provedor?: 'coach-deterministico' | 'ollama' | 'llama.cpp'
  modelo?: string
  criadoEm: string
}

type GateReviewData = Record<string, GateReviewEntry[]>
function ler(pid: string): GateReviewData {
  try {
    return decodificarHistoricoRevisao(localStorage.getItem(chaveStorageRevisao(pid))) as GateReviewData
  } catch {
    return {}
  }
}

export const useGateReview = defineStore('gate-review', () => {
  const projetoId = ref('')
  const dados = ref<GateReviewData>({})

  function carregar() {
    const pid = useProjects().state.atualId
    if (pid === projetoId.value) return
    projetoId.value = pid
    dados.value = pid ? ler(pid) : {}
  }

  function chave(gate: GateId, alvoId: string) {
    return `${gate}:${alvoId}`
  }

  function entradas(gate: GateId, alvoId: string): GateReviewEntry[] {
    carregar()
    return dados.value[chave(gate, alvoId)] ?? []
  }

  function registrar(gate: GateId, alvoId: string, entry: Omit<GateReviewEntry, 'id' | 'criadoEm'>): boolean {
    if (!alvoId) return false
    carregar()
    const k = chave(gate, alvoId)
    const lista = [...(dados.value[k] ?? []), {
      ...entry,
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      criadoEm: new Date().toISOString()
    }]
    dados.value = { ...dados.value, [k]: lista.slice(-300) }
    try {
      localStorage.setItem(chaveStorageRevisao(projetoId.value), JSON.stringify(dados.value))
    } catch {
      return false
    }
    return true
  }

  return { carregar, entradas, registrar }
})
