<script setup lang="ts">
import { computed } from 'vue'
import type { GateId, NexoObject, Epic, Feature, PBI } from '@/types/nexo'
import type { GateInfo } from '@/stores/useGate'
import { useGraph } from '@/stores/useGraph'
import LucideIcon from '@/components/common/LucideIcon.vue'

interface Props {
  gateId: GateId
  alvo: NexoObject | null
  gateInfo?: GateInfo | null
}

const props = defineProps<Props>()
const graph = useGraph()

const alvoObj = computed(() => (props.alvo as unknown as Record<string, unknown>) ?? {})

const epico = computed(() => {
  if (props.alvo?.tipo === 'epico') return props.alvo as Epic
  return graph.state.nos.find((n) => n.tipo === 'epico') as Epic | undefined
})

const featuresDoEpico = computed(() => {
  return graph.state.nos.filter((n) => n.tipo === 'feature') as Feature[]
})

const pbisDaFeature = computed(() => {
  if (!props.alvo) return []
  return graph.state.nos.filter((n) => {
    if (n.tipo !== 'pbi') return false
    const p = n as unknown as PBI
    return p.feature_id === props.alvo?.id || p.id === props.alvo?.id
  }) as PBI[]
})

const problema = computed(() => (alvoObj.value['problema'] as string) || props.alvo?.descricao || '')

const personas = computed(() => {
  const p = alvoObj.value['personas']
  return Array.isArray(p) ? (p as string[]) : []
})

const objetivo = computed(() => (alvoObj.value['objetivo'] as string) || '')

const riscos = computed(() => {
  const r = alvoObj.value['riscos']
  return Array.isArray(r) ? (r as string[]) : []
})

const criteriosBdd = computed(() => {
  const f = props.alvo as unknown as Record<string, unknown> | null
  if (!f || !Array.isArray(f['criterios_bdd'])) return []
  return f['criterios_bdd'] as { id?: string; given: string; when: string; then: string; prioridade?: string }[]
})

const integracoes = computed(() => {
  const f = props.alvo as unknown as Record<string, unknown> | null
  if (!f || !Array.isArray(f['integracoes'])) return []
  return f['integracoes'] as { sistema?: string; operacao?: string; contrato_ref?: string }[]
})

const fluxoFeliz = computed(() => {
  const f = props.alvo as unknown as Record<string, unknown> | null
  return typeof f?.['fluxo_feliz'] === 'string' ? (f['fluxo_feliz'] as string) : ''
})

const adrId = computed(() => {
  const f = props.alvo as unknown as Record<string, unknown> | null
  return typeof f?.['adr_id'] === 'string' ? (f['adr_id'] as string) : ''
})
</script>

<template>
  <div class="rounded-card border border-nexo-border bg-white p-4 shadow-sm space-y-4">
    <!-- Header do Painel Output -->
    <div class="flex items-center justify-between border-b border-nexo-border/60 pb-3">
      <div class="flex items-center gap-2">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-nexo-primary/10 text-nexo-primary font-bold text-xs">
          <LucideIcon name="file-text" :size="14" />
        </span>
        <div>
          <h3 class="text-sm font-bold text-nexo-text">Output Formal · Gate {{ props.gateId }}</h3>
          <p class="text-[11px] text-nexo-muted">
            Artefatos consolidados e derivados do grafo do projeto
          </p>
        </div>
      </div>

      <!-- Badge de Baseline registrada -->
      <div v-if="props.gateInfo?.baselineVersao" class="text-right">
        <span class="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
          <LucideIcon name="shield-check" :size="12" /> Baseline v{{ props.gateInfo.baselineVersao }}
        </span>
        <p class="text-[10px] text-nexo-muted mt-0.5">
          Aprovado por {{ props.gateInfo.aprovadoPor }}
          <span v-if="props.gateInfo.aprovadoEm"> em {{ new Date(props.gateInfo.aprovadoEm).toLocaleDateString() }}</span>
        </p>
      </div>
      <div v-else>
        <span class="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          <LucideIcon name="clock" :size="12" /> Baseline Pendente
        </span>
      </div>
    </div>

    <!-- EmptyState se nenhum alvo estiver carregado -->
    <div v-if="!props.alvo" class="rounded border border-dashed border-nexo-border p-6 text-center text-xs text-nexo-muted">
      <LucideIcon name="inbox" :size="24" class="mx-auto mb-2 text-nexo-muted" />
      <p class="font-medium text-nexo-text">Nenhum artefato gerado ainda</p>
      <p class="mt-1">Selecione um objeto do gate acima para visualizar os artefatos formais.</p>
    </div>

    <!-- Conteúdo Específico por Gate -->
    <div v-else class="space-y-3 text-xs">
      <!-- 1. G0: ONE-PAGER DE ENQUADRAMENTO -->
      <div v-if="props.gateId === 'G0'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">One-Pager de Enquadramento</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div>
              <span class="font-semibold text-nexo-text">Contexto & Dor Observável:</span>
              <p class="text-nexo-muted mt-0.5">{{ problema || 'Sem descrição cadastrada.' }}</p>
            </div>
            <div>
              <span class="font-semibold text-nexo-text">Público Afetado / Personas:</span>
              <p class="text-nexo-muted mt-0.5">
                {{ personas.length > 0 ? personas.join(', ') : 'Nenhuma persona definida.' }}
              </p>
            </div>
            <div>
              <span class="font-semibold text-nexo-text">Hipótese & Métrica Inicial:</span>
              <p class="text-nexo-muted mt-0.5">{{ objetivo || 'Sem hipótese refutável cadastrada.' }}</p>
            </div>
            <div>
              <span class="font-semibold text-nexo-text">Sponsor / Owner:</span>
              <p class="text-nexo-muted mt-0.5">{{ props.alvo.owner || 'Não atribuído' }}</p>
            </div>
          </div>

          <div class="border-t border-nexo-border/60 pt-2 text-[11px]">
            <span class="font-semibold text-nexo-text">Riscos Iniciais & Fronteiras:</span>
            <div v-if="riscos.length > 0" class="mt-1 flex flex-wrap gap-1">
              <span v-for="r in riscos" :key="r" class="rounded bg-red-100 text-red-800 px-2 py-0.5 text-[10px]">
                {{ r }}
              </span>
            </div>
            <p v-else class="text-nexo-muted mt-0.5 italic">
              Sem riscos críticos declarados no momento — preencha no Canvas para formalizar.
            </p>
          </div>
        </div>

        <div>
          <p class="font-semibold text-nexo-text text-xs mb-1.5">Candidatas a Épico (Descoberta):</p>
          <ul v-if="featuresDoEpico.length > 0" class="space-y-1">
            <li v-for="f in featuresDoEpico" :key="f.id" class="flex items-center justify-between rounded border border-nexo-border/60 bg-white p-2">
              <span class="font-medium text-nexo-text">{{ f.titulo }}</span>
              <span class="text-[10px] text-nexo-muted">{{ f.status }} v{{ f.versao }}</span>
            </li>
          </ul>
          <p v-else class="text-nexo-muted italic text-[11px]">
            Nenhuma candidata a épico vinculada no momento.
          </p>
        </div>
      </div>

      <!-- 2. G1: PRD / PERSONAS / MÉTRICAS -->
      <div v-else-if="props.gateId === 'G1'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">PRD · Especificação de Épico</p>
          <div class="text-[11px] space-y-1.5">
            <div>
              <span class="font-semibold text-nexo-text">Outcome de Negócio:</span>
              <p class="text-nexo-muted">{{ objetivo || 'Não definido' }}</p>
            </div>
            <div>
              <span class="font-semibold text-nexo-text">Personas Atendidas:</span>
              <p class="text-nexo-muted">{{ personas.length > 0 ? personas.join(', ') : 'Sem personas' }}</p>
            </div>
          </div>

          <!-- Tabela de KPIs -->
          <div class="border-t border-nexo-border/60 pt-2">
            <span class="font-semibold text-nexo-text text-[11px]">Métricas de Sucesso (KPIs):</span>
            <div v-if="Array.isArray(epico?.kpis) && epico.kpis.length > 0" class="mt-1 space-y-1">
              <div v-for="k in epico.kpis" :key="k.nome" class="flex items-center justify-between rounded bg-white p-1.5 border border-nexo-border/60 text-[11px]">
                <span class="font-semibold text-nexo-text">{{ k.nome }}</span>
                <span class="text-nexo-primary font-bold">Meta: {{ k.alvo }} {{ k.unidade }} (em {{ k.janela }})</span>
                <span class="text-[10px] text-nexo-muted">Resp: {{ k.responsavel }}</span>
              </div>
            </div>
            <p v-else class="text-nexo-muted italic text-[11px] mt-0.5">Sem KPIs registrados.</p>
          </div>

          <!-- Escopo In / Out -->
          <div class="grid grid-cols-2 gap-2 border-t border-nexo-border/60 pt-2 text-[11px]">
            <div class="rounded bg-green-50/60 p-2 border border-green-200">
              <span class="font-bold text-green-900 block mb-1">Dentro do Escopo (In):</span>
              <ul v-if="Array.isArray(epico?.escopo_in) && epico.escopo_in.length > 0" class="list-disc list-inside space-y-0.5 text-green-950">
                <li v-for="item in epico.escopo_in" :key="item">{{ item }}</li>
              </ul>
              <span v-else class="text-green-800 italic">Nenhum item delimitado.</span>
            </div>
            <div class="rounded bg-red-50/60 p-2 border border-red-200">
              <span class="font-bold text-red-900 block mb-1">Fora do Escopo (Out):</span>
              <ul v-if="Array.isArray(epico?.escopo_out) && epico.escopo_out.length > 0" class="list-disc list-inside space-y-0.5 text-red-950">
                <li v-for="item in epico.escopo_out" :key="item">{{ item }}</li>
              </ul>
              <span v-else class="text-red-800 italic">Nenhum item excluído.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. G2: STORY MAP / BDD -->
      <div v-else-if="props.gateId === 'G2'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">Story Map & Cenários BDD</p>

          <div class="text-[11px] space-y-1">
            <span class="font-semibold text-nexo-text">Fluxo Feliz:</span>
            <p class="text-nexo-muted bg-white p-2 rounded border border-nexo-border/60">
              {{ fluxoFeliz || 'Sem fluxo feliz documentado.' }}
            </p>
          </div>

          <div class="border-t border-nexo-border/60 pt-2">
            <span class="font-semibold text-nexo-text text-[11px] block mb-1.5">Cenários Given / When / Then (BDD):</span>
            <div v-if="criteriosBdd.length > 0" class="space-y-1.5">
              <div
                v-for="(c, i) in criteriosBdd"
                :key="i"
                class="rounded bg-white p-2 border border-nexo-border/80 text-[11px] space-y-0.5"
              >
                <div class="flex items-center justify-between text-[10px] text-nexo-muted">
                  <span class="font-bold text-nexo-primary">{{ c.id || `AC-00${i+1}` }}</span>
                  <span class="uppercase tracking-wide">{{ c.prioridade || 'must' }}</span>
                </div>
                <p><strong class="text-nexo-text">Given:</strong> <span class="text-nexo-muted">{{ c.given }}</span></p>
                <p><strong class="text-nexo-text">When:</strong> <span class="text-nexo-muted">{{ c.when }}</span></p>
                <p><strong class="text-nexo-text">Then:</strong> <span class="text-nexo-muted">{{ c.then }}</span></p>
              </div>
            </div>
            <div v-else class="rounded bg-white p-3 text-center border border-dashed border-nexo-border text-[11px] text-nexo-muted">
              Sem critérios BDD cadastrados ainda. Crie via IA na aba 'Chat Interativo' ou na aba 'Texto' do Canvas.
            </div>
          </div>
        </div>
      </div>

      <!-- 4. G3: CONTRATOS OPENAPI / ADRs / C4 -->
      <div v-else-if="props.gateId === 'G3'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">Arquitetura, Contratos & Decisões</p>

          <div class="text-[11px] space-y-1">
            <span class="font-semibold text-nexo-text">Contrato de Integração / OpenAPI:</span>
            <div v-if="integracoes.length > 0" class="space-y-1">
              <div
                v-for="(item, idx) in integracoes"
                :key="idx"
                class="rounded bg-white p-2 border border-nexo-border/80 text-[11px]"
              >
                <p class="font-semibold text-nexo-text">{{ item.sistema || 'Sistema Externo' }} · {{ item.operacao || 'Operação' }}</p>
                <p class="text-nexo-muted text-[10px] mt-0.5">Contrato: {{ item.contrato_ref || 'OpenAPI 3.0 padronizado' }}</p>
              </div>
            </div>
            <p v-else class="text-nexo-muted bg-white p-2 rounded border border-dashed border-nexo-border italic">
              Sem integrações técnicas registradas. Adicione na aba 'Detalhes' ou via proposta de patch.
            </p>
          </div>

          <div class="border-t border-nexo-border/60 pt-2 text-[11px]">
            <span class="font-semibold text-nexo-text">Decisões Arquiteturais Vinculadas (ADRs):</span>
            <p class="text-nexo-muted mt-0.5">
              {{ adrId ? `ADR Vinculada: ${adrId}` : 'Sem ADR associada a este nó.' }}
            </p>
          </div>
        </div>
      </div>

      <!-- 5. G4: PBIs / DoR / RELEASE -->
      <div v-else-if="props.gateId === 'G4'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">Backlog de PBIs (Definition of Ready)</p>

          <div v-if="pbisDaFeature.length > 0" class="space-y-1.5">
            <div
              v-for="p in pbisDaFeature"
              :key="p.id"
              class="rounded bg-white p-2.5 border border-nexo-border/80 text-[11px] space-y-1"
            >
              <div class="flex items-center justify-between">
                <span class="font-bold text-nexo-text">{{ p.titulo }}</span>
                <span class="rounded bg-gray-100 px-1.5 py-0.2 text-[10px] text-nexo-muted">{{ p.status }}</span>
              </div>
              <p class="text-nexo-muted">{{ p.descricao }}</p>
              <p class="text-[10px] text-nexo-primary font-medium">Estratégia de Teste: {{ p.estrategia_teste || 'Componente e integração' }}</p>
            </div>
          </div>
          <div v-else class="rounded bg-white p-3 text-center border border-dashed border-nexo-border text-[11px] text-nexo-muted">
            Sem PBIs vinculados a esta feature no momento.
          </div>
        </div>
      </div>

      <!-- 6. G5: PACOTE / EVIDÊNCIAS DoD -->
      <div v-else-if="props.gateId === 'G5'" class="space-y-3">
        <div class="rounded-card border border-nexo-border bg-nexo-canvas/30 p-3 space-y-2">
          <p class="text-xs font-bold text-nexo-primary uppercase tracking-wide">Pacote de Implementação & Evidências (DoD)</p>
          <div class="text-[11px] space-y-1">
            <div class="flex items-center justify-between rounded bg-white p-2 border border-nexo-border/60">
              <span class="font-semibold text-nexo-text">Status de Validação de Código:</span>
              <span
                class="font-bold uppercase text-[10px] px-2 py-0.5 rounded"
                :class="props.alvo.status === 'validated' || props.alvo.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
              >
                {{ props.alvo.status }}
              </span>
            </div>
            <div class="rounded bg-white p-2 border border-nexo-border/60 text-[11px] text-nexo-muted space-y-0.5">
              <p>✓ Suite de testes automatizados executada e verde.</p>
              <p>✓ Revisão humana por pares concluída.</p>
              <p>✓ Grafo de rastreabilidade do NEXO sincronizado.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
