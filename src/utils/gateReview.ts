/** Storage namespace isolates one project's review thread from every other project. */
export function chaveStorageRevisao(projectId: string): string {
  return `nexo.v1.gateReview.${encodeURIComponent(projectId)}`
}

/** A proposed diff can only be applied to the version it was generated from. */
export function versaoDaPropostaEstaAtual(versaoBase: number, versaoAtual: number): boolean {
  return Number.isInteger(versaoBase) && versaoBase === versaoAtual
}

export function decodificarHistoricoRevisao(raw: string | null): Record<string, unknown[]> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown[]> : {}
  } catch {
    return {}
  }
}
