<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProject } from '@/stores/useProject'
import LucideIcon from '@/components/common/LucideIcon.vue'
import type { NivelZoom } from '@/types/nexo'
import { VButton } from 'vueui-nova-kit'

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
      <VButton
        v-if="item.rota && i < itens.length - 1"
        type="button"
        variant="ghost"
        size="sm"
        class="text-nexo-text hover:text-nexo-primary hover:underline"
        @click="irPara(item.nivel, item.rota)"
      >
        {{ item.rotulo }}
      </VButton>
      <span v-else-if="i < itens.length - 1" class="text-nexo-text">{{ item.rotulo }}</span>
      <span v-else class="font-semibold text-nexo-primary" aria-current="page">{{ item.rotulo }}</span>
      <span v-if="i < itens.length - 1" class="inline-flex text-nexo-muted" aria-hidden="true"><LucideIcon name="chevR" :size="14" /></span>
    </template>
  </nav>
</template>
