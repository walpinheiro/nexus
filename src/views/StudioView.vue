<script setup lang="ts">
import { ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import PartsPalette from '@/components/studio/PartsPalette.vue'
import StudioStage from '@/components/studio/StudioStage.vue'
import StudioInspector from '@/components/studio/StudioInspector.vue'
import StudioToolbar from '@/components/studio/StudioToolbar.vue'
import LayersPanel from '@/components/studio/LayersPanel.vue'
import FramePanel from '@/components/studio/FramePanel.vue'
import PreviewModal from '@/components/studio/PreviewModal.vue'
import NewFrameDialog from '@/components/studio/NewFrameDialog.vue'

const studio = useStudio()
const renomeando = ref('')
const abaEsq = ref<'parts' | 'layers'>('parts')
const abaDir = ref<'edit' | 'prompt'>('edit')
const previewAberto = ref(false)
const dialogNovaTela = ref(false)

function criarDoDialog(v: { nome: string; preset: 'phone' | 'desktop' }) {
  if (v.preset === 'phone') studio.adicionarFrame(412, 892, v.nome || 'Nova tela')
  else studio.adicionarFrame(1280, 800, v.nome || 'Nova tela web')
  dialogNovaTela.value = false
}

function confirmarRemocao(id: string) {
  if (window.confirm('Remover esta tela? Actions para ela viram "back".')) studio.removerFrame(id)
}

function abrirPreview() {
  previewAberto.value = true
}
</script>

<template>
  <div class="relative flex h-full min-h-[560px] flex-col">
    <div class="pointer-events-none absolute left-0 right-0 top-2 z-30 flex justify-center">
      <div class="pointer-events-auto" style="border-radius: 28px">
        <StudioToolbar @preview="abrirPreview()" />
      </div>
    </div>
    <div class="flex min-h-0 flex-1 pt-14">
      <aside class="flex w-60 shrink-0 flex-col border-r border-nexo-border bg-white" aria-label="Paleta e layers">
        <div class="flex gap-1 border-b border-nexo-border p-2 text-xs" role="tablist" aria-label="Abas da esquerda">
          <button type="button" role="tab" :aria-selected="abaEsq === 'parts'" class="flex-1 rounded-btn px-2 py-1" :class="abaEsq === 'parts' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaEsq = 'parts'">Parts</button>
          <button type="button" role="tab" :aria-selected="abaEsq === 'layers'" class="flex-1 rounded-btn px-2 py-1" :class="abaEsq === 'layers' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaEsq = 'layers'">Layers</button>
        </div>
        <PartsPalette v-if="abaEsq === 'parts'" class="min-h-0 flex-1 border-r-0" />
        <LayersPanel v-else class="min-h-0 flex-1" />
      </aside>
      <StudioStage class="m-2" @preview="abrirPreview()" />
      <aside class="flex w-72 shrink-0 flex-col border-l border-nexo-border bg-white" aria-label="Painel direito">
        <div class="flex gap-1 border-b border-nexo-border p-2 text-xs" role="tablist" aria-label="Abas da direita">
          <button type="button" role="tab" :aria-selected="abaDir === 'edit'" class="flex-1 rounded-btn px-2 py-1" :class="abaDir === 'edit' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaDir = 'edit'">Editar</button>
          <button type="button" role="tab" :aria-selected="abaDir === 'prompt'" class="flex-1 rounded-btn px-2 py-1" :class="abaDir === 'prompt' ? 'bg-nexo-primary-soft font-semibold text-nexo-primary' : ''" @click="abaDir = 'prompt'">Prompt</button>
        </div>
        <div v-if="abaDir === 'edit'" class="min-h-0 flex-1 overflow-auto">
          <FramePanel />
          <StudioInspector />
        </div>
        <div v-else class="min-h-0 flex-1 overflow-auto p-3 text-xs">
          <p class="font-semibold">Prompt da tela atual</p>
          <p class="mt-1 text-nexo-muted">Use o botão Prompt na toolbar para o design inteiro ou 1 tela (editável antes de copiar).</p>
        </div>
      </aside>
    </div>
    <div class="flex items-center gap-2 overflow-auto border-t border-nexo-border bg-white p-2 text-xs" aria-label="Telas">
      <button
        v-for="fr in studio.doc.frames"
        :key="fr.id"
        type="button"
        class="shrink-0 rounded-btn border px-3 py-1.5"
        :class="fr.id === studio.screenId ? 'border-nexo-primary font-semibold text-nexo-primary' : 'border-nexo-border'"
        @click="studio.screenId = fr.id; studio.persist()"
      >
        {{ renomeando === fr.id ? '' : fr.name }} <span class="text-nexo-muted">{{ fr.w }}×{{ fr.h }}</span>
      </button>
      <span class="flex shrink-0 gap-1">
        <button type="button" title="Criar tela (pergunta mobile ou desktop)" class="rounded-btn border border-nexo-primary px-3 py-1 font-semibold text-nexo-primary" @click="dialogNovaTela = true">+ Nova tela</button>
      </span>
      <span class="ml-auto flex shrink-0 gap-1">
        <button
          v-for="fr in studio.doc.frames"
          :key="'m' + fr.id"
          type="button"
          class="rounded-btn border border-nexo-border px-1.5 py-1"
          :title="`Renomear/duplicar/remover ${fr.name}`"
          @click="renomeando = renomeando === fr.id ? '' : fr.id"
        >
          Editar {{ fr.name }}
        </button>
      </span>
    </div>
    <div v-if="renomeando" class="flex items-center gap-2 border-t border-nexo-border bg-white p-2 text-xs">
      <span>Editar: {{ studio.doc.frames.find((x) => x.id === renomeando)?.name }}</span>
      <input
        :value="studio.doc.frames.find((x) => x.id === renomeando)?.name ?? ''"
        aria-label="Renomear tela"
        class="rounded-btn border border-nexo-border px-2 py-1"
        @change="renomeando && studio.renomearFrame(renomeando, ($event.target as HTMLInputElement).value)"
      />
      <button type="button" class="rounded-btn border border-nexo-border px-2 py-1" @click="renomeando && studio.duplicarFrame(renomeando)">Duplicar</button>
      <button type="button" class="rounded-btn border border-nexo-blocked-border px-2 py-1 text-nexo-blocked" @click="renomeando && confirmarRemocao(renomeando); renomeando = ''">Remover</button>
      <button type="button" class="underline" @click="renomeando = ''">fechar</button>
    </div>
    <PreviewModal v-if="previewAberto" :inicio-id="studio.screenId" @fechar="previewAberto = false" />
    <NewFrameDialog v-if="dialogNovaTela" @fechar="dialogNovaTela = false" @criar="criarDoDialog" />
  </div>
</template>
