<script setup lang="ts">
import type { Artefato } from '@/types/nexo'
import type { GateInfo } from '@/stores/useGate'
import LucideIcon from '@/components/common/LucideIcon.vue'

interface Props {
  artefato: Artefato | null
  gateInfo?: GateInfo | null
  mostrarExportar?: boolean
}

withDefaults(defineProps<Props>(), { gateInfo: null, mostrarExportar: true })

const emit = defineEmits<{
  (e: 'exportar'): void
}>()

interface SecaoProgresso {
  itens: Array<{ valor: string }>
}

function itemPreenchido(valor: string | null | undefined): boolean {
  const v = (valor ?? '').trim().toLowerCase()
  if (!v) return false
  return !(
    v.includes('não informado') ||
    v.includes('(vazio)') ||
    v.includes('(nenhum') ||
    v.includes('(não ')
  )
}

function progressoSecao(secao: SecaoProgresso): { feitos: number; total: number; completa: boolean } {
  const total = secao.itens.length
  const feitos = secao.itens.filter((item) => itemPreenchido(item.valor)).length
  return { feitos, total, completa: total > 0 && feitos === total }
}
</script>

<template>
  <!-- EmptyState preservado quando sem alvo -->
  <div
    v-if="!artefato"
    class="rounded border border-dashed border-nexo-border p-6 text-center text-xs text-nexo-muted"
  >
    <LucideIcon name="inbox" :size="24" class="mx-auto mb-2 text-nexo-muted" />
    <p class="font-medium text-nexo-text">Nenhum artefato gerado ainda</p>
    <p class="mt-1">Selecione um objeto do gate acima para visualizar o artefato formal.</p>
  </div>

  <!-- Visualizador genérico do artefato normativo (motor src/utils/artefatos.ts) -->
  <div v-else class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3.5 space-y-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">
        {{ artefato.titulo }}
      </p>
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded bg-nexo-primary/10 px-2 py-0.5 text-xs font-bold text-nexo-primary"
        >
          Gate {{ artefato.gate }}
        </span>
        <span
          v-if="gateInfo?.baselineVersao"
          class="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800"
        >
          <LucideIcon name="shield-check" :size="12" /> Baseline v{{ gateInfo.baselineVersao }}
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"
        >
          <LucideIcon name="clock" :size="12" /> Baseline pendente
        </span>
        <!-- Exportar .md é secundário dentro do artefato (motor exportWiki preservado) -->
        <button
          v-if="mostrarExportar"
          type="button"
          class="inline-flex min-h-[32px] items-center gap-1.5 rounded-btn border border-nexo-border bg-white px-3 py-1.5 text-sm font-semibold text-nexo-text hover:bg-slate-50 transition-colors shadow-xs"
          :title="`Exportar markdown do Gate ${artefato.gate}`"
          @click="emit('exportar')"
        >
          <LucideIcon name="download" :size="13" />
          <span>Exportar .md</span>
        </button>
      </div>
    </div>

    <div
      v-for="secao in artefato.secoes"
      :key="secao.titulo"
      class="rounded bg-white p-3 border border-nexo-border/80 text-[11px] space-y-1.5"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <p class="font-bold text-nexo-text text-[11px]">{{ secao.titulo }}</p>
        <LucideIcon
          v-if="progressoSecao(secao).completa"
          name="check"
          :size="12"
          class="text-green-600"
        />
        <span
          class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold"
          :class="
            progressoSecao(secao).completa
              ? 'bg-green-100 text-green-800'
              : 'bg-nexo-canvas text-nexo-muted'
          "
        >
          {{ progressoSecao(secao).feitos }}/{{ progressoSecao(secao).total }}
        </span>
      </div>
      <dl class="space-y-1">
        <div
          v-for="item in secao.itens"
          :key="item.rotulo"
          class="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-1 md:gap-2"
        >
          <dt class="font-semibold text-nexo-text">{{ item.rotulo }}</dt>
          <dd class="text-nexo-muted whitespace-pre-wrap break-words">{{ item.valor }}</dd>
        </div>
      </dl>
    </div>

    <slot name="acoes-secundarias" />
  </div>
</template>
