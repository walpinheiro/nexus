<script setup lang="ts">
import { ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { encodeDoc } from '@/utils/studioShare'
import M3Icon from './m3/M3Icon.vue'

const emit = defineEmits<{
  (e: 'preview'): void
  (e: 'abrir-prompt'): void
  (e: 'abrir-ask'): void
}>()

const studio = useStudio()
const aviso = ref('')

function flash(msg: string) {
  aviso.value = msg
  setTimeout(() => (aviso.value = ''), 2500)
}

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = texto
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

async function copiarShare() {
  try {
    const hash = await encodeDoc(studio.doc)
    const ok = await copiarTexto(`${location.origin}${location.pathname}#/studio-full${hash}`)
    flash(ok ? 'Share-link copiado.' : 'Não foi possível copiar — verifique a permissão do navegador.')
  } catch {
    flash('Não foi possível gerar o share-link.')
  }
}

function exportarJSON() {
  const blob = new Blob([JSON.stringify(studio.doc, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'studio-doc.json'
  a.click()
  flash('JSON exportado.')
}

function exportarPNG() {
  const f = studio.frameAtual()
  if (!f) return
  const itens = studio.doc.groups.flatMap((g) => g.items).filter((i) => i.x >= f.x && i.x < f.x + f.w)
  const inner = itens
    .map((i) => `<g><rect x="${i.x - f.x + 20}" y="${i.y - f.y + 60}" width="220" height="54" rx="8" fill="#fff" stroke="#1D4ED8"/><text x="${i.x - f.x + 32}" y="${i.y - f.y + 82}" font-family="Inter,sans-serif" font-size="12" font-weight="bold" fill="#0F172A">${esc(i.kind)}</text><text x="${i.x - f.x + 32}" y="${i.y - f.y + 100}" font-family="Inter,sans-serif" font-size="11" fill="#64748B">${esc(i.label ?? '')}</text></g>`)
    .join('')
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${f.w}" height="${f.h}" viewBox="0 0 ${f.w} ${f.h}"><rect width="${f.w}" height="${f.h}" fill="#F7F8FB"/><text x="20" y="36" font-family="Inter,sans-serif" font-size="18" font-weight="bold" fill="#0F172A">${esc(f.name)}</text>${inner}</svg>`
  const url = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml;charset=utf-8' }))
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = f.w
    c.height = f.h
    c.getContext('2d')!.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    c.toBlob((b) => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = `studio-${f.id}.png`
      a.click()
      flash('PNG exportado.')
    }, 'image/png')
  }
  img.src = url
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function abrirPrompt() {
  emit('abrir-prompt')
  emit('abrir-ask')
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-1 p-1.5 text-xs shadow-card"
    :style="{ background: '#F7F2FA', borderRadius: '28px', border: '1px solid #E2E8F0' }"
    role="toolbar"
    aria-label="Toolbar do Studio"
  >
    <span class="flex items-center gap-1" role="group" aria-label="Modo">
      <button type="button" title="Selecionar (V)" aria-label="Selecionar" class="inline-flex items-center justify-center gap-1 rounded-btn px-2 py-1 font-semibold text-nexo-primary"><M3Icon name="arrow_selector_tool" :size="18" label="Selecionar" />Selecionar</button>
      <button type="button" title="Mover (H)" aria-label="Mover" class="inline-flex items-center justify-center gap-1 rounded-btn px-2 py-1"><M3Icon name="pan_tool" :size="18" label="Mover" />Mover</button>
    </span>
    <span class="flex items-center gap-1" role="group" aria-label="Zoom">
      <button type="button" title="Reduzir" aria-label="Reduzir zoom" class="inline-flex items-center justify-center rounded-btn px-1.5 py-1" @click="studio.zoom = Math.max(0.3, studio.zoom - 0.1)">−</button>
      <span class="min-w-12 text-center" aria-live="polite">{{ Math.round(studio.zoom * 100) }}%</span>
      <button type="button" title="Aproximar" aria-label="Aproximar zoom" class="inline-flex items-center justify-center rounded-btn px-1.5 py-1" @click="studio.zoom = Math.min(2, studio.zoom + 0.1)">+</button>
      <button type="button" title="Ajustar (0)" aria-label="Ajustar zoom" class="inline-flex items-center justify-center gap-1 rounded-btn px-2 py-1" @click="studio.zoom = 0.7"><M3Icon name="fit_screen" :size="18" label="Ajustar" />Ajustar</button>
    </span>
    <button type="button" title="Organizar (tidy)" aria-label="Organizar" class="inline-flex items-center justify-center gap-1 rounded-btn px-2 py-1" @click="studio.tidy()"><M3Icon name="auto_fix" :size="18" label="Organizar" />Organizar</button>
    <button type="button" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" class="inline-flex items-center justify-center gap-1 rounded-btn px-2 py-1" @click="studio.undo()"><M3Icon name="undo" :size="18" label="Desfazer" />Desfazer</button>
    <button type="button" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" class="inline-flex items-center justify-center gap-1 rounded-btn px-2 py-1" @click="studio.redo()"><M3Icon name="redo" :size="18" label="Refazer" />Refazer</button>
    <button type="button" title="Preview modal (P)" aria-label="Abrir preview" class="inline-flex items-center justify-center gap-1 rounded-btn bg-nexo-primary px-3 py-1 font-semibold text-white" @click="emit('preview')"><M3Icon name="play_arrow" :size="18" label="Preview" />Preview</button>
    <button type="button" title="Prompt (abre painel)" aria-label="Abrir prompt" class="inline-flex items-center justify-center gap-1 rounded-btn border border-nexo-border px-2 py-1" @click="abrirPrompt()"><M3Icon name="auto_awesome" :size="18" label="Prompt" />Prompt</button>
    <button type="button" title="Compartilhar (copia share-link)" aria-label="Compartilhar" class="inline-flex items-center justify-center gap-1 rounded-btn border border-nexo-border px-2 py-1" @click="copiarShare()"><M3Icon name="share" :size="18" label="Compartilhar" />Share</button>
    <button type="button" class="rounded-btn border border-nexo-border px-2 py-1" @click="exportarPNG()">PNG</button>
    <button type="button" class="rounded-btn border border-nexo-border px-2 py-1" @click="exportarJSON()">JSON</button>
    <span v-if="aviso" class="text-nexo-approved" role="status">{{ aviso }}</span>
  </div>
</template>
