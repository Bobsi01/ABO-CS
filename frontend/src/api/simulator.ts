import type { components } from './schema'

export type Scenario = components['schemas']['Scenario']
export type Catalog = components['schemas']['Catalog']
export type SimulationResult = components['schemas']['SimulationResult']
export type SweepResult = components['schemas']['SweepResult']
export type ReplicationResult = components['schemas']['ReplicationResult']
export type Trajectory = components['schemas']['Trajectory']
export type EruptionOptions = components['schemas']['EruptionOptions']
export type EruptionSequence = components['schemas']['EruptionSequence']
export type EruptionFrame = components['schemas']['EruptionFrame']
type ReportingOptions = Partial<Pick<components['schemas']['SimulationRequest'], 'screening_context' | 'population_year'>>

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const numbers = (value: unknown): value is number[] => Array.isArray(value) && value.every(finite)
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string')
const nullableNumber = (value: unknown) => value === null || finite(value)
const stringRecord = (value: unknown) => record(value) && Object.values(value).every(entry => typeof entry === 'string')
const optional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value)
function referenceGeojsonValid(value: unknown): boolean {
  if (!record(value)) return false
  if (value.type === 'FeatureCollection') return Array.isArray(value.features) && value.features.every(referenceGeojsonValid)
  if (value.type !== 'Feature' || !record(value.geometry)) return false
  const depth = value.geometry.type === 'Polygon' ? 3 : value.geometry.type === 'MultiPolygon' ? 4 : 0
  const coordinates = (entry: unknown, level: number): boolean => level === 1 ? numbers(entry) && entry.length === 2 : Array.isArray(entry) && entry.length > 0 && entry.every(child => coordinates(child, level - 1))
  return depth > 0 && coordinates(value.geometry.coordinates, depth)
}
function evidenceValid(value: unknown): boolean {
  return optional(value, entries => Array.isArray(entries) && entries.every(entry => record(entry) && ['id', 'parameter', 'units', 'datum', 'uncertainty', 'locator', 'license', 'conversions', 'notes'].every(key => typeof entry[key] === 'string') && ['measured', 'derived', 'calibrated', 'assumed'].includes(String(entry.classification)) && ['usable', 'source_blocked', 'illustrative'].includes(String(entry.readiness)) && strings(entry.source_ids) && strings(entry.dependencies)))
}
function historicalDetailsValid(value: Record<string, unknown>): boolean {
  return optional(value.protocol, protocol => protocol === null || record(protocol) && ['id', 'frozen_at', 'event_start_utc', 'event_end_utc', 'event_definition', 'acceptance_tolerance', 'review_status'].every(key => typeof protocol[key] === 'string') && finite(protocol.duration_s) && strings(protocol.evaluation_rules))
    && optional(value.dataset_id, id => id === null || typeof id === 'string')
    && optional(value.assessment_reasons, strings)
    && optional(value.source_dependencies, groups => Array.isArray(groups) && groups.every(group => record(group) && typeof group.group_id === 'string' && typeof group.disclosure === 'string' && strings(group.source_ids) && strings(group.dependent_quantities)))
    && optional(value.observation_results, rows => Array.isArray(rows) && rows.every(row => record(row) && typeof row.observation_id === 'string' && ['calibration', 'evaluation'].includes(String(row.split)) && finite(row.lat) && finite(row.lon) && finite(row.lower_mm) && finite(row.upper_mm) && row.lower_mm >= 0 && row.upper_mm >= row.lower_mm && typeof row.in_domain === 'boolean' && nullableNumber(row.predicted_mm) && nullableNumber(row.interval_residual_mm) && nullableNumber(row.midpoint_residual_mm) && typeof row.reason === 'string'))
    && optional(value.sensitivity, entries => Array.isArray(entries) && entries.every(record))
    && optional(value.reference_footprints, entries => Array.isArray(entries) && entries.every(entry => record(entry) && ['trace_id', 'label', 'dependency_group', 'uncertainty_notes'].every(key => typeof entry[key] === 'string') && finite(entry.threshold_mm) && entry.threshold_mm > 0 && strings(entry.source_ids) && referenceGeojsonValid(entry.geojson)))
    && optional(value.footprint_evidence, record)
}
function scenarioValid(value: unknown): boolean {
  return record(value) && typeof value.label === 'string' && typeof value.volcano_id === 'string' && ['illustrative', 'user_entered', 'reviewed'].includes(String(value.input_status)) && ['vent_lat', 'vent_lon', 'vent_elevation_m', 'column_height_m', 'mass_rate_kg_s', 'duration_s', 'wind_speed_m_s', 'wind_from_deg', 'diffusivity_m2_s', 'initial_spread_m', 'bulk_density_kg_m3', 'domain_km', 'cell_km', 'release_layers'].every(key => finite(value[key])) && Array.isArray(value.grains) && value.grains.length >= 3 && value.grains.length <= 5 && value.grains.every(g => record(g) && finite(g.fraction) && finite(g.diameter_um) && finite(g.settling_speed_m_s))
}
function receptorValid(value: unknown): boolean {
  return record(value) && typeof value.id === 'string' && typeof value.name === 'string' && ['municipality', 'airport', 'water'].includes(String(value.kind)) && finite(value.lat) && finite(value.lon) && nullableNumber(value.population) && nullableNumber(value.population_year)
}
function provenanceValid(value: unknown): boolean {
  return record(value) && typeof value.solver_version === 'string' && typeof value.dataset_revision === 'string' && typeof value.input_status === 'string' && strings(value.assumptions) && strings(value.warnings)
}
function sequenceValid(value: Record<string, unknown>): boolean {
  const gridValid = (grid: unknown) => {
    if (!record(grid) || !numbers(grid.east_m) || !numbers(grid.north_m) || !numbers(grid.extent_m) || grid.extent_m.length !== 4 || !finite(grid.cell_m) || grid.cell_m <= 0) return false
    const nx = grid.east_m.length, ny = grid.north_m.length
    const matrix = (m: unknown) => Array.isArray(m) && m.length === ny && m.every(row => numbers(row) && row.length === nx && row.every(n => n >= 0))
    return nx >= 2 && ny >= 2 && nx <= 400 && ny <= 400 && matrix(grid.thickness_mm) && matrix(grid.load_kg_m2)
  }
  const coordsValid = (coords: unknown, depth: number): boolean => depth === 1 ? numbers(coords) && coords.length === 2 : Array.isArray(coords) && coords.length > 0 && coords.every(c => coordsValid(c, depth - 1))
  const geoValid = (geo: unknown) => record(geo) && geo.type === 'FeatureCollection' && Array.isArray(geo.features) && geo.features.every(f => record(f) && record(f.geometry) && ['LineString', 'Polygon', 'MultiPolygon'].includes(String(f.geometry.type)) && coordsValid(f.geometry.coordinates, f.geometry.type === 'LineString' ? 2 : f.geometry.type === 'Polygon' ? 3 : 4))
  const resultRows = (rows: unknown) => Array.isArray(rows) && rows.every(r => receptorValid(r) && record(r) && finite(r.east_m) && finite(r.north_m) && typeof r.in_domain === 'boolean' && nullableNumber(r.load_kg_m2) && nullableNumber(r.thickness_mm) && [true, false, null].includes(r.reported as boolean | null) && record(r.screening) && Object.values(r.screening).every(s => ['exceeded', 'below', 'unknown'].includes(String(s))) && optional(r.screening_reasons, stringRecord))
  const diagnosticValid = (diagnostic: unknown) => record(diagnostic) && ['emitted_mass_kg', 'deposited_mass_kg', 'airborne_mass_kg', 'inside_domain_mass_kg', 'outside_domain_mass_kg'].every(key => finite(diagnostic[key]) && (diagnostic[key] as number) >= 0)
  if (!scenarioValid(value.scenario) || !record(value.options) || !gridValid(value.final_grid) || !provenanceValid(value.provenance) || !strings(value.warnings) || !strings(value.assumptions) || !record(value.lava) || !Array.isArray(value.frames) || value.frames.length < 25 || value.frames.length > 49) return false
  if (typeof value.options.include_lava !== 'boolean' || !['frame_count', 'plume_rise_speed_m_s', 'lava_effusion_m3_s', 'lava_width_m', 'lava_viscosity_pa_s', 'lava_density_kg_m3', 'lava_max_distance_m'].every(key => finite((value.options as Record<string, unknown>)[key]))) return false
  const frames = value.frames
  if (!frames.every(f => record(f) && geoValid(f.lava_footprint) && strings(f.lava_affected_receptor_ids))) return false
  if (!frames.every((f, i) => record(f) && finite(f.elapsed_s) && f.elapsed_s >= 0 && (i === 0 ? f.elapsed_s === 0 : record(frames[i - 1]) && f.elapsed_s > (frames[i - 1] as Record<string, number>).elapsed_s) && ['before', 'erupting', 'settling', 'after'].includes(String(f.phase)) && gridValid(f.grid) && geoValid(f.contours) && resultRows(f.receptors) && finite(f.column_top_m) && f.column_top_m >= 0 && diagnosticValid(f.diagnostics) && Array.isArray(f.plume_parcels) && f.plume_parcels.every(p => record(p) && typeof p.parcel_id === 'string' && ['grain_index', 'east_m', 'north_m', 'height_m', 'radius_m', 'mass_kg'].every(key => finite(p[key])) && (p.radius_m as number) > 0 && (p.mass_kg as number) >= 0) && Array.isArray(f.fountain_particles_m) && f.fountain_particles_m.every(p => numbers(p) && p.length === 3))) return false
  const lava = value.lava
  return typeof lava.enabled === 'boolean' && typeof lava.stop_reason === 'string' && typeof lava.model_label === 'string' && strings(lava.warnings) && strings(lava.affected_receptor_ids) && geoValid(lava.footprint) && Array.isArray(lava.path) && lava.path.every((p, i, path) => record(p) && ['east_m', 'north_m', 'elevation_m', 'lon', 'lat', 'arrival_s', 'width_m', 'thickness_m', 'speed_m_s'].every(key => finite(p[key])) && (p.width_m as number) > 0 && (p.arrival_s as number) >= 0 && (i === 0 || (p.arrival_s as number) >= path[i - 1].arrival_s)) && Array.isArray(value.fountain_paths_m) && value.fountain_paths_m.every(path => Array.isArray(path) && path.every(p => numbers(p) && p.length === 3)) && finite(value.fountain_flight_time_s) && typeof value.fountain_label === 'string'
}
function simulationValid(value: unknown): boolean {
  if (!record(value) || !scenarioValid(value.scenario) || !record(value.grid) || !record(value.illustration) || !record(value.summary) || !record(value.diagnostics) || !provenanceValid(value.provenance)) return false
  const { grid, illustration, summary, diagnostics } = value
  if (!numbers(grid.east_m) || !numbers(grid.north_m) || grid.east_m.length < 1 || grid.north_m.length < 1 || grid.east_m.length > 400 || grid.north_m.length > 400 || !finite(grid.cell_m) || grid.cell_m <= 0 || !numbers(grid.extent_m) || grid.extent_m.length !== 4) return false
  const width = grid.east_m.length, height = grid.north_m.length
  const matrix = (value: unknown) => Array.isArray(value) && value.length === height && value.every(row => numbers(row) && row.length === width && row.every(n => n >= 0))
  const contoursValid = record(value.contours) && value.contours.type === 'FeatureCollection' && Array.isArray(value.contours.features) && value.contours.features.every(f => record(f) && record(f.geometry) && f.geometry.type === 'LineString' && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.every(p => numbers(p) && p.length === 2) && record(f.properties) && finite(f.properties.thickness_mm))
  return matrix(grid.thickness_mm) && matrix(grid.load_kg_m2) && contoursValid && Array.isArray(value.receptors) && value.receptors.every(r => receptorValid(r) && record(r) && finite(r.east_m) && finite(r.north_m) && typeof r.in_domain === 'boolean' && nullableNumber(r.thickness_mm) && nullableNumber(r.load_kg_m2) && record(r.screening) && Object.values(r.screening).every(s => ['exceeded', 'below', 'unknown'].includes(String(s))) && optional(r.screening_reasons, stringRecord)) && finite(illustration.wind_east_m_s) && finite(illustration.wind_north_m_s) && Array.isArray(illustration.paths) && illustration.paths.every(p => record(p) && finite(p.grain_index) && finite(p.diameter_um) && finite(p.settling_time_s) && p.settling_time_s > 0 && Array.isArray(p.points_m) && p.points_m.length >= 2 && p.points_m.every(point => numbers(point) && point.length === 3)) && ['reporting_cutoff_mm', 'receptors_total', 'receptors_covered', 'municipalities_reported', 'indicative_population', 'reported_population_unknown'].every(key => finite(summary[key])) && ['elapsed_ms', 'retained_fraction', 'outside_domain_mass_kg'].every(key => finite(diagnostics[key])) && typeof diagnostics.validation_status === 'string'
}

async function request<T>(path: string, signal: AbortSignal, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/${path}`, {
      signal,
      ...(body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('Cannot reach the local Python server. Start ABO with scripts/start.ps1, then retry. Your previous completed result is preserved.', { cause: error })
  }
  let value: unknown
  try { value = await response.json() } catch { throw new Error(`Python returned a non-JSON response (HTTP ${response.status}). Check the local backend URL and retry.`) }
  if (!response.ok) {
    const detail = record(value) ? value.detail : undefined
    const fields = Array.isArray(detail) ? detail.filter(record).map(d => `${Array.isArray(d.loc) ? d.loc.join('.') : 'Input'}: ${typeof d.msg === 'string' ? d.msg : 'invalid value'}`).join('; ') : ''
    throw new Error(typeof detail === 'string' ? detail : fields || `Python rejected the request (HTTP ${response.status}). Check the inputs and retry.`)
  }
  if (!record(value)) throw new Error('Unexpected Python response. Check that the backend and frontend versions match.')
  const valid = path === 'catalog'
    ? typeof value.revision === 'string' && Array.isArray(value.scenarios) && value.scenarios.every(p => record(p) && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.status === 'string' && scenarioValid(p.scenario)) && Array.isArray(value.volcanoes) && value.volcanoes.every(v => record(v) && typeof v.id === 'string' && typeof v.name === 'string' && finite(v.lat) && finite(v.lon) && finite(v.elevation_m)) && Array.isArray(value.sources) && value.sources.every(s => record(s) && typeof s.title === 'string' && typeof s.url === 'string') && Array.isArray(value.receptors) && value.receptors.every(receptorValid) && Array.isArray(value.winds) && value.winds.every(w => record(w) && typeof w.name === 'string' && typeof w.status === 'string' && nullableNumber(w.speed_m_s) && nullableNumber(w.from_deg)) && record(value.historical) && typeof value.historical.reason === 'string' && evidenceValid(value.parameter_evidence) && optional(value.inventory_coverage, record) && optional(value.screening_contexts, entries => Array.isArray(entries) && entries.every(entry => record(entry) && typeof entry.id === 'string' && typeof entry.label === 'string' && stringRecord(entry.values))) && historicalDetailsValid(value.historical)
    : path === 'eruption-sequences'
      ? sequenceValid(value)
      : path === 'simulations'
      ? simulationValid(value)
      : path === 'wind-sweeps'
        ? Array.isArray(value.receptors) && value.receptors.every(r => receptorValid(r) && record(r) && typeof r.in_domain === 'boolean' && nullableNumber(r.maximum_thickness_mm) && nullableNumber(r.maximum_load_kg_m2) && nullableNumber(r.wind_from_deg)) && scenarioValid(value.scenario) && value.step_deg === 1 && typeof value.label === 'string'
        : typeof value.available === 'boolean' && typeof value.reason === 'string' && typeof value.validation_status === 'string' && (value.simulation == null || simulationValid(value.simulation)) && record(value.metrics) && Object.values(value.metrics).every(nullableNumber) && historicalDetailsValid(value)
  if (!valid) throw new Error('Unexpected Python response. Check that the backend and frontend versions match.')
  return value as T
}

export const getCatalog = (signal: AbortSignal) => request<Catalog>('catalog', signal)
export const simulate = (scenario: Scenario, signal: AbortSignal, reporting: ReportingOptions = {}) => request<SimulationResult>('simulations', signal, { scenario, ...reporting })
export const sweep = (scenario: Scenario, signal: AbortSignal) => request<SweepResult>('wind-sweeps', signal, { scenario })
export const replicate = (signal: AbortSignal) => request<ReplicationResult>('replications/taal-2020', signal, {})
export const eruption = (scenario: Scenario, options: Partial<EruptionOptions>, signal: AbortSignal, reporting: ReportingOptions = {}) => request<EruptionSequence>('eruption-sequences', signal, { simulation: { scenario, ...reporting }, options })
