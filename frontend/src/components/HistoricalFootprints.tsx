import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { FeatureCollection } from 'geojson'
import type { ReplicationResult } from '../api/simulator'
import { number } from '../presentation'
import { hideLeafletVectors } from './leafletAccessibility'

export default function HistoricalFootprints({
  traces,
}: {
  traces: NonNullable<ReplicationResult['reference_footprints']>
}) {

  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {

    if (!container.current) return
    const map = L.map(container.current, { center: [14, 121], zoom: 8 })
    const stopVectorObserver = hideLeafletVectors(container.current)
    const layers = traces.map((trace, index) =>
      L.geoJSON(
        (trace.geojson.type === 'Feature'
          ? { type: 'FeatureCollection', features: [trace.geojson] }
          : trace.geojson) as unknown as FeatureCollection,
        {
          style: {
            color: index === 0 ? '#195cc2' : '#a64112',
            dashArray: index === 0 ? undefined : '8 5',
            weight: 2,
            fillOpacity: 0.025,
          },
          onEachFeature: (_feature, layer) =>
            layer.bindTooltip(`${trace.label} · ${number(trace.threshold_mm)} mm derived contour`),
        },
      ).addTo(map),
    )
    const bounds = L.featureGroup(layers).getBounds()

    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
    map.attributionControl.addAttribution(
      'Derived Taal deposit contours · source dependencies listed below',
    )
    const controller = new AbortController()

    fetch('/geography-context.geojson', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {

        if (data && !controller.signal.aborted)
          L.geoJSON(data, {
            pane: 'tilePane',
            style: { color: '#6b8599', weight: 1, fillColor: '#e7eddd', fillOpacity: 0.7 },
            interactive: false,
          }).addTo(map)

      })
      .catch(() => {
        /* Contour coordinates remain usable without coastline context. */
      })
    const resize = new ResizeObserver(() => map.invalidateSize())

    resize.observe(container.current)

    return () => {

      controller.abort()
      resize.disconnect()
      stopVectorObserver()
      map.remove()

    }

  }, [traces])

  return (
    <>
      <div
        ref={container}
        className="historical-reference-map"
        role="region"
        aria-label="Two independently digitized reference contours, not model predictions"
      />
      <p className="view-note">
        Blue solid: first trace. Brown dashed: second trace. These two traces describe one dependent
        published source; overlap measures digitization repeatability.
      </p>
    </>
  )

}
