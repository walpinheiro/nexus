import assert from 'node:assert/strict'
import { gerarPromptStudio } from '@/utils/studioPrompt'

// Fixture baseada no seedDoc padrão de src/stores/useStudio.ts
const seedDoc = {
  title: 'Cobranças Pix',
  brief: 'Protótipo de telas do pagamento por Pix (espelha as 4 features NEXO).',
  frame: 'phone',
  platform: 'web',
  paletteKey: 'blue',
  theme: { palette: 'blue', scheme: 'blue', type: 'expressive', radius: 'rounded' },
  frames: [
    { id: 'checkout', name: 'Checkout Web', x: 0, y: 0, w: 1280, h: 800, preset: 'desktop', note: 'Criar cobrança Pix + status de pagamento.' },
    { id: 'pagpix', name: 'Pagamento Pix', x: 1400, y: 0, w: 412, h: 892, preset: 'phone', note: 'Pagar fatura com Pix; abre Checkout Web.' }
  ],
  groups: [
    {
      id: 'g-web',
      x: 28,
      y: 60,
      axis: 'x',
      order: 0,
      items: [{ id: 't1', kind: 'text', label: 'Criar cobrança Pix', size: 28, x: 28, y: 60 }]
    },
    {
      id: 'g-bar',
      x: 1400,
      y: 0,
      axis: 'x',
      order: 1,
      items: [{ id: 'bar1', kind: 'topAppBar', label: 'Pagamento Pix', icon: 'menu', variant: 'filled', x: 1400, y: 0 }]
    },
    {
      id: 'g-list',
      x: 1416,
      y: 112,
      axis: 'y',
      order: 2,
      items: [
        { id: 'c1', kind: 'card', label: 'Pagar fatura com Pix', supporting: 'Pix de forma simples e segura.', variant: 'filled', action: { to: 'checkout', transition: 'slide' }, x: 1416, y: 112 },
        { id: 'c2', kind: 'card', label: 'Confirmação idempotente', supporting: 'Sem transações duplicadas.', variant: 'filled', x: 1416, y: 350 },
        { id: 'c3', kind: 'card', label: 'Status de pagamento', supporting: 'Exibe o status da cobrança.', variant: 'outlined', x: 1416, y: 588 }
      ]
    },
    {
      id: 'g-pay',
      x: 1416,
      y: 700,
      axis: 'x',
      order: 3,
      items: [{ id: 'b1', kind: 'button', label: 'Pagar com Pix', variant: 'filled', size: 380, action: { to: 'checkout', transition: 'slide' }, note: 'Cria cobrança e abre o checkout.', x: 1416, y: 700 }]
    }
  ]
}

console.log('--- Iniciando Testes de Determinismo do Prompt Studio (diff0) ---')

// 1. Execução 2x no seedDoc -> assert diff === 0 (byte-identical)
const promptRun1 = gerarPromptStudio(seedDoc)
const promptRun2 = gerarPromptStudio(seedDoc)
assert.strictEqual(
  promptRun1,
  promptRun2,
  'FALHA: Execuções sucessivas sobre o mesmo seedDoc devem ser byte-identical (diff === 0).'
)
console.log('✓ Asserção 1: Byte-identical em execuções consecutivas (diff === 0).')

// 2. Execução com frames e grupos embaralhados / invertidos -> assert diff === 0
const shuffledDoc = {
  ...seedDoc,
  frames: [...seedDoc.frames].reverse(),
  groups: [...seedDoc.groups].reverse().map((g) => ({
    ...g,
    items: [...g.items].reverse()
  }))
}
const promptShuffled = gerarPromptStudio(shuffledDoc)
assert.strictEqual(
  promptRun1,
  promptShuffled,
  'FALHA: Ordem de frames/grupos/itens não pode alterar o prompt gerado (diff === 0).'
)
console.log('✓ Asserção 2: Determinismo mantido com frames, grupos e itens embaralhados (diff === 0).')

// 3. Asserção: Zero ocorrências de "Author:" ou "android"
const hasAuthor = /Author:/i.test(promptRun1)
const hasAndroid = /android/i.test(promptRun1)
assert.strictEqual(hasAuthor, false, 'FALHA: Prompt gerado não deve conter menção a "Author:".')
assert.strictEqual(hasAndroid, false, 'FALHA: Prompt gerado não deve conter menção a "android".')
console.log('✓ Asserção 3: Zero ocorrências de "Author:" e "android".')

// 4. Asserção: Presença de todos os 5 blocos M3E
const expectedBlocks = [
  '## Colors',
  '## Shape, type and motion',
  '## Layout',
  '## Component styles',
  '## General guidance'
]

for (const block of expectedBlocks) {
  assert.ok(
    promptRun1.includes(block),
    `FALHA: Bloco M3E obrigatório ausente: "${block}"`
  )
}
console.log('✓ Asserção 4: Todos os 5 blocos M3E presentes com sucesso.')

console.log('--- Todos os testes de determinismo passaram com sucesso (diff0)! ---')
