const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const { chromium } = require('../../browser/playwright-runtime.cjs')
const base = process.env.ABO_QA_URL || 'http://127.0.0.1:8012'
const suffix = process.env.ABO_QA_SUFFIX || 'baseline'
const report = { started: new Date().toISOString(), base, checks: [], errors: [], mode: 'Headless installed Chrome; functional accessibility evidence only' }
let browser, page
const write = () => fs.writeFileSync(path.join(__dirname, `${suffix}-resilience.json`), JSON.stringify(report, null, 2))
async function check(name, run) {
  try { report.checks.push({ name, passed: true, evidence: await run() }) }
  catch (error) { report.checks.push({ name, passed: false, error: error.stack }); await page.screenshot({ path: path.join(__dirname, `${suffix}-resilience-failure-${report.checks.length}.png`), fullPage: true }).catch(() => {}) }
  write()
}
const run = async () => {
  await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
  await page.getByRole('button', { name: 'Play sequence', exact: true }).waitFor({ timeout: 120000 })
  await page.waitForFunction(() => !document.querySelector('.status-line')?.textContent.includes('Computing'))
}
;(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  page = await context.newPage()
  page.on('pageerror', error => report.errors.push(error.message))
  await page.goto(base)
  await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
  report.assets = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src))
  await run()
  await check('Edited draft during asynchronous computation remains stale after old request completes', async () => {
    const requestPromise = page.waitForRequest('**/api/eruption-sequences')
    await page.route('**/api/eruption-sequences', async route => { const response = await route.fetch(); await new Promise(resolve => setTimeout(resolve, 1200)); await route.fulfill({ response }) })
    await page.getByLabel('Wind speed (m/s)', { exact: true }).fill('12')
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    await requestPromise
    await page.getByLabel('Wind speed (m/s)', { exact: true }).fill('18')
    await page.waitForFunction(() => !document.querySelector('.status-line')?.textContent.includes('Computing'))
    assert.match(await page.locator('.scene-caption').innerText(), /12 m\/s/)
    assert.match(await page.locator('.stale-message').innerText(), /Parameters have changed/)
    await page.unroute('**/api/eruption-sequences')
    return { draft: await page.getByLabel('Wind speed (m/s)', { exact: true }).inputValue(), completed: await page.locator('.scene-caption').innerText() }
  })
  await check('Cancel active computation keeps completed calculation and permits retry', async () => {
    await page.route('**/api/simulations', async route => { await new Promise(resolve => setTimeout(resolve, 1000)); await route.abort().catch(() => {}) })
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    await page.getByRole('button', { name: 'Cancel calculation', exact: true }).click()
    await page.locator('.error-message').waitFor()
    assert.match(await page.locator('.error-message').innerText(), /canceled or timed out/)
    assert.match(await page.locator('.scene-caption').innerText(), /12 m\/s/)
    await page.unroute('**/api/simulations')
    await run()
    return { recovered: await page.locator('.error-message').count() === 0 }
  })
  await check('Non-JSON API response is actionable and retains results', async () => {
    await page.route('**/api/simulations', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Synthetic wrong backend</title>' }))
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    await page.locator('.error-message').waitFor()
    assert.match(await page.locator('.error-message').innerText(), /non-JSON response/)
    await page.unroute('**/api/simulations')
    return { completed_result_retained: await page.getByRole('slider', { name: 'Eruption timeline' }).count() === 1 }
  })
  await check('Document visibility event is captured from actual background tab if available', async () => {
    await page.evaluate(() => { window.__aboVisibility = []; document.addEventListener('visibilitychange', () => window.__aboVisibility.push({ state: document.visibilityState, time: performance.now() })) })
    await page.getByRole('button', { name: 'Before', exact: true }).click()
    await page.getByRole('button', { name: 'Play sequence', exact: true }).click()
    const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront(); await other.waitForTimeout(500)
    await page.bringToFront()
    const evidence = await page.evaluate(() => ({ events: window.__aboVisibility, hidden: document.hidden }))
    await other.close()
    if (!evidence.events.some(event => event.state === 'hidden')) {
      await page.getByRole('button', { name: 'Pause sequence', exact: true }).click()
      return { ...evidence, outcome: 'Unsupported in this headless execution; actual hidden-page gate remains open' }
    }
    assert.equal(await page.getByRole('button', { name: 'Pause sequence', exact: true }).count(), 0)
    return { ...evidence, outcome: 'Paused on native visibility transition' }
  })
  await check('Bundled geography and terrain failure preserve computation and recover', async () => {
    await page.route('**/terrain/taal.json', route => route.fulfill({ status: 404, body: 'Synthetic terrain missing' }))
    await page.route('**/geography-context.geojson', route => route.fulfill({ status: 404, body: 'Synthetic geography missing' }))
    await page.reload(); await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
    await run()
    await page.getByRole('button', { name: 'Retry terrain', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Play sequence', exact: true }).isDisabled(), true)
    await page.getByRole('button', { name: 'Use schematic terrain', exact: true }).click()
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(node => node.textContent.includes('Play sequence') && !node.disabled))
    await page.getByText('Effects, reference zones & sources', { exact: true }).click()
    assert.match(await page.locator('.map-status[role=status]').innerText(), /Offline geography unavailable/)
    await page.unroute('**/terrain/taal.json'); await page.unroute('**/geography-context.geojson')
    await page.getByRole('button', { name: 'Guide & sources', exact: true }).click(); await page.getByRole('button', { name: 'Simulation', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('.scene-wrap')?.textContent.includes('Geographic terrain · ash uses flat'))
    return { computation_worked: true, explicit_fallback_choice: true, terrain_recovered: true }
  })
  await check('Keyboard skip link, disclosures and canvas expose usable focus', async () => {
    await page.goto(base)
    await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
    await page.getByRole('link', { name: 'Skip to results', exact: true }).focus()
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Skip to results')
    await page.keyboard.press('Enter')
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'workspace')
    const summary = page.locator('.model-notes summary')
    await summary.focus(); await summary.press('Enter'); assert.equal(await page.locator('.model-notes').evaluate(node => node.open), true)
    await summary.press('Escape'); assert.equal(await page.locator('.model-notes').evaluate(node => node.open), false)
    const canvas = page.locator('.scene-stage canvas')
    await canvas.waitFor(); await canvas.focus()
    const canvasDetails = await canvas.evaluate(node => ({ role: node.getAttribute('role'), label: node.getAttribute('aria-label'), tabIndex: node.tabIndex, outline: getComputedStyle(node).outlineStyle }))
    assert(canvasDetails.tabIndex >= 0)
    assert(canvasDetails.label)
    return { skip_link_destination: 'workspace', canvas: canvasDetails }
  })
  await check('Visible text contrast and button targets across themes at 320 px', async () => {
    await page.setViewportSize({ width: 320, height: 900 })
    const results = []
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
      const audit = await page.evaluate(() => {
        const parse = value => { const m = value.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0] }
        const lum = color => color.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
        const failures = [], samples = [], targets = []
        for (const node of document.querySelectorAll('.application *')) {
          const r = node.getBoundingClientRect(), style = getComputedStyle(node)
          if (!r.width || !r.height || style.visibility === 'hidden' || !node.checkVisibility() || node.closest('.leaflet-container, .scene-stage') || node.matches('svg,svg *,input')) continue
          if (node.matches('button')) targets.push({ name: node.textContent.trim() || node.getAttribute('aria-label'), w: r.width, h: r.height })
          if (![...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim())) continue
          let ancestor = node, bg
          while (ancestor) { bg = parse(getComputedStyle(ancestor).backgroundColor); if ((bg[3] ?? 1) === 1) break; ancestor = ancestor.parentElement }
          if (!ancestor) continue
          const fg = parse(style.color), ratio = (Math.max(lum(fg), lum(bg)) + .05) / (Math.min(lum(fg), lum(bg)) + .05)
          const size = parseFloat(style.fontSize), weight = Number(style.fontWeight), required = size >= 24 || size >= 18.67 && weight >= 700 ? 3 : 4.5
          const sample = { text: node.textContent.trim().slice(0, 100), color: style.color, background: getComputedStyle(ancestor).backgroundColor, ratio, required, size }
          samples.push(sample)
          if (ratio < required) failures.push(sample)
        }
        return { failures, sample_count: samples.length, minimum: Math.min(...samples.map(s => s.ratio)), targets_under_44: targets.filter(t => t.h < 44 || t.w < 44), targets_count: targets.length }
      })
      results.push({ theme, ...audit })
      await page.screenshot({ path: path.join(__dirname, `${suffix}-320-${theme}-viewport.png`) })
      assert.equal(audit.failures.length, 0, JSON.stringify(audit.failures))
      assert.equal(audit.targets_under_44.length, 0, JSON.stringify(audit.targets_under_44))
    }
    return { results, note: 'Opaque DOM text only; excludes raster scenes/maps, translucent graphics and disabled opacity. Not full WCAG certification.' }
  })
  report.finished = new Date().toISOString(); write(); await browser.close()
})().catch(async error => { report.fatal = error.stack; write(); await browser?.close(); process.exitCode = 1 })
