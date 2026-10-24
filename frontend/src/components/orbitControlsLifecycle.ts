import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Three r186 reconnects keyboard listeners through getRootNode(). React can detach
// the canvas before effect cleanup, so retain the root used at construction.
export function disposeOrbitControls(
  controls: OrbitControls,
  canvas: HTMLCanvasElement,
  root: Node,
) {

  const own = Object.getOwnPropertyDescriptor(canvas, 'getRootNode')

  Object.defineProperty(canvas, 'getRootNode', { configurable: true, value: () => root })
  try {
    controls.dispose()
  } finally {
    if (own) Object.defineProperty(canvas, 'getRootNode', own)
    else Reflect.deleteProperty(canvas, 'getRootNode')
  }

}
