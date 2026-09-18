<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { paletteOf } from './m3/theme'
import M3Node from './m3/M3Node.vue'
import M3Icon from './m3/M3Icon.vue'

const props = defineProps<{ inicioId: string | null }>()
const emit = defineEmits<{ (e: 'fechar'): void }>()

const studio = useStudio()
const pilha = ref<{ id: string; t: string }[]>([{ id: props.inicioId ?? studio.doc.frames[0]?.id ?? '', t: 'none' }])
const anim = ref<{ t: string; back: boolean }>({ t: 'none', back: false })
const valores = ref<Record<string, boolean>>({})
const seletorAberto = ref(false)
const scheme = computed(() => paletteOf(studio.doc.paletteKey, false))

const topo = computed(() => pilha.value[pilha.value.length - 1])
const frame = computed(() => studio.doc.frames.find((f) => f.id === topo.value?.id) ?? studio.doc.frames[0])
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
  pilha.value.push({ id, t: 'fade' })
  anim.value = { t: 'fade', back: false }
}

const itens = computed(() => {
  const fr = frame.value
  if (!fr) return []
  return studio.doc.groups
    .flatMap((g) => g.items)
    .filter((i) => i.x >= fr.x && i.x < fr.x + fr.w)
    .sort((a, b) => a.y - b.y)
})

function navegar(para: string, t: string) {
  if (para === 'back') {
    if (pilha.value.length <= 1) return
    pilha.value.pop()
    anim.value = { t: topo.value?.t ?? 'slide', back: true }
    return
  }
  if (!studio.doc.frames.some((f) => f.id === para)) return
  pilha.value.push({ id: para, t })
  anim.value = { t, back: false }
}

function onTap(itemId: string) {
  const it = studio.itemPorId(itemId)
  if (it?.action?.to) {
    navegar(it.action.to, it.action.transition ?? 'slide')
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
  const i = studio.doc.frames.findIndex((f) => f.id === frame.value?.id)
  const alvo = dx < 0 ? studio.doc.frames[i + 1] : studio.doc.frames[i - 1]
  if (alvo) {
    pilha.value.push({ id: alvo.id, t: 'slide' })
    anim.value = { t: 'slide', back: dx > 0 }
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('fechar')
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const i = studio.doc.frames.findIndex((f) => f.id === frame.value?.id)
    const alvo = e.key === 'ArrowRight' ? studio.doc.frames[i + 1] : studio.doc.frames[i - 1]
    if (alvo) {
      pilha.value.push({ id: alvo.id, t: 'slide' })
      anim.value = { t: 'slide', back: e.key === 'ArrowLeft' }
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
        class="overflow-hidden bg-white shadow-2xl"
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
        <div class="relative h-full w-full overflow-auto bg-white">
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
          <p class="p-2 text-center text-xs text-nexo-muted select-none">Toque navega · ‹ › / swipe troca de tela · Esc fecha</p>
        </div>
      </div>

      <!-- V3: Controles no Rodapé (Voltar | Seletor de Telas | Fechar) -->
      <div class="relative flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-3 py-1.5 text-sm text-white shadow-xl backdrop-blur-md">
        <!-- V1: Botão Voltar (desabilitado na 1ª tela) -->
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

        <!-- V2: Seletor de Telas (ícone smartphone, nome atual e chevron) -->
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
              v-for="f in studio.doc.frames"
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
