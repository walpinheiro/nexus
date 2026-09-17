<script setup lang="ts">
import { computed } from 'vue'
import type { StudioItem } from '@/types/studio'
import type { Scheme } from './theme'
import M3Icon from './M3Icon.vue'
import M3Button from './M3Button.vue'
import M3IconButton from './M3IconButton.vue'
import M3Fab from './M3Fab.vue'
import M3ExtendedFab from './M3ExtendedFab.vue'
import M3Chip from './M3Chip.vue'
import M3TopBar from './M3TopBar.vue'
import M3NavBar from './M3NavBar.vue'
import M3NavRail from './M3NavRail.vue'
import M3Tabs from './M3Tabs.vue'
import M3Search from './M3Search.vue'
import M3Card from './M3Card.vue'
import M3ListItem from './M3ListItem.vue'
import M3Dialog from './M3Dialog.vue'
import M3Snackbar from './M3Snackbar.vue'
import M3TextField from './M3TextField.vue'
import M3Select from './M3Select.vue'
import M3Switch from './M3Switch.vue'
import M3Checkbox from './M3Checkbox.vue'
import M3Radio from './M3Radio.vue'
import M3Slider from './M3Slider.vue'
import M3Text from './M3Text.vue'
import M3Image from './M3Image.vue'
import M3Box from './M3Box.vue'
import M3Divider from './M3Divider.vue'
import M3Loading from './M3Loading.vue'

const props = withDefaults(
  defineProps<{ item: StudioItem; scheme: Scheme; selecionado?: boolean; mini?: boolean }>(),
  { selecionado: false, mini: false }
)

const comp = computed(() => {
  switch (props.item.kind) {
    case 'button':
      return M3Button
    case 'iconButton':
      return M3IconButton
    case 'fab':
      return M3Fab
    case 'extendedFab':
      return M3ExtendedFab
    case 'chip':
      return M3Chip
    case 'topAppBar':
      return M3TopBar
    case 'bottomNav':
      return M3NavBar
    case 'navRail':
      return M3NavRail
    case 'tabs':
      return M3Tabs
    case 'searchBar':
      return M3Search
    case 'card':
      return M3Card
    case 'listItem':
      return M3ListItem
    case 'dialog':
      return M3Dialog
    case 'snackbar':
      return M3Snackbar
    case 'textField':
      return M3TextField
    case 'select':
      return M3Select
    case 'switch':
      return M3Switch
    case 'checkbox':
      return M3Checkbox
    case 'radio':
      return M3Radio
    case 'slider':
      return M3Slider
    case 'text':
      return M3Text
    case 'image':
      return M3Image
    case 'box':
      return M3Box
    case 'divider':
      return M3Divider
    case 'loadingIndicator':
    case 'linearProgress':
    case 'circularProgress':
      return M3Loading
    default:
      return null
  }
})

void M3Icon
</script>

<template>
  <div
    class="m3-node"
    :class="{ 'm3-selected': selecionado, 'm3-mini': mini }"
    :data-kind="item.kind"
    :style="{ '--m3-primary': scheme.primary }"
  >
    <component :is="comp" v-if="comp" :item="item" :scheme="scheme" />
    <div
      v-else
      class="rounded-badge border px-3 py-2 text-xs"
      :style="{ borderColor: scheme.outlineVariant, color: scheme.onSurface, background: scheme.surface }"
    >
      <span class="font-semibold">{{ item.kind }}</span>
      <span v-if="item.label"> — {{ item.label }}</span>
    </div>
  </div>
</template>
