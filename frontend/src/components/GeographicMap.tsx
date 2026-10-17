import { memo, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import type { FeatureCollection } from 'geojson'
import 'leaflet/dist/leaflet.css'
import type { EruptionFrame, EruptionSequence, ReceptorResult, Scenario, SimulationResult } from '../api/simulator'
import { depositColor, number } from '../presentation'
import Legend from './Legend'
import Select from './Select'
import Icon from './Icon'
import { phaseLabel, referenceZone } from './eruptionResearch'
import { hideLeafletVectors } from './leafletAccessibility'
import { scenarioClock } from './eruptionReplay'

type Props = {
  scenario: Scenario
  result: SimulationResult | null
  selected: string | null
  onSelect: (id: string) => void
  eruptionSequence?: EruptionSequence | null
  frame?: EruptionFrame | null
}

function GeographicMap({ scenario, result, selected, onSelect, eruptionSequence, frame }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const markers = useRef<Map<string, L.CircleMarker>>(new Map())
  const mapRef = useRef<L.Map | null>(null)
  const resultsLayer = useRef<L.LayerGroup | null>(null)
  const referenceLayer = useRef<L.LayerGroup | null>(null)
  const historicalLayer = useRef<L.LayerGroup | null>(null)

  const [chosenEffect, setEffect] = useState<'ash' | 'lava'>('ash')
  const effect = eruptionSequence?.lava.enabled ? chosenEffect : 'ash'

  const [showReference, setShowReference] = useState(false)
  const [showProvinces, setShowProvinces] = useState(true)
  const [showMunicipalities, setShowMunicipalities] = useState(true)
  const [showCityLabels, setShowCityLabels] = useState(true)
  const [showHistorical, setShowHistorical] = useState(false)

  const referenceVisible = useRef(false)
  const historicalVisible = useRef(false)

  const zone = referenceZone(scenario.volcano_id)
  const rows = frame?.receptors ?? result?.receptors
  const contours = frame?.contours ?? result?.contours
  const [mapState, setMapState] = useState(
    'Offline geographic context. Computed contours and receptors remain available.'
  )

  const select = useRef(onSelect)
  useEffect(() => {
    select.current = onSelect
  }, [onSelect])

  const [municipalBoundaries, setMunicipalBoundaries] = useState<FeatureCollection | null>(null)
  const [provincialBoundaries, setProvincialBoundaries] = useState<FeatureCollection | null>(null)
  const [historicalFootprint, setHistoricalFootprint] = useState<FeatureCollection | null>(null)

  useEffect(() => {
    if (!element.current) return
    const map = L.map(element.current, {
      center: [scenario.vent_lat, scenario.vent_lon],
      zoom: 9,
      keyboard: true,
    })
    const stopVectorObserver = hideLeafletVectors(element.current)
    mapRef.current = map
    resultsLayer.current = L.layerGroup().addTo(map)
    referenceLayer.current = L.layerGroup().addTo(map)
    historicalLayer.current = L.layerGroup().addTo(map)

    const reference = referenceLayer.current
    const recorded = referenceZone(scenario.volcano_id)
    if (recorded?.radius_m) {
      L.circle([scenario.vent_lat, scenario.vent_lon], {
        radius: recorded.radius_m,
        color: '#5b527e',
        weight: 2,
        dashArray: '6 5',
        fillOpacity: 0.04,
      })
        .bindTooltip(
          `${recorded.radius_m / 1000} km PDZ reference · ${recorded.source.date} · not a current alert`
        )
        .addTo(reference)
    }
    if (!referenceVisible.current) map.removeLayer(reference)
    if (!historicalVisible.current) map.removeLayer(historicalLayer.current)

    map.attributionControl.addAttribution(
      'Land/lakes: Natural Earth; Boundaries: geoBoundaries/PSA; Taal Lake © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors · ODbL</a>'
    )

    const controller = new AbortController()

    // 1. Load coastline / land-lake geography
    fetch('/geography-context.geojson', { signal: controller.signal, cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('Geographic context missing')
        return r.json() as Promise<FeatureCollection>
      })
      .then(data => {
        L.geoJSON(data, {
          pane: 'tilePane',
          style: feature => ({
            color: '#6b8599',
            weight: 1,
            fillColor: feature?.properties?.kind === 'lake' ? '#c4def1' : '#e7eddd',
            fillOpacity: 1,
          }),
          interactive: false,
        }).addTo(map)

        if (scenario.volcano_id === 'taal') {
          fetch('/taal_pdz.geojson', { signal: controller.signal, cache: 'no-store' })
            .then(r => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
            .then(pdz => {
              if (pdz && referenceLayer.current) {
                L.geoJSON(pdz, {
                  style: { color: '#5b527e', weight: 2, dashArray: '6 5', fillOpacity: 0.04 },
                })
                  .bindTooltip(
                    'Volcano Island shoreline context · PHIVOLCS PDZ reference, 15 Feb 2021 · contextual reference overlay, not a computed model result'
                  )
                  .addTo(referenceLayer.current)
              }
            })
            .catch(() => {})
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setMapState(
            `Offline geography unavailable (${error.message}). Coordinates, contours and receptors still work.`
          )
        }
      })

    // 2. Load provincial boundaries
    fetch('/provincial-boundaries.geojson', { signal: controller.signal, cache: 'no-store' })
      .then(r => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
      .then(data => {
        if (data) setProvincialBoundaries(data)
      })
      .catch(() => {})

    // 3. Load municipal boundaries
    fetch('/municipal-boundaries.geojson', { signal: controller.signal, cache: 'no-store' })
      .then(r => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
      .then(data => {
        if (data) setMunicipalBoundaries(data)
      })
      .catch(() => {})

    // 4. Load 2020 historical footprint for Taal comparison
    fetch('/taal_2020_footprint.geojson', { signal: controller.signal, cache: 'no-store' })
      .then(r => (r.ok ? (r.json() as Promise<FeatureCollection>) : null))
      .then(data => {
        if (data) setHistoricalFootprint(data)
      })
      .catch(() => {})

    const key = import.meta.env.VITE_MAPTILER_KEY
    if (key) {
      const tiles = L.tileLayer(
        `https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
        {
          maxZoom: 18,
          attribution: '© <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
        }
      ).addTo(map)
      tiles.on('load', () => setMapState('MapTiler basemap; scientific data are local.'))
      tiles.on('tileerror', () => {
        map.removeLayer(tiles)
        setMapState(
          'MapTiler unavailable. Using offline coastline; scientific results are unaffected.'
        )
      })
    }

    L.marker([scenario.vent_lat, scenario.vent_lon], {
      icon: L.divIcon({
        className: 'vent-marker',
        html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 21 7-14 3 4 3-4 7 14H2Z" fill="#195cc2" stroke="#fff" stroke-width="2"/></svg>',
        iconSize: [24, 24],
        iconAnchor: [12, 20],
      }),
      title: `${scenario.volcano_id} model vent`,
    })
      .addTo(map)
      .bindTooltip(`${scenario.volcano_id[0].toUpperCase()}${scenario.volcano_id.slice(1)} · model vent`)

    L.control.scale({ imperial: false, maxWidth: 100 }).addTo(map)
    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(element.current)
    const createdMarkers = markers.current

    return () => {
      controller.abort()
      resize.disconnect()
      stopVectorObserver()
      map.remove()
      mapRef.current = null
      resultsLayer.current = null
      referenceLayer.current = null
      historicalLayer.current = null
      createdMarkers.clear()
    }
  }, [scenario])

  // Render results, boundaries, contours, and localities
  useEffect(() => {
    const map = mapRef.current
    const layer = resultsLayer.current
    if (!map || !layer) return
    layer.clearLayers()
    markers.current.clear()

    const receptorsMap = new Map<string, ReceptorResult>()
    if (rows) {
      rows.forEach(r => {
        receptorsMap.set(r.id, r)
        // Also map by clean base name
        const baseName = r.name.split(',')[0].trim().toLowerCase()
        if (!receptorsMap.has(baseName)) receptorsMap.set(baseName, r)
      })
    }

    const sampleGridThickness = (lat: number, lon: number): number | null => {
      const g = frame?.grid ?? result?.grid
      if (!g || !g.east_m.length || !g.north_m.length) return null
      const dy = (lat - scenario.vent_lat) * 111132
      const dx = (lon - scenario.vent_lon) * 111132 * Math.cos((scenario.vent_lat * Math.PI) / 180)
      const e0 = g.east_m[0]
      const n0 = g.north_m[0]
      const cell = g.cell_m
      const i = Math.round((dx - e0) / cell)
      const j = Math.round((dy - n0) / cell)
      if (j >= 0 && j < g.thickness_mm.length && i >= 0 && i < g.thickness_mm[j].length) {
        return g.thickness_mm[j][i]
      }
      return null
    }

    // 1. Municipal Boundaries Layer
    if (showMunicipalities && municipalBoundaries && rows) {
      L.geoJSON(municipalBoundaries, {
        style: feat => {
          const prop = feat?.properties ?? {}
          const cleanName = String(prop.name).split(',')[0].trim().toLowerCase()
          const rec = receptorsMap.get(prop.receptor_id) || receptorsMap.get(cleanName)
          let thickness = rec?.thickness_mm
          if (thickness == null && prop.center_lat && prop.center_lon) {
            thickness = sampleGridThickness(prop.center_lat, prop.center_lon)
          }
          const val = thickness ?? 0
          const hasAsh = val >= 0.01
          return {
            color: hasAsh ? '#334155' : '#94a3b8',
            weight: hasAsh ? 1.2 : 0.6,
            fillColor: hasAsh ? depositColor(val) : '#f8fafc',
            fillOpacity: val >= 0.5 ? 0.45 : val >= 0.01 ? 0.25 : 0.04,
          }
        },
        onEachFeature: (feat, polygon) => {
          const prop = feat.properties ?? {}
          const cleanName = String(prop.name).split(',')[0].trim().toLowerCase()
          const rec = receptorsMap.get(prop.receptor_id) || receptorsMap.get(cleanName)
          let thickness = rec?.thickness_mm
          if (thickness == null && prop.center_lat && prop.center_lon) {
            thickness = sampleGridThickness(prop.center_lat, prop.center_lon)
          }
          const thicknessStr = thickness != null ? `${number(thickness)} mm ash` : 'Unmodeled'
          const provStr = prop.province ? ` (${prop.province})` : ''
          polygon.bindTooltip(`${prop.name}${provStr}: ${thicknessStr}`)
          if (rec) {
            polygon.on('click', () => select.current(rec.id))
          }
        },
      }).addTo(layer)
    }

    // 2. Provincial Boundaries and Regional Labels
    if (showProvinces && provincialBoundaries) {
      L.geoJSON(provincialBoundaries, {
        style: {
          color: '#475569',
          weight: 1.8,
          dashArray: '4 4',
          fillOpacity: 0,
        },
        interactive: false,
      }).addTo(layer)

      // Add clean province labels at centroid
      provincialBoundaries.features.forEach(feat => {
        const prop = feat.properties ?? {}
        if (prop.center_lat && prop.center_lon && prop.province) {
          const labelHtml = `<span class="province-label-tag">${prop.province}</span>`
          L.marker([prop.center_lat, prop.center_lon], {
            icon: L.divIcon({
              className: 'province-map-label',
              html: labelHtml,
              iconSize: [120, 24],
              iconAnchor: [60, 12],
            }),
            interactive: false,
          }).addTo(layer)
        }
      })
    }

    // 3. Ash Contours (trace 0.01-0.1 mm dashed, >=0.5 mm solid)
    if (effect === 'ash' && contours) {
      const geojson = contours as unknown as FeatureCollection
      // Casing line for >= 0.5 mm
      L.geoJSON(geojson, {
        filter: feat => Number(feat.properties?.thickness_mm) >= 0.5,
        style: { color: '#3c4038', weight: 5, opacity: 0.95 },
        interactive: false,
      }).addTo(layer)

      // Primary solid contours >= 0.5 mm
      L.geoJSON(geojson, {
        filter: feat => Number(feat.properties?.thickness_mm) >= 0.5,
        style: feat => ({
          color: depositColor(Number(feat?.properties?.thickness_mm)),
          weight: 3,
          opacity: 1,
        }),
        onEachFeature: (feat, line) => {
          line.bindTooltip(`${number(Number(feat.properties?.thickness_mm))} mm accumulated ash contour`)
        },
      }).addTo(layer)

      // Distal trace contours (0.01 mm and 0.1 mm) with amber dashed styling
      L.geoJSON(geojson, {
        filter: feat => Number(feat.properties?.thickness_mm) < 0.5,
        style: feat => ({
          color: Number(feat?.properties?.thickness_mm) >= 0.1 ? '#ca8a04' : '#eab308',
          weight: 2,
          dashArray: '5 4',
          opacity: 0.9,
        }),
        onEachFeature: (feat, line) => {
          line.bindTooltip(`${number(Number(feat.properties?.thickness_mm))} mm distal trace ash contour`)
        },
      }).addTo(layer)
    }

    // 4. Illustrative Lava Routing
    if (effect === 'lava' && eruptionSequence?.lava.enabled) {
      const lava = eruptionSequence.lava
      const elapsed = frame?.elapsed_s ?? 0
      const path = lava.path.filter(p => p.arrival_s <= elapsed)
      const next = lava.path[path.length]
      const previous = path[path.length - 1]
      const coords = path.map(p => [p.lat, p.lon] as L.LatLngTuple)
      if (next && previous) {
        const fraction = (elapsed - previous.arrival_s) / (next.arrival_s - previous.arrival_s)
        coords.push([
          previous.lat + (next.lat - previous.lat) * fraction,
          previous.lon + (next.lon - previous.lon) * fraction,
        ])
      }
      if (coords.length > 1) {
        L.polyline(coords, { color: '#b43f14', weight: 6 })
          .bindTooltip('Illustrative lava channel · line enlarged for visibility')
          .addTo(layer)
      }
      if (frame) {
        L.geoJSON(frame.lava_footprint as unknown as FeatureCollection, {
          style: { color: '#b43f14', fillColor: '#da6a26', fillOpacity: 0.4, weight: 1 },
        })
          .bindTooltip('Channel reached at selected time, prescribed width')
          .addTo(layer)
      }
      if (coords.length && frame?.phase === 'erupting') {
        L.circleMarker(coords[coords.length - 1], {
          radius: 6,
          color: '#722b12',
          fillColor: '#ff9d36',
          fillOpacity: 1,
        })
          .bindTooltip('Illustrative advancing lava front')
          .addTo(layer)
      }
    }

    // 5. Municipal Centroid Markers & Smart City Badges
    const labeledPositions = new Set<string>()
    if (rows) {
      rows.forEach(r => {
        const isAffected = (r.thickness_mm ?? 0) >= 0.01
        const tooltip = document.createElement('span')
        const provText = r.province ? ` (${r.province})` : ''
        tooltip.textContent = `${r.name.split(',')[0]}${provText}: ${number(r.thickness_mm)} mm${r.in_domain ? '' : ' · Outside domain'}`
        if (effect === 'lava') {
          tooltip.textContent = `${r.name}: ${
            frame?.lava_affected_receptor_ids.includes(r.id)
              ? 'Point intersects channel at selected time'
              : 'Point does not intersect channel at selected time'
          } · not a damage assessment`
        }

        const marker = L.circleMarker([r.lat, r.lon], {
          radius: r.kind === 'airport' ? 6 : isAffected ? 5 : 3.5,
          color: isAffected ? '#0f172a' : '#334155',
          fillColor:
            effect === 'lava'
              ? frame?.lava_affected_receptor_ids.includes(r.id)
                ? '#da6a26'
                : '#ffffff'
              : r.thickness_mm == null
              ? '#ffffff'
              : depositColor(r.thickness_mm),
          fillOpacity: 1,
          weight: r.in_domain ? 1.5 : 1,
          dashArray: r.in_domain ? undefined : '2 2',
        })
          .addTo(layer)
          .bindTooltip(tooltip)
          .on('click', () => select.current(r.id))

        markers.current.set(r.id, marker)

        // Show city label badge for affected localities when enabled
        if (showCityLabels && isAffected && effect === 'ash') {
          const cityName = r.name.split(',')[0].replace('City of ', '').trim()
          labeledPositions.add(cityName.toLowerCase())
          const badgeHtml = `<span class="city-map-badge">${cityName} <strong>${number(r.thickness_mm)} mm</strong></span>`
          L.marker([r.lat, r.lon], {
            icon: L.divIcon({
              className: 'city-badge-container',
              html: badgeHtml,
              iconSize: [110, 20],
              iconAnchor: [55, -6],
            }),
            interactive: false,
          }).addTo(layer)
        }
      })
    }

    // Additional badges for major domain municipalities not covered in rows
    if (showCityLabels && effect === 'ash' && municipalBoundaries) {
      municipalBoundaries.features.forEach(feat => {
        const prop = feat.properties ?? {}
        if (!prop.center_lat || !prop.center_lon) return
        const rawName = String(prop.name).split(',')[0].replace('City of ', '').trim()
        const normKey = rawName.toLowerCase()
        if (labeledPositions.has(normKey)) return

        const rec = receptorsMap.get(prop.receptor_id) || receptorsMap.get(normKey)
        const th = rec?.thickness_mm ?? sampleGridThickness(prop.center_lat, prop.center_lon)
        if (th != null && th >= 0.5) {
          labeledPositions.add(normKey)
          const badgeHtml = `<span class="city-map-badge">${rawName} <strong>${number(th)} mm</strong></span>`
          L.marker([prop.center_lat, prop.center_lon], {
            icon: L.divIcon({
              className: 'city-badge-container',
              html: badgeHtml,
              iconSize: [110, 20],
              iconAnchor: [55, -6],
            }),
            interactive: false,
          }).addTo(layer)
        }
      })
    }
  }, [
    scenario,
    rows,
    contours,
    effect,
    eruptionSequence,
    frame,
    showProvinces,
    showMunicipalities,
    showCityLabels,
    result,
    municipalBoundaries,
    provincialBoundaries,
  ])

  // Historical Reference 2020 Footprint Toggle
  useEffect(() => {
    historicalVisible.current = showHistorical
    const layer = historicalLayer.current
    const map = mapRef.current
    if (!layer || !map) return
    layer.clearLayers()

    if (showHistorical && historicalFootprint && scenario.volcano_id === 'taal') {
      L.geoJSON(historicalFootprint, {
        style: {
          color: '#7c3aed',
          weight: 2.5,
          dashArray: '6 4',
          fillColor: '#8b5cf6',
          fillOpacity: 0.08,
        },
        onEachFeature: (_, featureLayer) => {
          featureLayer.bindTooltip(
            '12–13 Jan 2020 Taal 0.5 mm isopach (Balangue-Tarriela et al., 2022) · ~8,640 km² across Luzon'
          )
        },
      }).addTo(layer)
      layer.addTo(map)
    } else {
      map.removeLayer(layer)
    }
  }, [showHistorical, scenario, historicalFootprint])

  useEffect(() => {
    referenceVisible.current = showReference
    if (referenceLayer.current && mapRef.current) {
      if (showReference) referenceLayer.current.addTo(mapRef.current)
      else mapRef.current.removeLayer(referenceLayer.current)
    }
  }, [showReference, scenario])

  useEffect(() => {
    markers.current.forEach((marker, id) => {
      marker.setRadius(selected === id ? 8 : 4)
      marker.setStyle({
        color: selected === id ? '#195cc2' : '#244d80',
        weight: selected === id ? 3 : 1.5,
      })
    })
    const marker = selected ? markers.current.get(selected) : null
    if (marker && mapRef.current && !mapRef.current.getBounds().contains(marker.getLatLng())) {
      mapRef.current.panTo(marker.getLatLng(), { animate: false })
    }
  }, [selected, result, frame, effect])

  const chosen = rows?.find(r => r.id === selected)

  function fitDeposit() {
    if (!result || !mapRef.current) return
    const layer =
      effect === 'lava' && eruptionSequence?.lava.path.length
        ? L.polyline(eruptionSequence.lava.path.map(p => [p.lat, p.lon]))
        : L.geoJSON(contours as unknown as FeatureCollection)
    const bounds = layer.getBounds()
    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [24, 24], maxZoom: 12, animate: false })
  }

  return (
    <div>
      <div className="map-toolbar">
        <Select
          label="Map effect"
          value={effect}
          onChange={value => setEffect(value as typeof effect)}
          options={[
            { value: 'ash', label: 'Accumulated ash' },
            ...(eruptionSequence?.lava.enabled
              ? [{ value: 'lava', label: 'Lava channel · teaching model' }]
              : []),
          ]}
        />
        <div className="map-view-controls">
          <button
            type="button"
            disabled={effect === 'ash' ? !contours?.features.length : !eruptionSequence?.lava.path.length}
            onClick={fitDeposit}
          >
            <Icon name="map" />
            {effect === 'ash' ? 'Deposit extent' : 'Channel extent'}
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Reset map to volcano region"
            title="Reset map to volcano region"
            onClick={() => mapRef.current?.setView([scenario.vent_lat, scenario.vent_lon], 9, { animate: false })}
          >
            <Icon name="reset" />
          </button>
        </div>
      <details className="map-layer-menu"><summary>Layers</summary>
      <fieldset className="map-layers-fieldset" role="group" aria-label="Map visual layer toggles">
        <legend>Map visual layers</legend>
        <div className="map-layer-checkboxes">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showProvinces}
              onChange={e => setShowProvinces(e.target.checked)}
            />
            <span>Provinces</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showMunicipalities}
              onChange={e => setShowMunicipalities(e.target.checked)}
            />
            <span>Municipal areas</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showCityLabels}
              onChange={e => setShowCityLabels(e.target.checked)}
            />
            <span>City labels</span>
          </label>
          {scenario.volcano_id === 'taal' && (
            <label className="checkbox-label historical-checkbox-label">
              <input
                type="checkbox"
                checked={showHistorical}
                onChange={e => setShowHistorical(e.target.checked)}
              />
              <span>Jan 2020 Footprint</span>
            </label>
          )}
        </div>
      </fieldset>
      </details>
      </div>

      <div className="map-stage" ref={element} aria-label="Geographic ashfall map" />
      {import.meta.env.VITE_MAPTILER_KEY && (
        <a className="maptiler-logo" href="https://www.maptiler.com/" aria-label="MapTiler attribution">
          <img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler" />
        </a>
      )}

      {effect === 'ash' ? (
        <Legend />
      ) : (
        <div className="legend">
          <span className="legend-title">Illustrative lava routing</span>
          <span>
            <i style={{ background: '#da6a26' }} />
            Channel / intersecting point
          </span>
          <small>Centerline enlarged; area uses prescribed width at this time. No validated runout or cooling prediction.</small>
        </div>
      )}

      {frame && (
        <p className="map-status">
          Snapshot: {phaseLabel(frame.phase)} · {scenarioClock(frame.elapsed_s)} ·{' '}
          {effect === 'lava'
            ? `${
                frame.receptors.filter(
                  r => r.kind === 'municipality' && frame.lava_affected_receptor_ids.includes(r.id)
                ).length
              } municipal centroids intersect the illustrative channel`
            : `${frame.receptors.filter(r => r.kind === 'municipality' && (r.thickness_mm ?? 0) >= 0.01).length} municipal centroids with ash ≥0.01 mm (${frame.receptors.filter(r => r.kind === 'municipality' && r.reported).length} with ≥0.5 mm)`}
        </p>
      )}

      {result ? (
        <details className="location-inspector-disclosure" open={Boolean(chosen)}><summary>Inspect a location</summary><div className="location-inspector">
          <Select
            label="Inspect location"
            value={selected ?? ''}
            onChange={onSelect}
            options={[
              { value: '', label: 'Choose a map point or location', disabled: true },
              ...[...(rows ?? [])]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(r => ({
                  value: r.id,
                  label: `${r.name}${r.in_domain ? '' : ' · outside domain'}`,
                })),
            ]}
          />
          {chosen && (
            <div className="impact-detail" role="status">
              <div className="impact-quantities">
                <p>
                  <strong>{number(chosen.thickness_mm)} mm</strong>
                  <span>{frame ? 'Accumulated ash at selected time' : 'Eventual accumulated ash'}</span>
                </p>
                <p>
                  <strong>{number(chosen.load_kg_m2)} kg/m²</strong>
                  <span>Ground load</span>
                </p>
              </div>
              <p>
                {chosen.in_domain
                  ? (chosen.thickness_mm ?? 0) >= result.summary.reporting_cutoff_mm
                    ? `At or above the ${result.summary.reporting_cutoff_mm} mm reporting cutoff.`
                    : (chosen.thickness_mm ?? 0) >= 0.01
                    ? `Trace deposit (≥0.01 mm); below the ${result.summary.reporting_cutoff_mm} mm reporting cutoff.`
                    : `Negligible (<0.01 mm); below the ${result.summary.reporting_cutoff_mm} mm reporting cutoff.`
                  : 'Outside the computed domain. Exposure is unknown.'}
              </p>
              {effect === 'lava' && (
                <p>
                  {frame?.lava_affected_receptor_ids.includes(chosen.id)
                    ? 'Point intersects the illustrative channel at this time. Direct inundation can bury or ignite surfaces; actual damage is not calculated.'
                    : 'This point does not intersect the illustrative channel at this time. Other areas of its municipality may differ.'}
                </p>
              )}
              <dl>
                {Object.entries(chosen.screening).map(([key, state]) => (
                  <div key={key}>
                    <dt>
                      {({
                        roof: 'Roof load',
                        crop: 'Crop deposit',
                        surface_exposure: 'Surface ash exposure',
                      } as Record<string, string>)[key] ?? key.replaceAll('_', ' ')}
                    </dt>
                    <dd>
                      {state === 'unknown'
                        ? 'Unknown'
                        : state === 'exceeded'
                        ? 'At or above screening threshold'
                        : 'Below screening threshold'}
                      {chosen.screening_reasons?.[key] && <small>{chosen.screening_reasons[key]}</small>}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="view-note">
                Population: {number(chosen.population, 0)} ({chosen.population_year ?? 'year unknown'}).
                {chosen.province && ` Province: ${chosen.province}.`} A centroid sample does not describe every resident or building.
              </p>
            </div>
          )}
        </div></details>
      ) : (
        <p className="view-note">The geographic backdrop is ready. Run a scenario to compute contours and location exposure.</p>
      )}

      <details>
        <summary>Effects, reference zones & sources</summary>
        <p className="view-note">
          Ash contours are wind-dependent, not circular hazard radii. Points sample accumulated ash at the selected snapshot.
          Deposits can load roofs, cover crops and contaminate exposed water, but this model has no reviewed damage or potability criteria.
          Airport points concern surface ash only.
        </p>
        {zone && (
          <>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showReference}
                onChange={event => setShowReference(event.target.checked)}
              />
              Show dated PDZ reference{zone.radius_m ? ` (${zone.radius_m / 1000} km)` : ' (Volcano Island)'}
            </label>
            <p className="view-note">
              <span className="zone-line" />
              Dashed outline: <a href={zone.source.url} target="_blank" rel="noreferrer">{zone.source.publisher}, {zone.source.date}</a>. {zone.source.note} Reference center uses the catalog vent coordinate.
            </p>
          </>
        )}
        {showHistorical && scenario.volcano_id === 'taal' && (
          <p className="view-note">
            <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#7c3aed', marginRight: '6px' }} />
            Purple outline: Digitized 0.5 mm isopach from Balangue-Tarriela et al. (2022) Figure 4a covering ~8,640 km² across Luzon during the 12–13 Jan 2020 eruption.
          </p>
        )}
        {eruptionSequence?.lava.enabled && (
          <p className="view-note">
            {eruptionSequence.lava.model_label}. Route stops: {eruptionSequence.lava.stop_reason.replaceAll('_', ' ')}.{' '}
            <a href="https://www.usgs.gov/programs/VHP/lava-flows-destroy-everything-their-path" target="_blank" rel="noreferrer">
              Lava effects and controls (USGS)
            </a>
          </p>
        )}
        <p className="map-status" role="status">{mapState}</p>
        <p className="view-note">
          Boundaries from geoBoundaries gbOpen ADM3 (2020) and PSA. Generalized land/lake geometry is for orientation.
        </p>
      </details>
    </div>
  )
}

export default memo(GeographicMap)
