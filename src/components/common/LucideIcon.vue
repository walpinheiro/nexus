<script setup lang="ts">
import { computed } from 'vue'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Menu,
  Move,
  Pencil,
  Play,
  Plus,
  Redo2,
  Search,
  Sparkles,
  Star,
  Trash2,
  TriangleAlert,
  Undo2,
  X
} from 'lucide-vue-next'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 14 })

const mapa: Record<string, unknown> = {
  lock: Lock,
  check: Check,
  x: X,
  alert: TriangleAlert,
  pencil: Pencil,
  sparkles: Sparkles,
  chevR: ChevronRight,
  chevL: ChevronLeft,
  search: Search,
  plus: Plus,
  trash: Trash2,
  copy: Copy,
  undo: Undo2,
  redo: Redo2,
  play: Play,
  eye: Eye,
  star: Star,
  image: ImageIcon,
  move: Move,
  menu: Menu,
  expand: Maximize2
}

const comp = computed(() => mapa[props.name] ?? X)
</script>

<template>
  <component :is="comp" :size="size" aria-hidden="true" />
</template>
