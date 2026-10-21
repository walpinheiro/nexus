<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjects } from '@/stores/useProjects'
import { useGraph } from '@/stores/useGraph'
import { useGate } from '@/stores/useGate'
import { useUsers } from '@/stores/useUsers'
import type { Classificacao } from '@/types/nexo'
import IngestaoDialog from '@/components/projects/IngestaoDialog.vue'
import { PASSOS_WIZARD_CRIACAO } from '@/ai/gateSkills'
import { VButton, VCard, VBadge, VProgress, VStatCard, VDialog, VTextInput, VTextarea, VSelect, VTabs } from 'vueui-nova-kit'
import { ORDEM_GATES, gateAnterior, gateDesbloqueado } from '@/utils/gates'
import LucideIcon from '@/components/common/LucideIcon.vue'

const projects = useProjects()
const graph = useGraph()
const gates = useGate()
const users = useUsers()
const router = useRouter()

const dialogAberto = ref(false)
const titulo = ref('')
const contexto = ref('')
const publico = ref('')
const objetivo = ref('')
const metrica = ref('')
const restricoesTxt = ref('')
const naoObjetivosTxt = ref('')
// W1 CRIACAOIA2-TELA: sem campo owner — responsável sempre = usuário logado.
const classificacao = ref<Classificacao>('internal')
const erros = ref<{ campo: string; codigo: string; mensagem: string }[]>([])
const avisoG0002 = ref('')
// W1 TIPOS-TELA
const tipoProjeto = ref<'novo' | 'existente'>('novo')

function contagem(pid: string): { nos: number; arestas: number } {
  try {
    const raw = localStorage.getItem(`nexo.v1.graph.${pid}`)
    if (!raw) return { nos: 0, arestas: 0 }
    const g = JSON.parse(raw) as { nos: unknown[]; arestas: unknown[] }
    return { nos: g.nos.length, arestas: g.arestas.length }
  } catch {
    return { nos: 0, arestas: 0 }
  }
}

function resumoGates(pid: string): string {
  try {
    const raw = localStorage.getItem(`nexo.v1.gates.${pid}`)
    if (!raw) return 'gates —'
    const gs = JSON.parse(raw) as { id: string; status: string }[]
    const ap = gs.filter((g) => g.status === 'aprovado').map((g) => g.id)
    const rev = gs.find((g) => g.status === 'revisao')
    return `${ap.length > 0 ? ap.join(',') + ' aprovado' : 'nada aprovado'}${rev ? ` · ${rev.id} em revisão` : ''}`
  } catch {
    return 'gates —'
  }
}

function abrirProjeto(id: string) {
  projects.selecionar(id, users.state.currentUserId)
  graph.trocarProjeto(id)
  gates.trocarProjeto(id)
  router.push('/backlog')
}

function abrirCanvasProjeto(id: string) {
  projects.selecionar(id, users.state.currentUserId)
  graph.trocarProjeto(id)
  gates.trocarProjeto(id)
  const sel = graph.state.nos.find((n) => n.tipo === 'epico')?.id ?? graph.state.selecionadoId
  router.push(`/canvas?view=canvas${sel ? `&selecionado=${sel}` : ''}`)
}

function abrirDialog() {
  tipoProjeto.value = 'novo'
  dialogAberto.value = true
  erros.value = []
  avisoG0002.value = ''
  iniciarWizardNovo()
}

// LIGA-TIPOS: recebe payload { projetoId, epicoId } do IngestaoDialog, conclui
// via MOTOR (concluirIngestaoExistente), troca namespaces e navega à rotaGate.
function aoIngestaoConcluido(payload: { projetoId: string; epicoId: string }) {
  const r = projects.concluirIngestaoExistente(payload, users.state.currentUserId)
  if (!r.ok || !r.projetoId || !r.rotaGate) {
    erros.value = r.erros
    return
  }
  graph.trocarProjeto(r.projetoId)
  gates.trocarProjeto(r.projetoId)
  dialogAberto.value = false
  tipoProjeto.value = 'novo'
  router.push(r.rotaGate)
}

function aoIngestaoCancelar() {
  dialogAberto.value = false
  tipoProjeto.value = 'novo'
}

function criar() {
  if (!wizardConcluidoNovo.value) return
  // Item5 FIXGERAL-TELA: usa criarProjetoComIA do MOTOR (não criarProjeto
  // direto) — título/campos confirmados no wizard; G0-001 sem título vazio.
  const tituloFinal = titulo.value.trim()
  if (!tituloFinal) {
    erros.value = [{ campo: 'titulo', codigo: 'G0-001', mensagem: 'Revise o título: escolha a sugestão ou escreva um título antes de criar.' }]
    return
  }
  const camposObrigatorios = [
    { campo: 'contexto', valor: contexto.value, minimo: 30, nome: 'Contexto' },
    { campo: 'objetivo', valor: objetivo.value, minimo: 1, nome: 'Objetivo' },
    { campo: 'publico', valor: publico.value, minimo: 1, nome: 'Público afetado' },
    { campo: 'metrica', valor: metrica.value, minimo: 1, nome: 'Métrica inicial' }
  ]
  const respostaInsuficiente = camposObrigatorios.find((item) => item.valor.trim().length < item.minimo)
  if (respostaInsuficiente) {
    erros.value = [{ campo: respostaInsuficiente.campo, codigo: 'G0-001', mensagem: `${respostaInsuficiente.nome} é obrigatório; revise este campo antes de criar.` }]
    return
  }
  const r = projects.criarProjetoComIA(
    {
      problema: contexto.value,
      objetivo: objetivo.value,
      usuarios: publico.value,
      escopo: restricoesTxt.value,
      metrica: metrica.value,
      naoObjetivos: naoObjetivosTxt.value,
      titulo: tituloFinal,
      classificacao: classificacao.value
    },
    users.state.currentUserId
  )
  erros.value = r.erros.filter((e) => e.codigo !== 'G0-002')
  avisoG0002.value = r.erros.find((e) => e.codigo === 'G0-002')?.mensagem ?? ''
  if (!r.ok || !r.projeto) return
  graph.trocarProjeto(r.projeto.id)
  gates.trocarProjeto(r.projeto.id)
  dialogAberto.value = false
  titulo.value = contexto.value = publico.value = objetivo.value = metrica.value = ''
  restricoesTxt.value = naoObjetivosTxt.value = ''
  router.push('/backlog')
}

// Item5 FIXGERAL-TELA: 5 passos SEM passo usuário (problema, objetivo,
// usuários, escopo, métrica) — consome PASSOS_WIZARD_CRIACAO do MOTOR, sem
// duplicar; métrica usa criarProjetoComIA; preenche TODOS (métrica +
// naoObjetivos); responsável sempre = usuário logado. O título sugerido é
// uma prévia local determinística derivada das respostas.
const passoWizard = ref(0)
const respostaPasso = ref('')
const erroPasso = ref('')
const wizardConcluidoNovo = ref(false)
// Título do passo vem do MOTOR (pergunta); ajuda local só complementa.
// Métrica tem ajuda própria; demais usam a ajuda do MOTOR.
const passoAtualWizard = computed(() => PASSOS_WIZARD_CRIACAO[passoWizard.value])
const ajudaPassoAtual = computed(() => {
  if (passoAtualWizard.value.id === 'problema') return 'Descreva o contexto e a dor observável com ao menos 30 caracteres.'
  if (passoAtualWizard.value.id === 'metrica') return 'Nome da métrica de sucesso (ex.: Adoção inicial).'
  return passoAtualWizard.value.ajuda
})

function iniciarWizardNovo() {
  titulo.value = ''
  contexto.value = ''
  publico.value = ''
  objetivo.value = ''
  metrica.value = ''
  restricoesTxt.value = ''
  naoObjetivosTxt.value = ''
  classificacao.value = 'internal'
  passoWizard.value = 0
  respostaPasso.value = ''
  erroPasso.value = ''
  wizardConcluidoNovo.value = false
  sugestaoTitulo.value = ''
  sugestaoAplicada.value = false
}

function validarPassoAtual(): boolean {
  const passoId = passoAtualWizard.value.id
  if (passoId === 'escopo' || passoId === 'metrica') return true
  const minimo = passoId === 'problema' ? 30 : 10
  if (respostaPasso.value.trim().length < minimo) {
    erroPasso.value = passoId === 'problema'
      ? 'Descreva o contexto com ao menos 30 caracteres.'
      : 'Resposta curta demais: use ao menos 10 caracteres.'
    return false
  }
  return true
}

function avancarWizard() {
  if (!validarPassoAtual()) return
  const passoId = passoAtualWizard.value.id
  const v = respostaPasso.value.trim()
  // Item5: preenche TODOS — métrica + naoObjetivos (G0-001 exige título;
  // métrica alimenta criarProjetoComIA; naoObjetivos evita G0 vazio).
  if (passoId === 'problema') contexto.value = v
  if (passoId === 'objetivo') objetivo.value = v
  if (passoId === 'usuarios') publico.value = v
  if (passoId === 'escopo') restricoesTxt.value = v
  if (passoId === 'metrica') {
    metrica.value = v || 'Adoção inicial'
    naoObjetivosTxt.value = naoObjetivosTxt.value || ''
  }
  erroPasso.value = ''
  if (passoWizard.value < PASSOS_WIZARD_CRIACAO.length - 1) {
    passoWizard.value += 1
    respostaPasso.value = valorDoPasso(PASSOS_WIZARD_CRIACAO[passoWizard.value].id)
  } else {
    wizardConcluidoNovo.value = true
    sugerirTitulo()
  }
}

function enviarWizard() {
  if (tipoProjeto.value !== 'novo') return
  if (wizardConcluidoNovo.value) criar()
  else avancarWizard()
}

// Sugestão local e determinística derivada das respostas; não chama um modelo.
const sugestaoTitulo = ref('')
const sugestaoAplicada = ref(false)

function sugerirTitulo() {
  const base = (objetivo.value.trim() || contexto.value.trim()).replace(/\s+/g, ' ').trim()
  sugestaoTitulo.value = base ? base.slice(0, 60) : ''
  sugestaoAplicada.value = false
}

function aplicarSugestaoTitulo() {
  if (sugestaoTitulo.value.trim()) {
    titulo.value = sugestaoTitulo.value.trim().slice(0, 60)
  }
  sugestaoAplicada.value = true
}

function voltarWizard() {
  erroPasso.value = ''
  if (passoWizard.value > 0) {
    passoWizard.value -= 1
    respostaPasso.value = valorDoPasso(PASSOS_WIZARD_CRIACAO[passoWizard.value].id)
  }
}

function valorDoPasso(passoId: string): string {
  if (passoId === 'problema') return contexto.value
  if (passoId === 'objetivo') return objetivo.value
  if (passoId === 'usuarios') return publico.value
  if (passoId === 'escopo') return restricoesTxt.value
  if (passoId === 'metrica') return metrica.value
  return ''
}

function editarPasso(indice: number) {
  passoWizard.value = indice
  respostaPasso.value = valorDoPasso(PASSOS_WIZARD_CRIACAO[indice].id)
  erroPasso.value = ''
  wizardConcluidoNovo.value = false
}

// W1 CRIACAOIA2-TELA: responsável sempre = usuário logado (sem campo owner).
// W3 CRIACAOIA2-TELA: provider padrão de IA persistido em localStorage.
const usuarioResponsavel = computed(() => {
  const u = users.state.usuarios.find((x) => x.id === users.state.currentUserId)
  return u ? `${u.nome} — ${u.papel}` : users.state.currentUserId
})
const temProjetos = computed(() => projects.state.projetos.length > 0)
const gatesDoProjeto = computed(() => gates.gates)
const totalGates = ORDEM_GATES.length
const aprovados = computed(() => gatesDoProjeto.value.filter((g) => g.status === 'aprovado').length)
const gateAtual = computed(() => gatesDoProjeto.value.find((g) => g.status !== 'aprovado') ?? null)
const gateCompleto = computed(() => gateAtual.value === null)
const proximoGate = computed(() => gateAtual.value?.id ?? null)
const gateEmRevisao = computed(() => gateAtual.value?.status === 'revisao')
const gateLiberado = computed(() => proximoGate.value ? gateDesbloqueado(proximoGate.value, gatesDoProjeto.value) : false)
const dependenciaGate = computed(() => proximoGate.value ? gateAnterior(proximoGate.value) : null)
const proximaAcao = computed(() => {
  if (gateCompleto.value) return 'Todos os gates aprovados'
  if (gateEmRevisao.value) return `Revisar Gate ${proximoGate.value}`
  if (proximoGate.value === 'G0') return 'Completar o enquadramento G0'
  if (gateLiberado.value) return `Completar artefatos do Gate ${proximoGate.value}`
  return `Resolver dependências do Gate ${proximoGate.value}`
})
const descricaoProximaAcao = computed(() => {
  if (gateCompleto.value) return `Os ${totalGates} gates deste projeto estão aprovados.`
  if (gateEmRevisao.value) return `O Gate ${proximoGate.value} está em revisão; a aprovação ainda está pendente.`
  if (gateLiberado.value) return `O Gate ${proximoGate.value} está disponível para preencher os artefatos e solicitar revisão.`
  return `O Gate ${proximoGate.value} depende da aprovação e da baseline do ${dependenciaGate.value ?? 'gate anterior'}. Consulte o backlog para resolver as pendências.`
})
const statusProximoGate = computed(() => {
  if (gateCompleto.value) return 'Todos aprovados'
  if (gateEmRevisao.value) return 'Em revisão'
  return gateLiberado.value ? 'Disponível para iniciar' : 'Aguardando dependência'
})
const rotuloMarcadorGate = computed(() => {
  if (gateCompleto.value) return 'GATES CONCLUÍDOS'
  if (gateEmRevisao.value) return 'GATE EM REVISÃO'
  return gateLiberado.value ? 'PRÓXIMO GATE' : 'GATE PENDENTE'
})
const rotuloContinuar = computed(() => {
  if (gateCompleto.value) return 'Ver backlog'
  if (gateEmRevisao.value) return `Revisar ${proximoGate.value}`
  if (proximoGate.value === 'G0') return 'Completar G0'
  return gateLiberado.value ? `Abrir ${proximoGate.value}` : 'Ver pendências'
})
function continuarProjeto() {
  if (!projects.state.atualId) return
  if (gateCompleto.value) router.push('/backlog')
  else if (proximoGate.value === 'G0') router.push(`/gates/G0?alvo=${encodeURIComponent(projects.atual?.epicoId ?? '')}&modo=wizard`)
  else if (gateLiberado.value && proximoGate.value) router.push(`/gates/${proximoGate.value}`)
  else router.push('/backlog')
}
</script>

<template>
  <div class="home-dashboard">
    <header class="home-heading"><div class="home-heading-copy"><span class="home-kicker">ESPAÇO DE PRODUTO</span><h1>Visão do projeto</h1><p>Acompanhe o discovery e avance pelos gates com contexto.</p></div><VButton class="home-new-project" variant="primary" size="md" @click="abrirDialog()">Novo projeto</VButton></header>
    <section v-if="temProjetos" class="home-next-action">
      <div class="home-next-copy">
        <div class="home-next-top">
          <div class="home-project-badge-wrap">
            <VBadge class="home-project-badge" variant="primary" size="sm" :aria-label="`Projeto atual: ${projects.atual?.titulo ?? ''}`">{{ projects.atual?.titulo }}</VBadge>
          </div>
          <div class="home-gates-summary">{{ aprovados }} de {{ totalGates }} gates aprovados</div>
        </div>
        <h2>{{ proximaAcao }}</h2>
        <p>{{ descricaoProximaAcao }}</p>
        <VProgress :value="Math.round(aprovados / totalGates * 100)" :label="`${aprovados}/${totalGates} gates`" aria-label="Progresso dos gates aprovados" />
        <VButton variant="primary" class="home-continue" @click="continuarProjeto">{{ rotuloContinuar }} <LucideIcon name="arrow-right" :size="16" /></VButton>
      </div>
      <div class="home-gate-marker">
        <span>{{ rotuloMarcadorGate }}</span>
        <strong>{{ proximoGate ?? '✓' }}</strong>
        <small>{{ statusProximoGate }}</small>
      </div>
    </section>
    <div class="home-metrics" v-if="temProjetos"><VStatCard label="Projetos" :value="projects.state.projetos.length" caption="No espaço de trabalho" variant="outlined" /><VStatCard label="Gates aprovados" :value="`${aprovados}/${totalGates}`" caption="Dos gates do projeto" variant="outlined" /><VStatCard label="Objetos no grafo" :value="graph.state.nos.length" caption="Rastreáveis no Canvas" variant="outlined" /></div>
    <div class="flex items-center justify-between"><h2 class="home-section-title">Projetos</h2></div>

    <div v-if="!temProjetos" class="home-empty">
      <p class="font-semibold">Nenhum projeto ainda.</p>
      <p class="mt-1 text-sm text-nexo-muted">Crie o primeiro projeto respondendo ao enquadramento G0.</p>
      <VButton variant="primary" class="mt-4" @click="abrirDialog()">Criar primeiro projeto</VButton>
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <VCard
        v-for="p in projects.state.projetos"
        :key="p.id"
        class="home-project-card"
        :class="p.id === projects.state.atualId ? 'border-nexo-primary' : 'border-nexo-border'"
        variant="outlined"
      >
        <template #title><h2 class="font-bold">{{ p.titulo }}</h2></template>
        <template #description>
        <p class="mt-1 text-sm text-nexo-muted">{{ p.descricao || 'Sem descrição' }}</p>
        <p class="mt-2 text-xs text-nexo-muted">
          Épico: {{ p.epicoTitulo }} · {{ contagem(p.id).nos }} nós · {{ contagem(p.id).arestas }} arestas ·
          {{ resumoGates(p.id) }} · owner {{ p.owner }}
        </p>
        </template>
        <template #default>
        <div class="home-project-actions mt-3 flex gap-2">
          <VButton class="home-project-action" variant="primary" size="sm" @click="abrirProjeto(p.id)">
            {{ p.id === projects.state.atualId ? 'Ver backlog' : 'Abrir projeto' }}
          </VButton>
          <VButton class="home-project-action" variant="outline" size="sm" @click="abrirCanvasProjeto(p.id)">Abrir Canvas</VButton>
        </div>
        </template>
      </VCard>
    </div>

    <VDialog v-model="dialogAberto" title="Novo projeto — Enquadramento G0" description="Responda às perguntas do wizard para iniciar uma trilha rastreável de produto." variant="basic" size="lg" @close="dialogAberto = false">
      <div class="w-full px-1">
        <VTabs class="mt-3" :model-value="tipoProjeto" :items="[{value:'novo',label:'Novo projeto'},{value:'existente',label:'Projeto existente'}]" variant="pill" size="sm" :panels="false" aria-label="Tipo de projeto" @update:model-value="tipoProjeto = $event as 'novo' | 'existente'" />
        <form v-if="tipoProjeto === 'novo'" @submit.prevent="enviarWizard">
        <!-- Item5 FIXGERAL-TELA: wizard IA 5 passos do MOTOR — pergunta por vez, pré-preenche ao final -->
        <div class="mt-3 space-y-2 text-sm" aria-label="Assistente de criação">
          <div v-if="!wizardConcluidoNovo" class="flex items-center justify-between text-xs text-nexo-muted">
            <span class="font-semibold text-nexo-text">Passo {{ passoWizard + 1 }} de {{ PASSOS_WIZARD_CRIACAO.length }}</span>
            <span>{{ Math.round(((passoWizard + 1) / PASSOS_WIZARD_CRIACAO.length) * 100) }}%</span>
          </div>
          <VProgress v-if="!wizardConcluidoNovo" :value="Math.round(((passoWizard + 1) / PASSOS_WIZARD_CRIACAO.length) * 100)" :label="false" size="md" aria-label="Progresso do enquadramento" />
          <template v-if="!wizardConcluidoNovo">
            <h3 class="home-wizard-question">{{ passoAtualWizard.pergunta }}</h3>
            <VTextarea v-model="respostaPasso" label="Sua resposta" :aria-label="passoAtualWizard.pergunta" :helper-text="ajudaPassoAtual" :rows="3" auto-resize />
            <p v-if="erroPasso" class="text-xs text-nexo-blocked">{{ erroPasso }}</p>
            <div class="flex gap-2">
              <VButton v-if="passoWizard > 0" type="button" variant="outline" @click="voltarWizard()">Voltar</VButton>
              <VButton type="button" variant="primary" class="flex-1" @click="avancarWizard()">{{ passoWizard < PASSOS_WIZARD_CRIACAO.length - 1 ? 'Responder e avançar' : 'Concluir respostas' }}</VButton>
            </div>
          </template>
          <VCard v-else variant="outlined" class="space-y-2">
            <template #title><h3 class="font-semibold">Revise suas respostas</h3></template>
            <p class="text-xs text-nexo-muted">As respostas estão aplicadas ao enquadramento. Edite qualquer etapa antes de criar.</p>
            <div v-for="(passo, indice) in PASSOS_WIZARD_CRIACAO" :key="passo.id" class="flex items-start justify-between gap-3 border-b border-nexo-border py-2 last:border-0">
              <div class="min-w-0"><p class="text-xs font-semibold">{{ passo.pergunta }}</p><p class="whitespace-pre-wrap text-sm text-nexo-muted">{{ valorDoPasso(passo.id) || 'Sem resposta' }}</p></div>
              <VButton type="button" variant="ghost" size="sm" @click="editarPasso(indice)">Editar</VButton>
            </div>
            <p class="text-xs text-nexo-muted">Responsável · {{ usuarioResponsavel }}</p>
          </VCard>
        </div>
        <!-- Sugestão local; o campo de título permanece editável. -->
        <div v-if="wizardConcluidoNovo && sugestaoTitulo" class="mt-2 rounded-btn border border-nexo-border bg-nexo-canvas p-2 text-sm">
          <p class="text-xs font-semibold text-nexo-text">Sugestão de título a partir das respostas</p>
          <p class="mt-1 text-xs text-nexo-muted">{{ sugestaoTitulo }}</p>
          <div class="mt-2 flex gap-2">
            <VButton type="button" variant="outline" @click="aplicarSugestaoTitulo()">Usar sugestão</VButton>
          </div>
          <p v-if="sugestaoAplicada" class="mt-1 text-xs text-nexo-approved">Sugestão aplicada. Você ainda pode editar o título.</p>
        </div>
        <div v-if="wizardConcluidoNovo" class="mt-3 space-y-2 text-sm">
          <VTextInput v-model="titulo" label="Título" required />
          <VTextarea v-model="contexto" label="Contexto / dor observável (mín. 30 caracteres)" :counter="500" :rows="2" auto-resize />
          <VTextInput v-model="publico" label="Público afetado" />
          <VTextInput v-model="objetivo" label="Objetivo" />
          <VTextInput v-model="metrica" label="Métrica inicial (nome)" />
          <VTextarea v-model="restricoesTxt" label="Restrições (uma por linha)" :rows="2" auto-resize />
          <VTextarea v-model="naoObjetivosTxt" label="Não-objetivos (um por linha)" :rows="2" auto-resize />
          <VSelect v-model="classificacao" label="Classificação" :options="[{value:'internal',label:'Interna'},{value:'confidential',label:'Confidencial'},{value:'restricted',label:'Restrita'}]" />
        </div>
        <ul v-if="erros.length > 0" class="mt-2 space-y-1 text-xs">
          <li v-for="e in erros" :key="e.codigo + e.campo" class="rounded-badge bg-nexo-blocked-bg px-2 py-1 text-nexo-blocked">{{ e.codigo }} — {{ e.mensagem }}</li>
        </ul>
        <p v-if="avisoG0002" class="mt-2 rounded-badge bg-nexo-stale-bg px-2 py-1 text-xs text-nexo-stale">{{ avisoG0002 }}</p>
        <div class="mt-3 flex gap-2">
          <VButton v-if="wizardConcluidoNovo" type="submit" variant="primary" class="flex-1">Criar projeto</VButton>
          <VButton type="button" variant="outline" @click="dialogAberto = false">Cancelar</VButton>
        </div>
        </form>
        <div v-else class="mt-3">
          <IngestaoDialog @concluido="aoIngestaoConcluido" @cancelar="aoIngestaoCancelar" />
        </div>
      </div>
    </VDialog>
  </div>
</template>

<style scoped>
.home-dashboard{max-width:1320px;margin:0 auto;padding:8px 4px 36px}.home-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:10px 2px 23px}.home-heading h1{margin:7px 0 4px;color:var(--v-color-text);font-size:28px;font-weight:750;letter-spacing:-.04em}.home-heading p{margin:0;color:var(--v-color-text-muted);font-size:13px}.home-kicker{color:var(--v-color-primary-text);font-size:10px;font-weight:750;letter-spacing:.13em}.home-next-action{display:grid;grid-template-columns:1fr 190px;align-items:center;gap:22px;border:1px solid var(--v-color-primary-100);border-radius:16px;background:linear-gradient(110deg,var(--v-color-primary-50),var(--v-color-bg) 60%,var(--v-color-primary-50));padding:21px 25px}.home-next-top{display:flex;align-items:center;gap:12px}.home-next-top>span{color:var(--v-color-text-muted);font-size:11px}.home-next-copy h2{margin:14px 0 5px;color:var(--v-color-text);font-size:19px;letter-spacing:-.025em}.home-next-copy>p{max-width:690px;margin:0 0 14px;color:var(--v-color-text-muted);font-size:12px;line-height:1.55}.home-continue{margin-top:15px}.home-gate-marker{display:grid;justify-items:center;gap:5px;border-left:1px solid var(--v-color-border);padding:5px 0 5px 23px;text-align:center}.home-gate-marker span{color:var(--v-color-text-muted);font-size:9px;font-weight:750;letter-spacing:.12em}.home-gate-marker strong{color:var(--v-color-primary-text);font-size:42px;line-height:1.15;letter-spacing:-.06em}.home-gate-marker small{color:var(--v-color-text-muted);font-size:10px}.home-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0 24px}.home-section-title{margin:20px 0 11px;color:var(--v-color-text);font-size:16px;font-weight:700}.home-project-card{min-width:0}.home-empty{padding:28px 20px;text-align:center;border:1px dashed var(--v-color-border);border-radius:14px;background:var(--v-color-surface)}.nexo-main .home-heading+.home-next-action{margin-bottom:2px}@media(max-width:700px){.home-heading{align-items:flex-start;padding-bottom:17px}.home-heading h1{font-size:24px}.home-heading p{max-width:240px;font-size:12px}.home-next-action{grid-template-columns:1fr;padding:17px}.home-gate-marker{grid-template-columns:auto auto 1fr;justify-items:start;align-items:center;border-left:0;border-top:1px solid var(--v-color-border);padding:12px 0 0;text-align:left}.home-gate-marker strong{font-size:27px}.home-gate-marker small{justify-self:end}.home-metrics{grid-template-columns:1fr;gap:8px}}
</style>

<style scoped>
.home-wizard-question { margin: 4px 0 0; color: var(--v-color-text); font-size: 16px; font-weight: 650; line-height: 1.4; }
.home-heading-copy { min-width: 0; flex: 1 1 auto; }
.home-new-project { flex: 0 0 auto; }
.home-next-top { min-width: 0; flex-wrap: wrap; }
.home-project-badge-wrap { min-width: 0; max-width: 100%; }
.home-project-badge { max-width: 100%; }
.home-project-badge :deep(.v-badge__label) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.home-gates-summary { color: var(--v-color-text-muted); font-size: 11px; }
.home-next-copy h2 { overflow-wrap: anywhere; }
.home-continue { max-width: 100%; height: auto; min-height: 44px; white-space: normal; }
.home-continue :deep(.v-button__label) { flex-wrap: wrap; white-space: normal; }
.home-project-actions { flex-wrap: wrap; }
.home-project-action { min-width: 0; flex: 1 1 8rem; white-space: normal; }
.home-project-action :deep(.v-button__label) { white-space: normal; }

@media (max-width: 360px) {
  .home-heading { flex-direction: column; align-items: stretch; gap: 12px; }
  .home-new-project { align-self: flex-start; }
  .home-next-action { padding: 14px; }
  .home-next-top { align-items: flex-start; gap: 8px; }
}
</style>
