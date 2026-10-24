"""Independent invariants for the October 24 data and interpretation defects."""

import json
from pathlib import Path

import numpy as np
import pytest

from abo_api import kernel, service
from abo_api.contracts import SimulationRequest

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize("height", [0, 100, 500, 1000, 2000, 3000])
def test_elevated_constant_profile_preserves_transport(height):
    east, north = kernel.layer_winds(
        np.array([height]), np.array([500, 2000]), [10, 10], [270, 270], True
    )
    assert east[0] == pytest.approx(10)
    assert north[0] == pytest.approx(0, abs=1e-12)


def test_piecewise_profile_mean_includes_lower_constant_segment():
    east, _ = kernel.layer_winds(
        np.array([250, 1000, 2000, 3000]),
        np.array([500, 2000]),
        [10, 40],
        [270, 270],
        True,
    )
    # Integral from zero: constant 10 below 500; linear 10..40 to 2000;
    # then constant 40. These expressions do not use the implementation's accumulator.
    np.testing.assert_allclose(east, [10, (5000 + 7500) / 1000, 42500 / 2000, 82500 / 3000])


def test_regional_metadata_and_provenance_disclose_heuristic():
    data = service.catalog()
    preset = next(p for p in data.scenarios if p.id == "taal-regional")
    assert "illustrative" in preset.name
    assert "actual event" not in preset.name
    result = service.simulate(SimulationRequest(scenario=preset.scenario, receptors=[]))
    assumptions = " ".join(result.provenance.assumptions)
    assert "Uniform release-height weights" not in assumptions
    assert "stationary proximal mass fraction=0.4" in assumptions
    assert "uncalibrated" in assumptions
    assert "height-integrated" in assumptions
    assert result.diagnostics.validation_status == "not_historically_validated"


def test_boundary_assignments_require_reviewed_source_centroid_and_id():
    catalog = service.catalog()
    receptors = {r.id: r for r in catalog.receptors}
    raw = {
        row["properties"]["shapeID"]: row
        for row in json.loads((ROOT / "data/source/derived-municipal-centroids.json").read_text())
    }
    features = json.loads((ROOT / "frontend/public/municipal-boundaries.geojson").read_text())[
        "features"
    ]
    for feature in features:
        props = feature["properties"]
        receptor_id = props["receptor_id"]
        if receptor_id is None:
            assert props["province"] == "Unresolved province"
            continue
        receptor = receptors[receptor_id]
        original = raw[props["shapeID"]]
        assert receptor.lat == pytest.approx(original["lat"], abs=0.00001)
        assert receptor.lon == pytest.approx(original["lon"], abs=0.00001)
        assert props["province"] == receptor.province
    # The remote same-name polygon must not be promoted to a Laguna municipality.
    assert not any(
        f["properties"]["name"] == "City of Calamba, Laguna" and f["properties"]["center_lat"] < 12
        for f in features
    )
