import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Dashboard from './Dashboard'
import { eruption, simulate } from '../api/simulator'
import type { Catalog, EruptionSequence, Scenario, SimulationResult } from '../api/simulator'

vi.mock('../api/simulator', () => ({ simulate: vi.fn(), eruption: vi.fn() }))
const scenario = { label: 'Synthetic A', input_status: 'illustrative', column_height_m: 1000, wind_from_deg: 180, wind_speed_m_s: 10, duration_s: 3600 } as Scenario
const catalog = { scenarios: [{ id: 'a', name: 'Preset A', scenario }, { id: 'b', name: 'Preset B', scenario: { ...scenario, label: 'Synthetic B' } }] } as Catalog
const result = { scenario, receptors: [{ id: 'one', name: 'Synthetic municipality', kind: 'municipality', in_domain: true, thickness_mm: 2, population_year: 2024, screening: {}, screening_reasons: {} }], summary: { receptors_covered: 1, receptors_total: 1 }, diagnostics: { retained_fraction: 1 } } as SimulationResult
const sequence = { scenario, frames: [{ elapsed_s: 0, receptors: [{ id: 'one', thickness_mm: 0 }] }, { elapsed_s: 3600, receptors: [{ id: 'one', thickness_mm: 2 }] }] } as EruptionSequence

afterEach(() => { cleanup(); vi.resetAllMocks() })

describe('preset dashboard', () => {
  it('distinguishes finite-time snapshot scope from eventual totals in the data dialog', async () => {
    vi.mocked(simulate).mockResolvedValue(result)
    vi.mocked(eruption).mockResolvedValue(sequence)
    render(<Dashboard catalog={catalog} simulation={null} simulationSequence={null} />)
    await screen.findByRole('img', { name: /Deposit distribution/ })
    const dialog = screen.getByRole('dialog', { hidden: true })
    dialog.setAttribute('open', '')
    expect(within(dialog).getByText('Synthetic A · Eventual totals')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Event snapshots' }))
    expect(within(dialog).getByText('Synthetic A · Computed event snapshots')).toBeTruthy()
    expect(within(dialog).queryByText('Synthetic A · Eventual totals')).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Locations' }))
    expect(within(dialog).getByText('Synthetic A · Eventual totals')).toBeTruthy()
  })
  it('calculates a preset and exposes numerical charts without spatial simulation', async () => {
    vi.mocked(simulate).mockResolvedValue(result)
    vi.mocked(eruption).mockResolvedValue(sequence)
    render(<Dashboard catalog={catalog} simulation={null} simulationSequence={null} />)
    expect(await screen.findByRole('img', { name: /Deposit distribution/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Final sampled thickness 2/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Synthetic municipality, 2 millimeters/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Run simulation' })).toBeNull()
    expect(screen.queryByRole('slider')).toBeNull()
  })
  it('hides prior charts when another preset fails and retries the selected preset', async () => {
    vi.mocked(simulate).mockResolvedValueOnce(result).mockRejectedValueOnce(new Error('Backend unavailable')).mockResolvedValueOnce({ ...result, scenario: catalog.scenarios[1].scenario })
    vi.mocked(eruption).mockResolvedValueOnce(sequence).mockResolvedValueOnce({ ...sequence, scenario: catalog.scenarios[1].scenario })
    render(<Dashboard catalog={catalog} simulation={null} simulationSequence={null} />)
    await screen.findByRole('img', { name: /Deposit distribution/ })
    fireEvent.change(screen.getByLabelText('Scenario'), { target: { value: 'b' } })
    await screen.findByRole('alert')
    expect(screen.queryByRole('img', { name: /Deposit distribution/ })).toBeNull()
    expect((screen.getByRole('button', { name: 'View raw data' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry preset' }))
    await waitFor(() => expect(screen.getByRole('img', { name: /Deposit distribution/ })).toBeTruthy())
    expect(vi.mocked(simulate).mock.calls.at(-1)?.[0].label).toBe('Synthetic B')
  })
})

describe('live timeline synchronization', () => {
  const twoTowns = { ...result, summary: { ...result.summary, reporting_cutoff_mm: 0.5 }, receptors: [
    { id: 'one', name: 'Town One', kind: 'municipality', in_domain: true, thickness_mm: 2, population_year: 2024, screening: {}, screening_reasons: {} },
    { id: 'two', name: 'Town Two', kind: 'municipality', in_domain: true, thickness_mm: 1, population_year: 2024, screening: {}, screening_reasons: {} },
  ] } as SimulationResult
  const live = { scenario, frames: [
    { phase: 'before', elapsed_s: 0, receptors: [{ id: 'one', thickness_mm: 0 }, { id: 'two', thickness_mm: 0 }] },
    { phase: 'erupting', elapsed_s: 1800, receptors: [{ id: 'one', thickness_mm: 0.2 }, { id: 'two', thickness_mm: 0.6 }] },
    { phase: 'after', elapsed_s: 3600, receptors: [{ id: 'one', thickness_mm: 2 }, { id: 'two', thickness_mm: 1 }] },
  ] } as unknown as EruptionSequence
  function show(frame: EruptionSequence['frames'][number] | null) {
    vi.mocked(simulate).mockResolvedValue(twoTowns)
    vi.mocked(eruption).mockResolvedValue(live)
    return render(<Dashboard catalog={catalog} simulation={twoTowns} simulationSequence={live} frame={frame} embedded />)
  }

  it('shows no deposits before the eruption starts', () => {
    show(live.frames[0])
    expect(screen.getByText('No ash deposited yet at this snapshot.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Town One, 2 millimeters/ })).toBeNull()
    expect(screen.getByRole('img', { name: /Current snapshot Before eruption · 0 h: 0 millimeters/ })).toBeTruthy()
    expect(screen.getByRole('img', { name: /Deposit distribution\. Below trace \(<0\.01 mm\): 2/ })).toBeTruthy()
  })

  it('re-ranks and recounts from the current snapshot during the eruption', () => {
    show(live.frames[1])
    const rows = screen.getAllByRole('button', { name: /millimeters, select time series/ })
    expect(rows[0].getAttribute('aria-label')).toMatch(/^Town Two, 0\.6 millimeters/)
    expect(rows[1].getAttribute('aria-label')).toMatch(/^Town One, 0\.2 millimeters/)
    expect(screen.getByText('Top 2 at During · 0.5 h')).toBeTruthy()
    expect(screen.getByRole('img', { name: /Trace \(0\.01–<0\.5 mm\): 1; 0\.5–<1 mm: 1/ })).toBeTruthy()
  })

  it('keeps eventual totals when no shared frame is supplied', () => {
    show(null)
    expect(screen.getByText('Top 2 municipal centroids · eventual totals')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Town One, 2 millimeters/ })).toBeTruthy()
  })
})
