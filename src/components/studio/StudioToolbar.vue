<script setup lang="ts">
import NovaAction from '@/components/common/NovaAction.vue'
import { ref } from 'vue'
import { FileJson, Hand, Image as ImageIcon, Maximize, MousePointer2, Play, Redo2, Share2, Sparkles, Undo2, ZoomIn, ZoomOut, LayoutGrid } from 'lucide-vue-next'
import { VToolbar, VToolbarDivider, VToolbarGroup } from 'vueui-nova-kit'
import { useStudio } from '@/stores/useStudio'
import { encodeDoc } from '@/utils/studioShare'

const emit = defineEmits<{
  (e: 'preview'): void
  (e: 'abrir-prompt'): void
  (e: 'abrir-ask'): void
  (e: 'fit'): void
}>()

const studio = useStudio()
const aviso = ref('')
const ferramenta = defineModel<'select' | 'hand'>('ferramenta', { default: 'select' })

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
    const ok = await copiarTexto(`${location.origin}/studio-full${hash}`)
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
  const img = new window.Image()
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
  <VToolbar class="studio-toolbar" variant="floating" size="sm" role="toolbar" aria-label="Ferramentas do Studio">
    <VToolbarGroup aria-label="Seleção e navegação">
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Selecionar (V)" aria-label="Selecionar (V)" :aria-pressed="ferramenta === 'select'" :class="{ 'is-active': ferramenta === 'select' }" @click="ferramenta = 'select'"><MousePointer2 :size="17" /></NovaAction>
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Mover stage (H)" aria-label="Mover stage (H)" :aria-pressed="ferramenta === 'hand'" :class="{ 'is-active': ferramenta === 'hand' }" @click="ferramenta = 'hand'"><Hand :size="17" /></NovaAction>
    </VToolbarGroup>
    <VToolbarDivider />
    <VToolbarGroup aria-label="Zoom e organização">
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Reduzir zoom" aria-label="Reduzir zoom" @click="studio.zoom = Math.max(0.05, studio.zoom - 0.1)"><ZoomOut :size="17" /></NovaAction>
      <span class="studio-zoom" aria-live="polite">{{ Math.round(studio.zoom * 100) }}%</span>
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Aproximar zoom" aria-label="Aproximar zoom" @click="studio.zoom = Math.min(2, studio.zoom + 0.1)"><ZoomIn :size="17" /></NovaAction>
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Ajustar ao stage (0)" aria-label="Ajustar ao stage" @click="emit('fit')"><Maximize :size="17" /></NovaAction>
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Organizar componentes" aria-label="Organizar componentes" @click="studio.tidy()"><LayoutGrid :size="17" /></NovaAction>
    </VToolbarGroup>
    <VToolbarDivider />
    <VToolbarGroup aria-label="Edição e preview">
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Desfazer (Ctrl+Z)" aria-label="Desfazer" @click="studio.undo()"><Undo2 :size="17" /></NovaAction>
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer" @click="studio.redo()"><Redo2 :size="17" /></NovaAction>
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Abrir preview (P)" aria-label="Abrir preview" @click="emit('preview')"><Play :size="17" /></NovaAction>
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Abrir prompt" aria-label="Abrir prompt" @click="abrirPrompt()"><Sparkles :size="17" /></NovaAction>
    </VToolbarGroup>
    <VToolbarDivider />
    <VToolbarGroup aria-label="Compartilhamento e exportação">
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Copiar link" aria-label="Copiar link de compartilhamento" @click="copiarShare()"><Share2 :size="17" /></NovaAction>
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Exportar PNG" aria-label="Exportar PNG" @click="exportarPNG()"><ImageIcon :size="17" /></NovaAction>
      <NovaAction type="button" variant="outline" size="sm" class="studio-tool" title="Exportar JSON" aria-label="Exportar JSON" @click="exportarJSON()"><FileJson :size="17" /></NovaAction>
    </VToolbarGroup>
    <span v-if="aviso" class="studio-toolbar-status" role="status">{{ aviso }}</span>
  </VToolbar>
</template>

<style scoped>
.studio-toolbar {
  display: flex;
  width: max-content;
  max-width: 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  @apply rounded-card border border-nexo-border bg-white shadow-card;
}

.studio-toolbar :deep(.v-toolbar__group) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.125rem;
}

.studio-toolbar :deep(.v-toolbar__divider) {
  height: 1.25rem;
  margin-inline: 0.125rem;
}

.studio-tool {
  display: inline-flex;
  width: 2rem;
  min-width: 2rem;
  height: 2rem;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.studio-tool.is-active {
  @apply border-nexo-primary bg-nexo-primary-soft text-nexo-primary;
}

.studio-zoom {
  min-width: 2.5rem;
  text-align: center;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  @apply text-nexo-text;
}

.studio-toolbar-status {
  flex-basis: 100%;
  padding: 0.125rem 0.375rem;
  @apply text-nexo-text;
  font-size: 0.6875rem;
}

@media (max-width: 640px) {
  .studio-toolbar {
    gap: 0.125rem;
  }
}
</style>
