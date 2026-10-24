const fs = require('fs'),
  path = require('path')
const { chromium } = require('./playwright-runtime.cjs')
;
(async () => {

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const cdp = await page.context().newCDPSession(page)

  await cdp.send('Performance.enable')
  await page.goto('http://127.0.0.1:8000/')
  await page.getByRole('button', { name: 'Run simulation', exact: true }).waitFor()
  const metrics = []

  for (let cycle = 0; cycle < 8; cycle++) {
    await page.getByRole('combobox', { name: /^Scenario/ }).click()
    await page
      .getByRole('option', {
        name: [
          'Taal · teaching scenario',
          'Mayon · teaching scenario',
          'Kanlaon · teaching scenario',
        ][cycle % 3],
        exact: true,
      })
      .click()
    await page.getByRole('button', { name: 'Run simulation', exact: true }).click()
    await page
      .getByRole('button', { name: 'Play sequence', exact: true })
      .waitFor({ timeout: 120000 })
    await page.getByRole('button', { name: 'Guide & sources', exact: true }).click()
    await page.getByRole('button', { name: 'Simulation', exact: true }).click()
    await page.waitForTimeout(1500)
    await cdp.send('HeapProfiler.collectGarbage')
    metrics.push({ cycle, metrics: (await cdp.send('Performance.getMetrics')).metrics })
    console.log('Retention cycle', cycle)
  }
  const chunks = []

  cdp.on('HeapProfiler.addHeapSnapshotChunk', (event) => chunks.push(event.chunk))
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
  fs.writeFileSync(path.join(__dirname, 'gap-engineering-retention.heapsnapshot'), chunks.join(''))
  fs.writeFileSync(
    path.join(__dirname, 'gap-engineering-retention.json'),
    JSON.stringify(metrics, null, 2),
  )
  await browser.close()

})().catch((error) => {

  console.error(error)
  process.exitCode = 1

})
