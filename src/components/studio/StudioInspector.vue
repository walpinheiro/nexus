<script setup lang="ts">
import { computed } from 'vue'
import { useStudio } from '@/stores/useStudio'
import { specOf, validarMedida, variantsOf } from './m3/tokens'
import TapStage from './TapStage.vue'
import type { StudioTab, StudioTransition } from '@/types/studio'

const studio = useStudio()
const item = computed(() => studio.itemPorId(studio.selecionados[0] ?? ''))
const spec = computed(() => (item.value ? specOf(item.value.kind) : undefined))
const medidaW = computed(() => item.value?.w ?? (item.value?.size as number | undefined) ?? spec.value?.w ?? 0)
const medidaH = computed(() => item.value?.h ?? spec.value?.h ?? 0)
const medidaMsg = computed(() => (item.value ? validarMedida(item.value.kind, medidaW.value, medidaH.value) : ''))
const medidaOk = computed(() => !medidaMsg.value.includes('fora do padrão'))
const abasTexto = computed(() => ((item.value?.tabs as StudioTab[] | undefined) ?? []).map((t) => t.label).join('\n'))

function set(campo: string, valor: unknown) {
  const it = item.value
  if (!it) return
  studio.pushHistory()
  ;(it as unknown as Record<string, unknown>)[campo] = valor
  studio.persist()
}

function setAbas(valor: string) {
  set(
    'tabs',
    valor
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => ({ label }))
  )
}

function onTapChange(v: { to: string; transition: StudioTransition }) {
  if (!v.to) set('action', undefined)
  else set('action', { to: v.to, transition: v.transition })
}

function setMedida(dim: 'w' | 'h', valor: number) {
  const it = item.value
  if (!it || !(valor > 0)) return
  const w = dim === 'w' ? valor : (it.w ?? (it.size as number | undefined) ?? spec.value?.w ?? valor)
  const h = dim === 'h' ? valor : (it.h ?? spec.value?.h ?? valor)
  studio.redimensionarItem(it.id, Math.round(w), Math.round(h))
}
</script>

<template>
  <div class="flex w-64 shrink-0 flex-col gap-2 overflow-auto border-l border-nexo-border bg-white p-3 text-xs">
    <h2 class="font-bold">Inspector</h2>
    <p v-if="!item" class="text-nexo-muted">Selecione uma part no stage.</p>
    <template v-else>
      <p class="text-nexo-muted">{{ item.kind }} · {{ item.id }}</p>
      <label v-if="spec?.hasLabel ?? true" class="block">Label<input :value="item.label ?? ''" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="set('label', ($event.target as HTMLInputElement).value)" /></label>
      <label v-if="spec?.hasIcon ?? true" class="block">Icone (Material Symbol)<input :value="item.icon ?? ''" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="set('icon', ($event.target as HTMLInputElement).value || null)" /></label>
      <label v-if="(spec?.hasVariant ?? true) && variantsOf(item.kind).length > 1" class="block">Variant
        <select :value="item.variant ?? variantsOf(item.kind)[0]" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="set('variant', ($event.target as HTMLSelectElement).value)">
          <option v-for="v in variantsOf(item.kind)" :key="v" :value="v">{{ v }}</option>
        </select>
      </label>
      <label v-if="spec?.hasSupporting ?? false" class="block">Supporting<input :value="item.supporting ?? ''" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="set('supporting', ($event.target as HTMLInputElement).value)" /></label>
      <label class="block">Note<textarea :value="item.note ?? ''" rows="2" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="set('note', ($event.target as HTMLTextAreaElement).value)" /></label>
      <label v-if="spec?.hasTabs" class="block">Abas (uma por linha)<textarea :value="abasTexto" rows="3" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="setAbas(($event.target as HTMLTextAreaElement).value)" /></label>
      <label v-if="spec?.hasAction ?? true" class="block">Ação → tela
        <select :value="item.action?.to ?? ''" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="set('action', { to: ($event.target as HTMLSelectElement).value, transition: item.action?.transition ?? 'slide' })">
          <option value="">(sem ação)</option>
          <option value="back">back</option>
          <option v-for="fr in studio.doc.frames" :key="fr.id" :value="fr.id">{{ fr.name }}</option>
        </select>
      </label>
      <label v-if="spec?.hasAction ?? true" class="block">Transição
        <select :value="item.action?.transition ?? 'slide'" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="set('action', { to: item.action?.to ?? '', transition: ($event.target as HTMLSelectElement).value })">
          <option value="slide">slide</option><option value="slideLeft">slideLeft</option><option value="slideUp">slideUp</option><option value="slideDown">slideDown</option><option value="fade">fade</option><option value="expand">expand</option><option value="none">none</option>
        </select>
      </label>
      <TapStage v-if="spec?.hasAction ?? true" :item-id="item.id" @change="onTapChange" />
      <label v-if="spec?.hasChecked" class="flex items-center gap-2">Checked<input type="checkbox" :checked="!!item.checked" @change="set('checked', ($event.target as HTMLInputElement).checked)" /></label>
      <label v-if="spec?.hasValue" class="block">Value (0–100)<input type="number" :value="item.value ?? 50" min="0" max="100" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="set('value', Number(($event.target as HTMLInputElement).value))" /></label>
      <fieldset class="rounded-badge border border-nexo-border p-2">
        <legend class="px-1 font-semibold">Medidas (padrão {{ spec?.w ?? '—' }}×{{ spec?.h ?? '—' }})</legend>
        <div class="flex gap-2">
          <label class="flex-1">Largura<input type="number" :value="item.w ?? item.size ?? spec?.w ?? 0" min="16" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="setMedida('w', Number(($event.target as HTMLInputElement).value))" /></label>
          <label class="flex-1">Altura<input type="number" :value="item.h ?? spec?.h ?? 0" min="16" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="setMedida('h', Number(($event.target as HTMLInputElement).value))" /></label>
        </div>
        <p class="mt-1" :class="medidaOk ? 'text-nexo-approved' : 'text-nexo-blocked'" role="status">{{ medidaMsg }}</p>
      </fieldset>
      <div class="flex gap-1">
        <button type="button" class="flex-1 rounded-btn border border-nexo-border px-2 py-1" @click="studio.duplicarItens([item.id])">Duplicar</button>
        <button type="button" class="flex-1 rounded-btn border border-nexo-blocked-border px-2 py-1 text-nexo-blocked" @click="studio.removerItens([item.id])">Remover</button>
      </div>
    </template>
  </div>
</template>
