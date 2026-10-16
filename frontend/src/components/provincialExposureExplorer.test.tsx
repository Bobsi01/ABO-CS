import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProvincialExposureExplorer from './ProvincialExposureExplorer'
import type { ReceptorResult } from '../api/simulator'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function createSampleReceptors(): ReceptorResult[] {
  return [
    {
      id: '0401001000',
      name: 'Agoncillo, Batangas',
      kind: 'municipality',
      lat: 13.967,
      lon: 120.927,
      population: 39101,
      population_year: 2024,
      source_ids: ['psa-national-directory'],
      coordinate_role: 'centroid',
      population_records: { '2024': 39101 },
      admin_codes: { current: '0401001000' },
      screening_conditions: {},
      province: 'Batangas',
      region: 'Region IV-A (CALABARZON)',
      east_m: -7500,
      north_m: -4500,
      in_domain: true,
      load_kg_m2: 2.4,
      thickness_mm: 2.4,
      reported: true,
      screening: { roof: 'below', crop: 'below' },
      screening_reasons: {},
    },
    {
      id: '0402101000',
      name: 'Tagaytay, Cavite',
      kind: 'municipality',
      lat: 14.115,
      lon: 120.962,
      population: 85330,
      population_year: 2024,
      source_ids: ['psa-national-directory'],
      coordinate_role: 'centroid',
      population_records: { '2024': 85330 },
      admin_codes: { current: '0402101000' },
      screening_conditions: {},
      province: 'Cavite',
      region: 'Region IV-A (CALABARZON)',
      east_m: -3800,
      north_m: 11500,
      in_domain: true,
      load_kg_m2: 4.8,
      thickness_mm: 4.8,
      reported: true,
      screening: { roof: 'below', crop: 'below' },
      screening_reasons: {},
    },
    {
      id: '1381300000',
      name: 'Quezon City, Metro Manila (NCR)',
      kind: 'municipality',
      lat: 14.681,
      lon: 121.061,
      population: 3084270,
      population_year: 2024,
      source_ids: ['psa-national-directory'],
      coordinate_role: 'centroid',
      population_records: { '2024': 3084270 },
      admin_codes: { current: '1381300000' },
      screening_conditions: {},
      province: 'Metro Manila (NCR)',
      region: 'National Capital Region',
      east_m: 6800,
      north_m: 74200,
      in_domain: true,
      load_kg_m2: 0.12,
      thickness_mm: 0.12,
      reported: false,
      screening: { roof: 'below', crop: 'below' },
      screening_reasons: {},
    },
  ]
}

describe('ProvincialExposureExplorer', () => {
  it('renders provincial KPI summary and groups localities by province', () => {
    const receptors = createSampleReceptors()
    const onSelect = vi.fn()

    render(
      <ProvincialExposureExplorer
        receptors={receptors}
        selected={null}
        onSelect={onSelect}
        reportingCutoffMm={0.5}
      />
    )

    // Heading and KPI metrics
    expect(screen.getByText('Provincial & City Impact Breakdown')).toBeDefined()
    expect(screen.getByText('Provinces Affected')).toBeDefined()
    expect(screen.getByText('Localities Affected')).toBeDefined()

    // Provinces present
    expect(screen.getByText('Cavite')).toBeDefined()
    expect(screen.getByText('Batangas')).toBeDefined()
    expect(screen.getByText('Metro Manila (NCR)')).toBeDefined()

    // Peak ash value
    expect(screen.getAllByText(/4.8/).length).toBeGreaterThan(0)
  })

  it('filters between trace (≥0.01 mm) and standard cutoff (≥0.5 mm)', () => {
    const receptors = createSampleReceptors()
    const onSelect = vi.fn()

    render(
      <ProvincialExposureExplorer
        receptors={receptors}
        selected={null}
        onSelect={onSelect}
        reportingCutoffMm={0.5}
      />
    )

    // Initially in trace mode (all 3 provinces should be present)
    expect(screen.getAllByText('Metro Manila (NCR)').length).toBeGreaterThan(0)

    // Switch to standard cutoff
    const standardBtn = screen.getByRole('button', { name: /Standard Cutoff/i })
    fireEvent.click(standardBtn)

    // Quezon City (0.12 mm) is <0.5 mm, so Metro Manila should no longer be listed as affected in standard cutoff mode
    expect(screen.queryAllByText('Metro Manila (NCR)').length).toBe(0)
    expect(screen.getByText('Cavite')).toBeDefined()
    expect(screen.getByText('Batangas')).toBeDefined()
  })

  it('triggers onSelect when Locate button is clicked', () => {
    const receptors = createSampleReceptors()
    const onSelect = vi.fn()

    render(
      <ProvincialExposureExplorer
        receptors={receptors}
        selected={null}
        onSelect={onSelect}
        reportingCutoffMm={0.5}
      />
    )

    const locateButtons = screen.getAllByTitle(/Inspect/i)
    expect(locateButtons.length).toBeGreaterThan(0)
    fireEvent.click(locateButtons[0])

    expect(onSelect).toHaveBeenCalled()
  })
})
