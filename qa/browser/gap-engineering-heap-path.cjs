const fs = require('fs'),
  path = require('path')
const heap = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'gap-engineering-retention.heapsnapshot')),
  ),
  n = heap.nodes,
  e = heap.edges,
  s = heap.strings,
  fields = heap.snapshot.meta.node_fields.length,
  ef = heap.snapshot.meta.edge_fields.length,
  types = heap.snapshot.meta.edge_types[0],
  nodeTypes = heap.snapshot.meta.node_types[0],
  count = n.length / fields
const incoming = new Int32Array(count).fill(-1),
  next = new Int32Array(e.length / ef),
  sources = new Int32Array(e.length / ef),
  candidates = []
let cursor = 0

for (let source = 0; source < count; source++)
  for (let step = 0; step < n[source * fields + 4]; step++, cursor += ef) {
    const edge = cursor / ef,
      to = e[cursor + 2] / fields

    sources[edge] = source
    next[edge] = incoming[to]
    incoming[to] = edge
    if (types[e[cursor]] === 'property' && s[e[cursor + 1]] === 'frames') candidates.push(source)
  }

function retainingPath(target) {

  const seen = new Uint8Array(count),
    queue = [target],
    previous = new Map()

  seen[target] = 1
  let root = -1

  for (let head = 0; head < queue.length; head++) {
    const at = queue[head]

    if (at === 0) {
      root = at
      break
    }
    for (let edge = incoming[at]; edge >= 0; edge = next[edge]) {
      if (types[e[edge * ef]] === 'weak') continue
      const from = sources[edge]

      if (seen[from]) continue
      seen[from] = 1
      previous.set(from, { to: at, edge })
      queue.push(from)
    }
  }
  if (root < 0) return ['No strong path']
  const result = []
  let at = root

  while (at !== target) {
    const { to, edge } = previous.get(at)
    const type = types[e[edge * ef]],
      label = ['element', 'hidden'].includes(type) ? e[edge * ef + 1] : s[e[edge * ef + 1]]

    result.push({
      from: s[n[at * fields + 1]],
      type: nodeTypes[n[at * fields]],
      edge: type + ':' + label,
      to: s[n[to * fields + 1]],
    })
    at = to
  }

  return result

}

const report = candidates.map((index) => ({ index, retaining_path: retainingPath(index) }))

fs.writeFileSync(
  path.join(__dirname, 'gap-engineering-retention-paths.json'),
  JSON.stringify(report, null, 2),
)
console.log(JSON.stringify(report.slice(0, 4), null, 2))
