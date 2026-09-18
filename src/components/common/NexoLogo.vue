<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  compact?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  compact: false,
  class: ''
})

const sizeMap: Record<string, number> = {
  sm: 20,
  md: 28,
  lg: 36,
  xl: 44
}

const heightPx = computed(() => {
  if (typeof props.size === 'number') return props.size
  return sizeMap[props.size] ?? 28
})

const widthPx = computed(() => {
  return props.compact ? heightPx.value : Math.round(heightPx.value * 3.54)
})

const viewBox = computed(() => {
  return props.compact ? '166 0 100 100' : '0 0 354 100'
})
</script>

<template>
  <svg
    :width="widthPx"
    :height="heightPx"
    :viewBox="viewBox"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="['inline-block shrink-0 select-none align-middle', props.class]"
    role="img"
    :aria-label="compact ? 'NEXO' : 'NEXO'"
  >
    <!-- Glifos N e E (somente quando compact for falso) -->
    <template v-if="!compact">
      <!-- N: Navy arredondado extra-bold -->
      <path
        d="M 0 92 A 8 8 0 0 0 8 100 L 12 100 A 8 8 0 0 0 20 92 L 20 46 Q 20 38 26 46 L 54 88 Q 58 94 62 100 L 66 100 A 10 10 0 0 0 76 90 L 76 8 A 8 8 0 0 0 68 0 L 64 0 A 8 8 0 0 0 56 8 L 56 54 Q 56 62 50 54 L 22 12 Q 18 6 14 0 L 10 0 A 10 10 0 0 0 0 10 Z"
        fill="#0F172A"
      />
      <!-- E: Navy arredondado extra-bold com 3 barras -->
      <path
        d="M 92 84 L 92 16 A 16 16 0 0 1 108 0 L 150 0 A 8 8 0 0 1 158 8 L 158 12 A 8 8 0 0 1 150 20 L 118 20 A 6 6 0 0 0 112 26 L 112 34 A 6 6 0 0 0 118 40 L 142 40 A 6 6 0 0 1 148 46 L 148 54 A 6 6 0 0 1 142 60 L 118 60 A 6 6 0 0 0 112 66 L 112 74 A 6 6 0 0 0 118 80 L 150 80 A 8 8 0 0 1 158 88 L 158 92 A 8 8 0 0 1 150 100 L 108 100 A 16 16 0 0 1 92 84 Z"
        fill="#0F172A"
      />
    </template>

    <!-- X: Chevron Azul (#1D4ED8) à esquerda -->
    <path
      d="M 174 12 A 8 8 0 0 1 182 0 L 190 0 A 8 8 0 0 1 196 6 L 220 44 A 8 8 0 0 1 220 56 L 196 94 A 8 8 0 0 1 190 100 L 182 100 A 8 8 0 0 1 174 88 L 174 82 A 8 8 0 0 1 182 74 L 194 54 A 6 6 0 0 0 194 46 L 182 26 A 8 8 0 0 1 174 18 Z"
      fill="#1D4ED8"
    />

    <!-- X: Segmento Superior Roxo (#7C3AED) à direita -->
    <path
      d="M 238 8 A 8 8 0 0 1 246 0 L 250 0 A 8 8 0 0 1 258 8 L 258 12 A 8 8 0 0 1 256 18 L 234 44 A 6 6 0 0 1 224 44 L 220 40 A 6 6 0 0 1 220 34 L 234 8 A 8 8 0 0 1 238 8 Z"
      fill="#7C3AED"
    />

    <!-- X: Segmento Inferior Roxo (#7C3AED) à direita -->
    <path
      d="M 220 66 A 6 6 0 0 1 220 60 L 224 56 A 6 6 0 0 1 234 56 L 256 82 A 8 8 0 0 1 258 88 L 258 92 A 8 8 0 0 1 250 100 L 246 100 A 8 8 0 0 1 238 92 L 234 92 Z"
      fill="#7C3AED"
    />

    <!-- O: Squircle Concêntrico Navy (#0F172A, quase-quadrado arredondado) -->
    <path
      v-if="!compact"
      fill-rule="evenodd"
      d="M 302 0 L 326 0 A 28 28 0 0 1 354 28 L 354 72 A 28 28 0 0 1 326 100 L 302 100 A 28 28 0 0 1 274 72 L 274 28 A 28 28 0 0 1 302 0 Z M 304 20 L 324 20 A 10 10 0 0 1 334 30 L 334 70 A 10 10 0 0 1 324 80 L 304 80 A 10 10 0 0 1 294 70 L 294 30 A 10 10 0 0 1 304 20 Z"
      fill="#0F172A"
    />
  </svg>
</template>
