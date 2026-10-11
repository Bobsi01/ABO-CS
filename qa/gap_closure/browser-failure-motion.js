async (page) => {
const evidence = { url: page.url(), browser: await page.context().browser().version(), checks: [] };
const timeline = page.getByRole('slider', { name: 'Eruption timeline' });
const record = async (name, details) => { const row = { name, ...details }; evidence.checks.push(row); console.log(JSON.stringify(row)); };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const current = () => timeline.inputValue();
const completed = await page.getByText(/^Eventual totals:/).textContent();
evidence.productionScripts = await page.locator('script[src]').evaluateAll(nodes => nodes.map(node => node.src));
try {
await page.getByRole('button', { name: 'Before', exact: true }).click();

await page.getByRole('button', { name: 'Play sequence', exact: true }).click();
await page.waitForTimeout(3200);
const beforeLoss = await current();
assert(await page.getByRole('button', { name: 'Pause sequence', exact: true }).isVisible(), 'Replay did not enter playing state');
const loss = await page.evaluate(() => {
  const canvas = document.querySelector('.scene-stage canvas');
  const gl = canvas.getContext('webgl2');
  const extension = gl.getExtension('WEBGL_lose_context');
  if (!extension) return false;
  extension.loseContext();
  return true;
});
assert(loss, 'Context-loss extension unavailable');
await page.getByRole('heading', { name: '3D needs WebGL 2' }).waitFor();
const atLoss = await current();
await page.waitForTimeout(1200);
assert(await current() === atLoss, 'Shared timeline advanced after context loss');
assert(await page.getByRole('button', { name: 'Play sequence', exact: true }).isDisabled(), 'Play remained enabled during context loss');
assert(await page.getByText(/^Eventual totals:/).textContent() === completed, 'Completed results changed after context loss');
assert(await page.getByLabel('Geographic ashfall map', { exact: true }).isVisible(), 'Map lost during context loss');
await record('Actual WebGL context loss', { pass: true, beforeLoss, atLoss, completedResultsPreserved: true });
await page.getByRole('button', { name: 'Retry 3D', exact: true }).click();
await page.locator('.scene-stage canvas').waitFor();
await page.waitForTimeout(600);
assert(await page.getByRole('button', { name: 'Play sequence', exact: true }).isEnabled(), 'Retry did not restore play');
assert(await current() === atLoss, 'Retry changed shared stage');
await record('Context-loss recovery', { pass: true, autoplay: false });

await page.evaluate(() => {
  const canvas = document.querySelector('.scene-stage canvas');
  const gl = canvas.getContext('webgl2');
  gl.clear = () => { throw new Error('Independent QA injected native GL clear failure'); };
});
await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
await page.getByRole('heading', { name: '3D renderer stopped' }).waitFor();
const atRendererFailure = await current();
await page.waitForTimeout(1000);
assert(await current() === atRendererFailure, 'Shared timeline advanced after renderer failure');
assert(await page.getByRole('button', { name: 'Play sequence', exact: true }).isDisabled(), 'Play remained enabled after renderer failure');
assert(await page.getByText(/^Eventual totals:/).textContent() === completed, 'Completed results lost after renderer failure');
await page.getByRole('button', { name: 'Retry 3D', exact: true }).click();
await page.locator('.scene-stage canvas').waitFor();
await page.waitForTimeout(600);
await record('Native renderer exception and explicit recovery', { pass: true, completedResultsPreserved: true, autoplay: false });

await page.getByRole('button', { name: 'Before', exact: true }).click();
await page.getByRole('button', { name: 'Play sequence', exact: true }).click();
await page.waitForTimeout(900);
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.getByRole('button', { name: 'Play sequence', exact: true }).waitFor();
const reducedAt = await current();
await page.waitForTimeout(900);
assert(await current() === reducedAt, 'Reduced-motion change did not pause clock');
await page.emulateMedia({ reducedMotion: 'no-preference' });
await page.waitForTimeout(900);
assert(await current() === reducedAt, 'Motion preference restoration autoplayed');
await record('Real reduced-motion media change', { pass: true, pausedAt: reducedAt, preferenceRestorationAutoplay: false });

await page.getByRole('button', { name: 'Play sequence', exact: true }).click();
await page.waitForTimeout(900);
const second = await page.context().newPage();
await second.goto('about:blank');
await second.bringToFront();
await page.waitForTimeout(800);
const actuallyHidden = await page.evaluate(() => document.hidden);
const hiddenAt = await current();
await page.waitForTimeout(900);
if (actuallyHidden) assert(await current() === hiddenAt, 'Hidden tab clock advanced');
await page.bringToFront();
await page.waitForTimeout(900);
if (actuallyHidden) assert(await current() === hiddenAt, 'Returning to page autoplayed');
await second.close();
await record('Actual hidden-tab transition', { pass: actuallyHidden ? true : null, documentHiddenObserved: actuallyHidden, pausedAt: hiddenAt, returnAutoplay: actuallyHidden ? false : null, limitation: actuallyHidden ? null : 'Opening another page did not hide this Chrome target; actual transition not established by this attempt.' });
await page.getByRole('button', { name: 'Before', exact: true }).click();
await page.getByText('Location table & exports', { exact: true }).click();
evidence.exportButtons = await page.getByRole('button').allTextContents();
} catch (error) { evidence.failure = error.message; }
console.log(JSON.stringify(evidence));
return evidence;
}
