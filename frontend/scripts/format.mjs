import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import prettier from 'prettier'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const check = process.argv.includes('--check')
const config = JSON.parse(await readFile(resolve(root, 'frontend/.prettierrc.json'), 'utf8'))
const tracked = execFileSync(
  'git',
  [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '-z',
    '--',
    'frontend',
    'scripts',
    'qa',
  ],
  {
    cwd: root,
    encoding: 'utf8',
  },
).split('\0')
const files = new Set([
  ...tracked.filter((path) => /\.(?:[cm]?js|tsx?|css)$/.test(path) && !path.endsWith('.d.ts')),
  'frontend/scripts/format.mjs',
])

function separateSteps(source, path) {

  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const insertions = new Set()

  function visit(node) {

    if (
      ts.isFunctionLike(node) &&
      node.body &&
      ts.isBlock(node.body) &&
      node.body.statements.length
    ) {
      insertions.add(node.body.getStart(tree) + 1)
      const lastStatement = node.body.statements.at(-1)
      const trailing = source.slice(lastStatement.end, node.body.end - 1)

      // Keep next-line directives attached to the line they control.
      if (/\/\/\s*(?:eslint-disable-next-line|@ts-(?:ignore|expect-error))\b/.test(trailing)) {
        if (!/\n\s*\n/.test(trailing)) insertions.add(lastStatement.end)
      } else {
        insertions.add(source.lastIndexOf('\n', node.body.end - 2))
      }
    }

    if (ts.isBlock(node) || ts.isSourceFile(node)) {
      const statements = node.statements

      for (let index = 1; index < statements.length; index += 1) {
        const previous = statements[index - 1]
        const current = statements[index]
        const endsSetup = ts.isVariableStatement(previous) && !ts.isVariableStatement(current)
        const endsImports = ts.isImportDeclaration(previous) && !ts.isImportDeclaration(current)
        const startsStep = ts.isReturnStatement(current) || ts.isFunctionDeclaration(current)
        const endsFunction = ts.isFunctionDeclaration(previous)
        const gap = source.slice(previous.end, current.getStart(tree))

        if ((endsSetup || endsImports || startsStep || endsFunction) && !/\n\s*\n/.test(gap)) {
          insertions.add(previous.end)
        }
      }
    }

    ts.forEachChild(node, visit)

  }

  visit(tree)

  for (const position of [...insertions].sort((left, right) => right - left)) {
    source = `${source.slice(0, position)}\n${source.slice(position)}`
  }

  return source

}

let changed = 0

for (const path of files) {
  const absolute = resolve(root, path)
  const original = await readFile(absolute, 'utf8')
  let result = original.replaceAll('\r\n', '\n')

  // Settle wrapping after adding blank lines to compact callbacks.
  for (let pass = 0; pass < 5; pass += 1) {
    const formatted = await prettier.format(result, { ...config, filepath: path })
    const next = path.endsWith('.css') ? formatted : separateSteps(formatted, path)

    if (next === result) break
    if (pass === 4) throw new Error(`Formatting did not settle: ${path}`)

    result = next
  }

  if (original.replaceAll('\r\n', '\n') !== result) {
    changed += 1

    if (check) console.error(path)
    else await writeFile(absolute, result)
  }
}

console.log(`${files.size} files checked; ${changed} ${check ? 'need formatting' : 'formatted'}.`)
process.exitCode = check && changed > 0 ? 1 : 0
