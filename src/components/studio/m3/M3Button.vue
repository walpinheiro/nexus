<script setup lang="ts">
import { computed } from 'vue'
import { VButton, type VButtonVariant } from 'vueui-nova-kit'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'

const props = defineProps<{ item: StudioItem; scheme: Scheme }>()

const variant = computed(() => props.item.variant ?? 'filled')
const label = computed(() => props.item.label ?? 'Botão')

const novaVariant = computed<VButtonVariant>(() => variant.value === 'outlined' ? 'outline' : variant.value === 'text' ? 'ghost' : variant.value === 'filled' ? 'primary' : 'secondary')
</script>

<template>
  <VButton
    type="button"
    :variant="novaVariant"
    size="md"
    shape="pill"
    class="m3-ripple justify-center gap-2 text-sm font-medium"
    :style="{ minWidth: '120px', width: item.w ? item.w + 'px' : undefined }"
  >
    <M3Icon v-if="item.icon" :name="item.icon" :size="18" :fill="variant === 'filled'" />
    {{ label }}
  </VButton>
</template>
