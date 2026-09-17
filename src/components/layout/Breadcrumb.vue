<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProject } from '@/stores/useProject'
import type { NivelZoom } from '@/types/nexo'

const project = useProject()
const route = useRoute()
const router = useRouter()
const itens = computed(() => project.breadcrumb)

function irPara(nivel: NivelZoom, rota?: string) {
  project.subir(nivel)
  if (rota && route.path !== rota) router.push(rota)
}
</script>

<template>
  <nav aria-label="breadcrumb" class="flex items-center gap-1 text-sm">
    <template v-for="(item, i) in itens" :key="item.nivel + '-' + i">
      <button
        v-if="item.rota && i < itens.length - 1"
        type="button"
        class="text-nexo-text hover:text-nexo-primary hover:underline"
        @click="irPara(item.nivel, item.rota)"
      >
        {{ item.rotulo }}
      </button>
      <span v-else-if="i < itens.length - 1" class="text-nexo-text">{{ item.rotulo }}</span>
      <span v-else class="font-semibold text-nexo-primary" aria-current="page">{{ item.rotulo }}</span>
      <span v-if="i < itens.length - 1" class="text-nexo-muted" aria-hidden="true">›</span>
    </template>
  </nav>
</template>
