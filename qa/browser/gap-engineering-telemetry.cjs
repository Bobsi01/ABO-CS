// Browser-only instrumentation for frame pacing and native WebGL allocation counts.
module.exports = function installTelemetry() {

  const state = {
    callbackTimes: [],
    renderTimes: [],
    visibility: [],
    resources: {},
    errors: [],
    capture: false,
    version: 1,
  }

  window.aboEngineeringTelemetry = state
  const originalRaf = window.requestAnimationFrame.bind(window)

  window.requestAnimationFrame = (callback) =>
    originalRaf((now) => {

      if (state.capture) state.callbackTimes.push(now)
      callback(now)

    })
  document.addEventListener('visibilitychange', () =>
    state.visibility.push({ at: performance.now(), hidden: document.hidden }),
  )
  window.addEventListener('error', (event) =>
    state.errors.push({ at: performance.now(), message: event.message }),
  )
  const contexts = new WeakMap()
  let contextId = 0
  const operations = [
    'Buffer',
    'Texture',
    'Program',
    'Shader',
    'Framebuffer',
    'Renderbuffer',
    'VertexArray',
    'Query',
    'Sampler',
    'TransformFeedback',
    'Sync',
  ]

  for (const Proto of [
    window.WebGLRenderingContext?.prototype,
    window.WebGL2RenderingContext?.prototype,
  ].filter(Boolean)) {
    function entry(gl) {

      if (!contexts.has(gl)) {
        const id = ++contextId

        contexts.set(gl, id)
        state.resources[id] = { created: {}, deleted: {}, lost: false }
        gl.canvas.addEventListener('webglcontextlost', () => {

          state.resources[id].lost = true

        })
      }

      return state.resources[contexts.get(gl)]

    }

    const clear = Proto.clear

    Proto.clear = function (mask) {

      if (state.capture && mask & this.COLOR_BUFFER_BIT && this.canvas.closest?.('.scene-stage'))
        state.renderTimes.push(performance.now())

      return clear.call(this, mask)

    }
    for (const name of operations) {
      for (const [prefix, countKey] of [
        ['create', 'created'],
        ['delete', 'deleted'],
      ]) {
        const method = prefix + name,
          original = Proto[method]

        if (typeof original !== 'function') continue
        Proto[method] = function (...args) {

          const result = original.apply(this, args)

          if (prefix === 'create' ? result !== null : args[0] !== null) {
            const counts = entry(this)[countKey]

            counts[name] = (counts[name] ?? 0) + 1
          }

          return result

        }
      }
    }
  }

}
