<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { useGraph } from '@/stores/useGraph'
import { montarEntradaStudio } from '@/ai/gateParaStudio'
import { paletteOf } from './m3/theme'
import type { StudioFrame, StudioItem } from '@/types/studio'
import type { ValidacaoCampo } from '@/types/nexo'
import M3Node from './m3/M3Node.vue'
import M3Icon from './m3/M3Icon.vue'
import M3TextField from './m3/M3TextField.vue'
import M3Snackbar from './m3/M3Snackbar.vue'

const props = defineProps<{ inicioId: string | null }>()
const emit = defineEmits<{ (e: 'fechar'): void }>()

const studio = useStudio()
const graph = useGraph()

const pilha = ref<{ id: string; t: string }[]>([{ id: props.inicioId ?? studio.doc.frames[0]?.id ?? '', t: 'none' }])
const anim = ref<{ t: string; back: boolean }>({ t: 'none', back: false })
const valores = ref<Record<string, boolean>>({})
const seletorAberto = ref(false)
const scheme = computed(() => paletteOf(studio.doc.paletteKey, false))

// ONDA2 Y3/Y4 — Modo 'Testar validações', estado preservado e mensagens
const modoTestarValidacoes = ref(true)
const valoresCampos = ref<Record<string, string>>({})
const errosValidacao = ref<Record<string, string>>({})
const snackbarVisivel = ref(false)
const snackbarTexto = ref('')
const snackbarTipo = ref<'sucesso' | 'erro' | 'normal'>('normal')
let snackbarTimer: ReturnType<typeof setTimeout> | null = null

const topo = computed(() => pilha.value[pilha.value.length - 1])

const framesDisponiveis = computed<StudioFrame[]>(() => {
  if (studio.doc.frames.some((f) => f.id === topo.value?.id)) {
    return studio.doc.frames
  }
  const targetId = topo.value?.id ?? props.inicioId ?? ''
  const featId = graph.featureDaTela(targetId) ?? targetId.replace(/-(t\d+|alt\d+)$/, '')
  const entrada = featId ? montarEntradaStudio(featId, graph.state.nos) : null

  if (entrada && entrada.telas.length > 0) {
    return entrada.telas.map((t, i) => ({
      id: t.id,
      name: t.nome,
      x: i * 460,
      y: 0,
      w: 412,
      h: 800
    }))
  }
  return studio.doc.frames
})

const frame = computed(() => framesDisponiveis.value.find((f) => f.id === topo.value?.id) ?? framesDisponiveis.value[0])
const telaAtualId = computed(() => frame.value?.id ?? topo.value?.id ?? '')

const regrasDaTela = computed<ValidacaoCampo[]>(() => {
  const tid = telaAtualId.value
  return graph.regrasValidacao[tid] ?? []
})

const moldura = ref<'auto' | 'phone' | 'desktop'>('auto')
const ehPhone = computed(() => {
  if (moldura.value === 'phone') return true
  if (moldura.value === 'desktop') return false
  return (frame.value?.w ?? 412) < 1280
})

function alternarMoldura() {
  moldura.value = ehPhone.value ? 'desktop' : 'phone'
}

function selecionarTela(id: string) {
  seletorAberto.value = false
  if (id === frame.value?.id) return
  tentarNavegar(id, 'fade')
}

const itens = computed(() => {
  const fr = frame.value
  if (!fr) return []
  const itensStudio = studio.doc.groups
    .flatMap((g) => g.items)
    .filter((i) => i.x >= fr.x && i.x < fr.x + fr.w)
    .sort((a, b) => a.y - b.y)

  if (itensStudio.length > 0) return itensStudio

  const targetId = fr.id
  const featId = graph.featureDaTela(targetId) ?? targetId.replace(/-(t\d+|alt\d+)$/, '')
  const entrada = featId ? montarEntradaStudio(featId, graph.state.nos) : null

  if (entrada) {
    const idx = entrada.telas.findIndex((t) => t.id === targetId)
    const tela = entrada.telas[idx]
    if (tela) {
      const lista: StudioItem[] = [
        {
          id: `bar-${tela.id}`,
          kind: 'topAppBar',
          label: tela.nome,
          icon: 'menu',
          variant: 'filled',
          x: fr.x,
          y: fr.y,
          w: 412
        },
        {
          id: `card-${tela.id}`,
          kind: 'card',
          label: tela.origem === 'fluxo_feliz' ? `Passo ${idx + 1}` : 'Exceção',
          supporting: tela.descricao,
          variant: 'filled',
          x: fr.x + 16,
          y: fr.y + 80,
          w: 380
        }
      ]
      const transicao = entrada.navegacao.find((nav) => nav.de === tela.id && nav.para !== tela.id)
      if (transicao) {
        lista.push({
          id: `btn-${tela.id}`,
          kind: 'button',
          label: transicao.gatilho.slice(0, 32) || 'Avançar',
          variant: 'filled',
          size: 380,
          w: 380,
          action: { to: transicao.para, transition: 'slide' },
          note: transicao.gatilho,
          x: fr.x + 16,
          y: fr.y + 700
        })
      }
      return lista
    }
  }

  return []
})

function itemPorId(id: string): StudioItem | undefined {
  return itens.value.find((i) => i.id === id) ?? studio.itemPorId(id)
}

function obterValor(campoId: string): string {
  return valoresCampos.value[campoId] ?? ''
}

function definirValor(campoId: string, val: string) {
  valoresCampos.value[campoId] = val
  if (errosValidacao.value[campoId]) {
    delete errosValidacao.value[campoId]
  }
}

function mostrarSnackbar(texto: string, tipo: 'sucesso' | 'erro' | 'normal' = 'normal') {
  if (snackbarTimer) clearTimeout(snackbarTimer)
  snackbarTexto.value = texto
  snackbarTipo.value = tipo
  snackbarVisivel.value = true
  snackbarTimer = setTimeout(() => {
    snackbarVisivel.value = false
  }, 4000)
}

function executarValidacao(): boolean {
  const tid = telaAtualId.value
  const res = graph.validarPreview(tid, valoresCampos.value)
  errosValidacao.value = { ...res.erros }

  if (!res.ok) {
    const primeiraMsg = Object.values(res.erros)[0] ?? 'Validação falhou. Verifique os campos com erro.'
    mostrarSnackbar(primeiraMsg, 'erro')
    return false
  } else {
    const msgSucesso =
      regrasDaTela.value[0]?.mensagemSucesso ??
      regrasDaTela.value[0]?.regras[0]?.mensagemSucesso ??
      'Validação aprovada com sucesso.'
    mostrarSnackbar(msgSucesso, 'sucesso')
    return true
  }
}

function navegar(para: string, t: string) {
  if (para === 'back') {
    if (pilha.value.length <= 1) return
    pilha.value.pop()
    anim.value = { t: topo.value?.t ?? 'slide', back: true }
    return
  }
  if (!framesDisponiveis.value.some((f) => f.id === para)) return
  pilha.value.push({ id: para, t })
  anim.value = { t, back: false }
}

function tentarNavegar(para: string, t: string) {
  if (para === 'back') {
    voltar()
    return
  }
  if (modoTestarValidacoes.value && regrasDaTela.value.length > 0) {
    const ok = executarValidacao()
    if (!ok) {
      return
    }
  }
  navegar(para, t)
}

function onTap(itemId: string) {
  const it = itemPorId(itemId)
  if (it?.action?.to) {
    tentarNavegar(it.action.to, it.action.transition ?? 'slide')
  } else if (it?.toggle !== undefined) {
    valores.value[itemId] = !valores.value[itemId]
  }
}

function voltar() {
  if (pilha.value.length <= 1) return
  navegar('back', 'slide')
}

let swipeX: number | null = null
function onPointerDown(e: PointerEvent) {
  swipeX = e.clientX
}
function onPointerUp(e: PointerEvent) {
  if (swipeX == null) return
  const dx = e.clientX - swipeX
  swipeX = null
  if (Math.abs(dx) < 60) return
  const i = framesDisponiveis.value.findIndex((f) => f.id === frame.value?.id)
  const alvo = dx < 0 ? framesDisponiveis.value[i + 1] : framesDisponiveis.value[i - 1]
  if (alvo) {
    tentarNavegar(alvo.id, 'slide')
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('fechar')
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const i = framesDisponiveis.value.findIndex((f) => f.id === frame.value?.id)
    const alvo = e.key === 'ArrowRight' ? framesDisponiveis.value[i + 1] : framesDisponiveis.value[i - 1]
    if (alvo) {
      tentarNavegar(alvo.id, 'slide')
    }
  }
}

watch(
  () => props.inicioId,
  (v) => {
    pilha.value = [{ id: v ?? studio.doc.frames[0]?.id ?? '', t: 'none' }]
  }
)

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (snackbarTimer) clearTimeout(snackbarTimer)
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Preview tap-through"
    @click.self="emit('fechar')"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <div class="flex max-h-full flex-col items-center gap-3" @click.stop>
      <!-- Viewport / Bezel do Dispositivo -->
      <div
        :key="topo?.id"
        class="overflow-hidden bg-white shadow-2xl relative"
        :class="anim.t !== 'none' ? `m3-trans-${anim.t}` : ''"
        :style="{
          width: ehPhone ? '412px' : 'min(1280px, 92vw)',
          maxWidth: '92vw',
          height: ehPhone ? 'min(800px, 78vh)' : 'min(720px, 75vh)',
          borderRadius: ehPhone ? '40px' : '28px',
          border: '12px solid #111'
        }"
        @click.stop
      >
        <div class="relative h-full w-full overflow-auto bg-white flex flex-col justify-between">
          <!-- Área de Conteúdo da Tela -->
          <div class="relative min-h-[460px] flex-1">
            <div
              v-for="it in itens"
              :key="it.id"
              role="button"
              tabindex="0"
              :aria-label="`${it.kind} ${it.label ?? ''}${it.action ? ', abre ' + it.action.to : ''}`"
              class="absolute"
              :class="it.action?.to || it.toggle !== undefined ? 'cursor-pointer' : 'cursor-default'"
              :style="{ left: Math.max(0, it.x - (frame?.x ?? 0)) + 'px', top: Math.max(0, it.y - (frame?.y ?? 0)) + 'px' }"
              @click.stop="onTap(it.id)"
              @keydown.enter.stop="onTap(it.id)"
            >
              <M3Node :item="it" :scheme="scheme" />
              <span v-if="valores[it.id]" class="absolute inset-0 rounded bg-black/10" aria-hidden="true" />
            </div>

            <!-- Painel / Card de Validações Interativo com Inputs Reais -->
            <div
              v-if="modoTestarValidacoes && regrasDaTela.length > 0"
              class="absolute left-4 right-4 z-20 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-md backdrop-blur-xs space-y-3"
              :style="{ top: Math.min(220, Math.max(90, (itens[1]?.y ?? 100) - (frame?.y ?? 0) + 110)) + 'px' }"
              @click.stop
            >
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <M3Icon name="fact_check" :size="16" class="text-nexo-primary" />
                  <span>Testar validações</span>
                </div>
                <span class="rounded bg-nexo-primary/10 px-2 py-0.5 text-[10px] font-mono font-medium text-nexo-primary">
                  {{ telaAtualId }} ({{ regrasDaTela.length }} regra{{ regrasDaTela.length > 1 ? 's' : '' }})
                </span>
              </div>

              <!-- Inputs reais vinculados e com validação inline -->
              <div class="space-y-2.5">
                <div v-for="campo in regrasDaTela" :key="campo.campoId" class="space-y-1">
                  <M3TextField
                    :item="{
                      id: campo.campoId,
                      kind: 'textField',
                      label: campo.campoId,
                      supporting: campo.regras[0]?.mensagemErro,
                      variant: 'outlined',
                      x: 0,
                      y: 0
                    }"
                    :scheme="scheme"
                    :model-value="obterValor(campo.campoId)"
                    :erro="errosValidacao[campo.campoId]"
                    @update:model-value="(v) => definirValor(campo.campoId, v)"
                  />
                </div>
              </div>

              <!-- Botão Validar Tela -->
              <div class="flex items-center justify-between pt-1">
                <span v-if="Object.keys(errosValidacao).length > 0" class="text-[11px] font-medium text-red-600">
                  {{ Object.keys(errosValidacao).length }} erro(s) encontrado(s)
                </span>
                <span v-else class="text-[11px] text-slate-500">
                  Preencha e teste as regras
                </span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-btn bg-nexo-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-nexo-primary/90 transition-colors"
                  @click.stop="executarValidacao()"
                >
                  <M3Icon name="check_circle" :size="14" />
                  <span>Validar</span>
                </button>
              </div>
            </div>
          </div>

          <p class="p-2 text-center text-xs text-nexo-muted select-none">Toque navega · ‹ › / swipe troca de tela · Esc fecha</p>
        </div>
      </div>

      <!-- Toast/Banner M3Snackbar ligado ao resultado da validação -->
      <transition name="fade">
        <div v-if="snackbarVisivel" class="fixed bottom-20 z-50">
          <M3Snackbar
            :item="{
              id: 'snack-val',
              kind: 'snackbar',
              label: snackbarTexto,
              supporting: 'Fechar',
              x: 0,
              y: 0
            }"
            :scheme="scheme"
            :tipo="snackbarTipo"
            @fechar="snackbarVisivel = false"
          />
        </div>
      </transition>

      <!-- Controles no Rodapé (Voltar | Seletor de Telas | Testar validações | Moldura | Fechar) -->
      <div class="relative flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-3.5 py-1.5 text-sm text-white shadow-xl backdrop-blur-md">
        <!-- Botão Voltar -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors"
          :class="pilha.length <= 1 ? 'cursor-not-allowed opacity-35 text-white/50' : 'text-white hover:bg-white/15 active:bg-white/25'"
          :disabled="pilha.length <= 1"
          aria-label="Voltar tela"
          title="Voltar tela"
          @click="voltar()"
        >
          <M3Icon name="arrow_back" :size="18" label="Voltar" />
          <span>Voltar</span>
        </button>

        <div class="h-4 w-px bg-white/20" aria-hidden="true" />

        <!-- Seletor de Telas -->
        <div class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 font-medium text-white transition-colors hover:bg-white/20 active:bg-white/25"
            :aria-expanded="seletorAberto"
            aria-haspopup="listbox"
            title="Selecionar tela"
            @click="seletorAberto = !seletorAberto"
          >
            <M3Icon name="smartphone" :size="18" />
            <span class="max-w-[150px] truncate text-xs sm:text-sm">{{ frame?.name ?? 'Tela' }}</span>
            <M3Icon :name="seletorAberto ? 'expand_less' : 'expand_more'" :size="18" />
          </button>

          <!-- Dropdown Flutuante de Telas -->
          <div
            v-if="seletorAberto"
            class="absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-lg"
            role="listbox"
          >
            <button
              v-for="f in framesDisponiveis"
              :key="f.id"
              type="button"
              role="option"
              :aria-selected="f.id === frame?.id"
              class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors"
              :class="f.id === frame?.id ? 'bg-white/20 font-semibold text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'"
              @click="selecionarTela(f.id)"
            >
              <M3Icon :name="f.id === frame?.id ? 'check' : 'smartphone'" :size="16" />
              <span class="truncate">{{ f.name }}</span>
            </button>
          </div>
        </div>

        <div class="h-4 w-px bg-white/20" aria-hidden="true" />

        <!-- Modo 'Testar validações' Toggle -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors"
          :class="modoTestarValidacoes ? 'bg-nexo-primary text-white font-semibold' : 'text-white/80 hover:bg-white/15 hover:text-white'"
          title="Alternar modo testar validações"
          @click="modoTestarValidacoes = !modoTestarValidacoes"
        >
          <M3Icon name="fact_check" :size="16" />
          <span>Testar validações</span>
        </button>

        <div class="h-4 w-px bg-white/20" aria-hidden="true" />

        <!-- Alternar Moldura Phone/Desktop -->
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          title="Alternar moldura phone/desktop"
          @click="alternarMoldura()"
        >
          {{ ehPhone ? 'Phone' : 'Desktop' }}
        </button>

        <div class="h-4 w-px bg-white/20" aria-hidden="true" />

        <!-- Botão Fechar -->
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-white/90 transition-colors hover:bg-white/15 hover:text-white active:bg-white/25"
          aria-label="Fechar preview (Esc)"
          title="Fechar preview (Esc)"
          @click="emit('fechar')"
        >
          <M3Icon name="close" :size="18" label="Fechar" />
          <span>Fechar</span>
        </button>
      </div>
    </div>
  </div>
</template>
