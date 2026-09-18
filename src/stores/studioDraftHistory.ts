import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { DraftSpec } from '@/ai/studioDraft'

export const DRAFTS_STORAGE_KEY = 'nexo.v1.studio.drafts.v1'

export interface StudioDraftRecord {
  id: string
  authorUserId: string
  authorName: string
  provider: 'OpenAI' | 'Claude' | 'Gemini' | 'DeepSeek' | string
  model: string
  prompt: string
  result: DraftSpec[]
  at: number
}

export const useStudioDraftHistory = defineStore('studioDraftHistory', () => {
  function carregar(): StudioDraftRecord[] {
    try {
      const bruto = localStorage.getItem(DRAFTS_STORAGE_KEY)
      if (bruto) return JSON.parse(bruto) as StudioDraftRecord[]
    } catch {}
    return []
  }

  const historico = ref<StudioDraftRecord[]>(carregar())

  function persist() {
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(historico.value))
    } catch {}
  }

  const ultimoDraft = computed<StudioDraftRecord | null>(() => historico.value[0] ?? null)

  function registrarDraft(entrada: Omit<StudioDraftRecord, 'id' | 'at'> & { at?: number }): StudioDraftRecord {
    const registro: StudioDraftRecord = {
      ...entrada,
      id: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      at: entrada.at ?? Date.now()
    }
    historico.value.unshift(registro)
    if (historico.value.length > 20) {
      historico.value.length = 20
    }
    persist()
    return registro
  }

  return {
    historico,
    ultimoDraft,
    registrarDraft,
    persist
  }
})
