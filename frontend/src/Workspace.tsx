import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { eruption, getCatalog, replicate, simulate, sweep } from './api/simulator'
import type { Catalog, EruptionOptions, EruptionSequence, ReplicationResult, Scenario, SimulationResult, SweepResult } from './api/simulator'
import { csvCell, download, number } from './presentation'
import { scientificScopeNote } from './scientificScope'
import HistoricalReferences from './components/HistoricalReferences'
import HistoricalEvaluation from './components/HistoricalEvaluation'
import EvidenceDetails from './components/EvidenceDetails'
import ScientificViewBoundary from './components/ScientificViewBoundary'
import Icon from './components/Icon'
import Select from './components/Select'
import type { IconName } from './components/Icon'
import EruptionTimeline from './components/EruptionTimeline'
import ProvincialExposureExplorer from './components/ProvincialExposureExplorer'
import { ERUPTION_SOURCES } from './components/eruptionResearch'
import Dashboard from './components/Dashboard'

const VolcanoScene = lazy(() => import('./components/VolcanoScene'))
const GeographicMap = lazy(() => import('./components/GeographicMap'))
type Tab = 'dashboard' | '3d' | 'comparison' | 'sweep' | 'history' | 'help'
const fields: { key: keyof Scenario; name: string; unit: string; label: string; min?: number; max?: number; step?: number }[] = [
  { key: 'vent_lat', name: 'Vent latitude', unit: '(°)', label: 'Vent latitude (°)', min: -85, max: 85 },
  { key: 'vent_lon', name: 'Vent longitude', unit: '(°)', label: 'Vent longitude (°)', min: -180, max: 180 },
  { key: 'vent_elevation_m', name: 'Vent elevation', unit: '(m ASL)', label: 'Vent elevation (m ASL)', min: 0, max: 10000 },
  { key: 'column_height_m', name: 'Column above ground', unit: '(m)', label: 'Column above ground (m)', min: 0.001, max: 50000 },
  { key: 'mass_rate_kg_s', name: 'Modeled ash rate', unit: '(kg/s)', label: 'Modeled ash rate (kg/s)', min: 0, max: 1e12 },
  { key: 'duration_s', name: 'Duration', unit: '(s)', label: 'Duration (s)', min: 0.001, max: 31536000 },
  { key: 'wind_speed_m_s', name: 'Wind speed', unit: '(m/s)', label: 'Wind speed (m/s)', min: 0, max: 200 },
  { key: 'wind_from_deg', name: 'Wind FROM', unit: '(° clockwise from N)', label: 'Wind FROM (° clockwise from N)', min: 0, max: 359.999 },
  { key: 'diffusivity_m2_s', name: 'Diffusivity', unit: '(m²/s)', label: 'Diffusivity (m²/s)', min: 0, max: 1e7 },
  { key: 'initial_spread_m', name: 'Initial spread σ₀', unit: '(m)', label: 'Initial spread σ₀ (m)', min: 0.001, max: 100000 },
  { key: 'umbrella_radius_m', name: 'Umbrella cloud radius', unit: '(m)', label: 'Umbrella cloud radius (m)', min: 0, max: 50000 },
  { key: 'bulk_density_kg_m3', name: 'Bulk deposit density', unit: '(kg/m³)', label: 'Bulk deposit density (kg/m³)', min: 0.001, max: 10000 },
  { key: 'domain_km', name: 'Domain width', unit: '(km)', label: 'Domain width (km)', min: 1, max: 400 },
  { key: 'cell_km', name: 'Cell size', unit: '(km)', label: 'Cell size (km)', min: 0.25, max: 10, step: 0.25 },
]

export default function Workspace() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [draft, setDraft] = useState<Scenario | null>(null)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [sequence, setSequence] = useState<EruptionSequence | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [sequencePlaying, setSequencePlaying] = useState(false)
  const [sceneAvailable, setSceneAvailable] = useState(true)
  const sceneAvailability = useCallback((available: boolean) => { setSceneAvailable(available); if (!available) setSequencePlaying(false) }, [])
  const [eruptionOptions, setEruptionOptions] = useState<Partial<EruptionOptions>>({ include_lava: false })
  const [tab, setTab] = useState<Tab>('3d')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [parametersOpen, setParametersOpen] = useState(false)
  const [loading, setLoading] = useState('Loading the local scenario catalog…')
  const [error, setError] = useState('')
  const [stale, setStale] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [sort, setSort] = useState<'name' | 'thickness'>('thickness')
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null)
  const [historical, setHistorical] = useState<ReplicationResult | null>(null)
  const [screeningContextId, setScreeningContextId] = useState('')
  const [populationYear, setPopulationYear] = useState<2020 | 2024>(2024)
  const [comparison, setComparison] = useState<SimulationResult[]>([])
  const [manualWinds, setManualWinds] = useState([{ speed: '', from: '' }, { speed: '', from: '' }])
  const [activePresetId, setActivePresetId] = useState('')
  const [rawDataOpenCount, setRawDataOpenCount] = useState(0)
  const request = useRef<AbortController | null>(null)
  const catalogRequest = useRef<AbortController | null>(null)
  const inputRevision = useRef(0)
  const completedReporting = useRef(new WeakMap<SimulationResult, { screening_context: Record<string, string>; population_year: 2020 | 2024 }>())

  function loadCatalog() {
    catalogRequest.current?.abort()
    const controller = new AbortController()
    catalogRequest.current = controller
    setLoading('Loading the local scenario catalog…'); setError('')
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    getCatalog(controller.signal).then(data => {
      if (catalogRequest.current !== controller) return
      const initialScenario = data.scenarios.find(s => s.id === 'taal-regional')?.scenario ?? data.scenarios[0]?.scenario ?? null
      setCatalog(data); setDraft(initialScenario)
      if (!data.scenarios.length) setError('The catalog has no scenario. Add local inputs before running.')
    }).catch(err => {
      if (catalogRequest.current === controller) setError(`${err instanceof Error ? err.message : 'Connection failed.'} Start the local Python backend, then retry the catalog.`)
    }).finally(() => { window.clearTimeout(timeout); if (catalogRequest.current === controller) setLoading('') })
  }
  useEffect(() => {
    const controller = new AbortController()
    catalogRequest.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    getCatalog(controller.signal).then(data => {
      if (catalogRequest.current !== controller) return
      const initialScenario = data.scenarios.find(s => s.id === 'taal-regional')?.scenario ?? data.scenarios[0]?.scenario ?? null
      setCatalog(data); setDraft(initialScenario)
      if (!data.scenarios.length) setError('The catalog has no runnable scenario. Add local inputs before running.')
    }).catch(err => { if (!controller.signal.aborted) setError(`${err.message} Start the local Python backend, then retry the catalog.`); else if (catalogRequest.current === controller) setError('Catalog request timed out. Start the backend and retry.') }).finally(() => { window.clearTimeout(timeout); if (catalogRequest.current === controller) setLoading('') })
    return () => { catalogRequest.current = null; controller.abort(); window.clearTimeout(timeout); request.current?.abort() }
  }, [])
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => setSequencePlaying(false)
    const pause = () => { if (document.hidden || motion.matches) setSequencePlaying(false) }
    document.addEventListener('visibilitychange', pause); motion.addEventListener('change', pause)
    window.addEventListener('blur', stop); window.addEventListener('pagehide', stop)
    return () => { document.removeEventListener('visibilitychange', pause); motion.removeEventListener('change', pause); window.removeEventListener('blur', stop); window.removeEventListener('pagehide', stop) }
  }, [])

  function change(next: Scenario) {
    inputRevision.current++
    setDraft({ ...next, input_status: next.input_status === 'illustrative' ? 'illustrative' : 'user_entered' })
    setStale(Boolean(result)); setComparison([]); setSweepResult(null); setSequencePlaying(false)
    if (next.volcano_id !== draft?.volcano_id) setEruptionOptions({ include_lava: next.volcano_id === 'mayon' })
  }
  function scalar(key: keyof Scenario, value: string) {
    if (!draft) return
    const nextValue = value === '' ? (key === 'umbrella_radius_m' ? null : NaN) : Number(value)
    if (key === 'wind_from_deg' && draft.wind_profile?.length && Number.isFinite(nextValue) && Number.isFinite(draft.wind_from_deg)) {
      const shift = Number(nextValue) - draft.wind_from_deg
      change({ ...draft, wind_from_deg: Number(nextValue), wind_profile: draft.wind_profile.map(level => ({ ...level, wind_from_deg: ((level.wind_from_deg + shift) % 360 + 360) % 360 })) })
      return
    }
    change({ ...draft, [key]: nextValue })
  }
  function applySweepDirection(bearing: number) {
    if (!sweepResult) return
    const scenario = sweepResult.scenario
    const shift = bearing - scenario.wind_from_deg
    change({ ...scenario, wind_from_deg: bearing, wind_profile: scenario.wind_profile?.map(level => ({ ...level, wind_from_deg: ((level.wind_from_deg + shift) % 360 + 360) % 360 })) ?? null })
    setTab('3d')
  }
  async function execute(kind: 'simulation' | 'sweep' | 'history' | 'comparison') {
    if (!draft || !catalog) return
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    const revision = inputRevision.current
    const timeout = window.setTimeout(() => controller.abort(), 90000)
    setLoading(kind === 'sweep' ? 'Evaluating 360 wind directions at receptors…' : kind === 'history' ? 'Checking the historical reference…' : kind === 'comparison' ? 'Computing both seasonal winds…' : 'Computing deposition and receptor samples in Python…'); setError('')
    const conditions = catalog.screening_contexts?.find(context => context.id === screeningContextId)?.values
    const screeningContext: Record<string, string> = conditions && typeof conditions === 'object' ? Object.fromEntries(Object.entries(conditions).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : {}
    const reporting = { screening_context: screeningContext, population_year: populationYear }
    try {
      if (kind === 'simulation') {
        const computed = await simulate(draft, controller.signal, reporting)
        const event = await eruption(draft, eruptionOptions, controller.signal, reporting)
        if (request.current !== controller) return
        if (JSON.stringify(computed.scenario) !== JSON.stringify(event.scenario)) throw new Error('The event sequence and deposition scenarios do not match. Retry the simulation.')
        completedReporting.current.set(computed, reporting)
        setResult(computed); setSequence(event); setFrameIndex(0); setSequencePlaying(false); setSelected(null); setStale(inputRevision.current !== revision)
        if (window.innerWidth <= 700) setParametersOpen(false)
      } else if (kind === 'sweep') {
        const computed = await sweep(draft, controller.signal)
        if (request.current === controller && inputRevision.current === revision) setSweepResult(computed)
      } else if (kind === 'history') {
        const reference = await replicate(controller.signal)
        if (reference.simulation) completedReporting.current.set(reference.simulation, { screening_context: {}, population_year: 2020 })
        if (request.current === controller) setHistorical(reference)
      } else {
        const reviewed = catalog.winds.filter(w => w.speed_m_s != null && w.from_deg != null && w.status === 'reviewed')
        const winds = reviewed.length >= 2 ? reviewed.slice(0, 2) : manualWinds.map((w, i) => ({ name: `Manual wind ${i + 1}`, speed_m_s: Number(w.speed), from_deg: Number(w.from) }))
        if (reviewed.length < 2 && manualWinds.some(w => w.speed === '' || w.from === '' || !Number.isFinite(Number(w.speed)) || !Number.isFinite(Number(w.from)) || Number(w.speed) < 0 || Number(w.speed) > 200 || Number(w.from) < 0 || Number(w.from) >= 360)) throw new Error('Enter both manual wind profiles: speed 0–200 m/s and direction 0–359.999°. This is a user-defined comparison, not a reviewed seasonal case.')
        const runWind = (index: number) => simulate({ ...draft, wind_profile: null, wind_speed_m_s: winds[index].speed_m_s!, wind_from_deg: winds[index].from_deg!, label: `${draft.label} · ${winds[index].name}` }, controller.signal, reporting)
        const outcomes = [await runWind(0), await runWind(1)]
        outcomes.forEach(outcome => completedReporting.current.set(outcome, reporting))
        if (request.current === controller && inputRevision.current === revision) setComparison(outcomes)
      }
    } catch (err) {
      if (request.current === controller) setError(controller.signal.aborted ? 'The request was canceled or timed out. Previous completed results are preserved; retry when Python is available.' : err instanceof Error ? err.message : 'The computation failed. Check inputs and retry.')
    } finally { window.clearTimeout(timeout); if (request.current === controller) setLoading('') }
  }

  function exportCSV() {
    if (!result) return
    const header = ['id', 'name', 'kind', 'population', 'population_year', 'in_domain', 'load_kg_m2', 'thickness_mm', 'reported_ge_0_5_mm', 'screening', 'screening_reasons', 'dataset_revision', 'solver_version', 'input_status']
    const rows = result.receptors.map(r => [r.id, r.name, r.kind, r.population, r.population_year, r.in_domain, r.load_kg_m2, r.thickness_mm, r.reported, JSON.stringify(r.screening), JSON.stringify(r.screening_reasons ?? {}), result.provenance.dataset_revision, result.provenance.solver_version, result.provenance.input_status].map(csvCell).join(','))
    download('abo-receptor-results.csv', [header.join(','), ...rows].join('\r\n'), 'text/csv;charset=utf-8')
  }
  const displayedScenario = result?.scenario ?? draft
  const activeSequence = sequence && result && JSON.stringify(sequence.scenario) === JSON.stringify(result.scenario) ? sequence : null
  const frame = activeSequence?.frames[Math.min(activeSequence.frames.length - 1, Math.floor(frameIndex))] ?? null
  const receptors = result ? [...result.receptors].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (b.thickness_mm ?? -1) - (a.thickness_mm ?? -1)) : []
  const tabs: [Tab, string, IconName][] = [['3d', 'Simulation', 'volcano'], ['comparison', 'Wind comparison', 'compare'], ['sweep', 'Wind sweep', 'compass'], ['history', 'Taal 2020', 'history'], ['help', 'Guide & sources', 'book']]
  const primaryKeys = ['column_height_m', 'mass_rate_kg_s', 'duration_s', 'wind_speed_m_s', 'wind_from_deg']
  const inputFields = (keys: string[]) => <div className="field-grid">{fields.filter(field => keys.includes(field.key)).map(field => <label key={field.key}><span className="field-label-text"><span className="field-name">{field.name}</span>{' '}<span className="field-unit">{field.unit}</span></span><input required={field.key !== 'umbrella_radius_m'} type="number" value={draft?.[field.key] == null || Number.isNaN(draft?.[field.key]) ? '' : Number(draft?.[field.key])} min={field.min} max={field.max} step={field.step ?? 'any'} placeholder={field.key === 'umbrella_radius_m' ? 'Optional (e.g. 20000)' : undefined} onChange={e => scalar(field.key, e.target.value)} /></label>)}</div>
  const optionFields: { key: keyof EruptionOptions; name: string; unit: string; label: string; initial: number; min: number; max: number }[] = [
    { key: 'plume_rise_speed_m_s', name: 'Illustrated plume rise', unit: '(m/s)', label: 'Illustrated plume rise (m/s)', initial: 30, min: 1, max: 300 },
    { key: 'lava_effusion_m3_s', name: 'Lava effusion', unit: '(m³/s)', label: 'Lava effusion (m³/s)', initial: 5, min: 0.001, max: 1000 },
    { key: 'lava_width_m', name: 'Channel width', unit: '(m)', label: 'Channel width (m)', initial: 20, min: 1, max: 1000 },
    { key: 'lava_viscosity_pa_s', name: 'Viscosity', unit: '(Pa·s)', label: 'Viscosity (Pa·s)', initial: 1000, min: 1, max: 1e12 },
    { key: 'lava_density_kg_m3', name: 'Lava density', unit: '(kg/m³)', label: 'Lava density (kg/m³)', initial: 2600, min: 1000, max: 4000 },
  ]

  return <div className="application" data-theme={theme} data-page={tab}>
    <a className="skip-link" href="#workspace">Skip to results</a>
    <header className="masthead">
      <h1>ABO <span>Eruption laboratory</span></h1>
      <nav className="primary-navigation" aria-label="Main navigation">{([['3d', 'Simulation'], ['comparison', 'Analysis'], ['help', 'Sources']] as [Tab, string][]).map(([id, label]) => <button key={id} type="button" aria-current={(id === tab || id === 'comparison' && ['sweep', 'history'].includes(tab)) ? 'page' : undefined} onClick={() => { setTab(id); setSequencePlaying(false) }}>{label}</button>)}</nav>
      <div className="header-actions">
        <details className="model-notes" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() } }}>
          <summary><Icon name="info" />Academic model<span className="summary-hint"> · limits</span></summary>
          <div className="model-notes-content">
            <p>Not a PHIVOLCS hazard advisory. Surface deposition does not establish building safety, water potability, or flight safety.</p>
            {catalog && typeof catalog.coverage_notes === 'string' && <p>{catalog.coverage_notes}</p>}
          </div>
        </details>
        <button className="icon-button" type="button" aria-label={`${theme === 'light' ? 'Dark' : 'Light'} theme`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><Icon name={theme === 'light' ? 'moon' : 'sun'} /></button>
      </div>
    </header>
    <main className={`laboratory${parametersOpen && tab !== 'dashboard' && tab !== 'help' ? '' : ' inputs-collapsed'}`}>
      <aside hidden={tab === 'dashboard' || tab === 'help' || !parametersOpen && tab === '3d'} className="parameter-panel" aria-labelledby="parameters-title">
        <details className="parameter-disclosure" open={parametersOpen} onToggle={event => setParametersOpen(event.currentTarget.open)}><summary id="parameters-title"><Icon name="settings" />Simulation inputs</summary>
        {!catalog && <button type="button" onClick={loadCatalog} disabled={Boolean(loading)}>Retry catalog connection</button>}
        {catalog && draft && <form onInvalidCapture={event => {
          const input = event.target
          if (!(input instanceof HTMLInputElement)) return
          event.preventDefault()
          for (let panel = input.closest('details'); panel; panel = panel.parentElement?.closest('details') ?? null) panel.open = true
          setParametersOpen(true)
          setError(`${input.labels?.[0]?.textContent?.trim() || 'Invalid input'}: ${input.validationMessage}`)
          input.focus()
        }} onSubmit={event => { event.preventDefault(); void execute('simulation') }}>
          <Select label="Scenario" value={catalog.scenarios.find(p => JSON.stringify(p.scenario) === JSON.stringify(draft))?.id ?? ''} onChange={value => { const preset = catalog.scenarios.find(p => p.id === value); if (preset) change(preset.scenario) }} options={[{ value: '', label: `${catalog.volcanoes.find(v => v.id === draft.volcano_id)?.name ?? draft.volcano_id} · custom inputs`, disabled: true }, ...catalog.scenarios.map(p => ({ value: p.id, label: p.name }))]} />
          <p className="input-status">{draft.input_status === 'illustrative' ? 'Illustrative inputs, not a historical eruption.' : draft.input_status === 'reviewed' ? 'Reviewed inputs. See source provenance.' : 'Manual inputs. Review provenance before use.'}</p>
          {scientificScopeNote(draft.volcano_id) && <p className="view-note">{scientificScopeNote(draft.volcano_id)}</p>}
          {inputFields(primaryKeys)}
          <details><summary>Eruption illustration & lava</summary><p className="view-note">Finite-duration ash uses the submitted eruption and wind inputs. Plume shape and fountains are schematic.</p>{draft.volcano_id === 'mayon' ? <label className="checkbox-label"><input type="checkbox" checked={Boolean(eruptionOptions.include_lava)} onChange={event => { setEruptionOptions({ ...eruptionOptions, include_lava: event.target.checked }); inputRevision.current++; setStale(Boolean(result)); setSequencePlaying(false) }} /><span>Include lava-channel teaching model</span></label> : <p className="view-note">{draft.volcano_id === 'taal' ? 'Taal shows an illustrative lava fountain. A downslope lava flow is not inferred from that mechanism.' : 'Effusive lava is not enabled for this explosive teaching scenario.'}</p>}<div className="field-grid">{optionFields.filter(field => field.key === 'plume_rise_speed_m_s' || eruptionOptions.include_lava).map(field => <label key={field.key}><span className="field-label-text"><span className="field-name">{field.name}</span>{' '}<span className="field-unit">{field.unit}</span></span><input type="number" step="any" required min={field.min} max={field.max} value={Number.isNaN(eruptionOptions[field.key]) ? '' : Number(eruptionOptions[field.key] ?? field.initial)} onChange={event => { setEruptionOptions({ ...eruptionOptions, [field.key]: event.target.value === '' ? NaN : Number(event.target.value) }); inputRevision.current++; setStale(Boolean(result)); setSequencePlaying(false) }} /></label>)}</div>{eruptionOptions.include_lava && <p className="view-note">These are illustrative fluid inputs, not measured Mayon values. The channel follows the raw DEM with constant viscosity. Cooling, branching and PDCs are not solved.</p>}</details>
          <details><summary>Dispersion & density</summary>{inputFields(['diffusivity_m2_s', 'initial_spread_m', 'umbrella_radius_m', 'bulk_density_kg_m3'])}</details>
          <details><summary>Vertical wind profile (opt-in extension)</summary>
            <p className="view-note">Optional height-dependent wind levels. Linearly interpolated across column release heights. When disabled, uniform wind is used.</p>
            <label className="checkbox-label"><input type="checkbox" checked={Boolean(draft.wind_profile && draft.wind_profile.length > 0)} onChange={event => {
              if (event.target.checked) {
                change({
                  ...draft,
                  wind_profile: [
                    { height_above_vent_m: 0, speed_m_s: draft.wind_speed_m_s, wind_from_deg: draft.wind_from_deg },
                    { height_above_vent_m: draft.column_height_m, speed_m_s: draft.wind_speed_m_s, wind_from_deg: draft.wind_from_deg },
                  ],
                })
              } else {
                change({ ...draft, wind_profile: null })
              }
            }} /><span>Enable vertical wind profile</span></label>
            {draft.wind_profile && draft.wind_profile.length > 0 && <div className="wind-levels">
              {draft.wind_profile.map((level, i) => <fieldset key={i}><legend>Profile level {i + 1}</legend>
                <div className="field-grid">
                  <label><span className="field-label-text"><span className="field-name">Height above vent</span>{' '}<span className="field-unit">(m)</span></span><input type="number" min={0} required value={Number.isNaN(level.height_above_vent_m) ? '' : level.height_above_vent_m} onChange={e => {
                    const next = draft.wind_profile!.map((lvl, idx) => idx === i ? { ...lvl, height_above_vent_m: e.target.value === '' ? NaN : Number(e.target.value) } : lvl)
                    change({ ...draft, wind_profile: next })
                  }} /></label>
                  <label><span className="field-label-text"><span className="field-name">Wind speed</span>{' '}<span className="field-unit">(m/s)</span></span><input type="number" min={0} max={150} required value={Number.isNaN(level.speed_m_s) ? '' : level.speed_m_s} onChange={e => {
                    const next = draft.wind_profile!.map((lvl, idx) => idx === i ? { ...lvl, speed_m_s: e.target.value === '' ? NaN : Number(e.target.value) } : lvl)
                    change({ ...draft, wind_profile: next })
                  }} /></label>
                  <label><span className="field-label-text"><span className="field-name">Wind FROM</span>{' '}<span className="field-unit">(°)</span></span><input type="number" min={0} max={359.999} step="any" required value={Number.isNaN(level.wind_from_deg) ? '' : level.wind_from_deg} onChange={e => {
                    const next = draft.wind_profile!.map((lvl, idx) => idx === i ? { ...lvl, wind_from_deg: e.target.value === '' ? NaN : Number(e.target.value) } : lvl)
                    change({ ...draft, wind_profile: next })
                  }} /></label>
                </div>
              </fieldset>)}
            </div>}
          </details>
          <details><summary>Screening & population</summary><Select label="Population year" value={String(populationYear)} onChange={value => { setPopulationYear(Number(value) as 2020 | 2024); inputRevision.current++; setStale(Boolean(result)); setSequencePlaying(false) }} options={[{ value: '2024', label: '2024 · current scenarios' }, { value: '2020', label: '2020 · historical reporting' }]} /><Select label="Screening conditions" value={screeningContextId} onChange={value => { setScreeningContextId(value); inputRevision.current++; setStale(Boolean(result)); setSequencePlaying(false) }} options={[{ value: '', label: 'Unspecified · applicability unknown' }, ...(catalog.screening_contexts ?? []).filter(context => context.id !== 'unspecified').map(context => ({ value: String(context.id), label: String(context.label ?? context.id) }))]} /><p className="view-note">A damage criterion applies only when the location type and documented conditions match. Missing conditions produce unknown. The 0.5 mm cutoff reports ash presence, not damage or safety.</p></details>
          <details><summary>Location & grid</summary>{inputFields(['vent_lat', 'vent_lon', 'vent_elevation_m', 'domain_km', 'cell_km'])}</details>
          <details><summary>Grain classes and release layers</summary><label>Release layers<input type="number" min="1" max="32" required value={draft.release_layers} onChange={e => scalar('release_layers', e.target.value)} /></label><Select label="Class count" value={String(draft.grains.length)} onChange={value => { const length = Number(value); const grains = Array.from({ length }, (_, i) => ({ ...(draft.grains[i] ?? { diameter_um: 1, settling_speed_m_s: 1 }), fraction: 1 / length })); change({ ...draft, grains }) }} options={[3, 4, 5].map(count => ({ value: String(count), label: `${count} classes` }))} /><p className="muted">Changing count resets fractions equally; new class sizes/speeds require your entry. Fractions must sum to 1.</p>
            <p className="view-note">Release layers approximate a continuous height distribution. Local convergence is not established; 16 and 32 layers can give materially different receptor values. More layers do not establish historical accuracy.</p>
            {draft.grains.map((grain, index) => <fieldset key={index}><legend>Class {index + 1}</legend><div className="grain-grid">{([
              { key: 'diameter_um', name: 'Diameter', unit: '(µm)' },
              { key: 'fraction', name: 'Mass fraction', unit: '(0–1)' },
              { key: 'settling_speed_m_s', name: 'Settling speed', unit: '(m/s)' }
            ] as const).map(gField => <label key={gField.key}><span className="field-label-text"><span className="field-name">{gField.name}</span>{' '}<span className="field-unit">{gField.unit}</span></span><input required type="number" step="any" min={gField.key === 'fraction' ? 0 : 0.000001} max={gField.key === 'fraction' ? 1 : undefined} value={Number.isNaN(grain[gField.key]) ? '' : grain[gField.key]} onChange={e => change({ ...draft, grains: draft.grains.map((g, j) => j === index ? { ...g, [gField.key]: e.target.value === '' ? NaN : Number(e.target.value) } : g) })} /></label>)}</div></fieldset>)}
          </details>
          <div className="form-actions"><button className="run-button" type="submit" disabled={Boolean(loading)}><Icon name="calculate" />Run simulation</button>
          {loading && <button type="button" onClick={() => request.current?.abort()}><Icon name="close" />Cancel calculation</button>}</div>
        </form>}</details>
      </aside>
      <div className="workspace" id="workspace" tabIndex={-1}>
        {tab !== 'dashboard' && tab !== '3d' && tab !== 'help' && <nav className="view-tabs" aria-label="Scientific views">{tabs.filter(([id]) => id !== '3d' && id !== 'help').map(([id, label, icon]) => <button type="button" aria-current={tab === id ? 'page' : undefined} key={id} onClick={() => { setTab(id); setSequencePlaying(false) }}><Icon name={icon} />{label}</button>)}</nav>}
        {tab === '3d' && <div className="simulation-heading"><div className="simulation-title-group"><h2>Simulation</h2><div className="status-line" aria-live="polite" role="status">{loading || (result ? `${catalog?.volcanoes.find(v => v.id === result.scenario.volcano_id)?.name ?? result.scenario.volcano_id} result · ${number(result.diagnostics.elapsed_ms, 0)} ms · ${result.scenario.input_status.replaceAll('_', ' ')} inputs · ${result.summary.municipalities_reported} centroids ≥${result.summary.reporting_cutoff_mm} mm · ${result.summary.receptors_covered}/${result.summary.receptors_total} in domain` : 'Choose inputs and run a simulation to view deposition.')}</div></div>{activeSequence && <EruptionTimeline sequence={activeSequence} index={frameIndex} playing={sequencePlaying} onIndex={setFrameIndex} onPlaying={setSequencePlaying} sceneAvailable={sceneAvailable} compact />}<div className="simulation-action-group">{catalog && <label className="header-scenario-select"><span className="sr-only">Preset scenario</span><select aria-label="Preset scenario" value={catalog.scenarios.find(p => JSON.stringify(p.scenario) === JSON.stringify(displayedScenario))?.id ?? 'last-run'} onChange={e => { const preset = catalog.scenarios.find(p => p.id === e.target.value); if (preset) { change(preset.scenario); setActivePresetId(preset.id) } }}><optgroup label="Taal 2020 Event & Directional Outcomes">{catalog.scenarios.filter(s => s.scenario.volcano_id === 'taal' && s.id !== 'taal-teaching').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup><optgroup label="Other Volcano Baselines">{catalog.scenarios.filter(s => s.scenario.volcano_id !== 'taal' || s.id === 'taal-teaching').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>{result && !catalog.scenarios.some(p => JSON.stringify(p.scenario) === JSON.stringify(result.scenario)) && <option value="last-run">Custom · {result.scenario.label}</option>}</select></label>}<button type="button" onClick={() => setParametersOpen(open => !open)} aria-expanded={parametersOpen}><Icon name="settings" />Edit parameters</button><button hidden={parametersOpen} type="button" className="run-button" disabled={Boolean(loading) || !draft} onClick={() => void execute('simulation')}><Icon name="calculate" />Run simulation</button><button className="raw-data-action" type="button" disabled={!result} onClick={() => setRawDataOpenCount(n => n + 1)}><Icon name="calculate" />View raw data</button></div></div>}
        {tab !== 'dashboard' && tab !== '3d' && <div className="status-line" aria-live="polite" role="status">{loading || (result ? `${catalog?.volcanoes.find(v => v.id === result.scenario.volcano_id)?.name ?? result.scenario.volcano_id} result · ${number(result.diagnostics.elapsed_ms, 0)} ms` : 'Choose inputs and run a simulation to view deposition.')}</div>}
        {error && <p className="error-message" role="alert">{error}</p>}
        {stale && tab !== 'dashboard' && <p className="stale-message">Parameters have changed. Views below retain the last completed simulation. Run again to update them.</p>}
        <section hidden={tab === 'dashboard'} className="visual-panel" aria-label={tabs.find(t => t[0] === tab)?.[1]}>
          {tab === '3d' && displayedScenario && <>
            <div className="simulation-workbench">
              <div className="workbench-spatial-stack">
                <section className="spatial-view" aria-labelledby="terrain-title"><ScientificViewBoundary key={`3d-${JSON.stringify(result?.scenario)}`} onFailure={() => sceneAvailability(false)} onRecovery={() => sceneAvailability(false)}><Suspense fallback={<p className="empty-note">Loading 3D illustration…</p>}><VolcanoScene scenario={displayedScenario} result={result} eruptionSequence={activeSequence} frameIndex={frameIndex} sequencePlaying={sequencePlaying} selected={selected} onSelect={setSelected} onAvailabilityChange={sceneAvailability} /></Suspense></ScientificViewBoundary></section>
                <section className="spatial-view" aria-labelledby="map-title"><ScientificViewBoundary key={`map-${JSON.stringify(result?.scenario)}-${activeSequence?.options.include_lava}`}><Suspense fallback={<p className="empty-note">Loading impact map…</p>}><GeographicMap scenario={displayedScenario} result={result} eruptionSequence={activeSequence} frame={frame} selected={selected} onSelect={setSelected} /></Suspense></ScientificViewBoundary></section>
              </div>
              <div className="workbench-analytics-pane">
                {catalog && <Dashboard
                  catalog={catalog}
                  simulation={result}
                  simulationSequence={activeSequence}
                  selectedId={selected}
                  onSelectLocation={setSelected}
                  embedded
                  presetOverride={activePresetId}
                  openDialogCount={rawDataOpenCount}
                  frame={frame}
                  onPresetCalculated={(computed, seq) => {
                    completedReporting.current.set(computed, { screening_context: {}, population_year: populationYear })
                    setResult(computed)
                    setSequence(seq)
                    setDraft(computed.scenario)
                    setFrameIndex(0)
                    setSequencePlaying(false)
                    setSelected(null)
                    setStale(false)
                  }}
                />}
              </div>
            </div>
            {result && <section className="results-section workbench-fullwidth-results" aria-labelledby="results-title"><div className="section-heading"><div><h2 id="results-title">Municipal and facility exposure</h2><p>Eventual totals: {result.summary.municipalities_reported} municipal centroids ≥{result.summary.reporting_cutoff_mm} mm · {number(result.summary.indicative_population, 0)} indicative residents · {result.summary.receptors_covered}/{result.summary.receptors_total} locations in domain</p></div></div>
              {frame && <p className="view-note">The breakdown below follows the selected event snapshot ({({ before: 'before eruption', erupting: 'during', settling: 'settling', after: 'after' } as Record<string, string>)[frame.phase] ?? frame.phase} · {number(frame.elapsed_s / 3600, 1)} h); the summary above reports eventual totals.</p>}
              <ProvincialExposureExplorer
                receptors={frame?.receptors ?? result.receptors}
                selected={selected}
                onSelect={setSelected}
                reportingCutoffMm={result.summary.reporting_cutoff_mm}
              />
              <details className="simulation-data"><summary>Detailed exposure & exports</summary>
                <details className="result-table-disclosure"><summary>All location data table & exports</summary>
                <div className="result-tools"><Select label="Sort locations" value={sort} onChange={value => setSort(value as typeof sort)} options={[{ value: 'thickness', label: 'Highest thickness first' }, { value: 'name', label: 'Name' }]} /><div className="export-actions"><button type="button" onClick={exportCSV}><Icon name="download" />Final CSV</button><button type="button" onClick={() => download('abo-scenario.json', JSON.stringify({ scenario: result.scenario, ...completedReporting.current.get(result), eruption_options: activeSequence?.options ?? null, provenance: result.provenance }, null, 2), 'application/json')}><Icon name="code" />Scenario JSON</button></div></div>
                <div className="table-scroll"><table><caption>Point samples; indicative populations are not individual exposure estimates.</caption><thead><tr><th>Location</th><th>Thickness (mm)</th><th>Load (kg/m²)</th><th>Population / year</th><th>Screening</th></tr></thead><tbody>{receptors.map(r => <tr key={r.id} className={r.id === selected ? 'selected-row' : ''}><th scope="row"><button className="text-button" type="button" onClick={() => setSelected(r.id)}>{r.name}</button><small>{r.kind} · {r.in_domain ? 'In domain' : 'Outside coverage'}</small></th><td>{number(r.thickness_mm)}</td><td>{number(r.load_kg_m2)}</td><td>{number(r.population, 0)} / {r.population_year ?? 'Unknown'}</td><td>{Object.entries(r.screening).map(([key, state]) => <span className="screening-line" key={key}>{catalog?.criteria.find(criterion => criterion.id === key)?.label ?? key.replaceAll('_', ' ')}: {state}{r.screening_reasons?.[key] && <small>{r.screening_reasons[key]}</small>}</span>)}</td></tr>)}</tbody></table></div>
                </details><details><summary>Result provenance and assumptions</summary><p>{number(result.diagnostics.retained_fraction * 100)}% modeled mass inside domain · {number(result.diagnostics.outside_domain_mass_kg, 0)} kg outside · {result.diagnostics.validation_status.replaceAll('_', ' ')}.</p><p>{result.summary.reported_population_unknown} reported municipalities have unknown population.</p><p>Dataset {result.provenance.dataset_revision} · Solver {result.provenance.solver_version} · Inputs {result.provenance.input_status}</p>{[...result.provenance.assumptions, ...result.provenance.warnings].map((text, i) => <p key={i}>{text}</p>)}{activeSequence && <><h3>Event sequence</h3><p>Solver {activeSequence.solver_version} · lava route: {activeSequence.lava.stop_reason.replaceAll('_', ' ')}</p>{[...activeSequence.assumptions, ...activeSequence.warnings, ...activeSequence.lava.warnings].map((text, i) => <p key={i}>{text}</p>)}</>}</details>
              </details>
            </section>}
          </>}
          {tab === '3d' && !displayedScenario && <p className="empty-note">Connect to Python to load the local scenario catalog. No scientific results have been fabricated.</p>}
          {tab === 'comparison' && catalog?.winds.some(wind => typeof wind.altitude_context === 'string') && <details><summary>Wind altitude & averaging evidence</summary>{catalog.winds.filter(wind => typeof wind.altitude_context === 'string').map(wind => <div key={wind.id}><h3>{wind.name}</h3><p>{String(wind.altitude_context)}</p>{typeof wind.averaging_period === 'string' && <p>{wind.averaging_period}</p>}{typeof wind.reason === 'string' && <p>{wind.reason}</p>}</div>)}</details>}
          {tab === 'comparison' && <><h2>Compare wind profiles</h2><p>Hold eruption inputs fixed. Reviewed seasonal winds are used when available; otherwise enter two manual winds below.</p>{catalog?.winds.map(w => <p key={w.id}><strong>{w.name}</strong> · {w.status} · {w.speed_m_s == null ? 'Effective speed/direction have not been reviewed.' : `${number(w.speed_m_s)} m/s from ${number(w.from_deg)}°`}</p>)}{(catalog?.winds.filter(w => w.status === 'reviewed' && w.speed_m_s != null && w.from_deg != null).length ?? 0) < 2 && <><p className="input-status">Manual comparison is not verified Amihan/Habagat weather.</p><div className="manual-winds">{manualWinds.map((wind, index) => <fieldset key={index}><legend>Manual wind {index + 1}</legend><label>Speed (m/s)<input disabled={Boolean(loading)} type="number" min="0" max="200" step="any" value={wind.speed} onChange={e => { setManualWinds(manualWinds.map((w, i) => i === index ? { ...w, speed: e.target.value } : w)); setComparison([]) }} /></label><label>Wind FROM (°)<input disabled={Boolean(loading)} type="number" min="0" max="359.999" step="any" value={wind.from} onChange={e => { setManualWinds(manualWinds.map((w, i) => i === index ? { ...w, from: e.target.value } : w)); setComparison([]) }} /></label></fieldset>)}</div></>}<button type="button" disabled={Boolean(loading) || !draft} onClick={() => void execute('comparison')}>Compute wind comparison</button>{comparison.map(r => <article className="comparison-result" key={r.scenario.label}><h3>{r.scenario.label}</h3><p>{r.summary.municipalities_reported} municipal centroids ≥0.5 mm · {number(r.summary.indicative_population, 0)} indicative residents</p><p>Retained mass {number(r.diagnostics.retained_fraction * 100)}% · Wind {number(r.scenario.wind_speed_m_s)} m/s from {number(r.scenario.wind_from_deg)}°</p><button type="button" onClick={() => { setResult(r); setSelected(null); setStale(true); setTab('3d') }}>Inspect this wind result</button></article>)}</>}
          {tab === 'comparison' && draft?.wind_profile && <p className="view-note">Comparison uses the two uniform winds entered here. The vertical wind profile is disabled for these comparison results.</p>}
          {tab === 'sweep' && <><h2>360° wind envelope</h2><p>One-degree directions; each receptor can peak under a different wind. This is not one simultaneous scenario.</p>{draft?.wind_profile && <p className="view-note">The whole vertical profile rotates together. Wind FROM reports the rotated reference bearing from the primary wind input; each level retains its relative direction and speed.</p>}<button type="button" disabled={Boolean(loading) || !draft} onClick={() => void execute('sweep')}>Evaluate all wind directions</button>{sweepResult && <div className="table-scroll"><table><caption>{sweepResult.label}</caption><thead><tr><th>Receptor</th><th>Maximum (mm)</th><th>Wind FROM</th><th>Action</th></tr></thead><tbody>{sweepResult.receptors.map(r => <tr key={r.id}><th scope="row">{r.name}</th><td>{number(r.maximum_thickness_mm)}</td><td>{r.wind_from_deg == null ? 'Unknown' : `${number(r.wind_from_deg, 0)}°`}</td><td><button type="button" disabled={r.wind_from_deg == null || !draft} onClick={() => { if (r.wind_from_deg != null) applySweepDirection(r.wind_from_deg) }}>Use this direction</button></td></tr>)}</tbody></table></div>}</>}
          {tab === 'history' && <><h2>12–13 January 2020 Taal fallout</h2>{!historical && <p>{catalog?.historical.reason}</p>}<button type="button" disabled={Boolean(loading) || !catalog} onClick={() => void execute('history')}>Check historical reference</button>{historical && <HistoricalEvaluation result={historical} onInspect={() => { setResult(historical.simulation ?? null); setSequence(null); setSequencePlaying(false); setStale(true); setTab('3d') }} />}<HistoricalReferences blocked={historical?.blocked_inputs ?? catalog?.historical.blocked_inputs ?? []} tables={historical?.reference_tables ?? catalog?.historical.reference_tables ?? []} volcanoId={draft?.volcano_id ?? 'taal'} /></>}
          {tab === 'help' && <><h2>How the calculation works</h2><ol className="computation-steps"><li>Multiply modeled ash rate by duration to obtain total ash mass.</li><li>Split mass across grain fractions and equally weighted release heights.</li><li>Divide release height by settling speed to obtain falling time; wind moves each Gaussian center during that time.</li><li>Integrate Gaussian mass over grid cells; evaluate municipality centroids as point samples.</li><li>Divide load by bulk deposit density to obtain thickness, then evaluate sourced screening criteria.</li></ol><p>The event sequence limits ash emission to the selected duration and accumulates each component after its falling time. It uses instant release at prescribed heights, not eruption-column CFD. Ash, steam and gas form volcanic plumes; the visible billows and fountain are schematic. Optional lava uses terrain slope, effusion, channel width, density and fixed viscosity, without cooling or branching.</p><p><a href="/documentation/COMPUTATION.md" target="_blank" rel="noreferrer">Computation documentation</a> · <a href="/documentation/ERUPTION_MODEL.md" target="_blank" rel="noreferrer">Event sequence & lava equations</a> · <a href="/documentation/INPUT_VALUES.md" target="_blank" rel="noreferrer">Required input values</a></p><details><summary>Eruption mechanisms & reference zones</summary>{ERUPTION_SOURCES.map(source => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> ({source.publisher}, {source.date}). {source.note}</p>)}<a href="/documentation/ERUPTION_RESEARCH.md" target="_blank" rel="noreferrer">Research registry and evidence limits</a></details><h3>Source registry</h3>{catalog?.sources.map(source => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>)}</>}
          {tab === 'help' && <div className="geography-references"><h3>Geography & picture references</h3><p className="view-note"><a href="https://volcano.si.edu/gallery/ShowImage.cfm?photo=GVP-01888" target="_blank" rel="noreferrer">Taal island and lake</a> · <a href="https://volcano.si.edu/gallery/ShowImage.cfm?photo=GVP-01777" target="_blank" rel="noreferrer">Mayon and Albay Gulf</a> · <a href="https://volcano.si.edu/gallery/ShowImage.cfm?photo=GVP-11191" target="_blank" rel="noreferrer">Kanlaon summit and ridge</a></p><p className="view-note">Historical Smithsonian/USGS/NASA references guide geographic interpretation. <a href="/documentation/GEOGRAPHY_REFERENCES.md" target="_blank" rel="noreferrer">Terrain provenance, photo credits & uncertainty</a></p></div>}
          {tab === 'help' && catalog && <EvidenceDetails catalog={catalog} />}
        </section>
      </div>
    </main><footer className="page-footer"><span>Academic simulation · Not a PHIVOLCS advisory</span><a href="https://docs.google.com/document/d/1dH4wl1l9PFE1Xj4CuJtWXPDA4vmmEpcGoh9cSXctCxg/edit?tab=t.if8cv8e8e5un">Project proposal</a></footer>
  </div>
}
