import { afterEach, describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera } from 'three'
import { createOrbitControls } from './orbitControlsLifecycle'

afterEach(() => vi.restoreAllMocks())

describe('camera control listener lifetime against installed Three', () => {
  it.each(['document', 'shadow root'])('removes shortcuts from their original %s after canvas detachment', rootKind => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = rootKind === 'shadow root' ? host.attachShadow({ mode: 'open' }) : document
    const canvas = document.createElement('canvas')
    if (root instanceof ShadowRoot) root.append(canvas)
    else host.append(canvas)
    const added = vi.spyOn(root, 'addEventListener'), removed = vi.spyOn(root, 'removeEventListener')
    const controls = createOrbitControls(new PerspectiveCamera(), canvas)
    const down = added.mock.calls.find(call => call[0] === 'keydown')
    expect(down).toBeDefined()
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }))
    const up = added.mock.calls.find(call => call[0] === 'keyup')
    expect(up).toBeDefined()
    canvas.remove()
    expect(canvas.getRootNode()).toBe(canvas)
    controls.dispose()
    expect(removed).toHaveBeenCalledWith('keydown', down![1], true)
    expect(removed).toHaveBeenCalledWith('keyup', up![1], true)
    const afterDispose = added.mock.calls.length
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }))
    expect(added.mock.calls).toHaveLength(afterDispose)
    host.remove()
  })

  it('can retire attached controls repeatedly without leaving document shortcuts', () => {
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    const added = vi.spyOn(document, 'addEventListener'), removed = vi.spyOn(document, 'removeEventListener')
    const controls = createOrbitControls(new PerspectiveCamera(), canvas)
    const handler = added.mock.calls.find(call => call[0] === 'keydown')![1]
    controls.dispose(); controls.dispose()
    expect(removed).toHaveBeenCalledWith('keydown', handler, true)
    canvas.remove()
  })
})
