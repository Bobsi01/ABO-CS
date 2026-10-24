import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import VolcanoScene from './VolcanoScene'
import type { EruptionSequence, Scenario, SimulationResult } from '../api/simulator'

const renderer = vi.hoisted(() => ({
  created: undefined as
    | undefined
    | ((state: { gl: { domElement: HTMLCanvasElement; render: () => void } }) => void),
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ onCreated }: { onCreated: typeof renderer.created }) => {

    renderer.created = onCreated

    return null

  },
}))
const fixture = {
  column_height_m: 3000,
  vent_elevation_m: 311,
  wind_from_deg: 180,
  wind_speed_m_s: 10,
  grains: [{ settling_speed_m_s: 2 }],
} as Scenario
const completed = {
  illustration: { paths: [{ grain_index: 0, diameter_um: 100, settling_time_s: 750 }] },
} as SimulationResult

function graphicsAvailable() {

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    getExtension: () => null,
  } as unknown as WebGL2RenderingContext)
  const changes = new EventTarget()
  const media = {
    matches: false,
    addEventListener: vi.fn(changes.addEventListener.bind(changes)),
    removeEventListener: vi.fn(changes.removeEventListener.bind(changes)),
  }

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  )

  return { media, changes }

}

afterEach(() => {

  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()

})
describe('graphics fallback', () => {

  it('keeps a clear alternative and disables graphics controls when WebGL 2 is unavailable', () => {

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    )
    render(<VolcanoScene scenario={fixture} result={null} selected={null} onSelect={vi.fn()} />)
    expect(screen.getByRole('heading', { name: '3D needs WebGL 2' })).toBeTruthy()
    expect(
      screen.getByText(/Run simulations normally, then use the map, stage slider/),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry 3D' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Play settling' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByRole('button', { name: 'Reset camera' }).hasAttribute('disabled')).toBe(true)

  })
  it('starts paused and pauses a user-started replay when the document becomes hidden', () => {

    graphicsAvailable()
    render(
      <VolcanoScene scenario={fixture} result={completed} selected={null} onSelect={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Play settling' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Play settling' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.getByRole('button', { name: 'Play settling' })).toBeTruthy()

  })
  it('pauses when reduced-motion becomes active and removes its media listener on unmount', () => {

    const { media, changes } = graphicsAvailable()
    const view = render(
      <VolcanoScene scenario={fixture} result={completed} selected={null} onSelect={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Play settling' }))
    media.matches = true
    act(() => changes.dispatchEvent(new Event('change')))
    expect(screen.getByRole('button', { name: 'Play settling' })).toBeTruthy()
    view.unmount()
    expect(media.removeEventListener).toHaveBeenCalledWith(
      'change',
      media.addEventListener.mock.calls[0][1],
    )

  })
  it('pauses and exposes the usable fallback when an initialized graphics context is lost', () => {

    graphicsAvailable()
    const availability = vi.fn()
    const view = render(
      <VolcanoScene
        scenario={fixture}
        result={completed}
        selected={null}
        onSelect={vi.fn()}
        onAvailabilityChange={availability}
      />,
    )
    const canvas = document.createElement('canvas')
    const remove = vi.spyOn(canvas, 'removeEventListener')

    act(() => renderer.created?.({ gl: { domElement: canvas, render: vi.fn() } }))
    fireEvent.click(screen.getByRole('button', { name: 'Play settling' }))
    act(() => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
    expect(screen.getByRole('heading', { name: '3D needs WebGL 2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Play settling' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(availability).toHaveBeenLastCalledWith(false)
    fireEvent.click(screen.getByRole('button', { name: 'Retry 3D' }))
    expect(availability).toHaveBeenLastCalledWith(true)
    view.unmount()
    expect(remove).toHaveBeenCalledWith('webglcontextlost', expect.any(Function))

  })
  it('labels grain paths with backend falling time and submitted class speed', () => {

    graphicsAvailable()
    render(
      <VolcanoScene scenario={fixture} result={completed} selected={null} onSelect={vi.fn()} />,
    )
    expect(screen.getByRole('list', { name: 'Grain-class legend' }).textContent).toContain(
      'Class 1 · 100 µm · 2 m/s · representative fall 750 s',
    )

  })
  it('uses the shared eruption frame and removes its independent settling clock controls', () => {

    graphicsAvailable()
    const sequence = {
      scenario: fixture,
      frames: [
        { phase: 'before', column_top_m: 0 },
        { phase: 'erupting', column_top_m: 2000 },
      ],
      fountain_label: 'Schematic Taal fountain.',
      fountain_paths_m: [],
      lava: { enabled: false, path: [] },
    } as unknown as EruptionSequence
    const view = render(
      <VolcanoScene
        scenario={fixture}
        result={completed}
        selected={null}
        onSelect={vi.fn()}
        eruptionSequence={sequence}
        frameIndex={0}
      />,
    )

    expect(screen.getByText('Before eruption · clear source')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Play settling' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Replay from start' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Reset camera' })).toBeTruthy()
    view.rerender(
      <VolcanoScene
        scenario={fixture}
        result={completed}
        selected={null}
        onSelect={vi.fn()}
        eruptionSequence={sequence}
        frameIndex={1}
        sequencePlaying
      />,
    )
    expect(screen.getByText('Rising source column 2 km')).toBeTruthy()
    expect(screen.getByRole('status').textContent).not.toContain('20 display seconds')

  })
  it('hides fixed geographic terrain when the vent is edited instead of moving real geography', async () => {

    graphicsAvailable()
    const asset = {
      volcano_id: 'taal',
      origin: { lat: 14, lon: 121 },
      east_m: [-1000, 1000],
      north_m: [-1000, 1000],
      elevation_m: [
        [0, 300],
        [10, 200],
      ],
      land_mask: [
        [0, 1],
        [1, 1],
      ],
      water_level_m: [
        [0, 0],
        [0, 0],
      ],
      vent_ground_m: 311,
      source: {
        title: 'Synthetic terrain fixture',
        url: 'https://example.com/fixture',
        resolution_m: 2000,
        datum: 'EGM96',
        review_status: 'synthetic',
      },
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(asset))))
    render(
      <VolcanoScene
        scenario={{ ...fixture, volcano_id: 'taal', vent_lat: 14.01, vent_lon: 121 }}
        result={null}
        selected={null}
        onSelect={vi.fn()}
      />,
    )
    expect(
      (await screen.findAllByText(/The edited vent differs from the fixed terrain origin/)).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(/Schematic terrain fallback/)).toBeTruthy()

  })
  it('announces temporary terrain loading and a failed asset without requiring a disclosure to be opened', async () => {

    graphicsAvailable()
    let rejectAsset: (reason: Error) => void = () => undefined

    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((_resolve, reject) => {

            rejectAsset = reject

          }),
      ),
    )
    render(
      <VolcanoScene
        scenario={{ ...fixture, volcano_id: 'taal', vent_lat: 14, vent_lon: 121 }}
        result={null}
        selected={null}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.getByRole('status').textContent).toContain('Loading geographic terrain')
    await act(async () => rejectAsset(new Error('Local asset failed')))
    expect(screen.getByRole('status').textContent).toContain('geographic terrain unavailable')

  })
  it('loads local geographic metadata while leaving the detached quantitative layer off initially', async () => {

    graphicsAvailable()
    const asset = {
      volcano_id: 'taal',
      origin: { lat: 14, lon: 121 },
      east_m: [-1000, 1000],
      north_m: [-1000, 1000],
      elevation_m: [
        [0, 300],
        [10, 200],
      ],
      land_mask: [
        [0, 1],
        [1, 1],
      ],
      water_level_m: [
        [0, 0],
        [0, 0],
      ],
      vent_ground_m: 311,
      source: {
        title: 'Synthetic terrain fixture',
        url: 'https://example.com/fixture',
        resolution_m: 2000,
        datum: 'EGM96',
        review_status: 'synthetic',
      },
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...asset,
          source: { ...asset.source, attribution: 'Synthetic display-source attribution' },
        }),
      ),
    )

    vi.stubGlobal('fetch', fetchMock)
    const view = render(
      <VolcanoScene
        scenario={{ ...fixture, volcano_id: 'taal', vent_lat: 14, vent_lon: 121 }}
        result={completed}
        selected={null}
        onSelect={vi.fn()}
      />,
    )

    expect(await screen.findByText(/Synthetic terrain fixture/)).toBeTruthy()
    expect(screen.getByText('Taal · Volcano Island')).toBeTruthy()
    expect(screen.getByText('Island relief ×6 · horizontal 1:1')).toBeTruthy()
    expect(screen.getByText('Synthetic display-source attribution')).toBeTruthy()
    fireEvent.click(screen.getByText('Illustration guide'))
    expect(
      screen.getByText(/The column starts at the submitted 311 m ASL model datum/),
    ).toBeTruthy()
    expect(
      (screen.getByRole('checkbox', { name: 'Show detached deposit layer' }) as HTMLInputElement)
        .checked,
    ).toBe(false)
    const camera = screen.getByRole('combobox', { name: /Camera view/ })

    fireEvent.keyDown(camera, { key: 'End' })
    fireEvent.keyDown(camera, { key: 'Enter' })
    expect(screen.getByText('Terrain scale 1:1')).toBeTruthy()
    expect(screen.queryByText('Island relief ×6 · horizontal 1:1')).toBeNull()
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal

    view.unmount()
    expect(signal.aborted).toBe(true)

  })

})
