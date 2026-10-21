<script setup lang="ts">
import NovaField from '@/components/common/NovaField.vue'

import NovaAction from '@/components/common/NovaAction.vue'
import { VDialog } from 'vueui-nova-kit'
import { ref, watch } from 'vue'
import { useStudio } from '@/stores/useStudio'

const emit = defineEmits<{ (e: 'fechar'): void; (e: 'criar', v: { nome: string; preset: 'phone' | 'desktop' }): void }>()

const studio = useStudio()
const nome = ref('')
const preset = ref<'phone' | 'desktop'>('desktop')
const inputRef = ref<{ focus: () => void } | null>(null)

watch(
  preset,
  () => {},
  { immediate: true }
)

function criar() {
  emit('criar', { nome: nome.value.trim(), preset: preset.value })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('fechar')
  if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
    e.preventDefault()
    criar()
  }
}

function focar() {
  requestAnimationFrame(() => inputRef.value?.focus())
}

focar()

void studio
</script>

<template>
  <VDialog :model-value="true" title="Nova tela — mobile ou desktop?" variant="form" size="md" :show-close="false" aria-label="Nova tela mobile ou desktop" @keydown="onKey" @close="emit('fechar')" @update:model-value="!$event && emit('fechar')">
    <div class="space-y-3">
      <label class="mt-3 block text-xs">Nome da tela
        <NovaField ref="inputRef" v-model="nome" placeholder="Ex.: Checkout" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1.5 text-sm" />
      </label>
      <div class="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Formato da tela">
        <NovaAction
          type="button"
          role="radio"
          :aria-checked="preset === 'phone'"
          class="rounded-card border p-3 text-left"
          :class="preset === 'phone' ? 'border-nexo-primary outline outline-2 outline-nexo-primary' : 'border-nexo-border'"
          @click="preset = 'phone'"
        >
          <span class="text-sm font-semibold">Mobile 412×892</span>
          <span class="mx-auto mt-2 block h-24 w-12 rounded-badge border-2 border-nexo-text bg-white" aria-hidden="true" />
        </NovaAction>
        <NovaAction
          type="button"
          role="radio"
          :aria-checked="preset === 'desktop'"
          class="rounded-card border p-3 text-left"
          :class="preset === 'desktop' ? 'border-nexo-primary outline outline-2 outline-nexo-primary' : 'border-nexo-border'"
          @click="preset = 'desktop'"
        >
          <span class="text-sm font-semibold">Desktop 1280×800</span>
          <span class="mx-auto mt-2 block h-16 w-32 rounded-badge border-2 border-nexo-text bg-white" aria-hidden="true" />
        </NovaAction>
      </div>
      <div class="mt-4 flex gap-2">
        <NovaAction type="button" class="flex-1 rounded-btn bg-nexo-primary px-3 py-2 text-sm font-semibold text-white" @click="criar()">Criar {{ preset === 'phone' ? 'mobile' : 'desktop' }}</NovaAction>
        <NovaAction type="button" class="rounded-btn border border-nexo-border px-3 py-2 text-sm" @click="emit('fechar')">Cancelar</NovaAction>
      </div>
    </div>
  </VDialog>
</template>
