<script setup lang="ts">
import NovaField from '@/components/common/NovaField.vue'
import NovaTextarea from '@/components/common/NovaTextarea.vue'
import NovaSelect from '@/components/common/NovaSelect.vue'

import NovaAction from '@/components/common/NovaAction.vue'
import { computed } from 'vue'
import { useStudio } from '@/stores/useStudio'

const studio = useStudio()
const frame = computed(() => studio.frameAtual())
const ehDesktop = computed(() => (frame.value?.w ?? 0) >= 1280)
const paletas = [
  { value: 'purple', label: 'Roxo' }, { value: 'blue', label: 'Azul' },
  { value: 'green', label: 'Verde' }, { value: 'coral', label: 'Coral' },
  { value: 'amber', label: 'Âmbar' }, { value: 'teal', label: 'Teal' }, { value: 'mono', label: 'Mono' }
]

function remover() {
  if (!frame.value) return
  if (window.confirm('Remover esta tela? Actions para ela viram "back".')) studio.removerFrame(frame.value.id)
}
</script>

<template>
  <div v-if="frame" class="w-full min-w-0 space-y-3 p-3 text-xs">
    <h2 class="truncate font-semibold" :title="frame.name">Tela · {{ frame.name }}</h2>
    <div class="flex min-w-0 items-center gap-1" role="group" aria-label="Tamanho da tela">
      <NovaAction
        type="button"
        :variant="!ehDesktop ? 'secondary' : 'outline'"
        size="sm"
        class="min-w-0 flex-1 whitespace-nowrap"
        :class="!ehDesktop ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'"
        :aria-pressed="!ehDesktop"
        @click="frame && studio.setFramePreset(frame.id, 'phone')"
      >
        Phone · 412×892
      </NovaAction>
      <NovaAction
        type="button"
        :variant="ehDesktop ? 'secondary' : 'outline'"
        size="sm"
        class="min-w-0 flex-1 whitespace-nowrap"
        :class="ehDesktop ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'"
        :aria-pressed="ehDesktop"
        @click="frame && studio.setFramePreset(frame.id, 'desktop')"
      >
        Desktop · 1280×800
      </NovaAction>
    </div>
    <label class="block">Nome<NovaField :value="frame.name" class="mt-1 w-full" @change="studio.renomearFrame(frame.id, ($event.target as HTMLInputElement).value)" /></label>
    <label class="block">Nota<NovaTextarea :value="frame.note ?? ''" rows="2" class="mt-1 w-full" @change="(frame.note = ($event.target as HTMLTextAreaElement).value, studio.persist())" /></label>
    <p class="text-nexo-muted">{{ frame.w }}×{{ frame.h }} · barras usam a largura da tela; em desktop, a navegação vira trilho.</p>
    <NovaSelect :value="studio.doc.paletteKey" :options="paletas" label="Paleta do tema" class="w-full" @change="studio.doc.paletteKey = $event.target.value as string; studio.doc.theme.palette = $event.target.value as string; studio.persist()" />
    <div class="flex gap-1">
      <NovaAction type="button" variant="outline" size="sm" class="min-w-0 flex-1" @click="studio.duplicarFrame(frame.id)">Duplicar tela</NovaAction>
      <NovaAction type="button" variant="destructive" size="sm" class="min-w-0 flex-1" @click="remover()">Remover</NovaAction>
    </div>
  </div>
</template>
