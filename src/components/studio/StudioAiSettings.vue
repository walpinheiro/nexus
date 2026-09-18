<script lang="ts">
/**
 * Constantes e funções de persistência puras exportadas para uso e testes unitários.
 * Chave de armazenamento: nexo.v1.studio.ai
 * Purely local, never makes network calls.
 */
export type StudioAiProviderId = 'OpenAI' | 'Claude' | 'Gemini' | 'DeepSeek' | 'Ollama'

export interface ProviderEndpointMeta {
  id: StudioAiProviderId
  label: string
  defaultModel: string
  defaultBaseUrl: string
  keyLink: string
  keyPlaceholder: string
}

export const AI_PROVIDERS_META: Record<StudioAiProviderId, ProviderEndpointMeta> = {
  OpenAI: {
    id: 'OpenAI',
    label: 'OpenAI',
    defaultModel: 'gpt-5.6-luna',
    defaultBaseUrl: 'https://api.openai.com/v1',
    keyLink: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...'
  },
  Claude: {
    id: 'Claude',
    label: 'Claude',
    defaultModel: 'claude-3-7-sonnet-latest',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    keyLink: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-api03-...'
  },
  Gemini: {
    id: 'Gemini',
    label: 'Gemini',
    defaultModel: 'gemini-2.0-flash',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    keyLink: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...'
  },
  DeepSeek: {
    id: 'DeepSeek',
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    keyLink: 'https://platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-...'
  },
  Ollama: {
    id: 'Ollama',
    label: 'Ollama (local)',
    defaultModel: 'queen',
    defaultBaseUrl: 'http://localhost:11434',
    keyLink: 'http://localhost:11434',
    keyPlaceholder: '(sem chave — 100% local)'
  }
}

export interface ProviderConfig {
  modelId: string
  baseUrl: string
  apiKey: string
}

export interface StudioAiSettingsConfig {
  activeProvider: StudioAiProviderId
  providers: Record<StudioAiProviderId, ProviderConfig>
}

export const DEFAULT_AI_STORAGE_KEY = 'nexo.v1.studio.ai'

export function createDefaultAiConfig(): StudioAiSettingsConfig {
  return {
    activeProvider: 'OpenAI',
    providers: {
      OpenAI: {
        modelId: AI_PROVIDERS_META.OpenAI.defaultModel,
        baseUrl: AI_PROVIDERS_META.OpenAI.defaultBaseUrl,
        apiKey: ''
      },
      Claude: {
        modelId: AI_PROVIDERS_META.Claude.defaultModel,
        baseUrl: AI_PROVIDERS_META.Claude.defaultBaseUrl,
        apiKey: ''
      },
      Gemini: {
        modelId: AI_PROVIDERS_META.Gemini.defaultModel,
        baseUrl: AI_PROVIDERS_META.Gemini.defaultBaseUrl,
        apiKey: ''
      },
      DeepSeek: {
        modelId: AI_PROVIDERS_META.DeepSeek.defaultModel,
        baseUrl: AI_PROVIDERS_META.DeepSeek.defaultBaseUrl,
        apiKey: ''
      },
      Ollama: {
        modelId: AI_PROVIDERS_META.Ollama.defaultModel,
        baseUrl: AI_PROVIDERS_META.Ollama.defaultBaseUrl,
        apiKey: ''
      }
    }
  }
}

export function loadAiConfig(storageKey: string = DEFAULT_AI_STORAGE_KEY): StudioAiSettingsConfig {
  const defaults = createDefaultAiConfig()
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults
  }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<StudioAiSettingsConfig>
    return {
      activeProvider: parsed.activeProvider && AI_PROVIDERS_META[parsed.activeProvider]
        ? parsed.activeProvider
        : defaults.activeProvider,
      providers: {
        OpenAI: { ...defaults.providers.OpenAI, ...(parsed.providers?.OpenAI || {}) },
        Claude: { ...defaults.providers.Claude, ...(parsed.providers?.Claude || {}) },
        Gemini: { ...defaults.providers.Gemini, ...(parsed.providers?.Gemini || {}) },
        DeepSeek: { ...defaults.providers.DeepSeek, ...(parsed.providers?.DeepSeek || {}) },
        Ollama: { ...defaults.providers.Ollama, ...(parsed.providers?.Ollama || {}) }
      }
    }
  } catch (err) {
    console.warn('[StudioAiSettings] Falha ao carregar configuração de localStorage:', err)
    return defaults
  }
}

export function saveAiConfig(
  config: StudioAiSettingsConfig,
  storageKey: string = DEFAULT_AI_STORAGE_KEY
): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(config))
  } catch (err) {
    console.warn('[StudioAiSettings] Falha ao persistir configuração de localStorage:', err)
  }
}

export function resetAiConfig(storageKey: string = DEFAULT_AI_STORAGE_KEY): StudioAiSettingsConfig {
  const defaults = createDefaultAiConfig()
  saveAiConfig(defaults, storageKey)
  return defaults
}
</script>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import M3Icon from './m3/M3Icon.vue'

interface Props {
  modelValue?: StudioAiSettingsConfig
  showHeader?: boolean
  storageKey?: string
  dense?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  showHeader: true,
  storageKey: DEFAULT_AI_STORAGE_KEY,
  dense: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: StudioAiSettingsConfig): void
  (e: 'change', value: StudioAiSettingsConfig): void
  (e: 'close'): void
  (e: 'saved', value: StudioAiSettingsConfig): void
  (e: 'reset'): void
}>()

const localConfig = ref<StudioAiSettingsConfig>(createDefaultAiConfig())
const showPassword = ref(false)
const savedFeedback = ref(false)

const providerList = Object.keys(AI_PROVIDERS_META) as StudioAiProviderId[]

const currentMeta = computed(() => AI_PROVIDERS_META[localConfig.value.activeProvider])

const currentProviderConfig = computed(() => {
  return localConfig.value.providers[localConfig.value.activeProvider]
})

function sincronizar(valor: StudioAiSettingsConfig) {
  localConfig.value = JSON.parse(JSON.stringify(valor))
}

onMounted(() => {
  if (props.modelValue) {
    sincronizar(props.modelValue)
  } else {
    localConfig.value = loadAiConfig(props.storageKey)
  }
})

watch(
  () => props.modelValue,
  (novo) => {
    if (novo) {
      sincronizar(novo)
    }
  },
  { deep: true }
)

function selecionarProvedor(prov: StudioAiProviderId) {
  localConfig.value.activeProvider = prov
  notificarMudanca()
}

function redefinirModeloPadrao() {
  currentProviderConfig.value.modelId = currentMeta.value.defaultModel
  notificarMudanca()
}

function redefinirBaseUrlPadrao() {
  currentProviderConfig.value.baseUrl = currentMeta.value.defaultBaseUrl
  notificarMudanca()
}

function notificarMudanca() {
  saveAiConfig(localConfig.value, props.storageKey)
  emit('update:modelValue', localConfig.value)
  emit('change', localConfig.value)
}

function salvarExplicitamente() {
  saveAiConfig(localConfig.value, props.storageKey)
  emit('update:modelValue', localConfig.value)
  emit('saved', localConfig.value)
  savedFeedback.value = true
  setTimeout(() => {
    savedFeedback.value = false
  }, 2000)
}

function redefinirTudo() {
  localConfig.value = resetAiConfig(props.storageKey)
  emit('update:modelValue', localConfig.value)
  emit('change', localConfig.value)
  emit('reset')
}
</script>

<template>
  <div
    class="studio-ai-settings flex flex-col bg-nexo-surface text-nexo-text"
    :class="dense ? 'p-2 text-xs' : 'p-4 text-sm'"
    data-testid="studio-ai-settings"
  >
    <!-- Header do Painel -->
    <header
      v-if="showHeader"
      class="mb-3 flex items-center justify-between border-b border-nexo-border pb-2"
    >
      <div class="flex items-center gap-2">
        <M3Icon name="auto_awesome" :size="dense ? 18 : 20" class="text-nexo-primary" label="AI" />
        <h2 class="font-semibold text-nexo-text" :class="dense ? 'text-xs' : 'text-sm'">
          AI settings
        </h2>
      </div>
      <button
        type="button"
        class="rounded-btn p-1 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text"
        title="Fechar painel"
        aria-label="Close panel"
        @click="emit('close')"
      >
        <M3Icon name="close" :size="dense ? 16 : 18" label="Fechar" />
      </button>
    </header>

    <!-- Provider Radio Group -->
    <section class="mb-4">
      <div class="mb-1.5 flex items-center justify-between">
        <span class="text-xs font-semibold text-nexo-muted">Provider</span>
        <span class="font-mono text-[10px] text-nexo-muted">{{ localConfig.activeProvider }}</span>
      </div>
      <div
        class="grid grid-cols-4 gap-1 rounded-btn border border-nexo-border bg-nexo-canvas p-0.5"
        role="radiogroup"
        aria-label="Provedor de IA"
      >
        <button
          v-for="prov in providerList"
          :key="prov"
          type="button"
          role="radio"
          :aria-checked="localConfig.activeProvider === prov"
          class="rounded-btn py-1 text-center font-medium transition"
          :class="[
            dense ? 'text-[11px]' : 'text-xs',
            localConfig.activeProvider === prov
              ? 'bg-white font-semibold text-nexo-primary shadow-xs'
              : 'text-nexo-muted hover:text-nexo-text'
          ]"
          @click="selecionarProvedor(prov)"
        >
          {{ prov }}
        </button>
      </div>
    </section>

    <!-- Model ID Input -->
    <section class="mb-3">
      <div class="mb-1 flex items-center justify-between">
        <label
          :for="`model-id-${localConfig.activeProvider}`"
          class="text-xs font-semibold text-nexo-muted"
        >
          Model ID
        </label>
        <button
          v-if="currentProviderConfig.modelId !== currentMeta.defaultModel"
          type="button"
          class="text-[11px] text-nexo-primary hover:underline"
          title="Restaurar modelo padrão"
          @click="redefinirModeloPadrao()"
        >
          Reset default
        </button>
      </div>
      <div class="relative flex items-center">
        <input
          :id="`model-id-${localConfig.activeProvider}`"
          v-model="currentProviderConfig.modelId"
          type="text"
          class="w-full rounded-btn border border-nexo-border bg-white px-2.5 py-1.5 font-mono text-xs focus:border-nexo-primary focus:outline-none"
          :placeholder="currentMeta.defaultModel"
          @input="notificarMudanca()"
        />
      </div>
      <p class="mt-1 text-[10px] text-nexo-muted">
        Padrão: <code class="font-mono">{{ currentMeta.defaultModel }}</code>
      </p>
    </section>

    <!-- Base URL Input (Optional / Custom) -->
    <section class="mb-3">
      <div class="mb-1 flex items-center justify-between">
        <label
          :for="`base-url-${localConfig.activeProvider}`"
          class="text-xs font-semibold text-nexo-muted"
        >
          Base URL <span class="font-normal text-nexo-muted">(optional/custom)</span>
        </label>
        <button
          v-if="currentProviderConfig.baseUrl !== currentMeta.defaultBaseUrl"
          type="button"
          class="text-[11px] text-nexo-primary hover:underline"
          title="Restaurar URL padrão"
          @click="redefinirBaseUrlPadrao()"
        >
          Reset default
        </button>
      </div>
      <input
        :id="`base-url-${localConfig.activeProvider}`"
        v-model="currentProviderConfig.baseUrl"
        type="text"
        class="w-full rounded-btn border border-nexo-border bg-white px-2.5 py-1.5 font-mono text-xs focus:border-nexo-primary focus:outline-none"
        :placeholder="currentMeta.defaultBaseUrl"
        @input="notificarMudanca()"
      />
    </section>

    <!-- API Key Input + "Get a key" Link -->
    <section class="mb-4">
      <div class="mb-1 flex items-center justify-between">
        <label
          :for="`api-key-${localConfig.activeProvider}`"
          class="text-xs font-semibold text-nexo-muted"
        >
          API key
        </label>
        <a
          :href="currentMeta.keyLink"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-[11px] font-medium text-nexo-primary hover:underline"
        >
          Get a key
          <M3Icon name="open_in_new" :size="12" label="Abrir console do provedor" />
        </a>
      </div>
      <div class="relative flex items-center">
        <input
          :id="`api-key-${localConfig.activeProvider}`"
          v-model="currentProviderConfig.apiKey"
          :type="showPassword ? 'text' : 'password'"
          class="w-full rounded-btn border border-nexo-border bg-white py-1.5 pl-2.5 pr-8 font-mono text-xs focus:border-nexo-primary focus:outline-none"
          :placeholder="currentMeta.keyPlaceholder"
          autocomplete="off"
          spellcheck="false"
          @input="notificarMudanca()"
        />
        <button
          type="button"
          class="absolute right-1.5 p-1 text-nexo-muted hover:text-nexo-text"
          :title="showPassword ? 'Ocultar chave' : 'Exibir chave'"
          :aria-label="showPassword ? 'Ocultar chave' : 'Exibir chave'"
          @click="showPassword = !showPassword"
        >
          <M3Icon
            :name="showPassword ? 'visibility_off' : 'visibility'"
            :size="15"
            :label="showPassword ? 'Ocultar' : 'Exibir'"
          />
        </button>
      </div>
    </section>

    <!-- Notice de Privacidade / Armazenamento Local -->
    <div
      class="mb-4 flex items-start gap-2 rounded-card border border-nexo-border bg-nexo-canvas p-2.5 text-xs text-nexo-muted"
      role="note"
    >
      <M3Icon name="lock" :size="16" class="shrink-0 text-nexo-primary" label="Segurança" />
      <div class="flex-1 leading-relaxed">
        <p class="font-medium text-nexo-text">
          Stored only in this browser, never sent to our servers.
        </p>
        <p class="text-[11px] text-nexo-muted mt-0.5">
          Suas chaves e endpoints ficam gravados exclusivamente em seu navegador sob a chave
          <code class="font-mono text-nexo-text">{{ storageKey }}</code> e nunca são transmitidos a servidores intermediários.
        </p>
      </div>
    </div>

    <!-- Botões de Ação Auxiliares -->
    <footer class="mt-auto flex items-center justify-between border-t border-nexo-border pt-3">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-btn px-2 py-1 text-xs text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text"
        title="Redefinir todas as configurações de IA"
        @click="redefinirTudo()"
      >
        <M3Icon name="restart_alt" :size="14" label="Reset" />
        Redefinir tudo
      </button>

      <div class="flex items-center gap-2">
        <span
          v-if="savedFeedback"
          class="inline-flex items-center gap-1 text-[11px] font-medium text-nexo-approved"
        >
          <M3Icon name="check_circle" :size="13" label="Salvo" />
          Salvo!
        </span>
        <button
          type="button"
          class="rounded-btn bg-nexo-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-95"
          @click="salvarExplicitamente()"
        >
          Salvar
        </button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.studio-ai-settings {
  min-width: 240px;
}
</style>
