import type { ReceptorResult } from '../api/simulator'
import { calculateFamiliesAffected } from '../presentation'

const bands = [
  { label: 'Below trace (<0.01 mm)', color: '#64748b', min: 0, max: 0.01 },
  { label: 'Trace (0.01–<0.5 mm)', color: '#facc15', min: 0.01, max: 0.5 },
  { label: '0.5–<1 mm', color: '#f59e0b', min: 0.5, max: 1 },
  { label: '1–<5 mm', color: '#f97316', min: 1, max: 5 },
  { label: '≥5 mm', color: '#dc2626', min: 5, max: Infinity },
]

// This is for chart bands; unknown and outside-domain locations stay separate.
export function depositDistribution(receptors: ReceptorResult[]) {

  const municipalities = receptors.filter((r) => r.kind === 'municipality')
  const known = municipalities.filter((r) => r.in_domain && r.thickness_mm !== null)

  return {
    bands: bands.map((b) => ({
      ...b,
      count: known.filter((r) => r.thickness_mm! >= b.min && r.thickness_mm! < b.max).length,
    })),
    known: known.length,
    outside: municipalities.filter((r) => !r.in_domain).length,
    unknown: municipalities.filter((r) => r.in_domain && r.thickness_mm === null).length,
  }

}

export type ExecutiveKpis = {
  provincesCount: number
  localitiesCount: number
  peakThickness: number
  peakLocality: string
  peakProvince: string
  totalPopulation: number
  totalFamilies: number
}

// The dashboard counts affected places at the selected thickness threshold.
export function calculateExecutiveKpis(
  receptors: ReceptorResult[],
  threshold: number,
): ExecutiveKpis {

  const inDomain = receptors.filter((r) => r.in_domain && r.kind === 'municipality')
  const affected = inDomain.filter((r) => (r.thickness_mm ?? 0) >= threshold)

  let maxMm = 0
  let peakName = ''
  let peakProv = ''
  let totalPop = 0
  const provinceSet = new Set<string>()

  for (const r of inDomain) {
    const mm = r.thickness_mm ?? 0

    if (mm > maxMm) {
      maxMm = mm
      peakName = r.name.split(',')[0].trim()
      peakProv = r.province || 'Other Province'
    }
  }

  for (const r of affected) {
    const prov = r.province || 'Other Province'

    provinceSet.add(prov)
    totalPop += r.population ?? 0
  }

  return {
    provincesCount: provinceSet.size,
    localitiesCount: affected.length,
    peakThickness: maxMm,
    peakLocality: peakName,
    peakProvince: peakProv,
    totalPopulation: totalPop,
    totalFamilies: calculateFamiliesAffected(totalPop),
  }

}
