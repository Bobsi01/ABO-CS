import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VolcanoScene from './VolcanoScene'
import type { EruptionSequence, Scenario } from '../api/simulator'

vi.mock('@react-three/fiber', () => ({ Canvas: () => null }))
const fountainLabel = 'Prescribed Taal fountain; synthetic QA label, not a historical reenactment.'
const scenario = (volcano_id: string) => ({ volcano_id, column_height_m: 3000, vent_elevation_m: 300, wind_from_deg: 180, wind_speed_m_s: 10, grains: [] }) as unknown as Scenario
const sequence = (volcano_id: string, fountain: number[][][]) => ({
  scenario: scenario(volcano_id), frames: [{ phase: 'erupting', column_top_m: 2000 }],
  fountain_label: fountainLabel, fountain_paths_m: fountain, lava: { enabled: false, path: [] },
}) as unknown as EruptionSequence

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('independent scenario-specific mechanism disclosure', () => {
  it('omits a Taal fountain description for a Mayon sequence with no fountain geometry', () => {
    render(<VolcanoScene scenario={scenario('mayon')} result={null} selected={null} onSelect={vi.fn()} eruptionSequence={sequence('mayon', [])} />)
    expect(screen.queryByText(new RegExp(fountainLabel))).toBeNull()
    expect(screen.getByText(/No downslope lava channel is enabled/)).toBeTruthy()
  })

  it('retains the fountain description when a Taal sequence actually contains fountain paths', () => {
    render(<VolcanoScene scenario={scenario('taal')} result={null} selected={null} onSelect={vi.fn()} eruptionSequence={sequence('taal', [[[0, 0, 0], [10, 0, 30]]])} />)
    expect(screen.getByText(new RegExp(fountainLabel))).toBeTruthy()
    expect(screen.getByText(/Fountain arcs are enlarged 4×/)).toBeTruthy()
  })
})
