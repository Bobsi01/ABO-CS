import type { ReceptorResult } from '../api/simulator'

const bands = [
  { label: 'Below trace (<0.01 mm)', color: '#64748b', min: 0, max: 0.01 },
  { label: 'Trace (0.01–<0.5 mm)', color: '#facc15', min: 0.01, max: 0.5 },
  { label: '0.5–<1 mm', color: '#f59e0b', min: 0.5, max: 1 },
  { label: '1–<5 mm', color: '#f97316', min: 1, max: 5 },
  { label: '≥5 mm', color: '#dc2626', min: 5, max: Infinity },
]

export function depositDistribution(receptors: ReceptorResult[]) {
  const municipalities = receptors.filter(r => r.kind === 'municipality')
  const known = municipalities.filter(r => r.in_domain && r.thickness_mm !== null)
  return {
    bands: bands.map(b => ({ ...b, count: known.filter(r => r.thickness_mm! >= b.min && r.thickness_mm! < b.max).length })),
    known: known.length,
    outside: municipalities.filter(r => !r.in_domain).length,
    unknown: municipalities.filter(r => r.in_domain && r.thickness_mm === null).length,
  }
}
