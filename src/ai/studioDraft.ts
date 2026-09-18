// Gerador local template-based PT-BR para o tubo IA do Studio (sem API externa).
// Entrada: texto livre em PT-BR. Saída: lista de specs { kind, props } para montar draft na tela atual.
// Layout tidy vertical aplicado pelo chamador: y += altura + 16, x = frame.x + 16.

export interface DraftSpec {
  kind: string
  props: Record<string, unknown>
}

interface Regra {
  chaves: string[]
  pecas: DraftSpec[]
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
  const t = texto.trim().toLowerCase()
  if (!t) return []
  const achadas: DraftSpec[] = []
  for (const r of REGRAS) {
    if (r.chaves.some((c) => t.includes(c))) {
      for (const p of r.pecas) achadas.push({ kind: p.kind, props: { ...p.props } })
    }
  }
  if (achadas.length > 0) return achadas.slice(0, 12)
  return [
    { kind: 'topAppBar', props: { label: 'Nova tela', icon: 'menu', variant: 'filled' } },
    { kind: 'text', props: { label: texto.trim().slice(0, 60) } },
    { kind: 'button', props: { label: 'Continuar', variant: 'filled' } }
  ]
}
