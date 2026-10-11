import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { guardRenderer } from './rendererLifecycle'

function fixture(texture: THREE.Texture) {
  const material = new THREE.MeshStandardMaterial()
  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), material))
  const original = vi.fn(() => material.onBeforeCompile({ uniforms: { dfgLUT: { value: texture } } } as unknown as THREE.WebGLProgramParametersWithUniforms, renderer))
  const renderer = { render: original } as unknown as THREE.WebGLRenderer
  return { renderer, original, material, scene, camera: new THREE.PerspectiveCamera() }
}

describe('renderer lifecycle', () => {
  it('releases shared shader textures and restores hooks and the original render function exactly once', () => {
    const texture = new THREE.Texture(), dispose = vi.spyOn(texture, 'dispose')
    const value = fixture(texture), originalHook = value.material.onBeforeCompile
    const retire = guardRenderer(value.renderer, vi.fn())
    value.renderer.render(value.scene, value.camera)
    retire(); retire()
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(value.renderer.render).toBe(value.original)
    expect(value.material.onBeforeCompile).toBe(originalHook)
  })
  it('keeps a shared lookup texture while a second live renderer still uses it', () => {
    const texture = new THREE.Texture(), dispose = vi.spyOn(texture, 'dispose')
    const a = fixture(texture), b = fixture(texture)
    const retireA = guardRenderer(a.renderer, vi.fn()), retireB = guardRenderer(b.renderer, vi.fn())
    a.renderer.render(a.scene, a.camera); b.renderer.render(b.scene, b.camera)
    retireA(); expect(dispose).not.toHaveBeenCalled()
    b.renderer.render(b.scene, b.camera); expect(b.original).toHaveBeenCalledTimes(2)
    retireB(); expect(dispose).toHaveBeenCalledTimes(1)
  })
  it('reports render failures and leaves a later wrapper intact at teardown', () => {
    const value = fixture(new THREE.Texture()), failure = vi.fn()
    value.original.mockImplementation(() => { throw new Error('Injected renderer failure') })
    const retire = guardRenderer(value.renderer, failure)
    value.renderer.render(value.scene, value.camera)
    expect(failure).toHaveBeenCalledTimes(1)
    const later = vi.fn(); value.renderer.render = later
    retire(); expect(value.renderer.render).toBe(later)
  })
})
