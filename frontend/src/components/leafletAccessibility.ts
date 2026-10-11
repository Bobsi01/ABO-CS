// Leaflet's pointer-only SVG paths duplicate the named location selector/table.
// Hide that rendering subtree while preserving the map, HTML controls and popup.
export function hideLeafletVectors(container: HTMLElement): () => void {
  const update = () => container.querySelectorAll<SVGSVGElement>('.leaflet-overlay-pane svg').forEach(svg => {
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
  })
  const observer = new MutationObserver(update)
  observer.observe(container, { childList: true, subtree: true })
  update()
  return () => observer.disconnect()
}
