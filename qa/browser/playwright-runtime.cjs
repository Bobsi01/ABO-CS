// Optional override for a shared installation; default to qa/node_modules.
const path = require('node:path')
const { createRequire } = require('node:module')

if (process.env.ABO_PLAYWRIGHT_MODULES) {
  const modules = path.resolve(process.env.ABO_PLAYWRIGHT_MODULES)

  module.exports = createRequire(path.join(modules, '__abo_qa__.cjs'))('playwright')
} else {
  module.exports = require('playwright')
}
