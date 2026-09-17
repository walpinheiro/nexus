<script setup lang="ts">
import { ref } from 'vue'
import { useStudio } from '@/stores/useStudio'
import PartsPalette from '@/components/studio/PartsPalette.vue'
import StudioStage from '@/components/studio/StudioStage.vue'
import StudioInspector from '@/components/studio/StudioInspector.vue'
import StudioToolbar from '@/components/studio/StudioToolbar.vue'

const studio = useStudio()
const novoNome = ref('')
const renomeando = ref('')

function adicionar(tipo: 'phone' | 'desktop') {
  if (tipo === 'phone') studio.adicionarFrame(412, 892, novoNome.value || 'Nova tela')
  else studio.adicionarFrame(1280, 800, novoNome.value || 'Nova tela web')
  novoNome.value = ''
}

function confirmarRemocao(id: string) {
  if (confirm('Remover esta tela? Actions para ela viram "back".')) studio.removerFrame(id)
}
</script>

<template>
  <div class="flex h-full min-h-[560px] flex-col">
    <StudioToolbar />
    <div class="flex min-h-0 flex-1">
      <PartsPalette />
      <StudioStage class="m-2" />
      <StudioInspector />
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
        <input v-model="novoNome" placeholder="Nome…" aria-label="Nome da nova tela" class="w-28 rounded-btn border border-nexo-border px-2 py-1" />
        <button type="button" title="Adicionar tela phone 412x892" class="rounded-btn border border-nexo-border px-2 py-1" @click="adicionar('phone')">+Phone</button>
        <button type="button" title="Adicionar tela desktop 1280x800" class="rounded-btn border border-nexo-border px-2 py-1" @click="adicionar('desktop')">+Web</button>
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
          ✎ {{ fr.name }}
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
  </div>
</template>
