import { memo, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { FeatureCollection } from 'geojson'
import 'leaflet/dist/leaflet.css'
import type { EruptionFrame, EruptionSequence, Scenario, SimulationResult } from '../api/simulator'
import { depositColor, number } from '../presentation'
import Legend from './Legend'
import Select from './Select'
import Icon from './Icon'
import { phaseLabel, referenceZone } from './eruptionResearch'
import { hideLeafletVectors } from './leafletAccessibility'
import { scenarioClock } from './eruptionReplay'

type Props = { scenario: Scenario; result: SimulationResult | null; selected: string | null; onSelect: (id: string) => void; eruptionSequence?: EruptionSequence | null; frame?: EruptionFrame | null }
function GeographicMap({ scenario, result, selected, onSelect, eruptionSequence, frame }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const markers = useRef<Map<string, L.CircleMarker>>(new Map())
  const mapRef = useRef<L.Map | null>(null)
  const resultsLayer = useRef<L.LayerGroup | null>(null)
  const referenceLayer = useRef<L.LayerGroup | null>(null)
  const [chosenEffect, setEffect] = useState<'ash' | 'lava'>('ash')
  const effect = eruptionSequence?.lava.enabled ? chosenEffect : 'ash'
  const [showReference, setShowReference] = useState(false)
  const referenceVisible = useRef(false)
  const zone = referenceZone(scenario.volcano_id)
  const rows = frame?.receptors ?? result?.receptors
  const contours = frame?.contours ?? result?.contours
  const [mapState, setMapState] = useState('Offline geographic context. Computed contours and receptors remain available.')
  const select = useRef(onSelect)
  useEffect(() => { select.current = onSelect }, [onSelect])
  useEffect(() => {
    if (!element.current) return
    const map = L.map(element.current, { center: [scenario.vent_lat, scenario.vent_lon], zoom: 10, keyboard: true })
    const stopVectorObserver = hideLeafletVectors(element.current)
    mapRef.current = map
    resultsLayer.current = L.layerGroup().addTo(map)
    referenceLayer.current = L.layerGroup().addTo(map)
    const reference = referenceLayer.current
    const recorded = referenceZone(scenario.volcano_id)
    if (recorded?.radius_m) L.circle([scenario.vent_lat, scenario.vent_lon], { radius: recorded.radius_m, color: '#5b527e', weight: 2, dashArray: '6 5', fillOpacity: 0.04 }).bindTooltip(`${recorded.radius_m / 1000} km PDZ reference · ${recorded.source.date} · not a current alert`).addTo(reference)
    if (!referenceVisible.current) map.removeLayer(reference)
    map.attributionControl.addAttribution('Land/lakes: Natural Earth; Taal Lake © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors · ODbL</a>')
    const controller = new AbortController()
    const coastline = fetch('/geography-context.geojson', { signal: controller.signal, cache: 'no-store' }).then(r => {
      if (!r.ok) throw new Error('Geographic context missing')
      return r.json() as Promise<FeatureCollection>
    }).then(data => {
      L.geoJSON(data, { pane: 'tilePane', style: feature => ({ color: '#6b8599', weight: 1, fillColor: feature?.properties?.kind === 'lake' ? '#c4def1' : '#e7eddd', fillOpacity: 1 }), interactive: false }).addTo(map)
      // The cached Lake Taal polygon's native holes preserve the island coastline.
      // Show the largest nearby island as context, never an invented Taal radius.
      if (scenario.volcano_id === 'taal') {
        fetch('/taal_pdz.geojson', { signal: controller.signal, cache: 'no-store' })
          .then(r => r.ok ? (r.json() as Promise<FeatureCollection>) : null)
          .then(pdz => {
            if (pdz) {
              L.geoJSON(pdz, { style: { color: '#5b527e', weight: 2, dashArray: '6 5', fillOpacity: 0.04 } })
                .bindTooltip('Volcano Island shoreline context · PHIVOLCS PDZ reference, 15 Feb 2021 · contextual reference overlay, not a computed model result')
                .addTo(reference)
            } else {
              const candidates: number[][][] = []
              data.features.forEach(feature => {
                if (feature.properties?.kind !== 'lake') return
                const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : []
                polygons.forEach(polygon => polygon.slice(1).forEach(ring => {
                  if (ring.some(p => Math.abs(p[0] - scenario.vent_lon) < 0.05 && Math.abs(p[1] - scenario.vent_lat) < 0.05)) candidates.push(ring)
                }))
              })
              const island = candidates.sort((a, b) => b.length - a.length)[0]
              if (island) L.polygon(island.map(p => [p[1], p[0]] as L.LatLngTuple), { color: '#5b527e', weight: 2, dashArray: '6 5', fillOpacity: 0.04 }).bindTooltip('Volcano Island shoreline context · PHIVOLCS PDZ reference, 15 Feb 2021 · not a surveyed boundary').addTo(reference)
            }
          })
          .catch(() => {})
      }
    }).catch(error => {
      if (!controller.signal.aborted) setMapState(`Offline geography unavailable (${error.message}). Coordinates, contours and receptors still work.`)
    })
    void coastline
    const key = import.meta.env.VITE_MAPTILER_KEY
    if (key) {
      const tiles = L.tileLayer(`https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`, {
        maxZoom: 18, attribution: '© <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
      }).addTo(map)
      tiles.on('load', () => setMapState('MapTiler basemap; scientific data are local.'))
      tiles.on('tileerror', () => { map.removeLayer(tiles); setMapState('MapTiler unavailable. Using offline coastline; scientific results are unaffected.') })
    }
    L.marker([scenario.vent_lat, scenario.vent_lon], { icon: L.divIcon({ className: 'vent-marker', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 21 7-14 3 4 3-4 7 14H2Z" fill="#195cc2" stroke="#fff" stroke-width="2"/></svg>', iconSize: [24, 24], iconAnchor: [12, 20] }), title: `${scenario.volcano_id} model vent` }).addTo(map).bindTooltip(`${scenario.volcano_id[0].toUpperCase()}${scenario.volcano_id.slice(1)} · model vent`)
    L.control.scale({ imperial: false, maxWidth: 100 }).addTo(map)
    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(element.current)
    const createdMarkers = markers.current
    return () => { controller.abort(); resize.disconnect(); stopVectorObserver(); map.remove(); mapRef.current = null; resultsLayer.current = null; referenceLayer.current = null; createdMarkers.clear() }
  }, [scenario])
  useEffect(() => {
    const map = mapRef.current, layer = resultsLayer.current
    if (!map || !layer) return
    layer.clearLayers(); markers.current.clear()
    if (effect === 'ash' && contours) {
      const geojson = contours as unknown as FeatureCollection
      L.geoJSON(geojson, { style: { color: '#3c4038', weight: 5, opacity: 0.95 }, interactive: false }).addTo(layer)
      L.geoJSON(geojson, { style: feature => ({ color: depositColor(Number(feature?.properties?.thickness_mm)), weight: 3, opacity: 1 }), onEachFeature: (feature, line) => line.bindTooltip(`${number(Number(feature.properties?.thickness_mm))} mm accumulated ash contour`) }).addTo(layer)
    }
    if (effect === 'lava' && eruptionSequence?.lava.enabled) {
      const lava = eruptionSequence.lava, elapsed = frame?.elapsed_s ?? 0
      const path = lava.path.filter(p => p.arrival_s <= elapsed)
      const next = lava.path[path.length], previous = path[path.length - 1]
      const coords = path.map(p => [p.lat, p.lon] as L.LatLngTuple)
      if (next && previous) { const fraction = (elapsed - previous.arrival_s) / (next.arrival_s - previous.arrival_s); coords.push([previous.lat + (next.lat - previous.lat) * fraction, previous.lon + (next.lon - previous.lon) * fraction]) }
      if (coords.length > 1) L.polyline(coords, { color: '#b43f14', weight: 6 }).bindTooltip('Illustrative lava channel · line enlarged for visibility').addTo(layer)
      if (frame) L.geoJSON(frame.lava_footprint as unknown as FeatureCollection, { style: { color: '#b43f14', fillColor: '#da6a26', fillOpacity: 0.4, weight: 1 } }).bindTooltip('Channel reached at selected time, prescribed width').addTo(layer)
      if (coords.length && frame?.phase === 'erupting') L.circleMarker(coords[coords.length - 1], { radius: 6, color: '#722b12', fillColor: '#ff9d36', fillOpacity: 1 }).bindTooltip('Illustrative advancing lava front').addTo(layer)
    }
    if (rows) {
      rows.forEach(r => {
        const tooltip = document.createElement('span')
        tooltip.textContent = `${r.name}: ${number(r.thickness_mm)} mm${r.in_domain ? '' : ' · Outside domain'}`
        if (effect === 'lava') tooltip.textContent = `${r.name}: ${frame?.lava_affected_receptor_ids.includes(r.id) ? 'Point intersects channel at selected time' : 'Point does not intersect channel at selected time'} · not a damage assessment`
        const marker = L.circleMarker([r.lat, r.lon], { radius: r.kind === 'airport' ? 6 : 4, color: '#244d80', fillColor: effect === 'lava' ? (frame?.lava_affected_receptor_ids.includes(r.id) ? '#da6a26' : '#ffffff') : r.thickness_mm == null ? '#ffffff' : depositColor(r.thickness_mm), fillOpacity: 1, weight: r.in_domain ? 1.5 : 1, dashArray: r.in_domain ? undefined : '2 2' }).addTo(layer).bindTooltip(tooltip).on('click', () => select.current(r.id))
        markers.current.set(r.id, marker)
      })
    }
  }, [scenario, rows, contours, effect, eruptionSequence, frame])
  useEffect(() => {
    referenceVisible.current = showReference
    if (referenceLayer.current && mapRef.current) { if (showReference) referenceLayer.current.addTo(mapRef.current); else mapRef.current.removeLayer(referenceLayer.current) }
  }, [showReference, scenario])
  useEffect(() => {
    markers.current.forEach((marker, id) => { marker.setRadius(selected === id ? 8 : 4); marker.setStyle({ color: selected === id ? '#195cc2' : '#244d80', weight: selected === id ? 3 : 1.5 }) })
    const marker = selected ? markers.current.get(selected) : null
    if (marker && mapRef.current && !mapRef.current.getBounds().contains(marker.getLatLng())) mapRef.current.panTo(marker.getLatLng(), { animate: false })
  }, [selected, result, frame, effect])
  const chosen = rows?.find(r => r.id === selected)
  function fitDeposit() {
    if (!result || !mapRef.current) return
    const layer = effect === 'lava' && eruptionSequence?.lava.path.length ? L.polyline(eruptionSequence.lava.path.map(p => [p.lat, p.lon])) : L.geoJSON(contours as unknown as FeatureCollection)
    const bounds = layer.getBounds()
    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 12, animate: false })
  }
  return <div>
    <div className="map-toolbar"><Select label="Map effect" value={effect} onChange={value => setEffect(value as typeof effect)} options={[{ value: 'ash', label: 'Accumulated ash' }, ...(eruptionSequence?.lava.enabled ? [{ value: 'lava', label: 'Lava channel · teaching model' }] : [])]} /><div className="map-view-controls"><button type="button" disabled={effect === 'ash' ? !contours?.features.length : !eruptionSequence?.lava.path.length} onClick={fitDeposit}><Icon name="map" />{effect === 'ash' ? 'Deposit extent' : 'Channel extent'}</button><button className="icon-button" type="button" aria-label="Reset map to volcano region" title="Reset map to volcano region" onClick={() => mapRef.current?.setView([scenario.vent_lat, scenario.vent_lon], 10, { animate: false })}><Icon name="reset" /></button></div></div>
    <div className="map-stage" ref={element} aria-label="Geographic ashfall map" />
    {import.meta.env.VITE_MAPTILER_KEY && <a className="maptiler-logo" href="https://www.maptiler.com/" aria-label="MapTiler attribution"><img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler" /></a>}
    {effect === 'ash' ? <Legend /> : <div className="legend"><span className="legend-title">Illustrative lava routing</span><span><i style={{ background: '#da6a26' }} />Channel / intersecting point</span><small>Centerline enlarged; area uses prescribed width at this time. No validated runout or cooling prediction.</small></div>}
    {frame && <p className="map-status">Snapshot: {phaseLabel(frame.phase)} · {scenarioClock(frame.elapsed_s)} · {effect === 'lava' ? `${frame.receptors.filter(r => r.kind === 'municipality' && frame.lava_affected_receptor_ids.includes(r.id)).length} municipal centroids intersect the illustrative channel` : `${frame.receptors.filter(r => r.kind === 'municipality' && r.reported).length} municipal centroids with ash ≥0.5 mm`}</p>}
    {result ? <div className="location-inspector"><Select label="Inspect location" value={selected ?? ''} onChange={onSelect} options={[{ value: '', label: 'Choose a map point or location', disabled: true }, ...[...(rows ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map(r => ({ value: r.id, label: `${r.name}${r.in_domain ? '' : ' · outside domain'}` }))]} />
      {chosen && <div className="impact-detail" role="status"><div className="impact-quantities"><p><strong>{number(chosen.thickness_mm)} mm</strong><span>{frame ? 'Accumulated ash at selected time' : 'Eventual accumulated ash'}</span></p><p><strong>{number(chosen.load_kg_m2)} kg/m²</strong><span>Ground load</span></p></div><p>{chosen.in_domain ? chosen.reported ? `At or above the ${result.summary.reporting_cutoff_mm} mm reporting cutoff.` : `Below the ${result.summary.reporting_cutoff_mm} mm reporting cutoff.` : 'Outside the computed domain. Exposure is unknown.'}</p>{effect === 'lava' && <p>{frame?.lava_affected_receptor_ids.includes(chosen.id) ? 'Point intersects the illustrative channel at this time. Direct inundation can bury or ignite surfaces; actual damage is not calculated.' : 'This point does not intersect the illustrative channel at this time. Other areas of its municipality may differ.'}</p>}<dl>{Object.entries(chosen.screening).map(([key, state]) => <div key={key}><dt>{({ roof: 'Roof load', crop: 'Crop deposit', surface_exposure: 'Surface ash exposure' } as Record<string, string>)[key] ?? key.replaceAll('_', ' ')}</dt><dd>{state === 'unknown' ? 'Unknown' : state === 'exceeded' ? 'At or above screening threshold' : 'Below screening threshold'}{chosen.screening_reasons?.[key] && <small>{chosen.screening_reasons[key]}</small>}</dd></div>)}</dl><p className="view-note">Population: {number(chosen.population, 0)} ({chosen.population_year ?? 'year unknown'}). A centroid sample does not describe every resident or building.</p></div>}
    </div> : <p className="view-note">The geographic backdrop is ready. Run a scenario to compute contours and location exposure.</p>}
    <details><summary>Effects, reference zones & sources</summary><p className="view-note">Ash contours are wind-dependent, not circular hazard radii. Points sample accumulated ash at the selected snapshot. Deposits can load roofs, cover crops and contaminate exposed water, but this model has no reviewed damage or potability criteria. Airport points concern surface ash only.</p>{zone && <><label className="checkbox-label"><input type="checkbox" checked={showReference} onChange={event => setShowReference(event.target.checked)} />Show dated PDZ reference{zone.radius_m ? ` (${zone.radius_m / 1000} km)` : ' (Volcano Island)'}</label><p className="view-note"><span className="zone-line" />Dashed outline: <a href={zone.source.url} target="_blank" rel="noreferrer">{zone.source.publisher}, {zone.source.date}</a>. {zone.source.note} Reference center uses the catalog vent coordinate.</p></>}{eruptionSequence?.lava.enabled && <p className="view-note">{eruptionSequence.lava.model_label}. Route stops: {eruptionSequence.lava.stop_reason.replaceAll('_', ' ')}. <a href="https://www.usgs.gov/programs/VHP/lava-flows-destroy-everything-their-path" target="_blank" rel="noreferrer">Lava effects and controls (USGS)</a></p>}<p className="map-status" role="status">{mapState}</p><p className="view-note">Generalized land/lake geometry is for orientation. Taal reference outline is an OSM shoreline approximation, not official hazard GIS.</p></details>
  </div>
}

export default memo(GeographicMap)
