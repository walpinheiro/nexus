<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '@/stores/useStudio'

const studio = useStudio()
const frame = computed(() => studio.frameAtual())
const ehDesktop = computed(() => (frame.value?.w ?? 0) >= 1280)

function alternarPreset() {
  if (!frame.value) return
  studio.setFramePreset(frame.value.id, ehDesktop.value ? 'phone' : 'desktop')
}

function remover() {
  if (!frame.value) return
  if (window.confirm('Remover esta tela? Actions para ela viram "back".')) studio.removerFrame(frame.value.id)
}
</script>

<template>
  <div v-if="frame" class="space-y-2 p-3 text-xs">
    <h2 class="font-bold">Tela: {{ frame.name }}</h2>
    <div class="flex items-center gap-2" role="group" aria-label="Tamanho da tela">
      <button
        type="button"
        class="flex-1 rounded-btn border px-2 py-1.5"
        :class="!ehDesktop ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'"
        :aria-pressed="!ehDesktop"
        @click="frame && studio.setFramePreset(frame.id, 'phone')"
      >
        Phone 412×892
      </button>
      <button
        type="button"
        class="flex-1 rounded-btn border px-2 py-1.5"
        :class="ehDesktop ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'"
        :aria-pressed="ehDesktop"
        @click="frame && studio.setFramePreset(frame.id, 'desktop')"
      >
        Desktop 1280×800
      </button>
    </div>
    <button type="button" class="w-full rounded-btn border border-nexo-border px-2 py-1.5" @click="alternarPreset()">
      Alternar para {{ ehDesktop ? 'phone' : 'desktop' }}
    </button>
    <label class="block">Nome<input :value="frame.name" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="studio.renomearFrame(frame.id, ($event.target as HTMLInputElement).value)" /></label>
    <label class="block">Nota<textarea :value="frame.note ?? ''" rows="2" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="(frame.note = ($event.target as HTMLTextAreaElement).value, studio.persist())" /></label>
    <p class="text-nexo-muted">Medidas: {{ frame.w }}×{{ frame.h }} · bars esticam à largura; em desktop a navegação vira rail.</p>
    <label class="block">Paleta do tema
      <select :value="studio.doc.paletteKey" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" aria-label="Paleta do tema" @change="studio.doc.paletteKey = ($event.target as HTMLSelectElement).value; studio.persist()">
        <option value="purple">Roxo</option>
        <option value="blue">Azul</option>
        <option value="green">Verde</option>
        <option value="coral">Coral</option>
        <option value="amber">Âmbar</option>
        <option value="teal">Teal</option>
        <option value="mono">Mono</option>
      </select>
    </label>
    <div class="flex gap-1">
      <button type="button" class="flex-1 rounded-btn border border-nexo-border px-2 py-1" @click="studio.duplicarFrame(frame.id)">Duplicar tela</button>
      <button type="button" class="flex-1 rounded-btn border border-nexo-blocked-border px-2 py-1 text-nexo-blocked" @click="remover()">Remover</button>
    </div>
  </div>
</template>
