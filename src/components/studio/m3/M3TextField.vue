<script setup lang="ts">
import { computed } from 'vue'
import { VTextInput } from 'vueui-nova-kit'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'

const props = defineProps<{ item: StudioItem; scheme: Scheme; modelValue?: string | number; erro?: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
const erro = computed(() => props.erro || undefined)
</script>

<template>
  <VTextInput
    :model-value="String(modelValue ?? '')"
    :label="item.label ?? 'Rótulo'"
    :placeholder="item.supporting || item.label || ''"
    :helper-text="item.supporting"
    :error-message="erro"
    :disabled="disabled"
    :style="{ width: item.w ? item.w + 'px' : '100%' }"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
