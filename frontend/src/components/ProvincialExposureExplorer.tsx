import { memo, useMemo, useState } from 'react'
import type { ReceptorResult } from '../api/simulator'
import { calculateFamiliesAffected, depositColor, number } from '../presentation'
import Icon from './Icon'

type Props = {
  receptors: ReceptorResult[]
  selected: string | null
  onSelect: (id: string) => void
  reportingCutoffMm?: number
}

function severityBadge(mm: number | null | undefined): { label: string; color: string; bg: string } {
  const val = mm ?? 0
  if (val >= 10) return { label: 'Heavy (≥10 mm)', color: '#7f1d1d', bg: '#fee2e2' }
  if (val >= 1) return { label: 'Moderate (1–10 mm)', color: '#9a3412', bg: '#ffedd5' }
  if (val >= 0.5) return { label: 'Light (0.5–1 mm)', color: '#854d0e', bg: '#fef9c3' }
  if (val >= 0.01) return { label: 'Trace (0.01–0.5 mm)', color: '#713f12', bg: '#fef08a' }
  return { label: 'None (<0.01 mm)', color: '#475569', bg: '#f1f5f9' }
}

function ProvincialExposureExplorer({
  receptors,
  selected,
  onSelect,
  reportingCutoffMm = 0.5,
}: Props) {
  const [expandedProvinces, setExpandedProvinces] = useState<Record<string, boolean>>({})

  const threshold = reportingCutoffMm

  const provinces = useMemo(() => {
    const inDomain = receptors.filter(r => r.in_domain && r.kind === 'municipality')
    const affected = inDomain.filter(r => (r.thickness_mm ?? 0) >= threshold)

    const groups: Record<
      string,
      {
        province: string
        region: string
        items: ReceptorResult[]
        peakMm: number
        peakName: string
        totalPop: number
        totalFamilies: number
      }
    > = {}

    affected.forEach(r => {
      const mm = r.thickness_mm ?? 0
      const prov = r.province || 'Other Province'
      const reg = r.region || 'Other Region'

      if (!groups[prov]) {
        groups[prov] = {
          province: prov,
          region: reg,
          items: [],
          peakMm: 0,
          peakName: '',
          totalPop: 0,
          totalFamilies: 0,
        }
      }

      const g = groups[prov]
      g.items.push(r)
      if (mm > g.peakMm) {
        g.peakMm = mm
        g.peakName = r.name.split(',')[0]
      }
      if (r.population) {
        g.totalPop += r.population
        g.totalFamilies += calculateFamiliesAffected(r.population)
      }
    })

    const sortedProvinces = Object.values(groups).sort((a, b) => b.peakMm - a.peakMm)
    sortedProvinces.forEach(g => {
      g.items.sort((a, b) => (b.thickness_mm ?? 0) - (a.thickness_mm ?? 0))
    })

    return sortedProvinces
  }, [receptors, threshold])

  const toggleProvince = (prov: string) => {
    setExpandedProvinces(prev => ({
      ...prev,
      [prov]: prev[prov] === undefined ? false : !prev[prov],
    }))
  }

  return (
    <div className="provincial-explorer" aria-labelledby="provincial-explorer-title">
      <div className="provincial-header">
        <div>
          <h3 id="provincial-explorer-title">Provincial & City Impact Breakdown</h3>
          <p className="view-note">
            Regional footprint analysis showing which provinces and municipalities receive deposited ash.
          </p>
        </div>
      </div>

      {provinces.length === 0 ? (
        <p className="empty-note">
          No municipalities inside the modeled domain receive ash at or above {threshold} mm under the current wind and eruption parameters.
        </p>
      ) : (
        <div className="province-cards-list">
          {provinces.map(p => {
            const isExpanded = expandedProvinces[p.province] ?? true
            const hasSelectedCity = p.items.some(item => item.id === selected)
            return (
              <div
                key={p.province}
                className={`province-card ${hasSelectedCity ? 'province-card-active' : ''}`}
              >
                <button
                  type="button"
                  className="province-card-header"
                  onClick={() => toggleProvince(p.province)}
                  aria-expanded={isExpanded}
                >
                  <div className="province-title-area">
                    <Icon name={isExpanded ? 'chevronDown' : 'chevronRight'} />
                    <strong>{p.province}</strong>
                    <span className="locality-count-badge">
                      {p.items.length} {p.items.length === 1 ? 'city/town' : 'cities/towns'}
                    </span>
                  </div>
                  <div className="province-summary-stats">
                    <span className="province-peak-stat">
                      Peak: <strong>{number(p.peakMm)} mm</strong> ({p.peakName})
                    </span>
                    <span className="province-pop-stat">
                      {number(p.totalFamilies, 0)} families
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="province-cities-table-wrapper">
                    <table className="province-cities-table">
                      <thead>
                        <tr>
                          <th scope="col">City / Municipality</th>
                          <th scope="col">Modeled Ash</th>
                          <th scope="col">Severity Tier</th>
                          <th scope="col">Ground Load</th>
                          <th scope="col">Population / Families</th>
                          <th scope="col">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map(r => {
                          const isSelected = r.id === selected
                          const badge = severityBadge(r.thickness_mm)
                          const families = calculateFamiliesAffected(r.population)
                          return (
                            <tr
                              key={r.id}
                              className={isSelected ? 'selected-city-row' : ''}
                            >
                              <th scope="row">
                                <span className="city-name-display">{r.name.split(',')[0]}</span>
                              </th>
                              <td>
                                <span
                                  className="deposit-swatch-badge"
                                  style={{
                                    borderLeft: `4px solid ${depositColor(r.thickness_mm ?? 0)}`,
                                    paddingLeft: '0.4rem',
                                  }}
                                >
                                  <strong>{number(r.thickness_mm)}</strong> mm
                                </span>
                              </td>
                              <td>
                                <span
                                  className="severity-pill"
                                  style={{ color: badge.color, backgroundColor: badge.bg }}
                                >
                                  {badge.label}
                                </span>
                              </td>
                              <td>{number(r.load_kg_m2)} kg/m²</td>
                              <td>
                                {r.population ? (
                                  <>
                                    <span>{number(r.population, 0)}</span>
                                    <small className="families-sub">({number(families, 0)} fam.)</small>
                                  </>
                                ) : (
                                  <span className="muted">Unknown</span>
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="locate-city-button"
                                  onClick={() => onSelect(r.id)}
                                  title={`Inspect ${r.name} on map`}
                                >
                                  <Icon name="map" />
                                  <span>{isSelected ? 'Focused' : 'Locate'}</span>
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default memo(ProvincialExposureExplorer)
