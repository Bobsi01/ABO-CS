export const CONTOUR_LEVELS = [0.5, 1, 5, 10, 50, 100]
export const TRACE_CONTOUR_LEVELS = [0.01, 0.1]

/** Sequential warm chromatic spectrum (yellow to red) encodes deposit thickness; academic simulation not a PHIVOLCS hazard advisory. */
export function depositColor(mm: number): string {
  if (mm >= 100) return '#4c0519'
  if (mm >= 50) return '#991b1b'
  if (mm >= 10) return '#dc2626'
  if (mm >= 5) return '#ef4444'
  if (mm >= 1) return '#f97316'
  if (mm >= 0.5) return '#f59e0b'
  if (mm >= 0.1) return '#facc15'
  if (mm >= 0.01) return '#fef08a'
  return '#e2e8f0'
}

export function number(value: number | null | undefined, digits = 2): string {
  return value == null ? 'Unknown' : value.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function csvCell(value: unknown): string {
  const raw = String(value ?? '')
  // Spreadsheet applications must not execute municipality labels as formulas.
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Average household size in CALABARZON / Region IV-A (PSA 2020 CPH Report No. 2). */
export const PSA_REGION4A_HOUSEHOLD_SIZE = 4.1

/** Estimate families / households affected based on PSA 2020 average household size. */
export function calculateFamiliesAffected(population: number | null | undefined): number {
  if (population == null || population <= 0) return 0
  return Math.round(population / PSA_REGION4A_HOUSEHOLD_SIZE)
}

