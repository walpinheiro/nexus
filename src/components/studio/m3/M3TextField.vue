<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{
  item: StudioItem
  scheme: Scheme
  modelValue?: string | number
  erro?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const variant = computed(() => props.item.variant ?? 'outlined')
const temErro = computed(() => Boolean(props.erro))
const contorno = computed(() => {
  if (temErro.value) {
    return {
      border: '1.5px solid #dc2626',
      background: variant.value === 'filled' ? '#fef2f2' : 'transparent'
    }
  }
  return variant.value === 'filled'
    ? { border: 'none', background: props.scheme.surfaceContainerHighest }
    : { border: `1px solid ${props.scheme.outline}`, background: 'transparent' }
})

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="relative block" :style="{ width: item.w ? item.w + 'px' : '100%' }">
    <label
      class="relative flex h-14 items-center rounded"
      :style="{
        background: contorno.background,
        border: contorno.border,
        borderRadius: '4px'
      }"
    >
      <span
        class="absolute -top-2 left-3 px-1 text-xs transition-colors"
        :style="{
          background: scheme.surface,
          color: temErro ? '#dc2626' : scheme.primary
        }"
      >
        {{ item.label ?? 'Rótulo' }}
      </span>

      <span class="flex h-full w-full items-center gap-2 px-3">
        <M3Icon
          v-if="item.icon"
          :name="item.icon"
          :size="20"
          :style="{ color: temErro ? '#dc2626' : scheme.onSurfaceVariant }"
        />
        <input
          type="text"
          class="h-full w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          :style="{ color: scheme.onSurface }"
          :value="modelValue ?? ''"
          :placeholder="item.supporting || item.label || ''"
          :disabled="disabled"
          @input="onInput"
        />
        <span
          v-if="variant === 'filled'"
          class="absolute inset-x-0 bottom-0 h-[2px]"
          :style="{ background: temErro ? '#dc2626' : scheme.primary }"
          aria-hidden="true"
        />
      </span>
    </label>

    <!-- Erro inline em vermelho (ou texto de apoio se não houver erro) -->
    <span
      v-if="erro"
      class="mt-1 block px-3 text-xs font-medium text-red-600"
      role="alert"
    >
      {{ erro }}
    </span>
    <span
      v-else-if="item.supporting"
      class="mt-1 block px-3 text-xs"
      :style="{ color: scheme.onSurfaceVariant }"
    >
      {{ item.supporting }}
    </span>
  </div>
</template>
