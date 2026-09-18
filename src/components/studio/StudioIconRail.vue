<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { AGENTES, usePresence } from '@/stores/studioPresence'
import M3Icon from './m3/M3Icon.vue'

export type RailTab = 'parts' | 'layers' | 'colors' | 'shape' | 'type' | 'motion' | 'ai'

const props = defineProps<{ ativo: RailTab }>()
const emit = defineEmits<{ (e: 'selecionar', tab: RailTab): void }>()

const studio = useStudio()
const presence = usePresence()

const BOTOES: { id: RailTab; rotulo: string; icone: string }[] = [
  { id: 'parts', rotulo: 'Parts', icone: 'add_box' },
  { id: 'layers', rotulo: 'Layers', icone: 'layers' },
  { id: 'colors', rotulo: 'Cores', icone: 'palette' },
  { id: 'shape', rotulo: 'Forma', icone: 'rounded_corner' },
  { id: 'type', rotulo: 'Tipo', icone: 'text_fields' },
  { id: 'motion', rotulo: 'Movimento', icone: 'animation' },
  { id: 'ai', rotulo: 'IA', icone: 'auto_awesome' }
]

const AI_CONFIG_KEY = 'nexo.v1.studio.aiConfig'
interface AiConfig {
  provider: string
  model: string
  baseUrl: string
  key: string
}

const aiConfig = ref<AiConfig>({ provider: 'OpenAI', model: 'gpt-5.6-luna', baseUrl: 'https://api.openai.com/v1', key: '' })
try {
  const raw = localStorage.getItem(AI_CONFIG_KEY)
  if (raw) aiConfig.value = JSON.parse(raw) as AiConfig
} catch {
  // usa default
}
function salvarAiConfig(c: AiConfig) {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(c))
  } catch {
    // ignora
  }
}
const mostrarAi = computed(() => props.ativo === 'ai')

function salvarAi() {
  salvarAiConfig(aiConfig.value)
}
</script>

<template>
  <div class="flex shrink-0">
    <nav
      class="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-nexo-border bg-nexo-surface py-2"
      role="tablist"
      aria-label="Icon rail do Studio"
    >
      <button
        v-for="b in BOTOES"
        :key="b.id"
        type="button"
        role="tab"
        :aria-selected="ativo === b.id"
        :title="b.rotulo"
        :aria-label="b.rotulo"
        class="flex h-11 w-11 items-center justify-center rounded-full"
        :style="ativo === b.id ? { background: '#DCE4FF', color: '#1E3A5F' } : {}"
        :class="ativo === b.id ? '' : 'text-nexo-muted hover:bg-nexo-canvas'"
        @click="emit('selecionar', b.id)"
      >
        <M3Icon :name="b.icone" :size="22" :label="b.rotulo" />
      </button>
    </nav>
    <div v-if="ativo === 'colors'" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel Cores">
      <h2 class="font-bold">Cores</h2>
      <p class="mt-1 text-nexo-muted">Paleta do tema (semente M3)</p>
      <label class="mt-2 block">Paleta
        <select :value="studio.doc.paletteKey" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" aria-label="Paleta do tema" @change="studio.doc.paletteKey = ($event.target as HTMLSelectElement).value; studio.doc.theme.palette = ($event.target as HTMLSelectElement).value; studio.persist()">
          <option value="purple">Purple</option>
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="coral">Coral</option>
          <option value="amber">Amber</option>
          <option value="teal">Teal</option>
          <option value="mono">Mono</option>
        </select>
      </label>
      <label class="mt-2 flex items-center gap-2">Modo escuro
        <input type="checkbox" :checked="!!studio.doc.theme.dark" @change="studio.doc.theme.dark = ($event.target as HTMLInputElement).checked; studio.persist()" />
      </label>
      <p class="mt-2 text-nexo-muted">Cor dinâmica segue o papel de parede do dispositivo.</p>
    </div>
    <div v-else-if="ativo === 'shape'" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel Forma">
      <h2 class="font-bold">Forma</h2>
      <div class="mt-2 flex flex-col gap-1" role="radiogroup" aria-label="Arredondamento">
        <button v-for="s in ['square', 'rounded', 'full']" :key="s" type="button" role="radio" :aria-checked="studio.doc.theme.radius === s" class="rounded-btn border px-2 py-1.5 text-left" :class="studio.doc.theme.radius === s ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'" @click="studio.doc.theme.radius = s; studio.persist()">{{ s === 'square' ? 'Square' : s === 'rounded' ? 'Rounded' : 'Full' }}</button>
      </div>
      <p class="mt-2 text-nexo-muted">Arredondamento aplicado aos componentes do tema.</p>
    </div>
    <div v-else-if="ativo === 'type'" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel Tipo">
      <h2 class="font-bold">Tipo</h2>
      <div class="mt-2 flex flex-col gap-1" role="radiogroup" aria-label="Fonte">
        <button v-for="f in ['Roboto', 'Roboto Flex', 'Roboto Serif', 'System']" :key="f" type="button" role="radio" :aria-checked="(studio.doc.theme.font ?? 'Roboto') === f" class="rounded-btn border px-2 py-1.5 text-left" :class="(studio.doc.theme.font ?? 'Roboto') === f ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'" @click="studio.doc.theme.font = f; studio.persist()">{{ f }}</button>
      </div>
      <label class="mt-2 flex items-center gap-2">Emphasized (negrito)
        <input type="checkbox" :checked="!!studio.doc.theme.emphasized" @change="studio.doc.theme.emphasized = ($event.target as HTMLInputElement).checked; studio.persist()" />
      </label>
    </div>
    <div v-else-if="ativo === 'motion'" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel Movimento">
      <h2 class="font-bold">Movimento</h2>
      <div class="mt-2 flex flex-col gap-1" role="radiogroup" aria-label="Esquema de movimento">
        <button v-for="m in ['standard', 'expressive']" :key="m" type="button" role="radio" :aria-checked="(studio.doc.theme.motion ?? 'standard') === m" class="rounded-btn border px-2 py-1.5 text-left capitalize" :class="(studio.doc.theme.motion ?? 'standard') === m ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'" @click="studio.doc.theme.motion = m; studio.persist()">{{ m === 'standard' ? 'Standard' : 'Expressive' }}</button>
      </div>
      <button type="button" class="mt-2 inline-flex items-center gap-1 rounded-btn border border-nexo-border px-2 py-1.5" @click="emit('selecionar', 'motion')">Tap to try <M3Icon name="arrow_forward" :size="14" label="Testar" /></button>
      <p class="mt-2 text-nexo-muted">Transição padrão do preview tap-through.</p>
    </div>
    <div v-else-if="mostrarAi" class="w-60 shrink-0 overflow-auto border-r border-nexo-border bg-white p-3 text-xs" role="tabpanel" aria-label="Painel IA">
      <h2 class="font-bold">IA</h2>
      <p class="mt-1 text-nexo-muted">Provedor (faixa pen.dev)</p>
      <div class="mt-2 grid grid-cols-2 gap-1" role="radiogroup" aria-label="Provedor de IA">
        <button v-for="a in AGENTES" :key="a.provider" type="button" role="radio" :aria-checked="aiConfig.provider === a.provider" class="rounded-btn border px-2 py-1.5" :class="aiConfig.provider === a.provider ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'" @click="aiConfig = { ...aiConfig, provider: a.provider, model: a.model }; salvarAi()">{{ a.provider }}</button>
      </div>
      <label class="mt-2 block">Model ID
        <input :value="aiConfig.model" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1 font-mono" aria-label="Model ID" placeholder="gpt-5.6-luna" @change="aiConfig = { ...aiConfig, model: ($event.target as HTMLInputElement).value }; salvarAi()" />
      </label>
      <label class="mt-2 block">Base URL
        <input :value="aiConfig.baseUrl" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1 font-mono" aria-label="Base URL" @change="aiConfig = { ...aiConfig, baseUrl: ($event.target as HTMLInputElement).value }; salvarAi()" />
      </label>
      <label class="mt-2 block">API key (só neste navegador)
        <input :value="aiConfig.key" type="password" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1 font-mono" aria-label="API key" placeholder="sk-…" @change="aiConfig = { ...aiConfig, key: ($event.target as HTMLInputElement).value }; salvarAi()" />
      </label>
      <p class="mt-2 text-nexo-muted">Chave armazenada só neste navegador (localStorage).</p>
      <p class="mt-1 text-nexo-muted">Desenhando como {{ presence.agenteDe('u-pm').model }}.</p>
    </div>
  </div>
</template>
