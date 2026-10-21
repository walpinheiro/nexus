<script setup lang="ts">
import { VButton, type VButtonSize, type VButtonType, type VButtonVariant } from 'vueui-nova-kit'
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ variant?: VButtonVariant; size?: VButtonSize; type?: VButtonType; disabled?: boolean; loading?: boolean; empty?: boolean }>(), {
  variant: 'secondary', size: 'sm', type: 'button', empty: false
})
</script>

<template>
  <VButton v-bind="$attrs" :variant="variant" :size="size" :type="type" :disabled="disabled" :loading="loading"><span v-if="empty" aria-hidden="true" class="block h-0 w-0 overflow-hidden" /><slot v-else /></VButton>
</template>
