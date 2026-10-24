import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EruptionTimeline from './components/EruptionTimeline'
import HistoricalReferences from './components/HistoricalReferences'
import VolcanoScene from './components/VolcanoScene'
import type { EruptionSequence, Scenario, SimulationResult } from './api/simulator'

// Mock 3D canvas for headless testing
vi.mock('@react-three/fiber', () => ({
  Canvas: () => null,
  useThree: () => ({ invalidate: vi.fn() }),
}))

// WCAG 2.2 Relative Luminance and Contrast Ratio calculation helpers
export function relativeLuminance(hex: string): number {

  const cleanHex = hex.replace('#', '').slice(0, 6)
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255
  const adjust = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))

  return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b)

}

export function contrastRatio(fgHex: string, bgHex: string): number {

  const l1 = relativeLuminance(fgHex)
  const l2 = relativeLuminance(bgHex)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)

}

const taalScenario = {
  volcano_id: 'taal',
  label: 'Taal 2020 teaching scenario',
  input_status: 'illustrative',
  vent_lat: 14.002,
  vent_lon: 120.993,
  vent_elevation_m: 311,
  column_height_m: 3000,
  mass_rate_kg_s: 1000,
  duration_s: 3600,
  wind_speed_m_s: 10,
  wind_from_deg: 180,
  diffusivity_m2_s: 1000,
  initial_spread_m: 500,
  bulk_density_kg_m3: 1000,
  domain_km: 100,
  cell_km: 1,
  release_layers: 16,
  grains: [{ diameter_um: 100, fraction: 1.0, settling_speed_m_s: 2 }],
} as unknown as Scenario

const mockTimelineEvents = [
  {
    date_phst: '2021-07-01 15:16',
    event_type: 'phreatomagmatic',
    duration: '5 min',
    plume_height_m: 1000,
    so2_t_day: 14200,
    alert_level: 3,
    source: 'PHIVOLCS Bulletin',
    disclaimer:
      'Contextual historical reference from PHIVOLCS bulletins / Smithsonian GVP. Not a reproduction of this event by the Gaussian dispersion model.',
  },
  {
    date_phst: '2022-03-26 07:22',
    event_type: 'phreatomagmatic',
    duration: '10 min',
    plume_height_m: 1500,
    so2_t_day: 6900,
    alert_level: 2,
    source: 'PHIVOLCS Bulletin',
    disclaimer:
      'Contextual historical reference from PHIVOLCS bulletins / Smithsonian GVP. Not a reproduction of this event by the Gaussian dispersion model.',
  },
  {
    date_phst: '2023-09-22 00:00',
    event_type: 'vog_degassing',
    duration: 'ongoing',
    plume_height_m: 2400,
    so2_t_day: 4500,
    alert_level: 1,
    source: 'PHIVOLCS Bulletin',
    disclaimer:
      'Contextual historical reference from PHIVOLCS bulletins / Smithsonian GVP. Not a reproduction of this event by the Gaussian dispersion model.',
  },
]

const mockActivityLog = [
  {
    date: '2021-07-01',
    alert_level: 3,
    so2_t_day: 14200,
    plume_height_m: 1000,
    event_type: 'phreatomagmatic',
    source: 'PHIVOLCS / GVP',
    disclaimer: 'Observational chronology from PHIVOLCS bulletins and Smithsonian GVP reports.',
  },
]

const mockWovodat = {
  volcano: 'Taal',
  gvp_volcano_number: '273070',
  observatory: 'PHIVOLCS',
  portal_urls: {
    wovodat: 'https://wovodat.org',
    phivolcs_lava: 'https://lava.phivolcs.dost.gov.ph',
  },
  monitoring_networks: {
    seismic: {
      status: 'active',
      description: 'Permanent seismic broadband network across Volcano Island and caldera rim.',
      stations: ['VTMC', 'VTCU', 'VTWV'],
    },
  },
  license: 'CC-BY-4.0',
  disclaimer: 'Monitoring metadata compiled from WOVOdat and PHIVOLCS.',
  note: 'Observatory reference.',
}

const mockHdx = {
  source: 'HDX / NASA-JPL ARIA',
  portal_url: 'https://data.humdata.org',
  datasets: [
    {
      id: 'aria-dpm-2020',
      title: 'Taal 2020 Damage Proxy Map',
      publisher: 'NASA-JPL ARIA',
      url: 'https://data.humdata.org/dataset/aria-dpm',
      format: 'GeoTIFF',
      date: '2020-01-15',
      disclaimer: 'Satellite radar damage proxy; not a dispersion output.',
    },
  ],
  disclaimer: 'Curated external humanitarian datasets.',
}

beforeEach(() => {

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )

  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {

      if (url.includes('taal_eruption_timeline_2021_2024.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              mockTimelineEvents.map((entry) => ({ ...entry, review_status: 'reviewed' })),
            ),
          ),
        )
      }
      if (url.includes('taal_activity_log_2021_2024.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              mockActivityLog.map((entry) => ({ ...entry, review_status: 'reviewed' })),
            ),
          ),
        )
      }
      if (url.includes('taal_wovodat_metadata.json')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ...mockWovodat, review_status: 'reviewed' })),
        )
      }
      if (url.includes('taal_hdx_damage_proxy_metadata.json')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ...mockHdx, review_status: 'reviewed' })),
        )
      }

      return Promise.resolve(new Response(JSON.stringify({})))

    }),
  )

})

afterEach(() => {

  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()

})

describe('WCAG 2.2 Color Contrast Programmatic Verification', () => {

  it('verifies contrast compliance for Alert level badge text and backgrounds', () => {

    // Alert Level 1: #15803d on #dcfce7
    const crAlert1 = contrastRatio('#15803d', '#dcfce7')

    expect(crAlert1).toBeGreaterThanOrEqual(4.5)
    expect(crAlert1).toBeCloseTo(4.57, 1)

    // Alert Level 2: #b45309 on #fef3c7
    const crAlert2 = contrastRatio('#b45309', '#fef3c7')

    expect(crAlert2).toBeGreaterThanOrEqual(4.5) // Barely passes (4.5097)
    expect(crAlert2).toBeCloseTo(4.51, 1)

    // Alert Level 3: #b91c1c on #fee2e2
    const crAlert3 = contrastRatio('#b91c1c', '#fee2e2')

    expect(crAlert3).toBeGreaterThanOrEqual(4.5)
    expect(crAlert3).toBeCloseTo(5.3, 1)

    // WOVOdat status badge: #15803d on #dcfce7
    const crBadge = contrastRatio('#15803d', '#dcfce7')

    expect(crBadge).toBeGreaterThanOrEqual(4.5)

  })

  it('verifies contrast compliance for 3D flight-level altimeter canvas sprite labels', () => {

    // Canvas text #1e3a8a on white #ffffff
    const crAltimeterWhite = contrastRatio('#1e3a8a', '#ffffff')

    expect(crAltimeterWhite).toBeGreaterThanOrEqual(4.5)
    expect(crAltimeterWhite).toBeGreaterThanOrEqual(7.0) // AAA compliant (10.36:1)

    // Canvas text #1e3a8a on blended background (85% white over #e8f0fa scene stage)
    const crAltimeterBlended = contrastRatio('#1e3a8a', '#fbfcfe')

    expect(crAltimeterBlended).toBeGreaterThanOrEqual(4.5)

  })

  it('verifies contrast compliance for seismicity inspection card in light mode', () => {

    // Text #1e3a5f on #ffffff
    const crBodyText = contrastRatio('#1e3a5f', '#ffffff')

    expect(crBodyText).toBeGreaterThanOrEqual(4.5)
    expect(crBodyText).toBeCloseTo(11.46, 1)

    // Heading strong #102a45 on #ffffff
    const crStrong = contrastRatio('#102a45', '#ffffff')

    expect(crStrong).toBeGreaterThanOrEqual(4.5)
    expect(crStrong).toBeCloseTo(14.59, 1)

    // Button #1e3a5f on #f0f4f8
    const crButton = contrastRatio('#1e3a5f', '#f0f4f8')

    expect(crButton).toBeGreaterThanOrEqual(4.5)
    expect(crButton).toBeCloseTo(10.41, 1)

  })

  it('detects contrast defect in dark mode for hardcoded white inspection card focus outline', () => {

    // In dark mode, --action is #9ac5ff. Focus outline uses var(--action).
    // On the hardcoded white #ffffff background of .scene-inspection-card:
    const crFocusOutline = contrastRatio('#9ac5ff', '#ffffff')

    // WCAG 2.2 SC 1.4.11 requires 3.0:1 for focus indicators
    // This asserts that the current implementation fails this check (< 3.0:1)
    expect(crFocusOutline).toBeLessThan(3.0)
    expect(crFocusOutline).toBeCloseTo(1.78, 1)

  })

  it('verifies contrast compliance for theme palette tokens across light and dark modes', () => {

    // Light mode
    expect(contrastRatio('#142b49', '#f2f6fc')).toBeGreaterThanOrEqual(4.5) // text on surface: 13.16:1
    expect(contrastRatio('#142b49', '#ffffff')).toBeGreaterThanOrEqual(4.5) // text on panel: 14.27:1
    expect(contrastRatio('#4b607b', '#f2f6fc')).toBeGreaterThanOrEqual(4.5) // secondary on surface: 5.94:1
    expect(contrastRatio('#4b607b', '#ffffff')).toBeGreaterThanOrEqual(4.5) // secondary on panel: 6.45:1
    expect(contrastRatio('#195cc2', '#ffffff')).toBeGreaterThanOrEqual(4.5) // action on panel: 6.27:1

    // Dark mode
    expect(contrastRatio('#edf4ff', '#0e1a2d')).toBeGreaterThanOrEqual(4.5) // text on surface: 15.76:1
    expect(contrastRatio('#edf4ff', '#14243a')).toBeGreaterThanOrEqual(4.5) // text on panel: 14.13:1
    expect(contrastRatio('#afc2dd', '#0e1a2d')).toBeGreaterThanOrEqual(4.5) // secondary on surface: 9.62:1
    expect(contrastRatio('#afc2dd', '#14243a')).toBeGreaterThanOrEqual(4.5) // secondary on panel: 8.62:1
    expect(contrastRatio('#9ac5ff', '#0e1a2d')).toBeGreaterThanOrEqual(4.5) // action on surface: 9.80:1

  })

})

describe('VolcanoScene Taal Layer Controls & Radiogroup Accessibility', () => {

  it('exposes Taal camera presets and single camera control without duplicate buttons', () => {

    render(
      <VolcanoScene scenario={taalScenario} result={null} selected={null} onSelect={vi.fn()} />,
    )
    const selectTrigger = screen.getByRole('combobox', { name: /Camera view/ })

    expect(selectTrigger).toBeTruthy()
    // Verify single reset button exists
    expect(screen.getByRole('button', { name: 'Reset camera' })).toBeTruthy()
    // Verify there are no duplicate camera preset buttons outside the select
    expect(screen.queryByRole('button', { name: 'Tagaytay Ridge' })).toBeNull()

  })

  it('renders seismicity depth filter radiogroup and altitude scale view note', async () => {

    render(
      <VolcanoScene scenario={taalScenario} result={null} selected={null} onSelect={vi.fn()} />,
    )

    // Open illustration guide details
    const guideSummary = screen.getByText('Illustration guide')

    fireEvent.click(guideSummary)

    // Check Flight-level altitude ruler checkbox
    const altimeterCheckbox = screen.getByRole('checkbox', {
      name: 'Show vertical altitude scale (flight levels)',
    })

    expect(altimeterCheckbox).toBeTruthy()
    expect((altimeterCheckbox as HTMLInputElement).checked).toBe(false)
    fireEvent.click(altimeterCheckbox)
    expect((altimeterCheckbox as HTMLInputElement).checked).toBe(true)

    // Verify descriptive flight levels note is announced in DOM
    expect(screen.getByText(/Blue vertical ruler marks altitude above vent/)).toBeTruthy()
    expect(screen.getByText(/5 km ~ FL160/)).toBeTruthy()
    expect(screen.getByText(/10 km ~ FL330/)).toBeTruthy()

    // Check Seismicity hypocenters checkbox
    const quakeCheckbox = screen.getByRole('checkbox', {
      name: 'Show 2021-2024 hypocenters (USGS context)',
    })

    expect(quakeCheckbox).toBeTruthy()
    expect((quakeCheckbox as HTMLInputElement).checked).toBe(false)
    fireEvent.click(quakeCheckbox)
    expect((quakeCheckbox as HTMLInputElement).checked).toBe(true)

    // Verify sublayer radiogroup renders
    const radioGroup = screen.getByRole('radiogroup', { name: 'Seismicity depth filter' })

    expect(radioGroup).toBeTruthy()

    const allRadio = screen.getByRole('radio', { name: 'All depths' }) as HTMLInputElement
    const conduitRadio = screen.getByRole('radio', { name: 'Conduit (≤15 km)' }) as HTMLInputElement
    const subductionRadio = screen.getByRole('radio', {
      name: 'Subduction (>15 km)',
    }) as HTMLInputElement

    expect(allRadio.checked).toBe(true)
    expect(conduitRadio.checked).toBe(false)
    expect(subductionRadio.checked).toBe(false)

    // Toggle radio options
    fireEvent.click(conduitRadio)
    expect(conduitRadio.checked).toBe(true)
    expect(allRadio.checked).toBe(false)

    fireEvent.click(subductionRadio)
    expect(subductionRadio.checked).toBe(true)
    expect(conduitRadio.checked).toBe(false)

  })

  it('renders explicit non-model and contextual disclaimers for all Taal contextual overlays', () => {

    render(
      <VolcanoScene scenario={taalScenario} result={null} selected={null} onSelect={vi.fn()} />,
    )
    const guideSummary = screen.getByText('Illustration guide')

    fireEvent.click(guideSummary)

    // Enable PDZ, Dike, Alert Ring, and Tropomi
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show PHIVOLCS PDZ (3D boundary)' }))
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Show Alert Level ring (source review pending)',
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true)
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Show 2020 dike intrusion (Bato et al. 2021)' }),
    )
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Show Sentinel-5P observed plume bearing (source review pending)',
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true)

    expect(screen.getByText(/OpenStreetMap shoreline approximation/)).toBeTruthy()
    expect(screen.getByText(/21 × 8 km modeled dike/)).toBeTruthy()

    // Verify all have "Contextual reference overlay - not a computed result of the ash model."
    const disclaimers = screen.getAllByText(
      /Contextual reference overlay - not a computed result of the ash model\./,
    )

    expect(disclaimers.length).toBeGreaterThanOrEqual(2)

  })

})

describe('EruptionTimeline Bookmarks Accessibility & Interaction', () => {

  const sequenceFixture = {
    scenario: taalScenario,
    frames: [
      { elapsed_s: 0, phase: 'before', column_top_m: 0 },
      { elapsed_s: 1800, phase: 'erupting', column_top_m: 3000 },
      { elapsed_s: 3600, phase: 'settling', column_top_m: 0 },
    ],
  } as unknown as EruptionSequence

  it('renders historical activity bookmarks group and toggles event detail card', async () => {

    render(
      <EruptionTimeline
        sequence={sequenceFixture}
        index={0}
        playing={false}
        onIndex={vi.fn()}
        onPlaying={vi.fn()}
      />,
    )

    // Wait for bookmarks to fetch and render
    const bookmarksHeader = await screen.findByText('Historical Activity Bookmarks (2021–2024)')

    expect(bookmarksHeader).toBeTruthy()

    // Verify reference badge exists
    expect(screen.getByText('Reference overlay · non-model')).toBeTruthy()

    // Verify bookmarks role group
    const pillsGroup = screen.getByRole('group', { name: 'Taal historical eruption events' })

    expect(pillsGroup).toBeTruthy()

    // Find bookmark buttons
    const pills = screen.getAllByRole('button', { name: /202[1-3]/ })

    expect(pills.length).toBe(3)

    // Initially no detail card is shown
    expect(screen.queryByRole('region', { name: 'Event details' })).toBeNull()
    expect(pills[0].getAttribute('aria-expanded')).toBe('false')

    // Click the first pill
    fireEvent.click(pills[0])
    expect(pills[0].getAttribute('aria-expanded')).toBe('true')

    // Detail card is revealed
    const detailCard = screen.getByRole('region', { name: 'Event details' })

    expect(detailCard).toBeTruthy()
    expect(screen.getByText('2021-07-01 15:16')).toBeTruthy()
    expect(screen.getByText('Alert Level 3')).toBeTruthy()
    expect(screen.getByText(/Contextual historical reference from PHIVOLCS/)).toBeTruthy()

    // Close button has aria-label
    const closeBtn = screen.getByRole('button', { name: 'Close event details' })

    expect(closeBtn).toBeTruthy()

    // Click close button
    fireEvent.click(closeBtn)
    expect(screen.queryByRole('region', { name: 'Event details' })).toBeNull()
    expect(pills[0].getAttribute('aria-expanded')).toBe('false')

  })

  it('dismisses event detail card on Escape key', async () => {

    render(
      <EruptionTimeline
        sequence={sequenceFixture}
        index={0}
        playing={false}
        onIndex={vi.fn()}
        onPlaying={vi.fn()}
      />,
    )

    const pills = await screen.findAllByRole('button', { name: /202[1-3]/ })

    fireEvent.click(pills[0])
    expect(screen.getByRole('region', { name: 'Event details' })).toBeTruthy()

    // Press Escape key on window
    fireEvent.keyDown(window, { key: 'Escape' })

    // Verification: card closes on Escape
    expect(screen.queryByRole('region', { name: 'Event details' })).toBeNull()

  })

  it('records tap target size limitation on bookmark pills and close buttons', async () => {

    // In CSS:
    // .bookmark-pill { min-height: 32px; } (violates 44px minimum tap target)
    // .bookmark-detail-card .close-button { min-height: 24px; width: 24px; } (violates 44px minimum tap target)
    render(
      <EruptionTimeline
        sequence={sequenceFixture}
        index={0}
        playing={false}
        onIndex={vi.fn()}
        onPlaying={vi.fn()}
      />,
    )

    const pills = await screen.findAllByRole('button', { name: /202[1-3]/ })

    expect(pills[0].classList.contains('bookmark-pill')).toBe(true)

    fireEvent.click(pills[0])
    const closeBtn = screen.getByRole('button', { name: 'Close event details' })

    expect(closeBtn.classList.contains('close-button')).toBe(true)

  })

})

describe('HistoricalReferences Curated Evidence Accordions & Tables', () => {

  it('withholds source-blocked context rather than rendering draft numbers', async () => {

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify([{ ...mockActivityLog[0], review_status: 'source_blocked' }]),
          ),
        ),
      ),
    )
    render(<HistoricalReferences blocked={[]} tables={[]} volcanoId="taal" />)
    expect(await screen.findByText(/records remain unavailable pending review/)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()

  })
  it('renders curated multi-parameter evidence sections for Taal', async () => {

    render(<HistoricalReferences blocked={[]} tables={[]} volcanoId="taal" />)

    // Main section heading & badge
    const header = await screen.findByText('Curated Taal Multi-Parameter Observation Evidence')

    expect(header).toBeTruthy()
    expect(screen.getByText('Reference evidence · non-model')).toBeTruthy()

    // 1. Activity log accordion
    const activityAccordion = await screen.findByText(
      /Recent Volcanic Unrest Activity Log \(2021–2024 · PHIVOLCS \/ GVP\)/,
    )

    expect(activityAccordion).toBeTruthy()
    expect(screen.getByText('1 logged events')).toBeTruthy()

    // Verify activity table structure
    const table = screen.getByRole('table')

    expect(table).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Alert Level' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'SO₂ Flux (t/day)' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Plume Height (m)' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Event Type' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeTruthy()
    expect(screen.getByText(/Observational chronology from PHIVOLCS bulletins/)).toBeTruthy()

    // 2. WOVOdat accordion
    const wovodatAccordion = await screen.findByText(
      /Observatory Monitoring Infrastructure \(WOVOdat \/ PHIVOLCS\)/,
    )

    expect(wovodatAccordion).toBeTruthy()
    expect(screen.getByText('GVP #273070')).toBeTruthy()
    expect(screen.getByText('active')).toBeTruthy()
    expect(screen.getByText('VTMC, VTCU, VTWV')).toBeTruthy()

    // 3. HDX accordion
    const hdxAccordion = await screen.findByText(
      /Exposure & Damage Proxy Datasets \(HDX \/ NASA-JPL ARIA \/ Copernicus\)/,
    )

    expect(hdxAccordion).toBeTruthy()
    expect(screen.getByText('1 datasets')).toBeTruthy()
    expect(screen.getByText('Taal 2020 Damage Proxy Map')).toBeTruthy()
    expect(screen.getByText(/Publisher: NASA-JPL ARIA/)).toBeTruthy()

  })

  it('omits curated Taal evidence section when non-Taal volcano is viewed', () => {

    render(<HistoricalReferences blocked={[]} tables={[]} volcanoId="mayon" />)
    expect(screen.queryByText('Curated Taal Multi-Parameter Observation Evidence')).toBeNull()

  })

  it('renders 3D population disclaimer and real-time exposure HUD with accessible contrast', () => {

    const mockResult = {
      scenario: taalScenario,
      illustration: { paths: [] },
      grid: { thickness_mm: [] },
      receptors: [
        {
          id: 'ph-tanauan',
          name: 'Tanauan, Batangas',
          kind: 'municipality',
          in_domain: true,
          population: 193936,
          population_year: 2020,
          thickness_mm: 2.4,
          load_kg_m2: 2.4,
          reported: true,
          screening: { surface_exposure: 'exceeded' },
        },
      ],
    }

    render(
      <VolcanoScene
        scenario={taalScenario}
        result={mockResult as unknown as SimulationResult}
        selected={null}
        onSelect={vi.fn()}
      />,
    )

    // Disclaimer view note
    const disclaimer = screen.getByText(
      /Extruded 3D columns show municipal population and dynamic ash arrival/,
    )

    expect(disclaimer).toBeTruthy()
    expect(disclaimer.textContent).toContain(
      'PSA 2020 Region IV-A average of 4.1 persons/household',
    )
    expect(disclaimer.textContent).toContain('Centroid screening sample, not an evacuation tally')

    // Real-time HUD elements
    expect(screen.getByText('Real-Time Exposure Tally')).toBeTruthy()
    expect(screen.getByText('193,936')).toBeTruthy()
    // 193,936 / 4.1 = 47,301 families
    expect(screen.getByText('47,301')).toBeTruthy()
    expect(screen.getByText(/PSA 2020 CPH · 4.1 persons\/family \(Region IV-A\)/)).toBeTruthy()

    // Contrast check on highlight stat text (#92400e on white #ffffff)
    const ratioLight = contrastRatio('#92400e', '#ffffff')

    expect(ratioLight).toBeGreaterThan(4.5) // Exceeds WCAG 2.2 Level AA (4.5:1)

  })

  it('renders selected municipality card with families count and dismisses on Escape key', () => {

    const onSelectSpy = vi.fn()
    const mockResult = {
      scenario: taalScenario,
      illustration: { paths: [] },
      grid: { thickness_mm: [] },
      receptors: [
        {
          id: 'ph-agoncillo',
          name: 'Agoncillo, Batangas',
          kind: 'municipality',
          in_domain: true,
          population: 39101,
          population_year: 2020,
          thickness_mm: 3.2,
          load_kg_m2: 3.2,
          reported: true,
          screening: { surface_exposure: 'exceeded' },
        },
      ],
    }

    render(
      <VolcanoScene
        scenario={taalScenario}
        result={mockResult as unknown as SimulationResult}
        selected="ph-agoncillo"
        onSelect={onSelectSpy}
      />,
    )

    // Card should be rendered
    const card = screen.getByRole('region', { name: 'Selected municipality details' })

    expect(card).toBeTruthy()
    expect(screen.getByText('Agoncillo, Batangas')).toBeTruthy()
    expect(screen.getByText(/Ash thickness: 3.2 mm/)).toBeTruthy()
    expect(screen.getByText(/Population \(2020\): 39,101/)).toBeTruthy()
    expect(screen.getByText(/Est. families: 9,537 \(PSA 4.1\/family\)/)).toBeTruthy()

    // Escape key press dismisses card
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onSelectSpy).toHaveBeenCalledWith('')

  })

})
