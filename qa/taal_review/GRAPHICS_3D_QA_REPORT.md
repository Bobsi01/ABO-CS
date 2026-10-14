# Independent 3D Graphics, WebGL Lifecycle & Performance QA Report

**Auditor:** Independent 3D Graphics, WebGL Lifecycle & Performance QA Evaluator  
**Date:** 14 October 2026  
**Governing Directives:** `skills/abo-qa/SKILL.md`, `docs/3D_ILLUSTRATION.md`, `AGENTS.md`  
**Target Implementation:** `frontend/src/components/VolcanoScene.tsx`  
**Test Suite:** `frontend/src/components/volcanoScene3DQA.test.tsx` (14 tests passed)

---

## 1. Executive Summary & Audit Scope

An independent, rigorous 3D graphics, WebGL lifecycle, and mathematical coordinate audit of `VolcanoScene.tsx` was performed, evaluating all newly introduced 3D components, camera presets, hit-testing mechanics, shader/material properties, lighting, fog, reduced-motion controls, and WebGL error handling.

The audit verified:
1. **WebGL & Three.js Resource Disposal:** Inspected geometry, material, texture, and buffer attribute disposal lifecycles for `THREE.InstancedMesh` (hypocenters), `THREE.Line` (PDZ boundary), `THREE.ArrowHelper` (InSAR dike vector and TROPOMI plume vector), `THREE.Mesh` (Alert Level ring), and `THREE.Group` (Column Altimeter).
2. **Raycasting & Hit-Testing:** Inspected instance ID mapping to the USGS FDSN seismicity catalog (`/taal_earthquakes_2021_2024.json`), depth filtering (`all`, `shallow` $\le 15\text{ km}$, `deep` $> 15\text{ km}$), pointer event propagation, and HUD inspection card states.
3. **Camera & Rendering Mechanics:** Evaluated the Tagaytay Ridge and Cross-wind Plume Profile camera presets, coordinate transformations, ground plane clipping limits, azimuth preservation, hemisphere lighting, distance fog parameters, reduced-motion compliance, and WebGL fallback behavior.

The audit authored an independent automated test suite in `frontend/src/components/volcanoScene3DQA.test.tsx` containing 14 unit and integration tests covering all verification targets. All 14 tests pass cleanly (`npm run test -- volcanoScene3DQA`).

---

## 2. Verification Checks & Observed Results

### 2.1 WebGL & Three.js Resource Disposal

| Element | Construction / Allocation | Disposal Mechanism | Observed Status & Lifecycle Finding |
| :--- | :--- | :--- | :--- |
| **Earthquake Hypocenters** | `THREE.InstancedMesh` with `<sphereGeometry>` and `<meshStandardMaterial>` | R3F declarative unmount | **P1 Defect:** While R3F disposes `<sphereGeometry>` and `<meshStandardMaterial>`, `THREE.InstancedMesh.prototype.dispose()` does **not** call `.dispose()` on `instanceMatrix` or `instanceColor` GPU buffers. When `depthFilter` changes (`all` $\to$ `shallow` $\to$ `deep`), R3F reconstructs `new InstancedMesh`, orphaning the old GPU `WebGLBuffer` allocations. |
| **Column Altimeter** | `THREE.Group` with `THREE.Line`, `THREE.LineSegments`, and cloned `THREE.Sprite` with `THREE.CanvasTexture` | Explicit traversal in `useEffect` | **Pass:** Lines 600–609 iterate over `rulerGroup.children`, explicitly calling `.dispose()` on line geometries, line materials, sprite geometries, canvas textures (`map.dispose()`), and sprite materials upon unmount or when `showAltimeter` is toggled off (`show = false` returns `null` from `useMemo`, triggering cleanup). |
| **PHIVOLCS PDZ Ring** | `THREE.Line` with `LineDashedMaterial` and `BufferGeometry` | `useEffect(() => () => { line?.geometry.dispose(); line?.material.dispose() }, [line])` | **P1 Defect:** When `showPDZ3D` is toggled off (`show = false`), `line` remains cached in `useMemo([points])`. Because `points` has not changed, the cleanup effect does not trigger. The GPU geometry and material remain allocated while hidden, and persist when switching between volcanoes unless unmounted. |
| **InSAR Dike Vector** | `THREE.ArrowHelper` with internal lines, cones, and basic materials | `useEffect(() => () => arrow?.dispose(), [arrow])` | **P1 Defect:** When `showDike` is toggled off or volcano is changed, `arrow` remains in `useMemo([data, base])`. Cleanup does not trigger until component unmount. |
| **Alert Level Ring** | `THREE.Mesh` with `RingGeometry` and `MeshBasicMaterial` | `useEffect(() => () => { ring?.geometry.dispose(); ring?.material.dispose() }, [ring])` | **P1 Defect:** Retained in memo closure when layer is unchecked or volcano switched to Mayon/Kanlaon. |
| **TROPOMI Plume Cue** | `THREE.ArrowHelper` with internal line and cone | `useEffect(() => () => arrow?.dispose(), [arrow])` | **P1 Defect:** Retained in memo closure when layer is unchecked or volcano switched. |

---

### 2.2 Raycasting & Hit-Testing

1. **Instance ID to Earthquake Index Mapping:**
   - In `SubsurfaceSeismicity`:
     $$\text{mesh.setMatrixAt}(i, \dots), \quad \text{mesh.setColorAt}(i, \dots), \quad \text{mesh.count} = \text{filteredQuakes.length}$$
   - When a raycast intersection occurs on the `InstancedMesh`, Three.js populates `intersect.instanceId = instanceId`.
   - The click handler retrieves:
     ```ts
     if (event.instanceId != null && filteredQuakes[event.instanceId]) {
       onInspectQuake(filteredQuakes[event.instanceId])
     }
     ```
   - **Verification:** Verified in `volcanoScene3DQA.test.tsx` that `event.instanceId` correctly maps to the exact earthquake entry in `filteredQuakes` across all depth filters (`all`, `shallow`, `deep`).
   - The local asset `/taal_earthquakes_2021_2024.json` is bit-for-bit identical to `data/source/taal/taal_earthquakes_2021_2024.json` (USGS FDSN catalog).

2. **Subsurface Visual Occlusion & Depth Testing:**
   - The hypocenters are calculated at $y = -\text{displayDepth}$ ($-1\text{ km}$ to $-35\text{ km}$ underground).
   - The terrain mesh and the domain neutral plane are positioned at $y \ge -0.05\text{ km}$ and are rendered opaque (`side={THREE.DoubleSide}`, `depthWrite={true}`).
   - The camera orbit is bounded by `controls.maxPolarAngle = Math.PI / 2 - 0.04`, strictly preventing the camera from moving below the ground horizon.
   - The earthquake hypocenter material specifies `depthWrite={false}`, but leaves `depthTest={true}` (default).
   - **Observed Result (P1 Defect):** Every fragment of the subterranean earthquake spheres fails the hardware depth test against the opaque terrain/ground surface. Consequently, all earthquake hypocenters are completely invisible to the user from all normal viewing angles unless an X-ray shader, cutaway plane, or `depthTest={false}` is implemented.

3. **HUD State Updates & Card Lifecycle:**
   - Selecting a hypocenter opens the `.scene-inspection-card` displaying Magnitude, Depth, UTC timestamp, and geographic Place.
   - **Observed Result (P2 Defect):** If the user unchecks "Show 2021-2024 hypocenters" or switches volcanoes to Mayon/Kanlaon, `inspectedQuake` is not cleared from React state (`setInspectedQuake(null)` is not called). The inspection card remains displayed on screen for an inactive layer.

---

### 2.3 Camera & Rendering Mechanics

1. **Tagaytay Ridge Camera Preset:**
   - **Formula:**
     $$\text{Position} = \left(0,\; \text{base} + \max(3.2,\; \text{height} \times 0.45),\; -\text{dist}\right), \quad \text{Target} = \left(0,\; \text{base} + \text{height} \times 0.25,\; 0\right)$$
     where $\text{dist} = \max(16,\; \text{height} \times 1.8)\text{ km}$.
   - **Ground Clearance:** At $\text{height} = 3\text{ km}$, camera elevation is $0.311 + 3.2 = 3.511\text{ km}$ ASL. The northern caldera rim (Tagaytay Ridge) reaches $\approx 455\text{ m}$ ASL. The camera has $>3\text{ km}$ clearance above the terrain, completely avoiding terrain clipping.
   - **Azimuth & Coordinates:** In the ABO coordinate system, North is $-Z$ and East is $+X$. Tagaytay Ridge is North of Volcano Island, so $Z = -16\text{ km}$ is strictly correct. Looking towards the vent at $Z = 0$, the forward vector is $+Z$ (South). With $\text{Up} = (0, 1, 0)$, the screen-right vector is $\text{Forward} \times \text{Up} = (-1, 0, 0)$ (West), and screen-left is $+X$ (East). This matches the real-world view from Tagaytay Ridge looking South across Lake Taal.

2. **Cross-wind Plume Profile Preset:**
   - **Formula:**
     $$\theta_{\text{transport}} = (\text{windFromDeg} + 180) \pmod{360}$$
     $$\theta_{\text{cross}} = (\theta_{\text{transport}} + 90) \pmod{360}, \quad \text{rad} = \frac{\theta_{\text{cross}} \pi}{180}$$
     $$\text{Position} = \left(\text{dist} \sin(\text{rad}),\; \text{base} + \text{height} \times 0.7,\; -\text{dist} \cos(\text{rad})\right), \quad \text{Target} = \left(0,\; \text{base} + \text{height} \times 0.4,\; 0\right)$$
   - **Orientation Analysis across 4 Cardinal Wind Directions:**
     * **Wind FROM South ($180^\circ$):** Transport towards North ($0^\circ$). Camera placed East ($+X$), looking West ($-X$). Screen-right vector points North ($-Z$). Plume travels left-to-right.
     * **Wind FROM North ($0^\circ$):** Transport towards South ($180^\circ$). Camera placed West ($-X$), looking East ($+X$). Screen-right vector points South ($+Z$). Plume travels left-to-right.
     * **Wind FROM East ($90^\circ$):** Transport towards West ($270^\circ$). Camera placed North ($-Z$), looking South ($+Z$). Screen-right vector points West ($-X$). Plume travels left-to-right.
     * **Wind FROM West ($270^\circ$):** Transport towards East ($90^\circ$). Camera placed South ($+Z$), looking North ($-Z$). Screen-right vector points East ($+X$). Plume travels left-to-right.
   - In all cases, $\mathbf{r}_{\text{camera}} \cdot \mathbf{v}_{\text{transport}} > 0.99$. The plume always rises and bends from left-to-right across the viewport. Elevation is $70\%$ of column height and target is $40\%$, providing consistent framing without ground clipping.

3. **Inverted Azimuth in `TaalDikeVector3D` (Critical P0 Defect):**
   - Line 460 of `VolcanoScene.tsx`:
     ```ts
     const rad = (data.dike_azimuth_deg * Math.PI) / 180
     const dir = new THREE.Vector3(Math.sin(rad), 0, Math.cos(rad)).normalize()
     ```
   - In ABO world coordinates:
     $$X = \text{East} = \sin(\text{rad}), \quad Z = -\text{North} = -\cos(\text{rad})$$
   - For the modeled 2020 lateral dike intrusion ($225^\circ$, South-West):
     * $\sin(225^\circ) = -0.7071$ (West, $-X$).
     * $\cos(225^\circ) = -0.7071$ (South, which must map to $+Z = -\cos(\text{rad}) = +0.7071$).
   - However, line 460 sets $Z = +\cos(\text{rad}) = -0.7071$. In ABO world coordinates, $-Z$ is North!
   - Consequently, the dike vector points **North-West** instead of **South-West**, an exact $180^\circ$ inversion along the North-South axis.
   - In contrast, `TaalTropomiPlumeCue` (line 533) correctly specifies:
     ```ts
     const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize()
     ```

4. **Hemisphere Lighting & Distance Fog:**
   - **Lighting:** Baseline `ambientLight intensity={0.5}`, `hemisphereLight args={['#ffffff', '#8fa3be', 0.5]}` (soft sky/ground environmental fill), and `directionalLight position={[-18, 32, 25]} intensity={1.7}`. Preserves distinct shadow relief on terrain slopes.
   - **Distance Fog:** `fog attach="fog" args={['#e8f0fa', 180, 650]}`.
     * Close-up views ($14\text{ km} \le \text{dist} \le 30\text{ km}$) are well within the $180\text{ km}$ fog near distance ($0\%$ fog blend), ensuring $100\%$ contrast for volcanic relief and plume billows.
     * Regional overview ($\approx 230\text{ km}$) falls smoothly within the $180\text{--}650\text{ km}$ range, fading the sharp boundary of the $100\text{ km}$ terrain heightfield into the `#e8f0fa` sky.
     * Compass and text sprites explicitly set `fog: false`, `toneMapped: false`, and `depthTest: false`, maintaining legibility across all camera distances.

5. **Reduced-Motion Compliance:**
   - When `prefers-reduced-motion: reduce` becomes active, the media query event listener calls `setPlaying(false)`.
   - `Canvas frameloop="demand"` suspends rendering when paused.
   - The settling replay `requestAnimationFrame` loop in `Ash` is cancelled.
   - The listener is cleanly detached on unmount.

6. **WebGL Fallback Behavior:**
   - `supportsWebGL2()` verifies context availability before mounting Canvas.
   - `guardRenderer` intercepts shader compilation/execution failures and transitions to fallback.
   - `SceneBoundary` catches React rendering exceptions inside the R3F tree.
   - `webglcontextlost` event triggers immediate transition to 2D alternative (Leaflet map and exposure table) and disables 3D playback/camera controls.

---

## 3. Categorized Findings & Defects

### Critical (P0)
* **FINDING-3D-01 (Inverted Azimuth in `TaalDikeVector3D`):**
  - **Location:** `frontend/src/components/VolcanoScene.tsx:460`
  - **Root Cause:** The direction vector calculation uses `new THREE.Vector3(Math.sin(rad), 0, Math.cos(rad))` instead of `new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad))`. Because ABO world coordinates define North as $-Z$ and South as $+Z$, the positive cosine sign inverts the North-South axis.
  - **Impact:** The Bato et al. (2021) 2020 dike intrusion azimuth ($225^\circ$, South-West) renders pointing North-West ($\approx 315^\circ$), displaying scientifically incorrect geometry to the user.
  - **Correction Recommendation:** Update line 460 to:
    ```ts
    const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize()
    ```

### Major (P1)
* **FINDING-3D-02 (GPU Buffer Leak on Dynamic `InstancedMesh` Recreation):**
  - **Location:** `frontend/src/components/VolcanoScene.tsx:395` (`SubsurfaceSeismicity`)
  - **Root Cause:** When `depthFilter` changes (`all` $\to$ `shallow` $\to$ `deep`), `filteredQuakes.length` changes, causing R3F to instantiate a new `THREE.InstancedMesh`. In Three.js, `InstancedMesh.prototype.dispose()` does not dispose `instanceMatrix` or `instanceColor` buffer attributes.
  - **Impact:** Orphaned WebGLBuffers remain bound in `WebGLAttributes`, leaking GPU memory on every depth filter toggle.
  - **Correction Recommendation:** Add an explicit cleanup effect in `SubsurfaceSeismicity` that calls `mesh.current.instanceMatrix.dispose()` and `mesh.current.instanceColor?.dispose()`.

* **FINDING-3D-03 (Subsurface Seismicity Visual Occlusion by Opaque Terrain):**
  - **Location:** `frontend/src/components/VolcanoScene.tsx:395` (`SubsurfaceSeismicity`)
  - **Root Cause:** Hypocenters are rendered at $y \in [-35, -1]\text{ km}$ below the opaque terrain and domain plane ($y \ge -0.05\text{ km}$). The camera is constrained above the ground plane, and the hypocenter material leaves `depthTest: true` by default.
  - **Impact:** The hypocenter spheres are completely hidden beneath the terrain and cannot be seen or easily interacted with in the 3D viewport.
  - **Correction Recommendation:** Set `depthTest: false` on the hypocenter material (with `renderOrder: 10`) or introduce a semi-transparent terrain/ground cutaway when Seismicity mode is active.

* **FINDING-3D-04 (GPU Resource Retention in Memo Closures):**
  - **Location:** `frontend/src/components/VolcanoScene.tsx:424-432, 457-466, 493-504, 529-537`
  - **Root Cause:** In `TaalPDZ3D`, `TaalDikeVector3D`, `TaalAlertLevelRing3D`, and `TaalTropomiPlumeCue`, components return `null` when `show` is false or `scenario.volcano_id !== 'taal'`. However, geometries and materials remain cached in `useMemo` closures and are not disposed because the dependencies did not change.
  - **Impact:** GPU resources remain allocated when sublayers are toggled off or when switching between volcanoes (e.g. from Taal to Mayon).
  - **Correction Recommendation:** Bind `show` into the memo dependency or clear/dispose the cached object when `show` becomes false.

### Minor (P2)
* **FINDING-3D-05 (Orphaned HUD Inspection Card State):**
  - **Location:** `frontend/src/components/VolcanoScene.tsx:638, 730-737`
  - **Root Cause:** `inspectedQuake` state is not reset when `showSeismicity` is unchecked or when `scenario.volcano_id` changes away from Taal.
  - **Impact:** The earthquake inspection details card remains docked in the HUD even after the user disables the seismicity layer or switches volcanoes.
  - **Correction Recommendation:** Add an effect resetting `inspectedQuake` to `null` whenever `showSeismicity` is false or `scenario.volcano_id !== 'taal'`.

* **FINDING-3D-06 (Hardcoded Entry Index in Alert Level Ring):**
  - **Location:** `frontend/src/components/VolcanoScene.tsx:485`
  - **Root Cause:** Code specifies `setLatest(entries[1] ?? entries[0])`, selecting index 1 (July 2021, Alert Level 3) rather than the most recent entry in the time-sorted archive (April 2024, Alert Level 1, at `entries[entries.length - 1]`).
  - **Impact:** The Alert Level ring is permanently fixed to Alert Level 3 instead of reflecting the latest bulletin status.
  - **Correction Recommendation:** Change index to `entries[entries.length - 1]`.

---

## 4. Test Suite Execution & Verification Evidence

An independent test file was authored and executed:
```powershell
npm run test -- volcanoScene3DQA
```
**Output:**
```
 RUN  v4.1.11 C:/Users/Michael/CS-Abo/ABO-CS-1/frontend

 ✓ src/components/volcanoScene3DQA.test.tsx (14 tests) 304ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Duration  1.51s
```

All 19 frontend test files (93 tests total) pass without regressions:
```
 Test Files  19 passed (19)
      Tests  93 passed (93)
   Duration  8.63s
```
Linter and TypeScript typechecker exited cleanly with 0 errors (`npm run lint`, `npm run typecheck`).
