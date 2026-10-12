const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict')
const { chromium } = require('../../browser/playwright-runtime.cjs')
let browser
;(async () => {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(process.env.ABO_QA_URL || 'http://127.0.0.1:8012')
  await page.waitForFunction(() => document.querySelector('.scene-wrap')?.textContent.includes('Geographic terrain · ash uses flat'))
  const canvas = page.locator('.scene-stage canvas'), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
  await canvas.focus(); await page.waitForTimeout(100)
  const take = async name => {
    const box = await canvas.boundingBox()
    return page.screenshot({ path: path.join(__dirname, `cleanup-fixed-camera-v2-${name}.png`), clip: { x: box.x + 5, y: box.y + 5, width: box.width - 10, height: box.height - 10 } })
  }
  const before = await take('before')
  await canvas.press('ArrowLeft'); await canvas.press('ArrowUp'); await canvas.press('+'); await page.waitForTimeout(150)
  const after = await take('after-keys')
  assert.notEqual(hash(before), hash(after), 'Keyboard camera controls must alter the rendered image')
  await page.getByRole('button', { name: 'Reset camera', exact: true }).click(); await canvas.focus(); await page.waitForTimeout(150)
  const reset = await take('reset')
  assert.equal(hash(before), hash(reset), 'Camera reset must restore the same paused terrain image')
  const report = { captured: new Date().toISOString(), assets: await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src)), mode: 'Headless installed Chrome paused terrain; image hashes prove camera interactions only. Five-pixel border crop excludes the keyboard-vs-pointer focus outline.', keys: ['ArrowLeft', 'ArrowUp', '+'], before: hash(before), after_keys: hash(after), reset: hash(reset), reset_matches_before: true, errors }
  fs.writeFileSync(path.join(__dirname, 'cleanup-fixed-camera-keyboard.json'), JSON.stringify(report, null, 2))
  await browser.close()
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1 })
