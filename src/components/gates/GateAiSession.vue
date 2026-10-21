<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { GateId, NexoObject, PatchMudanca } from '@/types/nexo'
import { VBadge, VButton, VSelect, VTabs, VTextInput } from 'vueui-nova-kit'
import { useGraph } from '@/stores/useGraph'
import { useUsers } from '@/stores/useUsers'
import { useGate } from '@/stores/useGate'
import { useGateReview } from '@/stores/useGateReview'
import { useProjects } from '@/stores/useProjects'
import { versaoDaPropostaEstaAtual } from '@/utils/gateReview'
import LucideIcon from '@/components/common/LucideIcon.vue'
import ArtefatoDoc from '@/components/gates/ArtefatoDoc.vue'
import GateArtifactEditor from '@/components/gates/GateArtifactEditor.vue'
import { montarArtefato } from '@/utils/artefatos'
import {
  diagnosticarFaltasGate,
  obterGovernancaGate,
  processarMensagemWizard,
  DICIONARIO_PERGUNTAS,
  type FaltaGate
} from '@/ai/gateSkills'
import { saude, type OllamaMessage } from '@/ai/ollamaClient'
import {
  executarSkill,
  ordenarFaltasPorPapel,
  type SkillRunnerProvider
} from '@/ai/skillRunner'

interface Props {
  gateId: GateId
  alvoId: string
  alvo: NexoObject | null
  alvoElegivel?: boolean
  bloqueado: boolean
  motivoBloqueio: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'fechar'): void
  (e: 'corrigir-no-objeto', id: string): void
}>()

const graph = useGraph()
const users = useUsers()
const gates = useGate()
const review = useGateReview()
const projects = useProjects()
const route = useRoute()

// Abas da sessão (chat-first como solicitado: chat padrão, faltas e governanca)
const tabAtiva = ref('chat')
const abasSessao = computed(() => [
  { value: 'faltas', label: `Pendências (${diagnostico.value?.faltas.length ?? 0})` },
  { value: 'chat', label: 'Revisão guiada' },
  { value: 'governanca', label: 'Governança' }
])
const naturezaOptions = [
  { value: 'fato', label: 'Declaração de fato' },
  { value: 'hipotese', label: 'Hipótese' },
  { value: 'evidencia', label: 'Referência de evidência' },
  { value: 'decisao-pendente', label: 'Decisão pendente' }
]
const inputMensagem = ref('')
const naturezaResposta = ref<'fato' | 'hipotese' | 'evidencia' | 'decisao-pendente'>('fato')
const referenciaResposta = ref('')
const erroPersistencia = ref(false)
const historicoChat = ref<{ id: string; autor: 'usuario' | 'ia'; texto: string; timestamp: string; natureza?: string; referencia?: string; provedor?: 'coach-deterministico' | 'ollama' | 'llama.cpp'; modelo?: string }[]>([])
const patchPendente = ref<{
  alvoId: string
  versaoBase: number
  justificativa: string
  mudancas: PatchMudanca[]
} | null>(null)
const editorAtivoCodigo = ref<string | null>(null)

// Estado do motor Ollama / llama.cpp (FIX-REAL-OLLAMA R1/R2)
const usarOllama = ref(true)
const ollamaStatus = ref<'online' | 'offline'>('offline')
const modeloEfetivo = ref('')
const provedorEfetivo = ref<SkillRunnerProvider>('local-fallback')

// Streaming / Output ao vivo
const gerandoOutputAoVivo = ref(false)
const outputAoVivoTexto = ref('')
const mensagemParaRetry = ref('')
let sequenciaGeracao = 0

async function checarOllama() {
  try {
    const res = await saude(2000)
    if (res.ok) {
      ollamaStatus.value = 'online'
      provedorEfetivo.value = res.provider
      modeloEfetivo.value = res.models[0] || 'modelo não anunciado pelo servidor'
    } else {
      ollamaStatus.value = 'offline'
      provedorEfetivo.value = 'local-fallback'
    }
  } catch {
    ollamaStatus.value = 'offline'
    provedorEfetivo.value = 'local-fallback'
  }
}

onMounted(() => {
  checarOllama()
})

// Diagnóstico de conformidade reativo em tempo real
const diagnostico = computed(() => {
  if (!props.alvo) return null
  return diagnosticarFaltasGate(props.alvo, props.gateId, graph.waivers, graph.state.nos)
})

// Pergunta ativa conduzida pela IA: UMA por vez do dicionário da skill do gate
const perguntaAtual = computed<FaltaGate | null>(() => {
  if (!diagnostico.value || diagnostico.value.faltas.length === 0) return null
  return diagnostico.value.faltas[0]
})


// A4: "Ver documento" abre o ARTEFATO normativo do gate (motor montarArtefato,
// mesma fonte do GateOutput) — sem tocar em gates/seed/engine/exportWiki.
const artefatoDocumento = computed(() => {
  if (!props.alvo) return null
  const gatesCtx = gates.gates.map((g) => ({
    id: g.id,
    status: g.status,
    baselineVersao: g.baselineVersao,
    aprovadoPor: g.aprovadoPor ?? undefined,
    aprovadoEm: g.aprovadoEm ?? undefined
  }))
  const ctx = { gates: gatesCtx, nos: graph.state.nos, vinculos: graph.vinculosTela, regras: graph.regrasValidacao }
  return montarArtefato(props.alvo, props.gateId, ctx)
})

const gateDoDocumento = computed(() => gates.gates.find((g) => g.id === props.gateId) ?? null)

// Helper para formatar valores no painel Preenchido (somente-leitura)
function obterValorPreenchido(campo: string, objeto: NexoObject | null): string {
  if (!objeto) return ''
  const val = (objeto as unknown as Record<string, unknown>)[campo]
  if (val === undefined || val === null || val === '') return ''
  if (Array.isArray(val)) {
    if (val.length === 0) return ''
    if (typeof val[0] === 'string') return val.join(', ')
    return JSON.stringify(val, null, 2)
  }
  if (typeof val === 'object') {
    return JSON.stringify(val, null, 2)
  }
  return String(val)
}

function registrarRevisao(
  autor: 'usuario' | 'coach',
  tipo: 'resposta' | 'pergunta' | 'decisao' | 'nota',
  texto: string,
  codigo?: string,
  meta: { natureza?: 'fato' | 'hipotese' | 'evidencia' | 'decisao-pendente'; referencia?: string; provedor?: 'coach-deterministico' | 'ollama' | 'llama.cpp'; modelo?: string } = {}
) {
  if (!props.alvoId) return false
  const ok = review.registrar(props.gateId, props.alvoId, { autor, tipo, texto, codigo, ...meta })
  erroPersistencia.value = !ok
  return ok
}

// Lista de itens preenchidos para o painel Somente-Leitura
const itensPreenchidos = computed(() => {
  if (!props.alvo || !diagnostico.value) return []
  const preenchidos: { codigo: string; campoAlvo: string; valor: string }[] = []
  diagnostico.value.checks
    .filter((c) => c.ok)
    .forEach((c) => {
      const dic = DICIONARIO_PERGUNTAS[c.codigo]
      const campo = dic?.campoAlvo ?? 'descricao'
      const valor = obterValorPreenchido(campo, props.alvo)
      if (valor) {
        preenchidos.push({
          codigo: c.codigo,
          campoAlvo: campo,
          valor
        })
      }
    })
  return preenchidos
})

// W1: auxiliares reativos do progresso G0 (derivam de computeds existentes, sem watcher)
const totalItens = computed(() => itensPreenchidos.value.length + (diagnostico.value?.faltas.length ?? 0))
const percentualPreenchido = computed(() =>
  totalItens.value === 0 ? 0 : Math.round((itensPreenchidos.value.length / totalItens.value) * 100)
)

// W4: modo wizard (?modo=wizard, G0) — pergunta 1 falta por vez via processarMensagemWizard
// (modoWizard hoje só controla o branch de envio; textos já são puros — regra ZERO-EMOJI permanente)
const modoWizard = computed(() => route.query.modo === 'wizard' && props.gateId === 'G0')

// Governança, papéis e travas
const governanca = computed(() => {
  return obterGovernancaGate(props.gateId, users.currentUser, props.alvo, gates.gates)
})

// Inicializa ou atualiza o chat conduzido pela IA ao trocar de objeto ou gate
watch(
  [() => props.alvoId, () => props.gateId, () => projects.state.atualId, () => props.alvoElegivel],
  ([novoId]) => {
    sequenciaGeracao += 1
    gerandoOutputAoVivo.value = false
    patchPendente.value = null
    if (!novoId || !props.alvo) {
      const textoBoasVindas =
        props.gateId === 'G5'
          ? 'Nenhum PBI elegível está associado à entrega G5. Prepare o mesmo PBI aprovado em G4; status e evidências não serão promovidos automaticamente.'
          : `Bem-vindo à Sessão de IA do Gate ${props.gateId}. Selecione um objeto para iniciarmos a interação.`

      historicoChat.value = [
        {
          id: 'init-empty',
          autor: 'ia',
          texto: textoBoasVindas,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
      return
    }

    const diag = diagnosticarFaltasGate(props.alvo, props.gateId, graph.waivers, graph.state.nos)

    let msgInicial = ''
    if (diag.aprovado) {
      // ZERO-EMOJI (regra permanente): texto puro, sem codepoint emoji; ícone Lucide vive no chrome da mensagem
      msgInicial = props.alvoElegivel === false
        ? `Os critérios bloqueantes do Gate ${props.gateId} passam no validador local para "${props.alvo.titulo}", mas o objeto não está vinculado a uma baseline elegível. Revise o gate anterior antes de solicitar aprovação.`
        : `Os critérios bloqueantes do Gate ${props.gateId} passam no validador local para "${props.alvo.titulo}". Confira as declarações e fontes; este resultado não aprova a baseline.`
    } else {
      // R3 Grill-me: ao abrir, a IA faz a 1ª pergunta da próxima falta (sem saudação prolixa nem menu mockado)
      const faltas = ordenarFaltasPorPapel(diag.faltas, props.gateId, users.currentUser?.papel)
      const primeira = faltas[0]
      msgInicial = `[${primeira.codigo}] ${primeira.pergunta}\n\nUse o formulário tipado para propor uma resposta revisável. Exemplos do roteiro não são dados do projeto.`
    }

    const salvo = review.entradas(props.gateId, novoId).map((e) => ({
      id: e.id,
      autor: e.autor === 'usuario' ? 'usuario' as const : 'ia' as const,
      texto: e.texto,
      timestamp: new Date(e.criadoEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      natureza: e.natureza,
      referencia: e.referencia,
      provedor: e.provedor,
      modelo: e.modelo
    }))
    historicoChat.value = salvo.length ? salvo : [
      {
        id: `init-${novoId}-${props.gateId}`,
        autor: 'ia',
        texto: msgInicial,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
    if (!salvo.length && !diag.aprovado) registrarRevisao('coach', 'pergunta', msgInicial, diag.faltas[0]?.codigo)
  },
  { immediate: true }
)

// Envio de mensagem e condução grill-me (R3)
async function enviarMensagem(textoCustom?: string) {
  const txt = (textoCustom ?? inputMensagem.value).trim()
  if (!txt || !props.alvo) return
  const execucao = ++sequenciaGeracao
  const projetoExecucao = projects.state.atualId
  const alvoExecucao = props.alvo.id
  const versaoExecucao = props.alvo.versao
  const objetoExecucao = JSON.parse(JSON.stringify(props.alvo)) as NexoObject

  const agora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  historicoChat.value.push({
    id: `u-${Date.now()}`,
    autor: 'usuario',
    texto: txt,
    timestamp: agora,
    natureza: naturezaResposta.value,
    referencia: referenciaResposta.value.trim()
  })
  registrarRevisao('usuario', 'resposta', txt, perguntaAtual.value?.codigo, {
    natureza: naturezaResposta.value,
    referencia: referenciaResposta.value.trim() || undefined
  })
  referenciaResposta.value = ''

  if (!textoCustom) {
    inputMensagem.value = ''
  }

  // W4 wizard: 1 falta por vez via processarMensagemWizard; pula fluxo normal executarSkill/patch
  if (modoWizard.value) {
    try {
      const res = processarMensagemWizard(txt, {
        objeto: objetoExecucao,
        gateId: props.gateId,
        user: users.currentUser ?? null,
        gates: gates.gates.map((g) => ({ id: g.id, status: g.status, baselineVersao: g.baselineVersao })),
        waivers: graph.waivers.map((w) => ({ codigo: w.codigo, prazo: w.prazo }))
      })
      historicoChat.value.push({
        id: `ia-${Date.now()}`,
        autor: 'ia',
        texto: res.texto,
        timestamp: agora
      })
      registrarRevisao('coach', 'nota', res.texto, perguntaAtual.value?.codigo)
    } catch (err) {
      historicoChat.value.push({
        id: `err-${Date.now()}`,
        autor: 'ia',
        texto: `Erro ao processar mensagem: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: agora
      })
      registrarRevisao('coach', 'nota', `Falha no modo wizard: ${err instanceof Error ? err.message : String(err)}`)
    }
    return
  }

  gerandoOutputAoVivo.value = true
  mensagemParaRetry.value = ''
  outputAoVivoTexto.value = 'Processando sua resposta...'

  try {
    const falta = perguntaAtual.value

    // R3 — "Qual o seu modelo?" responde provider+model EFETIVOS do skillRunner/saude, nunca ignora nem exibe menu
    const ehPerguntaModelo =
      /qual.*(seu\s+)?(modelo|model|provedor|provider|engine|ia|llm)/i.test(txt) ||
      /(qual|que)\s+modelo/i.test(txt) ||
      /quem\s+.*(voce|você)/i.test(txt)

    if (ehPerguntaModelo) {
      try {
        const s = await saude(1500)
        if (s.ok) {
          ollamaStatus.value = 'online'
          provedorEfetivo.value = s.provider
          modeloEfetivo.value = s.models[0] || 'modelo não anunciado pelo servidor'
        }
      } catch {
        // segue com status local se offline
      }

      const prov = ollamaStatus.value === 'online' ? provedorEfetivo.value : 'local-fallback (servidor inalcançável)'
      const mod = ollamaStatus.value === 'online' ? modeloEfetivo.value : 'local'
      // ZERO-EMOJI (regra permanente): texto puro + Lucide no chrome; Online/Offline sem codepoint emoji
      const msgRespBase = `Provedor: ${prov}\nModelo efetivo: ${mod}\nStatus: ${ollamaStatus.value === 'online' ? 'Online' : 'Offline (resposta local)'}`
      let msgResp = msgRespBase

      if (falta) {
        msgResp += `\n\nContinuando o Gate ${props.gateId}:\n[${falta.codigo}] ${falta.pergunta}\n\nUse o formulário tipado para registrar conteúdo real.`
      }

      historicoChat.value.push({
        id: `ia-${Date.now()}`,
        autor: 'ia',
        texto: msgResp,
        timestamp: agora
      })
      registrarRevisao('coach', 'nota', msgResp)
      return
    }

    if (falta) {
      const codigo = falta.codigo
      outputAoVivoTexto.value = `Processando [${codigo}] com ${usarOllama.value ? 'motor de IA' : 'regras locais'}...`

      const historico: OllamaMessage[] = [
        ...historicoChat.value.map((h) => ({
          role: (h.autor === 'usuario' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: h.texto
        }))
      ]

      let valorExtraido = ''
      let outputParcialLlm = ''

      if (usarOllama.value) {
        // R5/G2: contexto de portfólio p/ previsão de escopo — foco continua 1 feature.
        const epico = graph.state.nos.find((n) => n.tipo === 'epico') ?? null
        const features = graph.state.nos.filter((n) => n.tipo === 'feature')
        const res = await executarSkill(props.gateId, objetoExecucao, historico, users.currentUser?.papel, { epico, features, nos: graph.state.nos })
        if (execucao !== sequenciaGeracao || projects.state.atualId !== projetoExecucao || props.alvoId !== alvoExecucao) return
        const alvoAtual = graph.noPorId(alvoExecucao)
        if (!alvoAtual || !versaoDaPropostaEstaAtual(versaoExecucao, alvoAtual.versao)) {
          historicoChat.value.push({ id: `stale-${Date.now()}`, autor: 'ia', texto: 'O objeto mudou enquanto a resposta era analisada. Nenhuma proposta foi aplicada; revise as alterações atuais e envie a resposta novamente.', timestamp: agora })
          registrarRevisao('coach', 'nota', 'Resposta descartada porque o objeto mudou durante a análise.', codigo, { provedor: 'coach-deterministico' })
          return
        }
        provedorEfetivo.value = res.provider
        modeloEfetivo.value = res.model
        ollamaStatus.value = res.provider === 'local-fallback' ? 'offline' : 'online'

        outputParcialLlm = res.outputParcial
      }

      // Texto livre permanece como nota de revisão. Só um formulário estruturado
      // explícito poderá originar um patch; saída do coach/modelo nunca é fato.
      valorExtraido = txt
      patchPendente.value = null

      const tipoCoach = provedorEfetivo.value === 'local-fallback' || !usarOllama.value ? 'coach determinístico' : `IA real (${provedorEfetivo.value})`
      let textoConfirmacao = `Nota de revisão para [${codigo}] (${falta.campoAlvo}), registrada com ${tipoCoach}; não é evidência verificada:\n> "${valorExtraido}"\n\n`
      if (outputParcialLlm && provedorEfetivo.value !== 'local-fallback') {
        textoConfirmacao += `${outputParcialLlm}\n\n`
      }
      textoConfirmacao += `Sua resposta foi preservada como nota não verificada. Use o editor estruturado para propor uma alteração; isso não aprova o gate nem cria baseline.`

      historicoChat.value.push({
        id: `ia-${Date.now()}`,
        autor: 'ia',
        texto: textoConfirmacao,
        timestamp: agora,
        provedor: provedorEfetivo.value === 'local-fallback' || !usarOllama.value ? 'coach-deterministico' : provedorEfetivo.value,
        modelo: provedorEfetivo.value === 'local-fallback' || !usarOllama.value ? undefined : modeloEfetivo.value
      })
      registrarRevisao('coach', 'nota', textoConfirmacao, codigo, {
        provedor: provedorEfetivo.value === 'local-fallback' ? 'coach-deterministico' : provedorEfetivo.value,
        modelo: provedorEfetivo.value === 'local-fallback' ? undefined : modeloEfetivo.value
      })
    } else {
      // Sem faltas pendentes — todos os checks já cumpridos (REMOVIDO menu mockado 'experimente pedir')
      // ZERO-EMOJI (regra permanente): texto puro, sem codepoint emoji
      historicoChat.value.push({
        id: `ia-${Date.now()}`,
        autor: 'ia',
        texto: props.alvoElegivel === false
          ? `O validador local não encontrou lacunas bloqueantes, mas o alvo não está associado à baseline elegível. Revise o gate anterior antes de pedir aprovação.`
          : `Os critérios bloqueantes passam no validador local. Confira as declarações e fontes; esta resposta não aprova o gate nem registra baseline.`,
        timestamp: agora
      })
    }
  } catch (err) {
    mensagemParaRetry.value = txt
    historicoChat.value.push({
      id: `err-${Date.now()}`,
      autor: 'ia',
      texto: `Erro ao processar mensagem: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: agora
    })
    registrarRevisao('coach', 'nota', `Falha ao consultar IA: ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    if (execucao === sequenciaGeracao) {
      gerandoOutputAoVivo.value = false
      outputAoVivoTexto.value = ''
    }
  }
}

// Aceitar Proposta de Patch formal gerada pela IA e avançar para a próxima pergunta
function aceitarPatch() {
  if (!patchPendente.value || !props.alvo) return
  const alvoAtual = graph.noPorId(patchPendente.value.alvoId)
  if (!alvoAtual || !versaoDaPropostaEstaAtual(patchPendente.value.versaoBase, alvoAtual.versao)) {
    registrarRevisao('usuario', 'decisao', 'Patch descartado porque o objeto mudou desde a geração do diff.')
    patchPendente.value = null
    historicoChat.value.push({ id: `stale-patch-${Date.now()}`, autor: 'ia', texto: 'Esta proposta ficou desatualizada porque o objeto mudou. Revise o diff atual e gere outra proposta.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
    return
  }
  const autorId = users.currentUser?.id ?? 'u-anonimo'
  const prop = graph.proporPatch(
    patchPendente.value.alvoId,
    patchPendente.value.mudancas,
    patchPendente.value.justificativa,
    autorId,
    patchPendente.value.versaoBase
  )

  if (prop) {
    const patchAceito = graph.aceitarPatch(prop.patch_id, autorId)
    if (!patchAceito) {
      historicoChat.value.push({ id: `stale-patch-${Date.now()}`, autor: 'ia', texto: 'O diff expirou antes de ser aplicado. Nenhuma alteração foi feita; gere uma nova proposta sobre a versão atual.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
      patchPendente.value = null
      return
    }
    registrarRevisao('usuario', 'decisao', `Patch aceito por ${autorId}: ${patchPendente.value.justificativa}`)
    patchPendente.value = null

    // Recalcula o diagnóstico e avança a IA para a próxima pergunta
    const novoDiag = diagnosticarFaltasGate(props.alvo, props.gateId, graph.waivers, graph.state.nos)
    if (novoDiag.faltas.length > 0) {
      const faltas = ordenarFaltasPorPapel(novoDiag.faltas, props.gateId, users.currentUser?.papel)
      const prox = faltas[0]
      // ZERO-EMOJI (regra permanente): texto puro, sem codepoint emoji
      historicoChat.value.push({
        id: `sys-${Date.now()}`,
        autor: 'ia',
        texto: `Patch aceito. O objeto foi atualizado para v${props.alvo.versao}.\n\nPróxima pergunta da revisão guiada:\n[${prox.codigo}] ${prox.pergunta}\n\nPreencha somente informações reais no formulário tipado.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    } else {
      historicoChat.value.push({
        id: `sys-${Date.now()}`,
        autor: 'ia',
        texto: `Todos os critérios bloqueantes do Gate ${props.gateId} passam no validador local. Isso não confirma a verdade das fontes nem aprova o gate; confira os registros e a elegibilidade antes de enviar uma solicitação formal.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })
    }
  }
}

function proporPatchEstruturado(payload: { mudancas: PatchMudanca[]; natureza: 'fato' | 'hipotese' | 'evidencia' | 'decisao-pendente'; referencia?: string }, falta: FaltaGate) {
  const alvo = props.alvo && graph.noPorId(props.alvo.id)
  if (!alvo || alvo.project_id !== projects.state.atualId || alvo.versao !== props.alvo?.versao || payload.mudancas.length === 0) {
    registrarRevisao('usuario', 'decisao', 'Proposta recusada: o alvo mudou ou a entrada ficou vazia.')
    return
  }
  patchPendente.value = {
    alvoId: alvo.id,
    versaoBase: alvo.versao,
    justificativa: `Proposta estruturada para ${falta.codigo}; conteúdo fornecido pelo usuário como ${payload.natureza}${payload.referencia ? `, referência declarada: ${payload.referencia}` : ''}. Não comprova a origem até revisão humana.`,
    mudancas: payload.mudancas
  }
  registrarRevisao('usuario', 'decisao', `Diff estruturado proposto para ${falta.codigo} (${payload.natureza}); aguarda aceite.`, falta.codigo, { natureza: payload.natureza, referencia: payload.referencia })
  editorAtivoCodigo.value = null
  tabAtiva.value = 'chat'
}

function abrirEditor(codigo: string) {
  editorAtivoCodigo.value = codigo
  tabAtiva.value = 'faltas'
}

// Rejeitar Proposta de Patch
function rejeitarPatch() {
  registrarRevisao('usuario', 'decisao', `Patch rejeitado por ${users.currentUser?.id ?? 'u-anonimo'}.`)
  patchPendente.value = null
  historicoChat.value.push({
    id: `sys-${Date.now()}`,
    autor: 'ia',
    texto: `[Patch Rejeitado] Nenhuma alteração foi realizada. Você pode formular uma nova resposta no chat.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
}
</script>

<template>
  <aside
    class="flex h-full flex-col rounded-card border border-nexo-border bg-nexo-surface shadow-sm"
    role="region"
    aria-label="Sessão de IA do Gate"
  >
    <!-- Header do Painel: Skill Ativa (nome + papéis) + Badge Ollama (queen) + Toggle Local/Ollama -->
    <header class="flex shrink-0 flex-col gap-2 border-b border-nexo-border px-4 py-3 bg-nexo-canvas/40">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-btn bg-nexo-primary/10 text-nexo-primary">
            <LucideIcon name="sparkles" :size="16" />
          </span>
          <div>
            <h2 class="text-sm font-bold text-nexo-text">Sessão IA · Gate {{ props.gateId }}</h2>
            <p class="text-[11px] text-nexo-muted font-medium">
              {{ users.currentUser?.nome || 'Usuário' }} ({{ users.currentUser?.papel || 'Colaborador' }})
            </p>
          </div>
        </div>

        <VButton
          type="button"
          class="rounded-btn p-1.5 text-nexo-muted hover:bg-nexo-canvas hover:text-nexo-text focus:outline-none"
          aria-label="Fechar painel de IA"
          @click="emit('fechar')"
        >
          <LucideIcon name="x" :size="16" />
        </VButton>
      </div>

      <!-- Indica o serviço real e mantém o modo determinístico claramente disponível. -->
      <div class="flex items-center justify-between rounded border border-nexo-border/80 bg-white px-2.5 py-1.5 text-[11px]">
        <div class="flex items-center gap-2">
          <VBadge :variant="ollamaStatus === 'online' ? 'success' : 'warning'" size="xs">
            {{ ollamaStatus === 'online' ? `IA disponível · ${modeloEfetivo}` : 'IA indisponível · coach determinístico' }}
          </VBadge>
        </div>
        <VButton variant="outline" size="sm" :loading="gerandoOutputAoVivo" @click="checarOllama">
          {{ ollamaStatus === 'online' ? 'Testar conexão' : 'Verificar IA' }}
        </VButton>
      </div>
    </header>

    <VTabs v-model="tabAtiva" :items="abasSessao" variant="underline" size="sm" :panels="false" aria-label="Etapas da revisão guiada" class="shrink-0" />

    <!-- Conteúdo das Abas -->
    <div class="flex-1 overflow-y-auto p-4 text-xs">
      <!-- 1. TAB: CHAT INTERATIVO (CONDUÇÃO DA IA UMA PERGUNTA POR VEZ) -->
      <div v-if="tabAtiva === 'chat'" class="flex h-full flex-col space-y-3">
        <!-- W4: badge modo wizard (texto-xs, neutro) -->
        <span
          v-if="modoWizard"
          class="inline-flex w-fit items-center rounded border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-xs text-nexo-muted"
        >
          Modo wizard
        </span>
        <!-- W1 G0: progresso reativo em tempo real (topo da aba chat, acima do histórico) -->
        <div class="rounded-card border border-nexo-border bg-white p-2.5 shrink-0 space-y-1.5">
          <div class="flex items-center justify-between text-xs text-nexo-text">
            <span class="font-semibold">Preenchido {{ itensPreenchidos.length }} de {{ totalItens }}</span>
            <span class="font-mono text-[11px] text-nexo-muted">{{ percentualPreenchido }}%</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-nexo-canvas" role="progressbar" :aria-valuenow="percentualPreenchido" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full rounded-full bg-nexo-primary transition-all" :style="{ width: `${percentualPreenchido}%` }" />
          </div>
        </div>

        <!-- Próximo critério: abrir o formulário, sem inserir texto de exemplo como resposta -->
        <div v-if="perguntaAtual" class="rounded-card border border-nexo-border bg-white p-2.5 shrink-0 space-y-1.5">
          <p class="text-xs text-nexo-text">
            <span class="font-semibold">Próxima pergunta:</span>
            {{ perguntaAtual.descricao }} — {{ perguntaAtual.pergunta }}
          </p>
          <VButton variant="outline" size="sm" @click="abrirEditor(perguntaAtual.codigo)">Preencher este critério</VButton>
        </div>
        <div v-else class="rounded-card border border-nexo-border bg-white p-2.5 shrink-0">
          <p class="text-xs text-nexo-text font-medium">Todos os critérios preenchidos. Objeto apto para aprovação.</p>
        </div>

        <!-- Card Foco da Pergunta Atual (se houver critério pendente) -->
        <div
          v-if="perguntaAtual"
          class="rounded-card border border-nexo-primary/30 bg-nexo-primary/5 p-2.5 space-y-1 shrink-0"
        >
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-bold text-nexo-primary flex items-center gap-1">
              <LucideIcon name="help-circle" :size="14" />
              Pergunta Atual da IA do Gate (1 por vez)
            </span>
            <span class="rounded bg-nexo-primary/10 text-nexo-primary px-1.5 py-0.2 font-mono text-xs font-bold">
              {{ perguntaAtual.codigo }}
            </span>
          </div>
          <p class="text-xs font-semibold text-nexo-text leading-snug">
            {{ perguntaAtual.pergunta }}
          </p>
          <p class="text-xs text-nexo-muted italic truncate" :title="perguntaAtual.exemplo">
            Exemplo: {{ perguntaAtual.exemplo }}
          </p>
        </div>

        <!-- Histórico do Chat -->
        <div class="flex-1 space-y-3 overflow-y-auto pr-1">
          <div
            v-for="msg in historicoChat"
            :key="msg.id"
            class="flex flex-col"
            :class="msg.autor === 'usuario' ? 'items-end' : 'items-start'"
          >
            <div
              class="max-w-[85%] rounded-card p-3 text-xs leading-relaxed whitespace-pre-wrap shadow-xs"
              :class="msg.autor === 'usuario'
                ? 'bg-nexo-primary text-white rounded-br-none'
                : 'bg-white border border-nexo-border/80 text-nexo-text rounded-bl-none'"
            >
              <div v-if="msg.autor === 'ia'" class="flex items-center gap-1.5 mb-1 text-xs font-bold text-nexo-primary">
                <LucideIcon name="sparkles" :size="14" />
                <span>{{ msg.provedor === 'ollama' || msg.provedor === 'llama.cpp' ? `IA real · ${msg.provedor}${msg.modelo ? ` · ${msg.modelo}` : ''}` : msg.provedor === 'coach-deterministico' ? 'Coach determinístico' : 'Registro histórico' }}</span>
                <span class="text-nexo-muted font-normal ml-auto">{{ msg.timestamp }}</span>
              </div>
              <VBadge v-if="msg.autor === 'ia' && msg.texto.includes('FTR-004') && /owner|responsável/i.test(msg.texto)" variant="warning" size="xs" class="mb-1">Histórico legado: confira o critério e a policy atuais</VBadge>
              <div v-else class="text-xs text-white/80 font-medium mb-0.5 text-right">
                Você · {{ msg.timestamp }}
              </div>
              <div>{{ msg.texto }}</div>
            </div>
          </div>

          <!-- Indicador de streaming/geração ao vivo -->
          <div v-if="gerandoOutputAoVivo" class="flex items-center gap-2 text-nexo-primary text-xs font-medium animate-pulse">
            <LucideIcon name="activity" :size="14" />
            <span>{{ outputAoVivoTexto }}</span>
          </div>
          <div v-if="mensagemParaRetry" class="flex items-center justify-between rounded border border-nexo-blocked-border bg-nexo-blocked-bg px-2.5 py-2 text-xs text-nexo-blocked">
            <span>A chamada falhou. Sua resposta continua registrada.</span>
            <VButton type="button" class="underline font-semibold" @click="enviarMensagem(mensagemParaRetry)">Tentar novamente</VButton>
          </div>

          <!-- Card de Proposta Formal de Patch (Diff) -->
          <div
            v-if="patchPendente"
            class="rounded-card border-2 border-nexo-primary bg-nexo-primary-soft/40 p-3 shadow-sm"
          >
            <div class="flex items-center gap-1.5 font-bold text-nexo-primary text-xs">
              <LucideIcon name="file-diff" :size="14" />
              <span>Proposta Formal de Patch (Diff)</span>
            </div>
            <p class="mt-1 text-[11px] text-nexo-muted">{{ patchPendente.justificativa }}</p>

            <div class="mt-2 space-y-1.5 rounded border border-nexo-border/80 bg-white p-2">
              <div
                v-for="(m, i) in patchPendente.mudancas"
                :key="i"
                class="border-b border-nexo-border/40 pb-1.5 last:border-none last:pb-0 font-mono text-[11px]"
              >
                <div class="font-bold text-nexo-text">Campo: {{ m.campo }}</div>
                <div class="text-nexo-blocked line-through truncate max-h-12 overflow-hidden text-xs">- {{ m.de || '(vazio)' }}</div>
                <div class="text-nexo-approved whitespace-pre-wrap max-h-24 overflow-y-auto text-xs">+ {{ m.para }}</div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-end gap-2">
              <VButton
                type="button"
                class="rounded-btn border border-nexo-border px-3 py-1.5 min-h-[32px] text-sm font-semibold hover:bg-nexo-canvas"
                @click="rejeitarPatch()"
              >
                Rejeitar
              </VButton>
              <VButton
                type="button"
                class="rounded-btn bg-nexo-primary px-3 py-1.5 min-h-[32px] text-sm font-semibold text-white hover:bg-nexo-primary/90"
                @click="aceitarPatch()"
              >
                Aceitar (nova versão)
              </VButton>
            </div>
          </div>
        </div>

        <!-- Atalhos de teclado acessíveis -->
        <div class="flex flex-wrap gap-1 pt-2 border-t border-nexo-border/60 shrink-0">
          <template v-if="perguntaAtual">
            <VButton variant="ghost" size="sm" @click="abrirEditor(perguntaAtual.codigo)">Preencher {{ perguntaAtual.codigo }}</VButton>
          </template>
          <VButton variant="ghost" size="sm" @click="enviarMensagem('O que falta para aprovar este gate?')">O que falta?</VButton>
          <VButton variant="ghost" size="sm" @click="tabAtiva = 'faltas'">Ver pendências</VButton>
        </div>

        <!-- Input de Mensagem -->
        <div class="grid grid-cols-2 gap-2">
          <VSelect v-model="naturezaResposta" :options="naturezaOptions" label="Tipo de registro" size="sm" />
          <VTextInput v-model="referenciaResposta" label="Fonte / link (se houver)" placeholder="Referência fornecida pelo usuário" size="sm" />
        </div>
        <p class="text-[11px] text-nexo-muted">Fontes e links informados aqui são declarações não verificadas até revisão humana.</p>
        <form class="flex items-center gap-2 shrink-0" @submit.prevent="enviarMensagem()">
          <VTextInput
            v-model="inputMensagem"
            type="text"
            size="md"
            placeholder="Responda em texto livre à IA..."
            class="flex-1"
          />
          <VButton
            type="submit"
            variant="primary"
            size="md"
            :disabled="!inputMensagem.trim() || gerandoOutputAoVivo"
            aria-label="Enviar mensagem"
          >
            <LucideIcon name="send" :size="18" />
          </VButton>
        </form>
      </div>

      <!-- 2. TAB: O QUE FALTA (PAINÉIS SOMENTE-LEITURA: PREENCHIDO + FALTANDO + DOCUMENTO) -->
      <div v-else-if="tabAtiva === 'faltas'" class="space-y-4">
        <div v-if="!props.alvo" class="rounded-card border border-dashed border-nexo-border p-4 text-center text-nexo-muted">
          <LucideIcon name="alert-circle" :size="24" class="mx-auto mb-1 text-nexo-muted" />
          <p class="font-medium">Nenhum objeto selecionado</p>
          <p class="mt-1 text-[11px]">Selecione um objeto no gate para visualizar os painéis de leitura.</p>
        </div>

        <template v-else>
          <!-- Painel SOMENTE-LEITURA: 'Faltando' (códigos) -->
          <div class="rounded-card border border-nexo-border bg-white p-3 space-y-2">
            <div class="flex items-center justify-between border-b border-nexo-border/50 pb-1.5">
              <span class="font-bold text-xs text-nexo-text flex items-center gap-1.5">
                <LucideIcon name="alert-circle" :size="14" class="text-nexo-blocked" />
                Faltando (Códigos Bloqueantes)
              </span>
              <span class="rounded bg-nexo-blocked-bg text-nexo-blocked px-1.5 py-0.2 text-xs font-bold">
                {{ diagnostico?.faltas.length ?? 0 }} pendência(s)
              </span>
            </div>

            <div v-if="diagnostico && diagnostico.faltas.length > 0" class="space-y-1.5">
              <div
                v-for="falta in diagnostico.faltas"
                :key="falta.codigo"
                class="rounded bg-nexo-canvas/40 p-2 border border-nexo-border/50 text-[11px] space-y-0.5"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-nexo-text font-mono text-xs">{{ falta.codigo }}</span>
                  <span class="text-xs uppercase font-semibold text-nexo-blocked bg-nexo-blocked-bg px-1 py-0.2 rounded">
                    {{ falta.severidade }}
                  </span>
                </div>
                <p class="text-nexo-text font-medium">{{ falta.descricao }}</p>
                <p class="text-xs text-nexo-muted leading-tight">{{ falta.pergunta }}</p>
                <VButton
                  variant="ghost"
                  size="sm"
                  :aria-expanded="editorAtivoCodigo === falta.codigo"
                  @click="editorAtivoCodigo = editorAtivoCodigo === falta.codigo ? null : falta.codigo"
                >{{ editorAtivoCodigo === falta.codigo ? 'Fechar formulário' : `Preencher ${falta.codigo}` }}</VButton>
                <GateArtifactEditor
                  v-if="editorAtivoCodigo === falta.codigo && props.alvo"
                  :gate-id="props.gateId"
                  :alvo="props.alvo"
                  :codigo="falta.codigo"
                  :pergunta="falta.pergunta"
                  :por-que-bloqueia="falta.porQueBloqueia"
                  @propose="proporPatchEstruturado($event, falta)"
                />
              </div>
            </div>
            <p v-else class="text-xs text-nexo-approved italic">
              Nenhum código pendente. Todos os critérios foram preenchidos!
            </p>
          </div>

          <!-- Painel SOMENTE-LEITURA: 'Preenchido' (requisito: valor) -->
          <div class="rounded-card border border-nexo-border bg-white p-3 space-y-2">
            <div class="flex items-center justify-between border-b border-nexo-border/50 pb-1.5">
              <span class="font-bold text-xs text-nexo-text flex items-center gap-1.5">
                <LucideIcon name="check-circle-2" :size="14" class="text-nexo-approved" />
                Preenchido (Requisito: Valor)
              </span>
              <span class="rounded bg-nexo-approved-bg text-nexo-approved px-1.5 py-0.2 text-xs font-bold">
                {{ itensPreenchidos.length }} atendido(s)
              </span>
            </div>

            <div v-if="itensPreenchidos.length > 0" class="space-y-1.5">
              <div
                v-for="it in itensPreenchidos"
                :key="it.codigo"
                class="rounded bg-nexo-approved-bg/30 p-2 border border-nexo-approved-border text-[11px] space-y-0.5"
              >
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold text-nexo-approved font-mono">{{ it.codigo }}</span>
                  <span class="text-nexo-muted font-mono">{{ it.campoAlvo }}</span>
                </div>
                <div class="text-nexo-text text-xs whitespace-pre-wrap font-mono max-h-20 overflow-y-auto bg-white p-1 rounded border border-nexo-approved-border">
                  {{ it.valor }}
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-nexo-muted italic">
              Nenhum requisito preenchido ainda. Use o Chat para responder às perguntas da IA.
            </p>
          </div>

          <!-- Área: 'Documento' = artefato normativo do gate (motor, somente leitura).
               Export .md fica secundário dentro do artefato (mostrarExportar=false no chat). -->
          <ArtefatoDoc :artefato="artefatoDocumento" :gate-info="gateDoDocumento" :mostrar-exportar="false" />
        </template>
      </div>

      <!-- 3. TAB: GOVERNANÇA E PAPÉIS -->
      <div v-else-if="tabAtiva === 'governanca'" class="space-y-3">
        <!-- Cadeado Sequencial -->
        <div
          class="rounded-card border p-3"
          :class="governanca.sequenciaOk ? 'border-nexo-approved-border bg-nexo-approved-bg/50' : 'border-nexo-stale-border bg-nexo-stale-bg/50'"
        >
          <div class="flex items-center gap-2 font-semibold text-xs">
            <LucideIcon :name="governanca.sequenciaOk ? 'unlock' : 'lock'" :size="14" :class="governanca.sequenciaOk ? 'text-nexo-approved' : 'text-nexo-stale'" />
            <span>Cadeado Sequencial: {{ governanca.sequenciaOk ? 'Desbloqueado' : 'Bloqueado' }}</span>
          </div>
          <p class="mt-1 text-[11px] text-nexo-text">
            {{ governanca.sequenciaOk ? `O Gate anterior foi aprovado com baseline versionada.` : governanca.motivoSequencia }}
          </p>
          <RouterLink
            v-if="!governanca.sequenciaOk && governanca.gateAnteriorId"
            :to="`/gates/${governanca.gateAnteriorId}`"
            class="mt-1 inline-block text-[11px] font-medium text-nexo-primary underline"
          >
            Ir para Gate {{ governanca.gateAnteriorId }}
          </RouterLink>
        </div>

        <!-- Papéis Aprovadores -->
        <div class="rounded-card border border-nexo-border bg-white p-3 space-y-2">
          <p class="font-semibold text-nexo-text text-xs">Papéis Aprovadores Exigidos (APROVACAO_GATE):</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="papel in governanca.aprovadoresExigidos"
              :key="papel"
              class="rounded-badge border border-nexo-border bg-nexo-canvas px-2 py-0.5 text-[11px] font-semibold text-nexo-text"
            >
              {{ papel }}
            </span>
          </div>

          <div class="mt-2 border-t border-nexo-border/60 pt-2">
            <p class="text-[11px] text-nexo-muted">Seu usuário logado:</p>
            <p class="font-medium text-nexo-text">
              {{ governanca.usuarioAtual?.nome ?? 'Anônimo' }} ({{ governanca.usuarioAtual?.papel ?? 'Sem Papel' }})
            </p>
            <p
              class="mt-1 text-[11px] font-semibold"
              :class="governanca.papelOk ? 'text-nexo-approved' : 'text-nexo-blocked'"
            >
              {{ governanca.papelOk ? 'Papel apto para aprovação' : 'Seu papel atual não possui autorização para aprovar este gate' }}
            </p>
          </div>
        </div>

        <!-- Regra de Segregação: Proponente != Aprovador -->
        <div
          class="rounded-card border p-3"
          :class="!governanca.bloqueadoPorProponente ? 'border-nexo-approved-border bg-nexo-approved-bg/50' : 'border-nexo-stale-border bg-nexo-stale-bg/50'"
        >
          <div class="flex items-center gap-2 font-semibold text-xs">
            <LucideIcon :name="!governanca.bloqueadoPorProponente ? 'check-circle-2' : 'alert-triangle'" :size="14" :class="!governanca.bloqueadoPorProponente ? 'text-nexo-approved' : 'text-nexo-stale'" />
            <span>Segregação de Funções (SoD): {{ !governanca.bloqueadoPorProponente ? 'Conforme' : 'Aviso' }}</span>
          </div>
          <p class="mt-1 text-[11px] text-nexo-text">
            {{ governanca.bloqueadoPorProponente ? `Atenção: O usuário logado é o proponente/owner do objeto (${governanca.proponenteNome}). Pela regra SoD, outro aprovador deve homologar.` : 'Regra de Segregação de Funções (SoD) atendida: o proponente não é o único aprovador.' }}
          </p>
        </div>
      </div>
    </div>
  </aside>
</template>
