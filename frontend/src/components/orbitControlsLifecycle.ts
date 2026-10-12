import type { Camera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Three r186 installs these capture listeners on the canvas's original root,
// but disconnect() re-queries getRootNode() after React can detach the canvas.
// Keep the compatibility workaround here, covered against the locked runtime.
type RootShortcuts = { _interceptControlDown: EventListener; _interceptControlUp: EventListener }

export function createOrbitControls(camera: Camera, canvas: HTMLElement): OrbitControls {
  const listenerRoot = canvas.getRootNode()
  const controls = new OrbitControls(camera, canvas)
  const dispose = controls.dispose.bind(controls)
  const shortcuts = controls as unknown as RootShortcuts
  controls.dispose = () => {
    try { dispose() }
    finally {
      listenerRoot.removeEventListener('keydown', shortcuts._interceptControlDown, true)
      listenerRoot.removeEventListener('keyup', shortcuts._interceptControlUp, true)
    }
  }
  return controls
}
