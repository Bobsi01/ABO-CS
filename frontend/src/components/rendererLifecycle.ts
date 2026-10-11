import * as THREE from 'three'

// Three 0.186 shares the DFG lookup texture across renderers. Its dispose listeners
// otherwise keep a retired renderer reachable after WebGLRenderer.dispose(). Use
// public shader hooks and release the texture only when our last user retires.
const sharedTextureUsers = new Map<THREE.Texture, number>()

export function guardRenderer(renderer: THREE.WebGLRenderer, onFailure: () => void): () => void {
  const originalRender = renderer.render
  const hooks = new Map<THREE.Material, THREE.Material['onBeforeCompile']>()
  const uniforms = new Set<THREE.IUniform>()
  const textures = new Set<THREE.Texture>()
  let retired = false
  function acquireTextures() {
    uniforms.forEach(uniform => {
      if (uniform.value instanceof THREE.Texture && !textures.has(uniform.value)) {
        textures.add(uniform.value)
        sharedTextureUsers.set(uniform.value, (sharedTextureUsers.get(uniform.value) ?? 0) + 1)
      }
    })
  }
  const guardedRender: THREE.WebGLRenderer['render'] = function (scene, camera) {
    scene.traverse(object => {
      if (!('material' in object)) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach(material => {
        if (!(material instanceof THREE.Material) || hooks.has(material)) return
        const original = material.onBeforeCompile
        hooks.set(material, original)
        material.onBeforeCompile = function (parameters, gl) {
          original.call(this, parameters, gl)
          if (parameters.uniforms.dfgLUT) uniforms.add(parameters.uniforms.dfgLUT)
        }
      })
    })
    try { originalRender.call(renderer, scene, camera) }
    catch { onFailure() }
    finally { acquireTextures() }
  }
  renderer.render = guardedRender
  return () => {
    if (retired) return
    retired = true
    // Do not replace a later third-party wrapper installed after ours.
    if (renderer.render === guardedRender) renderer.render = originalRender
    hooks.forEach((original, material) => { material.onBeforeCompile = original })
    textures.forEach(texture => {
      const remaining = (sharedTextureUsers.get(texture) ?? 1) - 1
      if (remaining > 0) sharedTextureUsers.set(texture, remaining)
      else { sharedTextureUsers.delete(texture); texture.dispose() }
    })
    hooks.clear(); uniforms.clear(); textures.clear()
  }
}
