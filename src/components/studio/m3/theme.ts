// Esquema de cor M3 simplificado adaptado de m3e-canvas © lnkiai, MIT License.
// Código Vue original NEXO — 7 paletas seed + modo claro/escuro.

export type Scheme = Record<string, string>

interface SeedDef {
  primary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondaryContainer: string
  onSecondaryContainer: string
}

const SEEDS: Record<string, SeedDef> = {
  purple: {
    primary: '#6750A4',
    primaryContainer: '#EADDFF',
    onPrimaryContainer: '#4F378B',
    secondaryContainer: '#E8DEF8',
    onSecondaryContainer: '#4A4458'
  },
  blue: {
    primary: '#1D4ED8',
    primaryContainer: '#DCE4FF',
    onPrimaryContainer: '#0B2A6B',
    secondaryContainer: '#DCE4FF',
    onSecondaryContainer: '#1E3A5F'
  },
  green: {
    primary: '#146C2E',
    primaryContainer: '#B7F0B8',
    onPrimaryContainer: '#0B4D20',
    secondaryContainer: '#CCE8CC',
    onSecondaryContainer: '#1C4A2A'
  },
  coral: {
    primary: '#B3261E',
    primaryContainer: '#FFDAD6',
    onPrimaryContainer: '#93000A',
    secondaryContainer: '#FFDBD2',
    onSecondaryContainer: '#5C4037'
  },
  amber: {
    primary: '#7A5900',
    primaryContainer: '#FFDF9E',
    onPrimaryContainer: '#534100',
    secondaryContainer: '#F5E0A8',
    onSecondaryContainer: '#4D4518'
  },
  teal: {
    primary: '#0F766E',
    primaryContainer: '#A6F2E6',
    onPrimaryContainer: '#005048',
    secondaryContainer: '#CCE8E0',
    onSecondaryContainer: '#1C4A44'
  },
  mono: {
    primary: '#44464F',
    primaryContainer: '#E2E2E9',
    onPrimaryContainer: '#2E3138',
    secondaryContainer: '#E2E2E9',
    onSecondaryContainer: '#45464F'
  }
}

const LIGHT_BASE: Scheme = {
  surface: '#FEF7FF',
  onSurface: '#1D1B20',
  onSurfaceVariant: '#49454F',
  onPrimary: '#FFFFFF',
  surfaceContainerLow: '#F7F2FA',
  surfaceContainer: '#F3EDF7',
  surfaceContainerHigh: '#ECE6F0',
  surfaceContainerHighest: '#E6E0E9',
  outline: '#79747E',
  outlineVariant: '#CAC4D0',
  inverseSurface: '#322F35',
  inverseOnSurface: '#F5EFF7',
  inversePrimary: '#D0BCFF',
  error: '#BA1A1A'
}

const DARK_BASE: Scheme = {
  surface: '#141218',
  onSurface: '#E6E0E9',
  onSurfaceVariant: '#CAC4D0',
  onPrimary: '#FFFFFF',
  surfaceContainerLow: '#1D1B20',
  surfaceContainer: '#211F26',
  surfaceContainerHigh: '#2B2930',
  surfaceContainerHighest: '#36343B',
  outline: '#938F99',
  outlineVariant: '#49454F',
  inverseSurface: '#E6E0E9',
  inverseOnSurface: '#322F35',
  inversePrimary: '#6750A4',
  error: '#FFB4AB'
}

export const PALETTE_KEYS = ['purple', 'blue', 'green', 'coral', 'amber', 'teal', 'mono']

export function paletteOf(paletteKey: string | undefined, dark = false): Scheme {
  const seed = SEEDS[paletteKey ?? 'blue'] ?? SEEDS['blue']
  const base = dark ? DARK_BASE : LIGHT_BASE
  return {
    ...base,
    primary: seed.primary,
    primaryContainer: dark ? seed.onPrimaryContainer : seed.primaryContainer,
    onPrimaryContainer: dark ? seed.primaryContainer : seed.onPrimaryContainer,
    secondaryContainer: dark ? seed.onSecondaryContainer : seed.secondaryContainer,
    onSecondaryContainer: dark ? seed.secondaryContainer : seed.onSecondaryContainer
  }
}
