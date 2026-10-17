import { useEffect, useRef, useState } from 'react'
import { eruption, simulate } from '../api/simulator'
import type { Catalog, EruptionSequence, SimulationResult } from '../api/simulator'
import { csvCell, download, number } from '../presentation'
import Icon from './Icon'
import { depositDistribution } from './dashboardData'

type Run = { result: SimulationResult; sequence: EruptionSequence | null }
export default function Dashboard({ catalog, simulation, simulationSequence }: { catalog: Catalog; simulation: SimulationResult | null; simulationSequence: EruptionSequence | null }) {
  const [preset, setPreset] = useState(catalog.scenarios.find(s => s.id === 'taal-regional')?.id ?? catalog.scenarios[0]?.id ?? '')
  const [loaded, setLoaded] = useState<{ id: string; run: Run } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [location, setLocation] = useState('')
  const [search, setSearch] = useState('')
  const [domain, setDomain] = useState('all')
  const [sort, setSort] = useState('thickness')
  const [dataTab, setDataTab] = useState('locations')
  const cache = useRef(new Map<string, Run>())
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (preset === 'last-run') return
    const scenario = catalog.scenarios.find(s => s.id === preset)?.scenario
    if (!scenario) return
    const controller = new AbortController()
    let active = true
    const timeout = window.setTimeout(() => controller.abort(), 90000)
    async function load() {
      setPending(true); setError('')
      try {
        let run = cache.current.get(preset)
        if (!run) {
          const result = await simulate(scenario!, controller.signal, { population_year: 2024 })
          const sequence = await eruption(scenario!, { include_lava: false }, controller.signal, { population_year: 2024 })
          if (JSON.stringify(result.scenario) !== JSON.stringify(sequence.scenario)) throw new Error('The result and event scenario differ. Retry this preset.')
          run = { result, sequence }
          if (cache.current.size >= 2) cache.current.delete(cache.current.keys().next().value!)
          cache.current.set(preset, run)
        }
        if (!controller.signal.aborted) setLoaded({ id: preset, run })
      } catch (err) {
        if (active) setError(controller.signal.aborted ? 'Preset calculation timed out. Retry when the local backend is available.' : err instanceof Error ? err.message : 'Preset calculation failed.')
      } finally {
        window.clearTimeout(timeout)
        if (active) setPending(false)
      }
    }
    void load()
    return () => { active = false; controller.abort(); window.clearTimeout(timeout) }
  }, [catalog, preset, retry])

  const run = preset === 'last-run' && simulation ? { result: simulation, sequence: simulationSequence } : loaded?.id === preset ? loaded.run : null
  const result = run?.result
  const distribution = depositDistribution(result?.receptors ?? [])
  const ranked = (result?.receptors ?? []).filter(r => r.kind === 'municipality' && r.in_domain && r.thickness_mm !== null).sort((a, b) => b.thickness_mm! - a.thickness_mm!)
  const top = ranked.slice(0, 6)
  const selected = ranked.find(r => r.id === location) ?? ranked[0]
  const samples = run?.sequence?.frames.map(frame => ({ time: frame.elapsed_s / 3600, value: frame.receptors.find(r => r.id === selected?.id)?.thickness_mm ?? null })) ?? []
  const maxTime = Math.max(1, ...samples.map(s => s.time))
  const maxValue = Math.max(0.001, ...samples.map(s => s.value ?? 0))
  const paths: string[] = []
  let segment = ''
  samples.forEach(s => {
    if (s.value === null) { if (segment) paths.push(segment); segment = ''; return }
    segment += `${segment ? ' L' : 'M'}${80 + s.time / maxTime * 810},${185 - s.value / maxValue * 155}`
  })
  if (segment) paths.push(segment)
  const rows = (result?.receptors ?? []).filter(r => r.name.toLowerCase().includes(search.toLowerCase()) && (domain === 'all' || (domain === 'inside' ? r.in_domain : !r.in_domain))).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : (b.thickness_mm ?? -1) - (a.thickness_mm ?? -1))
  function exportRows() {
    if (!result) return
    const header = ['id', 'location', 'kind', 'in_domain', 'thickness_mm', 'load_kg_m2', 'population', 'population_year', 'screening', 'screening_reasons', 'dataset_revision', 'solver_version', 'input_status']
    const body = rows.map(r => [r.id, r.name, r.kind, r.in_domain, r.thickness_mm, r.load_kg_m2, r.population, r.population_year, JSON.stringify(r.screening), JSON.stringify(r.screening_reasons), result.provenance.dataset_revision, result.provenance.solver_version, result.provenance.input_status].map(csvCell).join(','))
    download('abo-filtered-locations.csv', [header.join(','), ...body].join('\r\n'), 'text/csv;charset=utf-8')
  }

  return <section className="dashboard" aria-labelledby="dashboard-title">
    <div className="dashboard-heading"><div><p className="dashboard-eyebrow">ASHFALL · SCENARIO RESULTS</p><h2 id="dashboard-title">Dashboard</h2><p>{catalog.volcanoes?.find(v => v.id === result?.scenario.volcano_id)?.name ?? 'Local model'} · Regional deposit analysis</p></div>
      <div className="dashboard-actions"><label>Scenario<select value={preset} onChange={e => { setPreset(e.target.value); setError('') }}>
        {catalog.scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        {simulation && <option value="last-run">Last completed simulation · {simulation.scenario.label}</option>}
      </select></label><button className="raw-data-action" type="button" disabled={!result} onClick={() => dialog.current?.showModal()}><Icon name="calculate" />View raw data</button></div>
    </div>
    <div className="dashboard-context" role="status">{result ? <><span>{result.scenario.input_status.replaceAll('_', ' ')} inputs</span><span>Eventual totals</span><span>{result.summary.municipalities_reported} municipal centroids ≥{result.summary.reporting_cutoff_mm} mm</span><span>{result.summary.receptors_covered}/{result.summary.receptors_total} locations in domain</span><span>Population year: {result.receptors.find(r => r.population_year)?.population_year ?? 'Unknown'}</span></> : pending ? 'Calculating the selected preset with the local Python model…' : 'Select a preset to calculate its results.'}</div>
    {error && <div className="error-message" role="alert">{error} <button type="button" onClick={() => setRetry(n => n + 1)}>Retry preset</button></div>}
    {!result ? <div className="dashboard-empty"><Icon name="compare" /><h3>{pending ? 'Preparing scenario data' : 'Results are unavailable'}</h3><p>{pending ? 'Charts will appear when deposition and event snapshots are calculated.' : 'Choose a preset or retry the calculation. No results have been invented.'}</p></div> : <>
      <div className="dashboard-charts">
        <article className="chart-panel accumulation-panel"><header><div><h3>Accumulation over event time</h3><p>Computed snapshots · {selected?.name ?? 'No location'}</p></div><label className="chart-location"><span className="sr-only">Chart location</span><select value={selected?.id ?? ''} onChange={e => setLocation(e.target.value)}>{ranked.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label></header>
          <div className="chart-reading"><div><span>{samples.length ? 'Final sampled deposit' : 'Eventual centroid deposit'}</span><strong>{number(samples.length ? samples.at(-1)?.value ?? null : selected?.thickness_mm ?? null)}<small> mm</small></strong></div><p>{selected?.name ?? 'No location selected'}{samples.length > 0 && <><br />At {number(samples.at(-1)!.time, 1)} h elapsed</>}</p></div>
          {samples.some(s => s.value !== null) ? <div className="line-chart-viewport" role="region" tabIndex={0} aria-label="Accumulation chart, scroll horizontally on small screens"><svg className="accumulation-chart" viewBox="0 0 920 235" role="img" aria-label={`Deposit thickness over event time for ${selected?.name}. Final sampled thickness ${number(samples.at(-1)?.value ?? null)} millimeters. Raw snapshot values are in View raw data.`}>
            {[0, 0.5, 1].map(f => <g key={f}><line x1="80" x2="890" y1={185 - f * 155} y2={185 - f * 155} className="chart-gridline" /><text x="70" y={190 - f * 155} textAnchor="end">{number(maxValue * f)}</text></g>)}
            {[0, 0.25, 0.5, 0.75, 1].map(f => <text key={f} x={80 + f * 810} y="207" textAnchor="middle">{number(maxTime * f, 1)}</text>)}
            {paths.map((d, i) => <path key={i} d={d} className="chart-line" />)}
            {samples.filter(s => s.value !== null).map((s, i) => <circle key={i} cx={80 + s.time / maxTime * 810} cy={185 - s.value! / maxValue * 155} r="3" className="chart-dot"><title>{number(s.time, 2)} h: {number(s.value)} mm</title></circle>)}
            <text x="485" y="232" textAnchor="middle">Elapsed time (h)</text><text transform="translate(13 110) rotate(-90)" textAnchor="middle">Thickness (mm)</text>
          </svg></div> : <p className="empty-note">No event snapshots are available for this location. Eventual totals remain available in raw data.</p>}
        </article>
        <article className="chart-panel ranking-panel"><header><div><h3>Deposit thickness by municipality</h3><p>Top {top.length} municipal centroids · eventual totals</p></div><span className="chart-unit">mm</span></header>
          <div className="ranking-chart">{!top.length && <p className="empty-note">No municipal thickness values are available in this domain.</p>}{top.map((r, i) => <button type="button" className={`ranking-row${r.id === selected?.id ? ' is-selected' : ''}`} key={r.id} onClick={() => setLocation(r.id)} aria-pressed={r.id === selected?.id} aria-label={`${r.name}, ${number(r.thickness_mm)} millimeters, select time series`}><span className="rank-index">{String(i + 1).padStart(2, '0')}</span><span className="rank-name">{r.name}</span><span className="rank-track"><span style={{ width: `${Math.max(0, r.thickness_mm! / Math.max(0.001, top[0]?.thickness_mm ?? 1) * 100)}%` }} /></span><strong>{number(r.thickness_mm)}</strong></button>)}</div>
          <p className="chart-footnote">Select a municipality to inspect its accumulation curve.</p>
        </article>
        <article className="chart-panel distribution-panel"><header><div><h3>Municipal deposit distribution</h3><p>Share of {distribution.known} centroids with known deposits</p></div></header>
          <div className="distribution-body"><svg viewBox="0 0 180 180" className="deposit-donut" role="img" aria-label={`Deposit distribution. ${distribution.bands.map(b => `${b.label}: ${b.count}`).join('; ')}. ${distribution.outside} outside domain and ${distribution.unknown} unknown excluded.`}><circle cx="90" cy="90" r="62" fill="none" stroke="var(--line)" strokeWidth="24" />{distribution.bands.map((b, index) => {
            const length = b.count / Math.max(1, distribution.known) * 389.5575
            const start = distribution.bands.slice(0, index).reduce((sum, band) => sum + band.count, 0) / Math.max(1, distribution.known) * 389.5575
            return <circle key={b.label} cx="90" cy="90" r="62" fill="none" stroke={b.color} strokeWidth="24" strokeDasharray={`${Math.max(0, length - 2)} ${389.5575 - Math.max(0, length - 2)}`} strokeDashoffset={-start} transform="rotate(-90 90 90)"><title>{b.label}: {b.count}</title></circle>
          })}<text x="90" y="89" textAnchor="middle" className="donut-total">{distribution.known}</text><text x="90" y="109" textAnchor="middle">centroids</text></svg>
            <ul className="distribution-legend">{distribution.bands.map(b => <li key={b.label}><span className="distribution-swatch" style={{ background: b.color }} /><span>{b.label}</span><strong>{b.count}</strong><span>{distribution.known ? number(b.count / distribution.known * 100, 1) : '0'}%</span></li>)}</ul></div>
          <p className="chart-footnote">Excluded: {distribution.outside} outside domain · {distribution.unknown} unknown. Bands describe deposits, not hazard severity.</p>
        </article>
        <article className="chart-panel scenario-panel"><header><div><h3>Scenario at a glance</h3><p>Settings behind these results</p></div><Icon name="info" /></header>
          <dl className="scenario-ledger"><div><dt>Column above ground</dt><dd>{number(result.scenario.column_height_m / 1000)} km</dd></div><div><dt>Wind FROM</dt><dd>{number(result.scenario.wind_from_deg, 0)}° · {number(result.scenario.wind_speed_m_s)} m/s</dd></div><div><dt>Emission duration</dt><dd>{number(result.scenario.duration_s / 3600)} h</dd></div><div><dt>Modeled mass in domain</dt><dd>{number(result.diagnostics.retained_fraction * 100, 1)}%</dd></div></dl>
          <p className="chart-footnote">Centroid samples are not municipality-wide averages. Historical agreement is not established.</p>
        </article>
      </div>
    </>}
    <dialog className="run-data-dialog" ref={dialog} aria-labelledby="run-data-title">
      <div className="dialog-heading"><div><h2 id="run-data-title">Run data</h2><p>{result?.scenario.label} · {dataTab === 'snapshots' ? 'Computed event snapshots' : dataTab === 'details' ? 'Run provenance' : 'Eventual totals'}</p></div><button type="button" aria-label="Close run data" onClick={() => dialog.current?.close()}><Icon name="close" /></button></div>
      <div className="data-tabs" aria-label="Data views">{[['locations', 'Locations'], ['snapshots', 'Event snapshots'], ['details', 'Run details']].map(([id, label]) => <button type="button" key={id} aria-pressed={dataTab === id} onClick={() => setDataTab(id)}>{label}</button>)}</div>
      {dataTab === 'locations' && <><div className="data-toolbar"><label>Search location<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Municipality or facility" /></label><label>Domain<select value={domain} onChange={e => setDomain(e.target.value)}><option value="all">All locations</option><option value="inside">In domain</option><option value="outside">Outside domain</option></select></label><label>Sort<select value={sort} onChange={e => setSort(e.target.value)}><option value="thickness">Highest thickness</option><option value="name">Location name</option></select></label><button type="button" onClick={exportRows}><Icon name="download" />Export CSV</button></div>
        <p className="data-context">{rows.length} records · Filters apply to table and CSV · Census year retained per record</p>
        <div className="data-scroll" tabIndex={0} role="region" aria-label="Filtered location data"><table><thead><tr><th>Location</th><th>Domain</th><th>Thickness (mm)</th><th>Load (kg/m²)</th><th>Population / year</th><th>Screening</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><th scope="row">{r.name}<small>{r.kind}</small></th><td>{r.in_domain ? 'In domain' : 'Outside domain'}</td><td>{number(r.thickness_mm)}</td><td>{number(r.load_kg_m2)}</td><td>{number(r.population, 0)} / {r.population_year ?? 'Unknown'}</td><td>{Object.entries(r.screening).map(([key, value]) => <div key={key}>{key.replaceAll('_', ' ')}: {value}<small>{r.screening_reasons?.[key]}</small></div>)}</td></tr>)}</tbody></table>{!rows.length && <p>No locations match these filters. Clear the search or change Domain.</p>}</div></>}
      {dataTab === 'snapshots' && <><label>Snapshot location<select value={selected?.id ?? ''} onChange={e => setLocation(e.target.value)}>{ranked.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><div className="data-scroll" role="region" tabIndex={0} aria-label="Event snapshot data"><table><thead><tr><th>Elapsed time (h)</th><th>Deposit thickness (mm)</th></tr></thead><tbody>{samples.map((s, i) => <tr key={i}><td>{number(s.time, 3)}</td><td>{number(s.value)}</td></tr>)}</tbody></table>{!samples.length && <p>No event snapshots are available for this run.</p>}</div></>}
      {dataTab === 'details' && result && <div className="data-scroll" tabIndex={0} role="region" aria-label="Run provenance"><h3>Provenance & assumptions</h3><p>Dataset {result.provenance.dataset_revision} · Solver {result.provenance.solver_version} · {result.provenance.input_status} inputs</p><p>Historical agreement is not established.</p>{[...result.provenance.assumptions, ...result.provenance.warnings, ...(run?.sequence?.warnings ?? [])].map((text, i) => <p key={i}>{text}</p>)}<button type="button" onClick={() => download('abo-dashboard-result.json', JSON.stringify({ scenario: result.scenario, provenance: result.provenance, receptors: result.receptors, summary: result.summary, eruption_options: run?.sequence?.options ?? null, result_scope: 'eventual_totals' }, null, 2), 'application/json')}>Export result JSON</button></div>}
      <p className="dialog-note">Unknown means unavailable. Outside-domain locations are not zero exposure. Academic simulation; not a PHIVOLCS advisory.</p>
    </dialog>
  </section>
}
