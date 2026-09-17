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
  if (it?.action?.to) navegar(it.action.to, it.action.transition ?? 'slide')
  else if (it?.toggle !== undefined) valores.value[itemId] = !valores.value[itemId]
}

function voltar() {
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
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Preview tap-through"
    @click.self="emit('fechar')"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <div class="flex max-h-full flex-col items-center gap-2">
      <div class="flex items-center gap-2 text-sm text-white">
        <button v-if="pilha.length > 1" type="button" class="rounded-btn bg-white/10 px-3 py-1" @click="voltar()">‹ Voltar</button>
        <span>{{ frame?.name }} · {{ anim.t }}{{ anim.back ? ' (back)' : '' }}</span>
        <span class="flex gap-1" role="group" aria-label="Moldura do preview">
          <button type="button" class="rounded-btn px-2 py-1" :class="ehPhone ? 'bg-white/20 font-semibold' : 'bg-white/10'" :aria-pressed="ehPhone" title="Moldura phone 412x892" @click="moldura = 'phone'">Phone</button>
          <button type="button" class="rounded-btn px-2 py-1" :class="!ehPhone ? 'bg-white/20 font-semibold' : 'bg-white/10'" :aria-pressed="!ehPhone" title="Moldura desktop 1280x800" @click="moldura = 'desktop'">Desktop</button>
        </span>
        <button type="button" class="rounded-btn bg-white/10 px-2 py-1" title="Alternar moldura" @click="alternarMoldura()">Alternar</button>
        <button type="button" class="rounded-btn bg-white/10 px-3 py-1" aria-label="Fechar preview (Esc)" @click="emit('fechar')">Fechar</button>
      </div>
      <div
        :key="topo?.id"
        class="overflow-hidden bg-white"
        :class="anim.t !== 'none' ? `m3-trans-${anim.t}` : ''"
        :style="{
          width: ehPhone ? '412px' : 'min(1280px, 92vw)',
          maxWidth: '92vw',
          height: ehPhone ? 'min(800px, 80vh)' : 'min(720px, 78vh)',
          borderRadius: ehPhone ? '40px' : '28px',
          border: '12px solid #111'
        }"
      >
        <div class="relative h-full w-full overflow-auto bg-white">
          <div
            v-for="it in itens"
            :key="it.id"
            role="button"
            tabindex="0"
            :aria-label="`${it.kind} ${it.label ?? ''}${it.action ? ', abre ' + it.action.to : ''}`"
            class="absolute cursor-pointer"
            :style="{ left: Math.max(0, it.x - (frame?.x ?? 0)) + 'px', top: Math.max(0, it.y - (frame?.y ?? 0)) + 'px' }"
            @click="onTap(it.id)"
            @keydown.enter="onTap(it.id)"
          >
            <M3Node :item="it" :scheme="scheme" />
            <span v-if="valores[it.id]" class="absolute inset-0 rounded bg-black/10" aria-hidden="true" />
          </div>
          <p class="p-2 text-center text-xs text-nexo-muted">Toque navega · ‹ › / swipe troca de tela · Esc fecha</p>
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs text-white" aria-hidden="true">
        <M3Icon name="touch_app" :size="16" />
        <span>toggle: toque alterna estado visual · swipe: arraste horizontal</span>
      </div>
    </div>
  </div>
</template>
