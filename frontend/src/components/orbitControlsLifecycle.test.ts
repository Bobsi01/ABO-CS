import { afterEach, expect, it, vi } from 'vitest'
import { PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { disposeOrbitControls } from './orbitControlsLifecycle'

afterEach(() => vi.restoreAllMocks())

it('removes document keyboard listeners even after React detaches its canvas', () => {
  const add = vi.spyOn(document, 'addEventListener')
  const remove = vi.spyOn(document, 'removeEventListener')
  const canvas = document.createElement('canvas')
  document.body.append(canvas)
  const controls = new OrbitControls(new PerspectiveCamera(), canvas)
  const root = canvas.getRootNode()
  const keyHandler = add.mock.calls.find(call => call[0] === 'keydown')![1]
  canvas.remove()
  disposeOrbitControls(controls, canvas, root)
  expect(remove).toHaveBeenCalledWith('keydown', keyHandler, { capture: true })
  expect(canvas.getRootNode()).toBe(canvas)
})
