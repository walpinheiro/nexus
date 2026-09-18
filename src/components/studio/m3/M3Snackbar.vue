<script setup lang="ts">
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = withDefaults(
  defineProps<{
    item: StudioItem
    scheme: Scheme
    tipo?: 'sucesso' | 'erro' | 'normal'
  }>(),
  { tipo: 'normal' }
)

const emit = defineEmits<{
  (e: 'fechar'): void
}>()
</script>

<template>
  <div
    class="flex min-h-12 w-[344px] max-w-[90vw] items-center gap-3 px-4 py-2.5 text-sm shadow-xl transition-all"
    :class="{
      'bg-green-700 text-white border border-green-600': props.tipo === 'sucesso',
      'bg-red-700 text-white border border-red-600': props.tipo === 'erro',
      'border border-slate-700': props.tipo === 'normal'
    }"
    :style="
      props.tipo === 'normal'
        ? { background: scheme.inverseSurface, color: scheme.inverseOnSurface, borderRadius: '8px' }
        : { borderRadius: '8px' }
    "
    role="status"
    aria-live="polite"
  >
    <M3Icon
      v-if="props.tipo === 'sucesso'"
      name="check_circle"
      :size="20"
      class="text-green-200 shrink-0"
    />
    <M3Icon
      v-else-if="props.tipo === 'erro'"
      name="error"
      :size="20"
      class="text-red-200 shrink-0"
    />
    <span class="flex-1 text-xs leading-snug break-words">{{ item.label ?? 'Mensagem' }}</span>
    <button
      v-if="item.supporting"
      type="button"
      class="font-semibold text-xs uppercase tracking-wider underline hover:opacity-80 shrink-0 ml-1"
      :style="props.tipo === 'normal' ? { color: scheme.inversePrimary } : {}"
      @click="emit('fechar')"
    >
      {{ item.supporting }}
    </button>
  </div>
</template>
