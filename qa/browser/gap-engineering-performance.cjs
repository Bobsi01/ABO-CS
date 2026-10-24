const fs = require('fs'),
  path = require('path'),
  os = require('os'),
  crypto = require('crypto'),
  { spawnSync } = require('child_process')
const { chromium } = require('./playwright-runtime.cjs')
const output = path.join(__dirname, 'gap-engineering-performance.json')
const evidence = {
  started: new Date().toISOString(),
  machine: { platform: os.platform(), release: os.release(), cpu: os.cpus()[0].model },
  browser_flags:
    'Default Playwright launch, no application scheduling overrides; native foreground audited, not forced',
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  scenario: 'Mayon teaching preset, default lava enabled, close-up, normal detail',
  requests: [],
  replays: [],
  foreground: [],
  errors: [],
}
const save = () => fs.writeFileSync(output, JSON.stringify(evidence, null, 2))
let browser, page
let checks

function summarize(samples) {

  const gaps = samples
    .slice(1)
    .map((time, index) => time - samples[index])
    .sort((a, b) => a - b)
  const percentile = (fraction) =>
    gaps.length ? gaps[Math.floor((gaps.length - 1) * fraction)] : null
  const start = samples[0],
    end = samples.at(-1),
    windows = []

  for (let from = start; from + 10000 <= end; from += 1000)
    windows.push({
      start: from,
      fps: samples.filter((time) => time >= from && time < from + 10000).length / 10,
    })

  return {
    count: samples.length,
    duration_ms: end - start,
    p50_frame_ms: percentile(0.5),
    p95_frame_ms: percentile(0.95),
    p99_frame_ms: percentile(0.99),
    minimum_steady_10s_fps: windows.length
      ? Math.min(...windows.map((window) => window.fps))
      : null,
    windows,
  }

}

;(async () => {

  browser = await chromium.launch({ channel: 'chrome', headless: false })
  const context = await browser.newContext({
    viewport: evidence.viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  })

  page = await context.newPage()
  page.on('request', (request) => {

    if (
      request.method() === 'POST' &&
      /\/api\/(simulations|eruption-sequences)$/.test(request.url())
    )
      evidence.requests.push({
        path: new URL(request.url()).pathname,
        body: request.postDataJSON(),
      })

  })
  page.on('pageerror', (error) => evidence.errors.push(error.message))
  const browserCdp = await browser.newBrowserCDPSession()
  const processes = await browserCdp.send('SystemInfo.getProcessInfo')
  const browserPid = processes.processInfo.find((process) => process.type === 'browser')?.id

  function foreground(focus = false) {

    const args = [
      '-NoProfile',
      '-File',
      path.join(__dirname, 'gap-engineering-foreground.ps1'),
      '-AboBrowserProcessId',
      String(browserPid),
    ]

    if (focus) args.push('-Focus')
    const result = spawnSync('powershell.exe', args, { encoding: 'utf8' })

    evidence.foreground.push(JSON.parse(result.stdout.trim()))

  }

  await page.goto('http://127.0.0.1:8000/qa-baseline.html')
  await page.bringToFront()
  foreground(false)
  await page.getByRole('button', { name: 'Record 10-second baseline' }).click()
  await page.getByRole('status').filter({ hasText: 'Complete:' }).waitFor({ timeout: 30000 })
  evidence.baseline = JSON.parse(await page.locator('#evidence').getAttribute('data-evidence'))
  evidence.baseline.summary = summarize(evidence.baseline.rendered)
  await page.goto('http://127.0.0.1:8000/?qa=1')
  await page
    .getByRole('button', { name: 'Run simulation', exact: true })
    .waitFor({ timeout: 30000 })
  evidence.initial_accessibility_snapshot = await page.locator('body').ariaSnapshot()
  await page.getByRole('combobox', { name: /^Scenario/ }).click()
  await page.getByRole('option', { name: 'Mayon · teaching scenario', exact: true }).click()
  await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
  await page
    .getByRole('button', { name: 'Play sequence', exact: true })
    .waitFor({ timeout: 120000 })
  evidence.build_assets = await page
    .locator('script[src]')
    .evaluateAll((elements) => elements.map((element) => element.src))
  evidence.build_hashes = Object.fromEntries(
    evidence.build_assets.map((url) => {

      const file = path.join(__dirname, '../../frontend/dist', new URL(url).pathname)

      return [url, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]

    }),
  )
  evidence.browser = browser.version()
  for (let replay = 0; replay < 4; replay++) {
    await page.bringToFront()
    foreground(false)
    const state = await page.evaluate(() => ({
      hidden: document.hidden,
      hasFocus: document.hasFocus(),
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
    }))

    await page.getByRole('button', { name: 'Before', exact: true }).click()
    await page.getByRole('button', { name: 'Play sequence', exact: true }).click()
    checks = setInterval(() => {

      foreground(false)
      save()

    }, 10000)
    await page
      .getByRole('button', { name: 'Replay sequence', exact: true })
      .waitFor({ timeout: 120000 })
    clearInterval(checks)
    const samples = JSON.parse(
      await page.locator('.scene-stage canvas').getAttribute('data-frame-evidence'),
    )

    samples.callback_summary = summarize(samples.callbacks)
    samples.render_summary = summarize(samples.rendered)
    evidence.replays.push({ number: replay, warmup: replay === 0, state, ...samples })
    save()
    process.stdout.write(
      `Replay ${replay} recorded: ${samples.render_summary.minimum_steady_10s_fps} minimum fps\n`,
    )
  }
  evidence.finished = new Date().toISOString()
  evidence.completed = true
  save()
  await browser.close()

})().catch(async (error) => {

  clearInterval(checks)
  evidence.errors.push(error.stack)
  evidence.completed = false
  if (page && !page.isClosed())
    evidence.failure_snapshot = await page
      .locator('body')
      .ariaSnapshot()
      .catch(() => null)
  save()
  await browser?.close()
  process.stderr.write(error.stack + '\n')
  process.exitCode = 1

})
