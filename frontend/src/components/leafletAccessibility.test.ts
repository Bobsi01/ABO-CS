import { expect, it } from 'vitest'
import { hideLeafletVectors } from './leafletAccessibility'

it('hides only pointer vector rendering and includes later overlays without hiding map controls', async () => {
  const container = document.createElement('div')
  container.setAttribute('role', 'region')
  container.innerHTML = '<div class="leaflet-overlay-pane"><svg><path /></svg></div><button>Zoom in</button><div class="leaflet-popup-pane">Named location</div>'
  const disconnect = hideLeafletVectors(container)
  expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  expect(container.hasAttribute('aria-hidden')).toBe(false)
  expect(container.querySelector('button')?.hasAttribute('aria-hidden')).toBe(false)
  const later = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  container.querySelector('.leaflet-overlay-pane')!.append(later)
  await Promise.resolve()
  expect(later.getAttribute('aria-hidden')).toBe('true')
  expect(later.getAttribute('focusable')).toBe('false')
  disconnect()
})
