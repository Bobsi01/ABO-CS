"""Inspect strong V8 retaining paths without changing application source or prior evidence."""

import hashlib
import json
from collections import Counter, deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "qa/comprehensive_20261012/app/final-guide-unmounted.heapsnapshot"
OUTPUT = Path(__file__).resolve().parent / "retention-analysis.json"
heap = json.loads(SOURCE.read_text(encoding="utf-8"))
meta = heap["snapshot"]["meta"]
nodes, edges, strings = heap["nodes"], heap["edges"], heap["strings"]
nf, ef = meta["node_fields"], meta["edge_fields"]
ns, es = len(nf), len(ef)
ntypes, etypes = meta["node_types"][0], meta["edge_types"][0]
ni = {name: i for i, name in enumerate(nf)}
ei = {name: i for i, name in enumerate(ef)}
n = len(nodes) // ns
offsets = [0] * (n + 1)
reverse = [[] for _ in range(n)]
for index in range(n):
    offsets[index + 1] = offsets[index] + nodes[index * ns + ni["edge_count"]] * es
    for pos in range(offsets[index], offsets[index + 1], es):
        if etypes[edges[pos + ei["type"]]] != "weak":
            reverse[edges[pos + ei["to_node"]] // ns].append((index, pos))


def node(index):
    base = index * ns
    return {
        "index": index,
        "id": nodes[base + ni["id"]],
        "type": ntypes[nodes[base + ni["type"]]],
        "name": strings[nodes[base + ni["name"]]],
        "self_size": nodes[base + ni["self_size"]],
        "detachedness": nodes[base + ni["detachedness"]] if "detachedness" in ni else None,
    }


def edge(pos):
    kind = etypes[edges[pos + ei["type"]]]
    label = edges[pos + ei["name_or_index"]]
    return {"type": kind, "name": label if kind in ("element", "hidden") else strings[label]}


def outward(index):
    return [
        {"edge": edge(pos), "target": node(edges[pos + ei["to_node"]] // ns)}
        for pos in range(offsets[index], offsets[index + 1], es)
    ]


def retainers(index):
    return [{"source": node(parent), "edge": edge(pos)} for parent, pos in reverse[index]]


# A shortest strong path is evidential but not a dominator/sole-owner claim.
parents = [None] * n
parents[0] = (0, -1)
queue = deque([0])
while queue:
    source = queue.popleft()
    for pos in range(offsets[source], offsets[source + 1], es):
        if etypes[edges[pos + ei["type"]]] == "weak":
            continue
        target = edges[pos + ei["to_node"]] // ns
        if node(target)["name"] == "InjectedScript":
            continue
        if parents[target] is None:
            parents[target] = (source, pos)
            queue.append(target)


def path(index):
    result = []
    cursor = index
    while cursor and parents[cursor] is not None:
        parent, pos = parents[cursor]
        result.append({"source": node(parent), "edge": edge(pos), "target": node(cursor)})
        cursor = parent
    return list(reversed(result))


canvas = [
    index
    for index in range(n)
    if node(index)["type"] == "native" and node(index)["name"].startswith("<canvas")
]
renderers, controls = [], []
for index in range(n):
    if node(index)["type"] != "object":
        continue
    if any(
        etypes[edges[pos + ei["type"]]] == "property"
        and strings[edges[pos + ei["name_or_index"]]] == "isWebGLRenderer"
        for pos in range(offsets[index], offsets[index + 1], es)
    ):
        renderers.append(index)
    if any(
        etypes[edges[pos + ei["type"]]] == "property"
        and strings[edges[pos + ei["name_or_index"]]] == "_interceptControlDown"
        for pos in range(offsets[index], offsets[index + 1], es)
    ):
        controls.append(index)
native_names = Counter(node(index)["name"] for index in range(n) if node(index)["type"] == "native")
report = {
    "snapshot": str(SOURCE.relative_to(ROOT)),
    "snapshot_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "node_count": n,
    "edge_count": len(edges) // es,
    "meta": meta,
    "native_names": native_names.most_common(45),
    "canvas_count": len(canvas),
    "controls_count": len(controls),
    "analysis": {
        "state": "Guide view, no visible application canvas or map; forced GC before snapshot",
        "detached_rendered_canvas_count": sum(node(index)["detachedness"] == 2 for index in canvas),
        "document_retained_controls_count": sum(
            any(step["source"]["name"] == "HTMLDocument" for step in path(index))
            for index in controls
        ),
        "observed_retaining_chain": (
            "Live Window -> HTMLDocument -> EventTargetData -> RegisteredEventListener "
            "-> V8EventListener -> native_bind -> bound_this OrbitControls "
            "-> domElement detached rendered canvas"
        ),
        "application_attribution": (
            "All 12 control objects own _interceptControlDown and _interceptControlUp. "
            "The document-retained bound closure matches the _interceptControlDown property. "
            "These are application-created Three OrbitControls, not automation element handles."
        ),
        "dependency_mechanism": (
            "Three OrbitControls.connect adds captured keydown to domElement.getRootNode(); "
            "disconnect recomputes that root. After DOM detachment it is the canvas, "
            "so removal can target a different event target from initial registration."
        ),
        "source_locations": [
            "frontend/src/components/VolcanoScene.tsx:41 OrbitControls construction",
            "frontend/src/components/VolcanoScene.tsx:78 passive effect cleanup/dispose",
            "frontend/node_modules/three/examples/jsm/controls/OrbitControls.js:505 register root",
            "frontend/node_modules/three/examples/jsm/controls/OrbitControls.js:526 removal root",
        ],
        "renderer_attribution_limit": (
            "One object with isWebGLRenderer is retained through shared closure/module context. "
            "The snapshot does not prove all renderer/GPU resources leak, "
            "nor does it assign all aggregate node/listener growth to this path."
        ),
        "retest_required": (
            "Owner should correct original-root listener retirement, then repeat natural "
            "scene remount/Guide forced-GC checks; these are pre-correction retaining paths."
        ),
    },
    "controls": [
        {
            "node": node(index),
            "retainers": retainers(index),
            "root_path": path(index),
            "key_handler_and_dom_properties": [
                item
                for item in outward(index)
                if item["edge"]["name"]
                in ("_interceptControlDown", "_interceptControlUp", "domElement")
            ],
        }
        for index in controls
    ],
    "canvases": [
        {"node": node(index), "retainers": retainers(index), "root_path": path(index)}
        for index in canvas
    ],
    "renderers": [
        {"node": node(index), "retainers": retainers(index), "root_path": path(index)}
        for index in renderers
    ],
    "limit": (
        "Strong shortest paths exclude weak edges and InjectedScript roots. "
        "This is not a dominator or GPU-memory measurement."
    ),
}
# Save representative full paths and identities for every retained control/canvas.
# The parser remains available to reproduce every path directly from the snapshot.
for index, item in enumerate(report["controls"]):
    handler = next(
        prop["target"]
        for prop in item["key_handler_and_dom_properties"]
        if prop["edge"]["name"] == "_interceptControlDown"
    )
    assert handler["id"] == item["root_path"][-1]["source"]["id"]
    if index >= 3:
        item["root_path"] = [
            {
                "from_id": step["source"]["id"],
                "edge": step["edge"],
                "to_id": step["target"]["id"],
                "to_name": step["target"]["name"],
            }
            for step in item["root_path"]
        ]
for item in report["canvases"]:
    item["root_path"] = [
        {
            "from_id": step["source"]["id"],
            "edge": step["edge"],
            "to_id": step["target"]["id"],
            "to_name": step["target"]["name"],
        }
        for step in item["root_path"]
    ]
OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(
    json.dumps(
        {k: report[k] for k in ["node_count", "edge_count", "canvas_count", "controls_count"]}
    )
)
