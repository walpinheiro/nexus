<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { useGraph } from '@/stores/useGraph'
import { encodeDoc } from '@/utils/studioShare'
import { gerarPromptStudio } from '@/utils/studioPrompt'

const studio = useStudio()
const graph = useGraph()
const aviso = ref('')
const promptAberto = ref(false)
const promptEscopo = ref<string>('tudo')
const promptTexto = ref('')

function flash(msg: string) {
  aviso.value = msg
  setTimeout(() => (aviso.value = ''), 2500)
}

async function copiarShare() {
  const hash = await encodeDoc(studio.doc)
  await navigator.clipboard.writeText(`${location.origin}${location.pathname}#/studio-full${hash}`)
  flash('Share-link #docz= copiado (abre no m3e original).')
}

async function copiarM3E() {
  const hash = await encodeDoc(studio.doc)
  await navigator.clipboard.writeText(`https://lnkiai.github.io/m3e-canvas/${hash}`)
  flash('Link m3e copiado.')
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
  promptTexto.value = gerarPromptStudio(studio.doc, promptEscopo.value, graph.state.selecionadoId ?? undefined)
  promptAberto.value = true
}

async function copiarPrompt() {
  await navigator.clipboard.writeText(promptTexto.value)
  flash('Prompt copiado.')
}

const origemNo = computed(() => graph.state.selecionadoId ?? '—')
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 border-b border-nexo-border bg-white p-2 text-xs">
    <strong class="mr-1">Studio</strong>
    <span class="text-nexo-muted">origem: {{ origemNo }}</span>
    <button type="button" title="Organizar (tidy)" class="rounded-btn border border-nexo-border px-2 py-1" @click="studio.tidy()">Tidy</button>
    <button type="button" title="Desfazer (Ctrl+Z)" class="rounded-btn border border-nexo-border px-2 py-1" @click="studio.undo()">↩</button>
    <button type="button" title="Refazer (Ctrl+Shift+Z)" class="rounded-btn border border-nexo-border px-2 py-1" @click="studio.redo()">↪</button>
    <button type="button" title="Ajustar zoom (0)" class="rounded-btn border border-nexo-border px-2 py-1" @click="studio.zoom = 0.7">Fit</button>
    <button type="button" class="rounded-btn border border-nexo-border px-2 py-1" @click="abrirPrompt()">Prompt</button>
    <button type="button" class="rounded-btn border border-nexo-border px-2 py-1" @click="copiarShare()">Share-link</button>
    <button type="button" class="rounded-btn border border-nexo-border px-2 py-1" @click="copiarM3E()">Link m3e</button>
    <button type="button" class="rounded-btn border border-nexo-border px-2 py-1" @click="exportarPNG()">PNG</button>
    <button type="button" class="rounded-btn border border-nexo-border px-2 py-1" @click="exportarJSON()">JSON</button>
    <span v-if="aviso" class="text-nexo-approved" role="status">{{ aviso }}</span>
    <div v-if="promptAberto" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" role="dialog" aria-modal="true" aria-label="Prompt do Studio" @click.self="promptAberto = false">
      <div class="flex max-h-full w-full max-w-2xl flex-col rounded-card bg-white p-4 shadow-card">
        <div class="flex items-center gap-2 text-xs">
          <label>Escopo
            <select v-model="promptEscopo" class="rounded-btn border border-nexo-border px-2 py-1" @change="abrirPrompt()">
              <option value="tudo">Design inteiro</option>
              <option v-for="fr in studio.doc.frames" :key="fr.id" :value="fr.id">1 tela: {{ fr.name }}</option>
            </select>
          </label>
          <span class="text-nexo-muted">{{ promptTexto.length }} caracteres</span>
          <button type="button" class="ml-auto text-nexo-muted" @click="promptAberto = false">× Fechar</button>
        </div>
        <textarea v-model="promptTexto" rows="16" class="mt-2 w-full rounded-btn border border-nexo-border p-2 font-mono text-xs" aria-label="Prompt editável" />
        <button type="button" class="mt-2 rounded-btn bg-nexo-primary px-3 py-2 font-semibold text-white" @click="copiarPrompt()">Copiar prompt</button>
      </div>
    </div>
  </div>
</template>
