export const CONTOUR_LEVELS = [0.5, 1, 5, 10, 50, 100]

/** Sequential earth tones encode deposit thickness, never hazard severity. */
export function depositColor(mm: number): string {
  if (mm >= 100) return '#432818'
  if (mm >= 50) return '#6f4329'
  if (mm >= 10) return '#986c3f'
  if (mm >= 5) return '#b78a52'
  if (mm >= 1) return '#d1af78'
  if (mm >= 0.5) return '#e5d1a7'
  return '#e9e8de'
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

