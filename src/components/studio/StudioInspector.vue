<script setup lang="ts">
import NovaField from '@/components/common/NovaField.vue'
import NovaTextarea from '@/components/common/NovaTextarea.vue'
import NovaSelect from '@/components/common/NovaSelect.vue'

import NovaAction from '@/components/common/NovaAction.vue'
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
const transicaoOptions = ['slide','slideLeft','slideUp','slideDown','fade','expand','none'].map(v => ({ value: v, label: v }))

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
  <div class="flex w-full min-w-0 flex-col gap-3 bg-white p-3 text-xs">
    <h2 class="font-bold">Inspector</h2>
    <p v-if="!item" class="text-nexo-muted">Selecione uma part no stage.</p>
    <template v-else>
      <p class="text-nexo-muted">{{ spec?.label ?? item.kind }} selecionado</p>
      <label v-if="spec?.hasLabel ?? true" class="block">Label<NovaField :value="item.label ?? ''" class="mt-1 w-full" @change="set('label', ($event.target as HTMLInputElement).value)" /></label>
      <label v-if="spec?.hasIcon ?? true" class="block">Ícone (Material Symbol)<NovaField :value="item.icon ?? ''" class="mt-1 w-full" @change="set('icon', ($event.target as HTMLInputElement).value || null)" /></label>
      <NovaSelect v-if="(spec?.hasVariant ?? true) && variantsOf(item.kind).length > 1" label="Variant" :value="item.variant ?? variantsOf(item.kind)[0]" :options="variantsOf(item.kind).map(v => ({ value: v, label: v }))" class="w-full" @change="set('variant', $event.target.value)" />
      <label v-if="spec?.hasSupporting ?? false" class="block">Texto de apoio<NovaField :value="item.supporting ?? ''" class="mt-1 w-full" @change="set('supporting', ($event.target as HTMLInputElement).value)" /></label>
      <label class="block">Nota<NovaTextarea :value="item.note ?? ''" rows="2" class="mt-1 w-full" @change="set('note', ($event.target as HTMLTextAreaElement).value)" /></label>
      <label v-if="spec?.hasTabs" class="block">Abas (uma por linha)<NovaTextarea :value="abasTexto" rows="3" class="mt-1 w-full" @change="setAbas(($event.target as HTMLTextAreaElement).value)" /></label>
      <NovaSelect v-if="spec?.hasAction ?? true" label="Ação → tela" :value="item.action?.to ?? ''" :options="[{ value: '', label: '(sem ação)' }, { value: 'back', label: 'back' }, ...studio.doc.frames.map(fr => ({ value: fr.id, label: fr.name }))]" class="w-full" @change="set('action', { to: $event.target.value, transition: item.action?.transition ?? 'slide' })" />
      <NovaSelect v-if="spec?.hasAction ?? true" label="Transição" :value="item.action?.transition ?? 'slide'" :options="transicaoOptions" class="w-full" @change="set('action', { to: item.action?.to ?? '', transition: $event.target.value as StudioTransition })" />
      <TapStage v-if="spec?.hasAction ?? true" :item-id="item.id" @change="onTapChange" />
      <label v-if="spec?.hasChecked" class="flex items-center gap-2">Checked<NovaField type="checkbox" :checked="!!item.checked" @change="set('checked', ($event.target as HTMLInputElement).checked)" /></label>
      <label v-if="spec?.hasValue" class="block">Value (0–100)<NovaField type="number" :value="item.value ?? 50" min="0" max="100" class="mt-1 w-full rounded-btn border border-nexo-border px-2 py-1" @change="set('value', Number(($event.target as HTMLInputElement).value))" /></label>
      <fieldset class="rounded-badge border border-nexo-border p-2">
        <legend class="px-1 font-semibold">Medidas (padrão {{ spec?.w ?? '—' }}×{{ spec?.h ?? '—' }})</legend>
        <div class="flex gap-2">
          <label class="min-w-0 flex-1">Largura<NovaField type="number" :value="item.w ?? item.size ?? spec?.w ?? 0" min="16" class="mt-1 w-full" @change="setMedida('w', Number(($event.target as HTMLInputElement).value))" /></label>
          <label class="min-w-0 flex-1">Altura<NovaField type="number" :value="item.h ?? spec?.h ?? 0" min="16" class="mt-1 w-full" @change="setMedida('h', Number(($event.target as HTMLInputElement).value))" /></label>
        </div>
        <p class="mt-1" :class="medidaOk ? 'text-nexo-approved' : 'text-nexo-blocked'" role="status">{{ medidaMsg }}</p>
      </fieldset>
      <div class="flex gap-1">
        <NovaAction type="button" variant="outline" size="sm" class="min-w-0 flex-1" @click="studio.duplicarItens([item.id])">Duplicar</NovaAction>
        <NovaAction type="button" variant="destructive" size="sm" class="min-w-0 flex-1" @click="studio.removerItens([item.id])">Remover</NovaAction>
      </div>
    </template>
  </div>
</template>
