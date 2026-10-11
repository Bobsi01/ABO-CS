/** Independent DOM checks against the actual custom Select (no app build).
 * Run: node qa/select_audit.cjs. jsdom does not certify browser rendering/AT.
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const frontend = createRequire(path.join(__dirname, '../frontend/package.json'))
const { JSDOM } = frontend('jsdom')
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
global.window = dom.window
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement
global.Node = dom.window.Node
global.getComputedStyle = dom.window.getComputedStyle
global.IS_REACT_ACT_ENVIRONMENT = true
const React = frontend('react')
const { render, fireEvent, screen, cleanup } = frontend('@testing-library/react')
const ts = frontend('typescript')
const source = fs.readFileSync(path.join(__dirname, '../frontend/src/components/Select.tsx'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const component = { exports: {} }
new Function('require', 'module', 'exports', compiled)(frontend, component, component.exports)
const Select = component.exports.default
const changes = []
const options = [{ value: '', label: 'Choose location', disabled: true }, { value: 'a', label: 'Alba' }, { value: 'b', label: 'Albay' }, { value: 't', label: 'Tanauan' }]
render(React.createElement(Select, { label: 'Inspect location', value: '', options, onChange: value => changes.push(value) }))
let control = screen.getByRole('combobox')
control.focus()
fireEvent.keyDown(control, { key: ' ' })
assert.equal(document.getElementById(control.getAttribute('aria-activedescendant')).textContent, 'Alba')
fireEvent.keyDown(control, { key: 'ArrowUp' })
assert.equal(document.getElementById(control.getAttribute('aria-activedescendant')).textContent, 'Tanauan')
fireEvent.keyDown(control, { key: 'Enter' })
assert.deepEqual(changes, ['t'])
assert.equal(document.activeElement, control)
fireEvent.click(control)
fireEvent.keyDown(control, { key: 'Home' })
fireEvent.keyDown(control, { key: 'a' })
fireEvent.keyDown(control, { key: 'a' })
assert.equal(document.getElementById(control.getAttribute('aria-activedescendant')).textContent, 'Alba')
fireEvent.keyDown(control, { key: 'a' })
assert.equal(document.getElementById(control.getAttribute('aria-activedescendant')).textContent, 'Albay')
fireEvent.keyDown(control, { key: 'Escape' })
assert.equal(screen.queryByRole('listbox'), null)
assert.deepEqual(changes, ['t'])
cleanup()

// Reproduce the independently reported overflow geometry: 188 px below and
// a large menu. Correct placement must choose the upward side and fit there.
Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true })
render(React.createElement(Select, { label: 'Locations', value: '0', options: Array.from({ length: 123 }, (_, i) => ({ value: String(i), label: `Point ${i}` })), onChange: () => {} }))
control = screen.getByRole('combobox')
control.getBoundingClientRect = () => ({ left: 16, top: 556, bottom: 600, width: 288, height: 44 })
fireEvent.click(control)
const portal = screen.getByRole('listbox').parentElement
assert.equal(portal.style.top, '')
assert.equal(portal.style.bottom, '248px')
assert.ok(Number.parseFloat(portal.style.maxHeight) <= 544)
assert.ok(Number.parseFloat(portal.style.left) + Number.parseFloat(portal.style.width) <= 312)
fireEvent.pointerDown(document.body)
assert.equal(screen.queryByRole('listbox'), null)
cleanup()
console.log(JSON.stringify({ status: 'PASS', checks: 'Space/disabled-first/wrap/commit/focus/repeated-typeahead/Escape/outside dismissal; 123-item viewport placement', limit: 'Actual component in jsdom; browser/touch/assistive-technology proof separate.' }))
