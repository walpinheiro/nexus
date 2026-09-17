<script setup lang="ts">
withDefaults(
  defineProps<{ name?: string | null; size?: number; fill?: boolean; label?: string }>(),
  { size: 20, fill: false }
)
</script>

<template>
  <span
    v-if="name"
    class="msr"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label ?? undefined"
    :style="{ fontSize: size + 'px', fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }"
  >
    {{ name }}
  </span>
</template>
