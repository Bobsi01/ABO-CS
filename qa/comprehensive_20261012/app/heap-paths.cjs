const fs = require('node:fs'), path = require('node:path')
const source = process.argv[2] || path.join(__dirname, 'final-guide-unmounted.heapsnapshot')
const output = source.replace(/\.heapsnapshot$/, '-paths.json')
const heap = JSON.parse(fs.readFileSync(source, 'utf8'))
const nf = heap.snapshot.meta.node_fields, ef = heap.snapshot.meta.edge_fields
const ns = nf.length, es = ef.length, nodeCount = heap.nodes.length / ns, edgeCount = heap.edges.length / es
const types = heap.snapshot.meta.node_types[0], edgeTypes = heap.snapshot.meta.edge_types[0]
const ni = Object.fromEntries(nf.map((field, i) => [field, i])), ei = Object.fromEntries(ef.map((field, i) => [field, i]))
const name = node => heap.strings[heap.nodes[node * ns + ni.name]]
const type = node => types[heap.nodes[node * ns + ni.type]]
const describe = node => ({ node, id: heap.nodes[node * ns + ni.id], type: type(node), name: name(node).slice(0, 180), detachedness: heap.nodes[node * ns + ni.detachedness], self_size: heap.nodes[node * ns + ni.self_size] })
const head = new Int32Array(nodeCount).fill(-1), next = new Int32Array(edgeCount), from = new Int32Array(edgeCount)
let edge = 0
for (let node = 0; node < nodeCount; node++) for (let count = heap.nodes[node * ns + ni.edge_count]; count; count--, edge++) {
  from[edge] = node
  const target = heap.edges[edge * es + ei.to_node] / ns
  next[edge] = head[target]; head[target] = edge
}
function edgeLabel(index) {
  const kind = edgeTypes[heap.edges[index * es + ei.type]], raw = heap.edges[index * es + ei.name_or_index]
  return { kind, label: ['element', 'hidden'].includes(kind) ? String(raw) : heap.strings[raw].slice(0, 100) }
}
function rootPath(start) {
  const visited = new Uint8Array(nodeCount), backNode = new Int32Array(nodeCount).fill(-1), backEdge = new Int32Array(nodeCount).fill(-1)
  const queue = new Int32Array(nodeCount); let first = 0, last = 1, root = -1
  queue[0] = start; visited[start] = 1
  while (first < last) {
    const node = queue[first++]
    if (type(node) === 'synthetic' && /GC roots|Global handles|Strong roots/.test(name(node))) { root = node; break }
    for (let edge = head[node]; edge !== -1; edge = next[edge]) {
      const kind = edgeTypes[heap.edges[edge * es + ei.type]], parent = from[edge]
      if (kind === 'weak' || visited[parent]) continue
      visited[parent] = 1; backNode[parent] = node; backEdge[parent] = edge; queue[last++] = parent
    }
  }
  if (root === -1) return { visited: last, path: [] }
  const result = []; let node = root
  for (let count = 0; node !== -1 && count < 50; count++) {
    result.push({ ...describe(node), retaining_edge: backEdge[node] >= 0 ? edgeLabel(backEdge[node]) : null })
    node = backNode[node]
  }
  return { visited: last, path: result }
}
const canvas = [], counts = {}, controls = []
for (let node = 0; node < nodeCount; node++) {
  const n = name(node), t = type(node)
  if (!['object', 'native'].includes(t) || n.length > 150) continue
  if (/HTMLCanvasElement|WebGLRenderingContext|WebGL2RenderingContext|HTMLDivElement|WebGLRenderer/.test(n)) counts[`${t}:${n}`] = (counts[`${t}:${n}`] || 0) + 1
  if (t === 'object' && n === 'HTMLCanvasElement') canvas.push(node)
}
for (let edge = 0; edge < edgeCount; edge++) if (edgeTypes[heap.edges[edge * es + ei.type]] === 'property' && heap.strings[heap.edges[edge * es + ei.name_or_index]] === '_interceptControlDown') controls.push({ ...describe(from[edge]), root_path: rootPath(from[edge]) })
const report = { source, node_count: nodeCount, edge_count: edgeCount, counts, controls, canvases: canvas.map(node => ({ ...describe(node), direct_retainers: (() => { const result = []; for (let edge = head[node]; edge !== -1 && result.length < 15; edge = next[edge]) result.push({ ...describe(from[edge]), retaining_edge: edgeLabel(edge) }); return result })(), root_path: rootPath(node) })) }
fs.writeFileSync(output, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ output, counts, orbit_controls_count: controls.length, canvas_wrapper_count: canvas.length, engine_canvases_rooted_by_document_listener: report.canvases.filter(canvas => canvas.root_path.path.some(node => node.name === 'native_bind') && canvas.root_path.path.some(node => node.name === 'HTMLDocument')).length }, null, 2))
