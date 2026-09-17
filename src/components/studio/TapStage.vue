<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { paletteOf } from './m3/theme'
import type { StudioTransition } from '@/types/studio'

const props = defineProps<{ itemId: string | null }>()
const emit = defineEmits<{ (e: 'change', v: { to: string; transition: StudioTransition }): void }>()

const studio = useStudio()
const scheme = computed(() => paletteOf(studio.doc.paletteKey, false))
const item = computed(() => (props.itemId ? studio.itemPorId(props.itemId) : undefined))
const destino = ref(item.value?.action?.to ?? '')
const transicao = ref<StudioTransition>((item.value?.action?.transition as StudioTransition) ?? 'slide')

const TRANSICOES: StudioTransition[] = ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none']

function aplicar() {
  if (!destino.value) {
    emit('change', { to: '', transition: transicao.value })
    return
  }
  emit('change', { to: destino.value, transition: transicao.value })
}

void scheme
</script>

<template>
  <div v-if="item" class="rounded-card border border-nexo-border bg-nexo-canvas p-2" aria-label="Tap-through da ação">
    <div class="flex items-center justify-center gap-2">
      <span class="rounded-badge border border-nexo-border bg-white px-2 py-1 text-[11px]">{{ item.kind }} {{ (item.label ?? '').slice(0, 14) }}</span>
      <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true">
        <path d="M2 8 H22 M16 2 L23 8 L16 14" fill="none" stroke="#1D4ED8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="rounded-badge border border-nexo-primary bg-white px-2 py-1 text-[11px] text-nexo-primary">
        {{ destino === 'back' ? 'back' : studio.doc.frames.find((f) => f.id === destino)?.name ?? '—' }}
      </span>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-1">
      <select v-model="destino" class="rounded-btn border border-nexo-border bg-white px-1.5 py-1 text-[11px]" aria-label="Tela destino" @change="aplicar()">
        <option value="">(sem ação)</option>
        <option value="back">back</option>
        <option v-for="fr in studio.doc.frames" :key="fr.id" :value="fr.id">{{ fr.name }}</option>
      </select>
      <div class="flex gap-1" role="group" aria-label="Transição">
        <button
          v-for="t in TRANSICOES"
          :key="t"
          type="button"
          :title="t"
          :aria-pressed="transicao === t"
          class="rounded-badge border px-1.5 py-1 text-[10px]"
          :class="transicao === t ? 'border-nexo-primary bg-nexo-primary-soft text-nexo-primary' : 'border-nexo-border bg-white'"
          @click="transicao = t; aplicar()"
        >
          {{ t }}
        </button>
      </div>
    </div>
  </div>
</template>
