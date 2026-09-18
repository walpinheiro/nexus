import type { StudioDoc, StudioFrame, StudioItem } from '@/types/studio'
import { paletteOf } from '@/components/studio/m3/theme'

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildPreamble(doc: StudioDoc, frames: StudioFrame[]): string[] {
  const isMulti = frames.length > 1
  const screenWord = isMulti ? 'these screens' : 'this screen'
  const firstFrame = frames[0]
  const dims = firstFrame ? `${firstFrame.w}×${firstFrame.h}dp` : '1280×800dp'

  const mode = doc.theme?.bothModes
    ? 'both light and dark modes'
    : doc.theme?.dark
      ? 'dark mode only'
      : 'light mode only'

  return [
    `Please implement ${screenWord} in the Material 3 Expressive design language. Target a responsive web layout (${dims}), ${mode}. Build it for Web, as a web app that runs in the browser. The layout below is a rough sketch that conveys intent, not a finished spec. Do not reproduce it as a static picture; build the complete, usable app that this kind of product is normally expected to be.`,
    ''
  ]
}

function buildColorsBlock(doc: StudioDoc): string[] {
  const paletteKey = doc.paletteKey ?? doc.theme?.palette ?? 'blue'
  const isDark = doc.theme?.dark ?? false
  const schemeName = isDark ? 'dark' : 'light'
  const scheme = paletteOf(paletteKey, isDark)

  return [
    '## Colors',
    '',
    `The theme is ${capitalize(paletteKey)}. Set these on the Material 3 ${schemeName} color scheme and reference every UI color through its role.`,
    '',
    `- primary ${scheme.primary ?? '#1D4ED8'} / onPrimary ${scheme.onPrimary ?? '#FFFFFF'} / primaryContainer ${scheme.primaryContainer ?? '#DCE4FF'} / onPrimaryContainer ${scheme.onPrimaryContainer ?? '#0B2A6B'}`,
    `- secondary ${scheme.secondaryContainer ?? '#DCE4FF'} / secondaryContainer ${scheme.secondaryContainer ?? '#DCE4FF'} / onSecondaryContainer ${scheme.onSecondaryContainer ?? '#1E3A5F'} / tertiaryContainer ${scheme.primaryContainer ?? '#DCE4FF'} / onTertiaryContainer ${scheme.onPrimaryContainer ?? '#0B2A6B'}`,
    `- surface ${scheme.surface ?? '#FEF7FF'} / surfaceContainerLow ${scheme.surfaceContainerLow ?? '#F7F2FA'} / surfaceContainer ${scheme.surfaceContainer ?? '#F3EDF7'} / surfaceContainerHigh ${scheme.surfaceContainerHigh ?? '#ECE6F0'} / surfaceContainerHighest ${scheme.surfaceContainerHighest ?? '#E6E0E9'}`,
    `- onSurface ${scheme.onSurface ?? '#1D1B20'} / onSurfaceVariant ${scheme.onSurfaceVariant ?? '#49454F'} / outline ${scheme.outline ?? '#79747E'} / outlineVariant ${scheme.outlineVariant ?? '#CAC4D0'}`,
    `- inverseSurface ${scheme.inverseSurface ?? '#322F35'} / inverseOnSurface ${scheme.inverseOnSurface ?? '#F5EFF7'} / inversePrimary ${scheme.inversePrimary ?? '#D0BCFF'}`,
    `- error ${scheme.error ?? '#BA1A1A'} / onError #FFFFFF / errorContainer #FFDAD6 / onErrorContainer #93000A`,
    ''
  ]
}

function buildShapeTypeMotionBlock(doc: StudioDoc): string[] {
  const radius = doc.theme?.radius ?? 'rounded'
  const font = doc.theme?.font ?? 'Roboto'
  const emphasized = doc.theme?.emphasized ?? true
  const motion = doc.theme?.motion ?? 'expressive'

  const shapeDesc =
    radius === 'square'
      ? '- Corners are square / sharp across components (0dp radius).'
      : radius === 'full'
        ? '- Corners use full roundness / pill shapes wherever possible.'
        : '- Corners follow the M3 Expressive defaults (pill buttons, 20dp cards, 28dp dialogs).'

  const typeDesc = emphasized
    ? `- Use ${font} as the typeface. Headlines and labels use the heavier M3 Expressive styles (bold / emphasized weights).`
    : `- Use ${font} as the typeface. Typography uses the standard M3 weights.`

  const motionDesc =
    motion === 'standard'
      ? '- Motion uses MotionScheme.standard(): smooth transitions and state changes with no bounce.'
      : '- Motion uses MotionScheme.expressive(): spring dynamics (stiffness 360, damping 26, mass 1, duration ~420ms) for transitions and state changes with bouncy overshoot.'

  return [
    '## Shape, type and motion',
    '',
    shapeDesc,
    typeDesc,
    motionDesc,
    ''
  ]
}

function describeItem(i: StudioItem): string {
  const parts: string[] = []
  const kindName = i.kind === 'topAppBar' ? 'top app bar' : i.kind === 'bottomNav' ? 'navigation bar' : i.kind
  parts.push(`a ${i.variant ? `${i.variant} ` : ''}${kindName}`)

  if (i.label) {
    parts.push(`"${i.label}"`)
  }
  if (i.icon) {
    parts.push(`with the ${i.icon} icon`)
  }
  if (i.icon2) {
    parts.push(`and trailing ${i.icon2} icon`)
  }
  if (i.supporting) {
    parts.push(`supporting text "${i.supporting}"`)
  }
  if (i.tabs && Array.isArray(i.tabs) && i.tabs.length > 0) {
    const tabsList = (i.tabs as (string | { label: string })[])
      .map((t) => (typeof t === 'string' ? t : t.label))
      .filter(Boolean)
      .join(' | ')
    if (tabsList) parts.push(`destinations: [${tabsList}]`)
  }
  if (i.action) {
    parts.push(`tapping opens "${i.action.to}" via ${i.action.transition} transition`)
  }
  if (i.note) {
    parts.push(`note: "${i.note}"`)
  }

  return parts.join(', ')
}

function buildLayoutBlock(doc: StudioDoc, frames: StudioFrame[]): string[] {
  const linhas: string[] = ['## Layout', '']

  for (const f of frames) {
    const notePart = f.note ? ` — ${f.note}` : ''
    linhas.push(`The "${f.name}" screen (${f.w}×${f.h}dp${notePart}), from top to bottom:`)
    linhas.push('')

    const itens = (doc.groups ?? [])
      .flatMap((g) => g.items ?? [])
      .filter((i) => i.x >= f.x && i.x < f.x + f.w && i.y >= f.y && i.y < f.y + f.h)
      .sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y
        if (a.x !== b.x) return a.x - b.x
        return (a.id || '').localeCompare(b.id || '')
      })

    if (itens.length === 0) {
      linhas.push('- Empty screen ready for content.')
    } else {
      for (const item of itens) {
        const relY = (item.y - f.y) / f.h
        let posStr = 'In the middle'
        if (relY < 0.2) posStr = 'Near the top'
        else if (relY > 0.78) posStr = 'Near the bottom'

        linhas.push(`- ${posStr}: ${describeItem(item)}.`)
      }
    }
    linhas.push('')
  }

  return linhas
}

const COMPONENT_STYLE_KEYS = [
  'topAppBar',
  'button',
  'fab',
  'bottomNav',
  'listItem',
  'textField',
  'card',
  'dialog',
  'searchBar',
  'tabs'
] as const

const COMPONENT_STYLES: Record<(typeof COMPONENT_STYLE_KEYS)[number], string> = {
  topAppBar:
    '- Top app bar: 64dp tall on surface, with its background extended behind the status bar (pad the top by the system inset). Title in titleLarge, 48dp icon buttons on each side. A bar named medium or large is M3\'s flexible top app bar: 112dp or 152dp tall, the icons in the top 64dp row and the title on its own line at the foot (headlineSmall / headlineMedium), collapsing to the small bar on scroll. The standard tint to surfaceContainer on scroll is fine.',
  button:
    '- Buttons: medium size, 56dp tall, fully rounded (pill). Filled uses primary, tonal uses secondaryContainer, outlined has a 1dp outline border. A connected button group is a row with 3dp gaps where only the inner adjoining corners shrink to 8dp and the outer corners stay round (the M3 Expressive connected button group). A button given a height follows the M3 size scale (XS 32dp, S 40dp, M 56dp, L 96dp, XL 136dp).',
  fab:
    '- FAB: 56dp with 16dp corners; large is 96dp with 28dp corners; small is 40dp with 12dp corners. Tonal uses primaryContainer, filled uses primary. Float it 16dp from the screen edge with a level 3 shadow.',
  bottomNav:
    '- Navigation bar: 80dp tall on surfaceContainer, with its background extended down through the gesture navigation area (pad the bottom by the system inset). The active destination shows a secondaryContainer pill indicator (64×32dp), a filled icon and a labelMedium label.',
  listItem:
    '- List items: 72dp tall, 24dp leading icon (on a 40dp primaryContainer circle unless stated), headline in bodyLarge, supporting text in bodyMedium on onSurfaceVariant, on the specified background role (surfaceContainerLow unless stated). A stacked list is a vertical run with 3dp gaps, 28dp outer corners and 8dp inner corners.',
  textField:
    '- Text fields: 56dp tall, filled on surfaceContainerHighest or outlined with 1dp outline border. Corner radius 4dp (filled) or 8dp (outlined). Label in bodySmall on focus, bodyLarge resting.',
  card:
    '- Cards: 20dp corner radius. Elevated uses surfaceContainerLow with level 1 shadow; filled uses surfaceContainer; outlined has a 1dp outlineVariant border.',
  dialog:
    '- Dialogs: 28dp corner radius on surfaceContainerHigh, with 24dp padding, headlineSmall title and action buttons at the bottom right.',
  searchBar:
    '- Search bar: 56dp tall, fully rounded (pill) on surfaceContainerHigh, with leading search icon and trailing profile avatar or clear button.',
  tabs:
    '- Tabs: 48dp tall on surface, active tab indicated by a primary underline bar or pill container.'
}

function buildComponentStylesBlock(kindsInUse: Set<string>): string[] {
  const linhas: string[] = [
    '## Component styles',
    '',
    'Per-component guidance for the parts in use. The numbers are the M3 Expressive defaults: let the standard components handle whatever they already do, and adjust where the content calls for it.',
    ''
  ]

  let count = 0
  for (const kind of COMPONENT_STYLE_KEYS) {
    if (kindsInUse.has(kind)) {
      linhas.push(COMPONENT_STYLES[kind])
      count++
    }
  }

  // Se nenhum específico foi usado ou poucos, inclui os essenciais padrão
  if (count === 0) {
    linhas.push(COMPONENT_STYLES.topAppBar)
    linhas.push(COMPONENT_STYLES.button)
    linhas.push(COMPONENT_STYLES.listItem)
  }

  linhas.push('')
  return linhas
}

function buildGeneralGuidanceBlock(): string[] {
  return [
    '## General guidance',
    '',
    '- Work out what kind of app this is from the purpose of the screens, and implement the features such an app is normally expected to have (create, list, detail, edit, delete, search, settings, whichever apply) even where the sketch does not show them.',
    '- Treat the data as real. Persist what the user creates on the device so it survives restarts. Do not ship dummy or sample data; show an empty state when there is nothing yet. Validate input, and confirm or report failures and deletions appropriately.',
    '- Fill in behavior the sketch leaves out from the purpose of the screen and the labels of the parts. A button or item with no behavior specified should do what its label implies (save, send, open a detail screen, and so on), never nothing.',
    '- The layout only needs to keep the intent (order, grouping, relative placement); sizes and spacing may be adjusted to fit the content. If something would break on a device, prefer working over matching the sketch.',
    '- Use Vue 3 + TypeScript + Tailwind CSS with Material 3 Expressive styling; do not custom-draw parts standard tokens provide.',
    '- Always reference colors through the scheme roles above (primary, surfaceContainer, …) instead of hard-coded values.',
    '- Keep 16dp screen margins and 8–16dp between parts, and use the M3 type styles (titleLarge, bodyMedium, …).',
    '- Parts described as "in one row" must share a single Row (horizontal container) on the same line; never stack them vertically or wrap them. The row is as tall as its tallest part and the others are vertically centered in it.',
    '- Parts described as "layered inside" a container are drawn on top of that container (a Box with the container as its background). The overlap is intentional: do not separate or reorder them for layout reasons. Later items in the description are drawn in front of earlier ones.',
    '- Give every tappable part ripple plus a slight press-scale. "Back" plays the entry transition in reverse, and the system back gesture / button must do the same.',
    '- Use Material Symbols Rounded for icons.',
    '- Do not verify in an external browser. When the implementation is done, produce a fully runnable web app as the deliverable.'
  ]
}

/**
 * Generates an authentic Material 3 Expressive prompt matching M3E canvas spec §4.
 * 100% pure, offline, deterministic, web-only, and without author metadata.
 */
export function gerarPromptStudio(
  doc: StudioDoc,
  frameId: string | 'tudo' = 'tudo',
  _origemNo?: string
): string {
  const rawFrames =
    frameId === 'tudo'
      ? doc.frames ?? []
      : (doc.frames ?? []).filter((f) => f.id === frameId)
  const candidateFrames = rawFrames.length > 0 ? rawFrames : doc.frames ?? []

  // Ordenação determinística de frames por id
  const targetFrames = [...candidateFrames].sort((a, b) => a.id.localeCompare(b.id))

  const kindsInUse = new Set<string>()
  for (const g of doc.groups ?? []) {
    for (const item of g.items ?? []) {
      if (item.kind) kindsInUse.add(item.kind)
    }
  }

  const linhas: string[] = [
    ...buildPreamble(doc, targetFrames),
    ...buildColorsBlock(doc),
    ...buildShapeTypeMotionBlock(doc),
    ...buildLayoutBlock(doc, targetFrames),
    ...buildComponentStylesBlock(kindsInUse),
    ...buildGeneralGuidanceBlock()
  ]

  return linhas.join('\n')
}
