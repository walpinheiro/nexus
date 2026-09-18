// Tipos do Studio (port Vue do formato m3e — espelho, sem React).
// Formato Doc: { title, brief, frame, platform, paletteKey, theme, frames[], groups[] }

export type StudioTransition = 'slide' | 'slideLeft' | 'slideUp' | 'slideDown' | 'fade' | 'expand' | 'none'

export interface StudioAction {
  to: string
  transition: StudioTransition
}

export interface StudioTab {
  icon?: string
  label: string
}

export interface StudioItem {
  id: string
  kind: string
  label?: string
  icon?: string | null
  icon2?: string | null
  variant?: string
  supporting?: string
  note?: string
  action?: StudioAction
  actions?: Record<string, StudioAction>
  toggle?: string | Record<string, string>
  tabs?: StudioTab[] | string[]
  selected?: number
  size?: number
  size2?: number
  checked?: boolean
  value?: number
  src?: string
  fill?: string
  radiusTop?: boolean
  radiusBottom?: boolean
  noImage?: boolean
  layout?: string
  count?: number
  corners?: number
  railExpanded?: boolean
  railModal?: boolean
  bold?: boolean
  contained?: boolean
  wavy?: boolean
  trackThickness?: number
  x: number
  y: number
  w?: number
  h?: number
  [k: string]: unknown
}

export interface StudioGroup {
  id: string
  x: number
  y: number
  axis: 'x' | 'y'
  items: StudioItem[]
  order: number
  locked?: boolean
}

export interface StudioFrame {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  preset?: 'phone' | 'desktop'
  note?: string
  bg?: string
  swipe?: { left?: string; right?: string; up?: string; down?: string } | boolean
  place?: string
}

export interface StudioTheme {
  palette: string
  scheme: string
  type: string
  radius: string
  dark?: boolean
  bothModes?: boolean
  contrast?: string
  shape?: string
  font?: string
  emphasized?: boolean
  motion?: string
}

export interface StudioDoc {
  title: string
  brief?: string
  frame: string
  platform: 'android' | 'web'
  paletteKey?: string
  theme: StudioTheme
  frames: StudioFrame[]
  groups: StudioGroup[]
}

export const STUDIO_KINDS = [
  'button',
  'fab',
  'chip',
  'topAppBar',
  'bottomNav',
  'tabs',
  'searchBar',
  'card',
  'listItem',
  'dialog',
  'snackbar',
  'textField',
  'select',
  'switch',
  'checkbox',
  'radio',
  'slider',
  'text',
  'image',
  'box',
  'divider',
  'loadingIndicator',
  'navRail',
  'toolbar',
  'extendedFab'
] as const

export type StudioKind = (typeof STUDIO_KINDS)[number]

// ONDA2-MOTOR-VALIDAÇÃO (Y1): re-export dos tipos de validação (fonte: @/types/nexo).
// O VUE (M3TextField/snackbar) consome carregarRegras()+validarPreview() do graph.
export type {
  MapaRegrasValidacao,
  RegraValidacao,
  ResultadoValidacao,
  TipoRegraValidacao,
  ValidacaoCampo
} from '@/types/nexo'
