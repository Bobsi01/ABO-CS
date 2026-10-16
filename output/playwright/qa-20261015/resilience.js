async (page) => {
  const report = { cases: [], measurements: {} }
  const check = (name, pass, detail) => { report.cases.push({ name, pass: !!pass, detail }); if (!pass) throw new Error(name + ': ' + JSON.stringify(detail)) }
  await page.addInitScript(() => {
    window.__qa = { listeners: new Set(), draws: 0 }
    const add = document.addEventListener.bind(document), remove = document.removeEventListener.bind(document)
    document.addEventListener = function(type, fn, options) { if (type === 'keydown') window.__qa.listeners.add(fn); return add(type, fn, options) }
    document.removeEventListener = function(type, fn, options) { if (type === 'keydown') window.__qa.listeners.delete(fn); return remove(type, fn, options) }
    for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original = WebGL2RenderingContext.prototype[name]
      WebGL2RenderingContext.prototype[name] = function(...args) { window.__qa.draws++; return original.apply(this, args) }
    }
  })
  await page.goto('http://127.0.0.1:8066')
  await page.getByLabel('Volcano illustration.', { exact: false }).waitFor()
  const baseline = await page.evaluate(() => ({ keydown: window.__qa.listeners.size, canvases: document.querySelectorAll('canvas').length }))
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
    await page.getByRole('button', { name: 'Simulation', exact: true }).click()
    await page.getByLabel('Volcano illustration.', { exact: false }).waitFor()
  }
  const after = await page.evaluate(() => ({ keydown: window.__qa.listeners.size, canvases: document.querySelectorAll('canvas').length }))
  check('ten view cycles release document listeners and canvases', baseline.keydown === after.keydown && baseline.canvases === after.canvases, { baseline, after })
  await page.getByText('Vertical wind profile (opt-in extension)', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'Enable vertical wind profile' }).check()
  const levels = page.locator('.wind-levels fieldset')
  await levels.nth(0).getByLabel('Speed (m/s)', { exact: true }).fill('20')
  await levels.nth(0).getByLabel('Wind FROM (°)', { exact: true }).fill('270')
  await levels.nth(1).getByLabel('Speed (m/s)', { exact: true }).fill('40')
  await levels.nth(1).getByLabel('Wind FROM (°)', { exact: true }).fill('225')
  await page.getByRole('button', { name: 'Run simulation' }).click()
  await page.getByRole('slider', { name: 'Eruption timeline' }).waitFor()
  await page.getByRole('button', { name: 'Wind sweep', exact: true }).click()
  const swept = page.waitForResponse(r => r.url().endsWith('/api/wind-sweeps'))
  await page.getByRole('button', { name: 'Evaluate all wind directions' }).click()
  const sweep = await (await swept).json()
  check('profile sweep uses all 320 catalog receptors', sweep.receptors?.length === 320)
  const target = sweep.receptors.find(r => r.in_domain)
  const row = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: target.name, exact: true }) })
  await row.getByRole('button', { name: 'Use this direction' }).click()
  const shift = target.wind_from_deg - sweep.scenario.wind_from_deg
  const expected = (270 + shift + 360) % 360
  check('use sweep direction rotates profile inputs', Number(await levels.nth(0).getByLabel('Wind FROM (°)', { exact: true }).inputValue()) === expected)
  await page.getByRole('button', { name: 'Wind comparison', exact: true }).click()
  const manual = page.locator('.manual-winds fieldset')
  for (let i = 0; i < 2; i++) {
    await manual.nth(i).getByLabel('Speed (m/s)', { exact: true }).fill(String(10 + i * 10))
    await manual.nth(i).getByLabel('Wind FROM (°)', { exact: true }).fill(String(90 + i * 180))
  }
  const submitted = []
  const capture = request => { if (request.url().endsWith('/api/simulations')) submitted.push(request.postDataJSON()) }
  page.on('request', capture)
  await page.getByRole('button', { name: 'Compute wind comparison' }).click()
  await page.getByRole('button', { name: 'Inspect this wind result' }).nth(1).waitFor()
  page.off('request', capture)
  check('comparison uses two actual uniform winds', submitted.length === 2 && submitted.every(r => r.scenario.wind_profile === null) && submitted[0].scenario.wind_from_deg !== submitted[1].scenario.wind_from_deg, submitted.map(r => ({ from: r.scenario.wind_from_deg, profile: r.scenario.wind_profile })))
  await page.getByRole('button', { name: 'Simulation', exact: true }).click()
  await page.getByRole('button', { name: 'During', exact: true }).click()
  await page.getByRole('button', { name: 'Play sequence' }).click()
  report.measurements.foreground = await page.evaluate(() => new Promise(resolve => {
    const start = performance.now(), draws = window.__qa.draws; let callbacks = 0
    const tick = now => { callbacks++; if (now - start >= 2200) resolve({ hidden: document.hidden, focused: document.hasFocus(), callbacks_per_s: callbacks * 1000 / (now - start), draws: window.__qa.draws - draws }); else requestAnimationFrame(tick) }; requestAnimationFrame(tick)
  }))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Play sequence' }).waitFor()
  await page.waitForTimeout(400)
  const pausedDraws = await page.evaluate(async () => { const before = window.__qa.draws; await new Promise(r => setTimeout(r, 1000)); return window.__qa.draws - before })
  check('reduced motion pauses replay and GL drawing', pausedDraws === 0, { pausedDraws })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByText('Illustration guide', { exact: true }).click()
  await page.getByRole('checkbox', { name: 'Show PHIVOLCS PDZ (3D boundary)' }).check()
  await page.getByRole('checkbox', { name: 'Show 2020 dike intrusion (Bato et al. 2021)' }).check()
  await page.getByRole('checkbox', { name: 'Show 2021-2024 hypocenters (USGS context)' }).check()
  check('reviewed geometry captions', await page.getByText(/21 × 8 km modeled dike/).isVisible() && await page.getByText(/OpenStreetMap shoreline approximation/).isVisible())
  check('unreviewed overlays disabled', await page.getByRole('checkbox', { name: 'Show Sentinel-5P observed plume bearing (source review pending)' }).isDisabled())
  await page.screenshot({ path: 'output/playwright/qa-20261015/taal-context-light.png', fullPage: true })
  const available = await page.evaluate(() => { const canvas = document.querySelector('canvas'); const gl = canvas.getContext('webgl2'); const extension = gl?.getExtension('WEBGL_lose_context'); extension?.loseContext(); return !!extension })
  check('real WebGL context loss available', available)
  await page.getByRole('button', { name: 'Retry 3D' }).waitFor()
  check('context loss preserves completed exposure', await page.getByRole('heading', { name: 'Municipal and facility exposure' }).isVisible())
  await page.getByRole('button', { name: 'Retry 3D' }).click()
  await page.getByLabel('Volcano illustration.', { exact: false }).waitFor()
  check('graphics retry remains paused', await page.getByRole('button', { name: 'Play sequence' }).isVisible())
  const sibling = await page.context().newPage()
  await sibling.goto('about:blank'); await sibling.bringToFront()
  report.measurements.hidden_transition = await page.evaluate(() => ({ hidden: document.hidden, visibilityState: document.visibilityState }))
  await sibling.close(); await page.bringToFront()
  return report
}
