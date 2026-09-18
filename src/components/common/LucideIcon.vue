<script setup lang="ts">
import { computed } from 'vue'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileDiff,
  FileText,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Lock,
  Maximize2,
  Menu,
  MessageCircle,
  Move,
  Pencil,
  Play,
  Plus,
  Redo2,
  Search,
  Send,
  ShieldCheck,
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
  'check-circle': CircleCheck,
  x: X,
  alert: TriangleAlert,
  'alert-circle': CircleAlert,
  pencil: Pencil,
  sparkles: Sparkles,
  chevR: ChevronRight,
  'chevron-right': ChevronRight,
  chevL: ChevronLeft,
  'chevron-left': ChevronLeft,
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
  expand: Maximize2,
  layout: LayoutDashboard,
  download: Download,
  inbox: Inbox,
  send: Send,
  'file-text': FileText,
  fileText: FileText,
  clock: Clock,
  'external-link': ExternalLink,
  externalLink: ExternalLink,
  'file-diff': FileDiff,
  fileDiff: FileDiff,
  'shield-check': ShieldCheck,
  shieldCheck: ShieldCheck,
  message: MessageCircle
}

const comp = computed(() => mapa[props.name] ?? X)
</script>

<template>
  <component :is="comp" :size="size" aria-hidden="true" />
</template>
