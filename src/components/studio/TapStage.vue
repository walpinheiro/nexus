<script setup lang="ts">
import NovaAction from '@/components/common/NovaAction.vue'
import NovaSelect from '@/components/common/NovaSelect.vue'
import { ArrowRight } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import type { StudioTransition } from '@/types/studio'

const props = defineProps<{ itemId: string | null }>()
const emit = defineEmits<{ (e: 'change', v: { to: string; transition: StudioTransition }): void }>()

const studio = useStudio()
const item = computed(() => (props.itemId ? studio.itemPorId(props.itemId) : undefined))
const destino = ref(item.value?.action?.to ?? '')
const destinos = computed(() => [
  { value: '', label: '(sem ação)' }, { value: 'back', label: 'back' },
  ...studio.doc.frames.map(fr => ({ value: fr.id, label: fr.name }))
])
const transicao = ref<StudioTransition>((item.value?.action?.transition as StudioTransition) ?? 'slide')

const TRANSICOES: StudioTransition[] = ['slide', 'slideLeft', 'slideUp', 'slideDown', 'fade', 'expand', 'none']

function aplicar() {
  if (!destino.value) {
    emit('change', { to: '', transition: transicao.value })
    return
  }
  emit('change', { to: destino.value, transition: transicao.value })
}

</script>

<template>
  <div v-if="item" class="min-w-0 rounded-card border border-nexo-border bg-nexo-surface p-3" aria-label="Tap-through da ação">
    <div class="flex min-w-0 flex-wrap items-center gap-2 text-xs text-nexo-text">
      <span class="max-w-full truncate rounded-badge border border-nexo-border bg-white px-2 py-1">{{ item.kind }} · {{ item.label || 'sem rótulo' }}</span>
      <ArrowRight class="shrink-0 text-nexo-primary" :size="16" aria-hidden="true" />
      <span class="max-w-full truncate rounded-badge border border-nexo-border bg-white px-2 py-1 font-medium">
        {{ destino === 'back' ? 'Voltar' : studio.doc.frames.find((f) => f.id === destino)?.name ?? 'Sem destino' }}
      </span>
    </div>
    <div class="mt-3 grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(160px,1fr)_auto] xl:items-end">
      <NovaSelect v-model="destino" :options="destinos" label="Tela destino" @change="aplicar()" />
      <div class="min-w-0 overflow-x-auto pb-1" role="group" aria-label="Transição">
        <span class="mb-1 block text-xs font-medium text-nexo-text">Transição</span>
        <div class="flex min-w-max gap-1">
        <NovaAction
          v-for="t in TRANSICOES"
          :key="t"
          type="button"
          :title="t"
          :aria-pressed="transicao === t"
          variant="outline"
          size="sm"
          class="rounded-badge border px-2 py-1 text-xs"
          :class="transicao === t ? 'border-nexo-primary bg-nexo-primary-soft text-nexo-primary' : 'border-nexo-border bg-white text-nexo-text'"
          @click="transicao = t; aplicar()"
        >
          {{ t }}
        </NovaAction>
        </div>
      </div>
    </div>
  </div>
</template>
