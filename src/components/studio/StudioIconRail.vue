<script setup lang="ts">
import NovaSelect from '@/components/common/NovaSelect.vue'

import NovaAction from '@/components/common/NovaAction.vue'
import { computed } from 'vue'
import { useStudio } from '@/stores/useStudio'
import M3Icon from './m3/M3Icon.vue'

export type RailTab = 'parts' | 'layers' | 'colors' | 'shape' | 'type' | 'motion' | 'ai'

const props = defineProps<{ ativo: RailTab }>()
const emit = defineEmits<{ (e: 'selecionar', tab: RailTab): void }>()

const studio = useStudio()
const paletteOptions = [
  { value: 'purple', label: 'Purple' }, { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' }, { value: 'coral', label: 'Coral' },
  { value: 'amber', label: 'Amber' }, { value: 'teal', label: 'Teal' }, { value: 'mono', label: 'Mono' }
]

const BOTOES: { id: RailTab; rotulo: string; dica: string; icone: string }[] = [
  { id: 'parts', rotulo: 'Parts', dica: 'Partes', icone: 'add_box' },
  { id: 'layers', rotulo: 'Layers', dica: 'Camadas', icone: 'layers' },
  { id: 'colors', rotulo: 'Colors', dica: 'Cores', icone: 'palette' },
  { id: 'shape', rotulo: 'Shape', dica: 'Forma', icone: 'rounded_corner' },
  { id: 'type', rotulo: 'Type', dica: 'Tipo', icone: 'text_fields' },
  { id: 'motion', rotulo: 'Motion', dica: 'Movimento', icone: 'animation' },
  { id: 'ai', rotulo: 'AI', dica: 'IA', icone: 'auto_awesome' }
]

const mostrarAi = computed(() => props.ativo === 'ai')
</script>

<template>
  <div class="flex shrink-0">
    <nav
      class="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-nexo-border bg-nexo-surface py-2"
      role="group"
      aria-label="Icon rail do Studio"
    >
      <NovaAction
        v-for="b in BOTOES"
        :key="b.id"
        type="button"
        :aria-current="ativo === b.id ? 'page' : undefined"
        :title="b.dica"
        :aria-label="`${b.rotulo} — ${b.dica}`"
        class="flex h-11 w-11 items-center justify-center rounded-full"
        :style="ativo === b.id ? { background: '#DCE4FF', color: '#1E3A5F' } : {}"
        :class="ativo === b.id ? '' : 'text-nexo-muted hover:bg-nexo-canvas'"
        @click="emit('selecionar', b.id)"
      >
        <M3Icon :name="b.icone" :size="22" :label="b.rotulo" />
      </NovaAction>
    </nav>
    <div v-if="ativo === 'colors'" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel Cores">
      <h2 class="font-bold">Cores</h2>
      <p class="mt-1 text-nexo-muted">Paleta do tema (semente M3)</p>
      <NovaSelect :value="studio.doc.paletteKey" :options="paletteOptions" label="Paleta" class="mt-2 w-full" @change="studio.doc.paletteKey = $event.target.value; studio.doc.theme.palette = $event.target.value; studio.persist()" />
      <label class="mt-2 flex items-center gap-2">Modo escuro
        <NovaField type="checkbox" :checked="!!studio.doc.theme.dark" @change="studio.doc.theme.dark = ($event.target as HTMLInputElement).checked; studio.persist()" />
      </label>
      <p class="mt-2 text-nexo-muted">Cor dinâmica segue o papel de parede do dispositivo.</p>
    </div>
    <div v-else-if="ativo === 'shape'" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel Forma">
      <h2 class="font-bold">Forma</h2>
      <div class="mt-2 flex flex-col gap-1" role="radiogroup" aria-label="Arredondamento">
        <NovaAction v-for="s in ['square', 'rounded', 'full']" :key="s" type="button" role="radio" :aria-checked="studio.doc.theme.radius === s" class="rounded-btn border px-2 py-1.5 text-left" :class="studio.doc.theme.radius === s ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'" @click="studio.doc.theme.radius = s; studio.persist()">{{ s === 'square' ? 'Square' : s === 'rounded' ? 'Rounded' : 'Full' }}</NovaAction>
      </div>
      <p class="mt-2 text-nexo-muted">Arredondamento aplicado aos componentes do tema.</p>
    </div>
    <div v-else-if="ativo === 'type'" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel Tipo">
      <h2 class="font-bold">Tipo</h2>
      <div class="mt-2 flex flex-col gap-1" role="radiogroup" aria-label="Fonte">
        <NovaAction v-for="f in ['Roboto', 'Roboto Flex', 'Roboto Serif', 'System']" :key="f" type="button" role="radio" :aria-checked="(studio.doc.theme.font ?? 'Roboto') === f" class="rounded-btn border px-2 py-1.5 text-left" :class="(studio.doc.theme.font ?? 'Roboto') === f ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'" @click="studio.doc.theme.font = f; studio.persist()">{{ f }}</NovaAction>
      </div>
      <label class="mt-2 flex items-center gap-2">Emphasized (negrito)
        <NovaField type="checkbox" :checked="!!studio.doc.theme.emphasized" @change="studio.doc.theme.emphasized = ($event.target as HTMLInputElement).checked; studio.persist()" />
      </label>
    </div>
    <div v-else-if="ativo === 'motion'" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel Movimento">
      <h2 class="font-bold">Movimento</h2>
      <div class="mt-2 flex flex-col gap-1" role="radiogroup" aria-label="Esquema de movimento">
        <NovaAction v-for="m in ['standard', 'expressive']" :key="m" type="button" role="radio" :aria-checked="(studio.doc.theme.motion ?? 'standard') === m" class="rounded-btn border px-2 py-1.5 text-left capitalize" :class="(studio.doc.theme.motion ?? 'standard') === m ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'" @click="studio.doc.theme.motion = m; studio.persist()">{{ m === 'standard' ? 'Standard' : 'Expressive' }}</NovaAction>
      </div>
      <NovaAction type="button" class="mt-2 inline-flex items-center gap-1 rounded-btn border border-nexo-border px-2 py-1.5" @click="emit('selecionar', 'motion')">Tap to try <M3Icon name="arrow_forward" :size="14" label="Testar" /></NovaAction>
      <p class="mt-2 text-nexo-muted">Transição padrão do preview tap-through.</p>
    </div>
    <div v-else-if="mostrarAi" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel IA">
      <h2 class="font-bold">Geração externa</h2>
      <p class="mt-2 text-nexo-muted">Provedores remotos ainda não estão conectados. Esta tela não coleta nem armazena chaves.</p>
      <p class="mt-2 rounded-badge border border-nexo-border bg-nexo-canvas p-2 text-nexo-text">Disponível: rascunho local por templates em português. Use “Copiar instrução” no tubo IA para continuar em um agente externo.</p>
    </div>
  </div>
</template>
