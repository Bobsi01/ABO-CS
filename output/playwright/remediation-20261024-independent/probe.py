"""Independent read-only numerical/data checks for the remediation branch."""
import json
from pathlib import Path

import numpy as np
from scipy.integrate import quad

from abo_api import eruption, kernel, service
from abo_api.contracts import EruptionRequest, SimulationRequest

root = Path(__file__).resolve().parents[3]
report = {"profile_checks": [], "presets": []}
z = [500.0, 2000.0, 5000.0]
speed = [10.0, 25.0, 15.0]
bearing = [270.0, 180.0, 90.0]
east = [-s * np.sin(np.deg2rad(b)) for s, b in zip(speed, bearing)]
north = [-s * np.cos(np.deg2rad(b)) for s, b in zip(speed, bearing)]
for height in [100.0, 500.0, 1000.0, 2500.0, 5000.0, 8000.0]:
    actual = kernel.layer_winds(np.array([height]), np.array(z), speed, bearing, True)
    expected = [
        quad(lambda h: float(np.interp(h, z, values)), 0, height, points=[p for p in z if p < height])[0] / height
        for values in [east, north]
    ]
    np.testing.assert_allclose([v[0] for v in actual], expected, rtol=1e-10, atol=1e-10)
    report["profile_checks"].append({"height_m": height, "expected": expected, "actual": [float(v[0]) for v in actual]})

cat = service.catalog()
for preset in cat.scenarios:
    request = SimulationRequest(scenario=preset.scenario)
    result = service.simulate(request)
    values = np.array(result.grid.load_kg_m2)
    assert np.isfinite(values).all() and (values >= 0).all()
    total = result.diagnostics.total_ash_mass_kg
    assert np.isclose(result.diagnostics.inside_domain_mass_kg + result.diagnostics.outside_domain_mass_kg, total)
    report["presets"].append({"id": preset.id, "finite_nonnegative": True, "mass_balance": True, "reported": result.summary.municipalities_reported, "input_status": result.provenance.input_status})

regional = next(p.scenario for p in cat.scenarios if p.id == "taal-regional")
seq = eruption.sequence(EruptionRequest(simulation=SimulationRequest(scenario=regional)))
assert max(map(max, seq.frames[0].grid.thickness_mm)) == 0
assert np.all(np.diff([[r.thickness_mm or 0 for r in f.receptors] for f in seq.frames], axis=0) >= -1e-9)
assert np.allclose(seq.final_grid.thickness_mm, service.simulate(SimulationRequest(scenario=regional)).grid.thickness_mm)
report["sequence"] = {"zero_initial_grid": True, "monotone_centroids": True, "final_matches_eventual": True}
features = json.loads((root / "frontend/public/municipal-boundaries.geojson").read_text())["features"]
ids = {r.id for r in cat.receptors}
matched = [f for f in features if f["properties"]["receptor_id"] in ids]
unmatched = [f for f in features if f["properties"]["receptor_id"] is None]
assert len(features) == len(matched) + len(unmatched)
assert not any(f["properties"]["name"] == "City of Calamba, Laguna" and f["properties"]["center_lat"] < 12 for f in features)
report["boundaries"] = {"total":len(features), "matched":len(matched), "unmatched_explicit":len(unmatched), "remote_calamba_mislabel_absent":True}
report["historical_available"] = service.replication().available
assert report["historical_available"] is False
Path(__file__).with_name("numerical-evidence.json").write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
