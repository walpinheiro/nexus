// Gerador local template-based PT-BR para o tubo IA do Studio (sem API externa).
// Entrada: texto livre em PT-BR. Saída: lista de specs { kind, props } para montar draft na tela atual.
// Layout tidy vertical aplicado pelo chamador: y += altura + 16, x = frame.x + 16.

export interface DraftSpec {
  kind: string
  props: Record<string, unknown>
}

export interface Geracao {
  authorUserId: string
  provider: string
  model: string
  prompt: string
  result: DraftSpec[]
  at: number
}

export interface RegistrarMetadadosParams {
  authorUserId: string
  prompt: string
  result?: DraftSpec[]
  provider?: string
  model?: string
  at?: number
}

interface Regra {
  chaves: string[]
  pecas: DraftSpec[]
}

// Normaliza para busca sem acento/caixa (puro, determinístico).
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const CHAVES_PIX = ['pix', 'qr', 'qrcode', 'qr code', 'cobranca', 'chave pix', 'copia e cola']

function ehPix(normalizado: string): boolean {
  return CHAVES_PIX.some((c) => normalizado.includes(c))
}

// Caminho Pix prioritário: peças cobrindo pagar → criar → confirmar → status.
// Toda peça com label não-vazio, PT-BR, sem emoji.
function montarPix(): DraftSpec[] {
  return [
    { kind: 'card', props: { label: 'Pagamento Pix', supporting: 'Cobrança via QR.', variant: 'tonal' } },
    { kind: 'textField', props: { label: 'Chave Pix', variant: 'outlined' } },
    { kind: 'textField', props: { label: 'Valor', variant: 'outlined' } },
    { kind: 'button', props: { label: 'Criar cobrança Pix', variant: 'filled' } },
    { kind: 'button', props: { label: 'Pagar com Pix', variant: 'filled' } },
    { kind: 'button', props: { label: 'Confirmar pagamento', variant: 'tonal' } },
    { kind: 'card', props: { label: 'Status do pagamento', supporting: 'Aguardando confirmação.', variant: 'tonal' } }
  ]
}

// Rótulo do fallback: deriva do texto (título/descrição/fluxo/BDD colado no
// tubo) ou 'Pagamento Pix' quando vazio. Nunca vazio.
function rotuloFallback(texto: string): string {
  const base = texto.trim().replace(/\s+/g, ' ').slice(0, 60)
  return base || 'Pagamento Pix'
}

const REGRAS: Regra[] = [
  {
    chaves: ['login', 'entrar', 'senha', 'email', 'acesso'],
    pecas: [
      { kind: 'topAppBar', props: { label: 'Entrar', icon: 'menu', variant: 'filled' } },
      { kind: 'textField', props: { label: 'E-mail', variant: 'outlined' } },
      { kind: 'textField', props: { label: 'Senha', variant: 'outlined' } },
      { kind: 'button', props: { label: 'Entrar', variant: 'filled' } }
    ]
  },
  {
    chaves: ['cadastro', 'criar conta', 'registrar', 'cadastrar'],
    pecas: [
      { kind: 'textField', props: { label: 'Nome', variant: 'outlined' } },
      { kind: 'textField', props: { label: 'E-mail', variant: 'outlined' } },
      { kind: 'textField', props: { label: 'Senha', variant: 'outlined' } },
      { kind: 'button', props: { label: 'Criar conta', variant: 'filled' } }
    ]
  },
  {
    chaves: ['lista', 'listar', 'itens'],
    pecas: [
      { kind: 'searchBar', props: { label: 'Buscar' } },
      { kind: 'listItem', props: { label: 'Item 1', supporting: 'Detalhe', icon: 'restaurant' } },
      { kind: 'listItem', props: { label: 'Item 2', supporting: 'Detalhe', icon: 'restaurant' } },
      { kind: 'listItem', props: { label: 'Item 3', supporting: 'Detalhe', icon: 'restaurant' } }
    ]
  },
  {
    chaves: ['menu', 'navegar', 'abas naveg'],
    pecas: [
      { kind: 'bottomNav', props: { tabs: [{ icon: 'home', label: 'Início' }, { icon: 'search', label: 'Buscar' }, { icon: 'settings', label: 'Ajustes' }], selected: 0 } }
    ]
  },
  {
    chaves: ['perfil', 'conta', 'usuario', 'usuário'],
    pecas: [
      { kind: 'image', props: {} },
      { kind: 'text', props: { label: 'Nome do usuário' } },
      { kind: 'button', props: { label: 'Editar', variant: 'tonal' } },
      { kind: 'button', props: { label: 'Sair', variant: 'outlined' } }
    ]
  },
  {
    chaves: ['config', 'ajuste', 'preferencia', 'preferência'],
    pecas: [
      { kind: 'listItem', props: { label: 'Notificações', icon: 'notifications' } },
      { kind: 'listItem', props: { label: 'Privacidade', icon: 'lock' } },
      { kind: 'listItem', props: { label: 'Ajuda', icon: 'help' } }
    ]
  },
  {
    chaves: ['ajuda', 'suporte', 'duvida', 'dúvida'],
    pecas: [{ kind: 'dialog', props: { label: 'Ajuda', supporting: 'Como podemos ajudar?', icon: 'help' } }]
  },
  {
    chaves: ['erro', 'falha', 'problema'],
    pecas: [{ kind: 'snackbar', props: { label: 'Algo deu errado', supporting: 'Tentar de novo' } }]
  },
  {
    chaves: ['busca', 'pesquisa', 'procurar'],
    pecas: [
      { kind: 'searchBar', props: { label: 'Buscar' } },
      { kind: 'listItem', props: { label: 'Resultado 1', icon: 'search' } },
      { kind: 'listItem', props: { label: 'Resultado 2', icon: 'search' } },
      { kind: 'listItem', props: { label: 'Resultado 3', icon: 'search' } }
    ]
  },
  {
    chaves: ['abas', 'tab '],
    pecas: [
      { kind: 'tabs', props: { tabs: [{ label: 'Aba 1' }, { label: 'Aba 2' }], selected: 0 } },
      { kind: 'card', props: { label: 'Conteúdo', supporting: 'Detalhe da aba.', variant: 'tonal' } }
    ]
  },
  {
    chaves: ['produto', 'loja', 'comprar', 'catalogo', 'catálogo'],
    pecas: [
      { kind: 'card', props: { label: 'Produto 1', supporting: 'Descrição curta.', variant: 'tonal' } },
      { kind: 'card', props: { label: 'Produto 2', supporting: 'Descrição curta.', variant: 'tonal' } },
      { kind: 'button', props: { label: 'Comprar', variant: 'filled' } }
    ]
  },
  {
    chaves: ['checkout', 'pagamento pix', 'pagar com'],
    pecas: [
      { kind: 'card', props: { label: 'Resumo', supporting: 'Valor e itens.', variant: 'tonal' } },
      { kind: 'select', props: { label: 'Forma de pagamento', variant: 'outlined' } },
      { kind: 'button', props: { label: 'Pagar', variant: 'filled' } }
    ]
  },
  {
    chaves: ['entrega', 'endereco', 'endereço', 'confirmar entrega'],
    pecas: [
      { kind: 'box', props: { label: 'Mapa' } },
      { kind: 'button', props: { label: 'Confirmar', variant: 'filled' } }
    ]
  },
  {
    chaves: ['foto', 'camera', 'câmera', 'capturar'],
    pecas: [
      { kind: 'box', props: { label: 'Câmera' } },
      { kind: 'button', props: { label: 'Capturar', variant: 'filled' } }
    ]
  },
  {
    chaves: ['contato', 'fale conosco', 'mensagem'],
    pecas: [
      { kind: 'textField', props: { label: 'Nome', variant: 'outlined' } },
      { kind: 'textField', props: { label: 'E-mail', variant: 'outlined' } },
      { kind: 'button', props: { label: 'Enviar', variant: 'filled' } }
    ]
  },
  {
    chaves: ['dashboard', 'resumo', 'visao geral', 'visão geral'],
    pecas: [
      { kind: 'card', props: { label: 'Receita', supporting: 'Resumo do período.', variant: 'tonal' } },
      { kind: 'card', props: { label: 'Pedidos', supporting: 'Resumo do período.', variant: 'tonal' } },
      { kind: 'card', props: { label: 'Clientes', supporting: 'Resumo do período.', variant: 'tonal' } }
    ]
  },
  {
    chaves: ['onboarding', 'boas-vindas', 'comecar', 'começar', 'pular'],
    pecas: [
      { kind: 'text', props: { label: 'Bem-vindo' } },
      { kind: 'button', props: { label: 'Começar', variant: 'filled' } },
      { kind: 'button', props: { label: 'Pular', variant: 'text' } }
    ]
  },
  {
    chaves: ['pagamento', 'valor', 'pagar'],
    pecas: [
      { kind: 'card', props: { label: 'Valor', supporting: 'Detalhe do pagamento.', variant: 'tonal' } },
      { kind: 'slider', props: { value: 40 } },
      { kind: 'button', props: { label: 'Pagar', variant: 'filled' } }
    ]
  },
  {
    chaves: ['senha', 'recuperar', 'esqueci'],
    pecas: [
      { kind: 'textField', props: { label: 'Nova senha', variant: 'outlined' } },
      { kind: 'button', props: { label: 'Entrar', variant: 'filled' } }
    ]
  },
  {
    chaves: ['progresso', 'carregando', 'loading'],
    pecas: [{ kind: 'loadingIndicator', props: { variant: 'circular', value: 40 } }]
  }
]

export function gerarDraft(texto: string): DraftSpec[] {
  const bruto = texto.trim()
  if (!bruto) return []
  const t = normalizar(bruto)
  // Caminho Pix prioritário: pix/qr/cobrança cobre pagar → criar → confirmar → status.
  if (ehPix(t)) return montarPix()
  const achadas: DraftSpec[] = []
  for (const r of REGRAS) {
    if (r.chaves.some((c) => t.includes(normalizar(c)))) {
      for (const p of r.pecas) achadas.push({ kind: p.kind, props: { ...p.props } })
    }
  }
  if (achadas.length > 0) return achadas.slice(0, 12)
  // Fallback sem keyword vazia: deriva de título/descrição/fluxo/BDD colado
  // no tubo, ou 'Pagamento Pix'. Toda peça com label não-vazio.
  const rotulo = rotuloFallback(bruto)
  return [
    { kind: 'topAppBar', props: { label: rotulo, icon: 'menu', variant: 'filled' } },
    { kind: 'text', props: { label: rotulo } },
    { kind: 'button', props: { label: 'Continuar', variant: 'filled' } }
  ]
}

export function registrarMetadados(params: RegistrarMetadadosParams): Geracao {
  const result = params.result ?? gerarDraft(params.prompt)
  return {
    authorUserId: params.authorUserId,
    provider: params.provider ?? 'local',
    model: params.model ?? 'template-ptbr',
    prompt: params.prompt,
    result,
    at: params.at ?? Date.now()
  }
}

