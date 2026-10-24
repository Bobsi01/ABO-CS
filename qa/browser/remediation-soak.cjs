// Real Chromium lifecycle/resource acceptance, default 30 minutes. No app data is mocked.
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const { chromium } = require('./playwright-runtime.cjs')
const telemetry = require('./gap-engineering-telemetry.cjs')
const root = path.resolve(__dirname, '../..')
const target = path.resolve(
  root,
  process.env.ABO_QA_OUTPUT ?? 'output/playwright/remediation-20261015',
)

if (!target.startsWith(root + path.sep)) throw new Error('QA output must stay inside this checkout')
fs.mkdirSync(target, { recursive: true })
const seconds = Number(process.env.ABO_SOAK_SECONDS ?? 1800)
const base = process.env.ABO_QA_URL ?? 'http://127.0.0.1:8066'

if (!Number.isFinite(seconds) || seconds < 1) throw new Error('Invalid soak duration')
const evidence = {
  started: new Date().toISOString(),
  target_seconds: seconds,
  completed: false,
  machine: { platform: os.platform(), cpu: os.cpus()[0].model, ram_bytes: os.totalmem() },
  cases: [],
  samples: [],
  errors: [],
  warnings: [],
  cycles: 0,
}
const save = () =>
  fs.writeFileSync(path.join(target, 'soak.json'), JSON.stringify(evidence, null, 2))

function check(name, pass, detail) {

  evidence.cases.push({ name, pass: !!pass, detail })
  save()
  if (!pass) throw new Error(name + ': ' + JSON.stringify(detail))

}

let browser
;
(async () => {

  browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    ignoreDefaultArgs: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
    ],
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })

  await context.addInitScript(telemetry)
  const page = await context.newPage()

  page.on('pageerror', (error) => {

    evidence.errors.push(String(error))
    save()

  })
  page.on('console', (msg) => {

    if (msg.type() === 'warning' && !evidence.warnings.includes(msg.text())) {
      evidence.warnings.push(msg.text())
      save()
    }

  })
  page.setDefaultTimeout(30000)
  const cdp = await context.newCDPSession(page)

  await cdp.send('Performance.enable')
  await page.goto(base + '/?qa=1')
  await page.locator('.scene-stage canvas').waitFor()
  evidence.browser = browser.version()
  evidence.asset_hashes = Object.fromEntries(
    fs
      .readdirSync(path.join(root, 'frontend/dist/assets'))
      .filter((n) => n.endsWith('.js'))
      .map((n) => [
        n,
        crypto
          .createHash('sha256')
          .update(fs.readFileSync(path.join(root, 'frontend/dist/assets', n)))
          .digest('hex'),
      ]),
  )
  evidence.gpu = await page.locator('.scene-stage canvas').evaluate((canvas) => {

    const gl = canvas.getContext('webgl2'),
      ext = gl.getExtension('WEBGL_debug_renderer_info')

    return {
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: gl.getParameter(gl.VENDOR),
    }

  })

  async function run() {

    const response = page.waitForResponse((r) => r.url().endsWith('/api/eruption-sequences'))

    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    const result = await response

    check('sequence HTTP success', result.status() === 200, result.status())
    await page.getByRole('button', { name: 'Play sequence', exact: true }).waitFor()

  }

  await run()
  // Playwright enables CDP focus emulation by default, which also keeps hidden
  // pages visible. Disable that override for the real OS lifecycle experiment.
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false })
  await page.getByRole('button', { name: 'During', exact: true }).click()
  await page.getByRole('button', { name: 'Play sequence', exact: true }).click()
  // Minimize the actual browser window, without changing document.hidden in script.
  const { windowId } = await cdp.send('Browser.getWindowForTarget')

  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } })
  await page.waitForTimeout(1200)
  let hidden = await page.evaluate(() => ({
    hidden: document.hidden,
    state: document.visibilityState,
    slider: document.querySelector('.timeline-slider input').value,
    paused: !![...document.querySelectorAll('.timeline-top button')].find((button) =>
      button.textContent.includes('Play sequence'),
    ),
  }))

  await page.waitForTimeout(1000)
  let hiddenAfter = await page.locator('.timeline-slider input').inputValue()

  evidence.hidden = { ...hidden, slider_after: hiddenAfter }
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } })
  await page.bringToFront()
  if (!hidden.hidden) {
    evidence.minimized_window_attempt = evidence.hidden
    if (await page.getByRole('button', { name: 'Play sequence', exact: true }).isVisible())
      await page.getByRole('button', { name: 'Play sequence', exact: true }).click()
    const sibling = await context.newPage()

    await sibling.goto('about:blank')
    await sibling.bringToFront()
    await page.waitForTimeout(1200)
    hidden = await page.evaluate(() => ({
      hidden: document.hidden,
      state: document.visibilityState,
      slider: document.querySelector('.timeline-slider input').value,
      paused: !![...document.querySelectorAll('.timeline-top button')].find((button) =>
        button.textContent.includes('Play sequence'),
      ),
    }))
    await page.waitForTimeout(1000)
    hiddenAfter = await page.locator('.timeline-slider input').inputValue()
    evidence.hidden = {
      ...hidden,
      slider_after: hiddenAfter,
      trigger: 'sibling browser tab, focus emulation disabled',
    }
    await sibling.close()
    await page.bringToFront()
  }
  if (hidden.hidden)
    check(
      'real minimized-window pause',
      hidden.state === 'hidden' && hidden.slider === hiddenAfter && hidden.paused,
      evidence.hidden,
    )
  else
    evidence.hidden_status =
      'unavailable: minimizing this automation window did not change document.hidden'
  if (await page.getByRole('button', { name: 'Pause sequence', exact: true }).isVisible())
    await page.getByRole('button', { name: 'Pause sequence', exact: true }).click()
  await page.getByRole('button', { name: 'Play sequence', exact: true }).waitFor()
  check(
    'restore remains paused',
    await page.getByRole('button', { name: 'Play sequence', exact: true }).isVisible(),
  )
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true })
  evidence.soak_scheduling =
    'Playwright focus emulation enabled during resource soak; real lifecycle tested separately with emulation disabled. Not a native foreground performance benchmark.'
  const beginning = Date.now()

  async function sample(label) {

    await cdp.send('HeapProfiler.collectGarbage')
    const metrics = await cdp.send('Performance.getMetrics')
    const resources = await page.evaluate(() => {

      const state = window.aboEngineeringTelemetry
      const live = Object.entries(state.resources).filter(([, value]) => !value.lost)
      const outstanding = {}

      for (const [, entry] of live)
        for (const [kind, count] of Object.entries(entry.created))
          outstanding[kind] = (outstanding[kind] ?? 0) + count - (entry.deleted[kind] ?? 0)

      return {
        contexts: live.length,
        outstanding,
        canvases: document.querySelectorAll('canvas').length,
        visible: !document.hidden,
        total_contexts: Object.keys(state.resources).length,
      }

    })
    const value = {
      label,
      elapsed_s: (Date.now() - beginning) / 1000,
      resources,
      metrics: Object.fromEntries(
        metrics.metrics
          .filter((m) =>
            ['JSHeapUsedSize', 'Nodes', 'Documents', 'JSEventListeners'].includes(m.name),
          )
          .map((m) => [m.name, m.value]),
      ),
    }

    evidence.samples.push(value)
    save()

    return value

  }

  async function layers(enabled) {

    const guide = page
      .locator('.scene-details details')
      .filter({ has: page.getByText('Illustration guide', { exact: true }) })

    if (!((await guide.getAttribute('open')) !== null))
      await page.getByText('Illustration guide', { exact: true }).click()
    for (const name of [
      'Show vertical altitude scale (flight levels)',
      'Show 2021-2024 hypocenters (USGS context)',
      'Show PHIVOLCS PDZ (3D boundary)',
      'Show 2020 dike intrusion (Bato et al. 2021)',
    ]) {
      await page.getByRole('checkbox', { name, exact: true }).setChecked(enabled)
    }
    await page.waitForTimeout(350)
    if (enabled) {
      await page.getByRole('radio', { name: 'Conduit (≤15 km)', exact: true }).check()
      await page.getByRole('radio', { name: 'All depths', exact: true }).check()
    }

  }

  // Warm all resources first; compare stable, layer-off states after each cycle.
  await layers(true)
  await layers(false)
  await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
  await page.getByRole('button', { name: 'Simulation', exact: true }).click()
  await page.locator('.scene-stage canvas').waitFor()
  await page.waitForTimeout(700)
  const initial = await sample('warmed-baseline')

  while (Date.now() - beginning < seconds * 1000) {
    await page.bringToFront()
    await run()
    await layers(true)
    await layers(false)
    await page.getByRole('button', { name: 'Before', exact: true }).click()
    await page.getByRole('button', { name: 'Play sequence', exact: true }).click()
    await page
      .getByRole('button', { name: 'Replay sequence', exact: true })
      .waitFor({ timeout: 60000 })
    await page.waitForTimeout(300)
    await page.evaluate(() => {

      window.aboEngineeringTelemetry.capture = true
      window.aboEngineeringTelemetry.renderTimes = []

    })
    await page.waitForTimeout(1000)
    const paused = await page.evaluate(() => {

      const n = window.aboEngineeringTelemetry.renderTimes.length

      window.aboEngineeringTelemetry.capture = false

      return n

    })

    check('paused on-demand rendering', paused === 0, { cycle: evidence.cycles, draws: paused })
    await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
    await page.getByRole('button', { name: 'Simulation', exact: true }).click()
    await page.locator('.scene-stage canvas').waitFor()
    await page.waitForTimeout(700)
    evidence.cycles++
    await sample('cycle-' + evidence.cycles)
    process.stdout.write(
      JSON.stringify({ elapsed_s: (Date.now() - beginning) / 1000, cycles: evidence.cycles }) +
        '\n',
    )
  }
  const final = await sample('final')

  check('no JavaScript exceptions', evidence.errors.length === 0, evidence.errors)
  check(
    'one canvas and bounded live GL contexts',
    final.resources.canvases === 1 && final.resources.contexts <= initial.resources.contexts,
    { initial: initial.resources, final: final.resources },
  )
  check(
    'post-GC heap bounded',
    final.metrics.JSHeapUsedSize <= initial.metrics.JSHeapUsedSize + 20 * 1024 ** 2,
    { initial: initial.metrics, final: final.metrics },
  )
  check(
    'document listeners bounded',
    final.metrics.JSEventListeners <= initial.metrics.JSEventListeners + 10,
    { initial: initial.metrics, final: final.metrics },
  )
  const unchanged = Object.entries(evidence.asset_hashes).every(
    ([n, hash]) =>
      crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(root, 'frontend/dist/assets', n)))
        .digest('hex') === hash,
  )

  check('build unchanged during soak', unchanged)
  evidence.actual_seconds = (Date.now() - beginning) / 1000
  evidence.completed = true
  evidence.finished = new Date().toISOString()
  save()
  await page.screenshot({ path: path.join(target, 'soak-final.png') })
  await browser.close()

})().catch(async (error) => {

  evidence.errors.push(error.stack)
  save()
  process.stderr.write(error.stack + '\n')
  await browser?.close()
  process.exitCode = 1

})
