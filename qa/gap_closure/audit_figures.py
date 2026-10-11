"""Independently compare manuscript figure evidence with the actual NumPy engine."""

import hashlib
import json
import math
from pathlib import Path

import numpy as np

from abo_api import kernel
from abo_api.contracts import Scenario

ROOT = Path(__file__).resolve().parents[2]


def quantities(scenario, east, north):
    s = Scenario.model_validate(scenario)
    time, weight, variance = kernel.components(
        s.column_height_m,
        s.mass_rate_kg_s * s.duration_s,
        np.array([g.fraction for g in s.grains]),
        np.array([g.settling_speed_m_s for g in s.grains]),
        s.release_layers,
        s.diffusivity_m2_s,
        s.initial_spread_m,
    )
    ue, un = kernel.wind_components(s.wind_speed_m_s, s.wind_from_deg)
    point = kernel.point_load(np.array([east]), np.array([north]), time, weight, variance, ue, un)
    _, grid, retained = kernel.grid_load(
        s.domain_km * 1000, s.cell_km * 1000, time, weight, variance, ue, un
    )
    return {
        "point_thickness_mm": float(point[0, 0] * 1000 / s.bulk_density_kg_m3),
        "inside_mass_kg": retained,
        "outside_mass_kg": s.mass_rate_kg_s * s.duration_s - retained,
        "cells": int(grid.shape[0]),
    }


def main():
    figure_path = ROOT / "docs/figures/figure-evidence.json"
    figure = json.loads(figure_path.read_text())
    request_path = ROOT / "data/examples/mayon-eruption-request.json"
    scenario = json.loads(request_path.read_text())["simulation"]["scenario"]
    assert hashlib.sha256(request_path.read_bytes()).hexdigest() == figure["request_sha256"]
    east, north = figure["receptor_east_north_m"]
    assert math.isclose(math.hypot(east, north), 50000, rel_tol=1e-14)
    records = []
    for expected in figure["records"]:
        changed = {
            **scenario,
            expected["parameter"]: scenario[expected["parameter"]] * expected["factor"],
        }
        actual = quantities(changed, east, north)
        difference = actual["point_thickness_mm"] - expected["thickness_mm"]
        assert math.isclose(actual["point_thickness_mm"], expected["thickness_mm"], rel_tol=1e-12)
        records.append({**expected, "kernel_difference_mm": difference})
    release = [
        {
            "release_layers": layers,
            **quantities({**scenario, "release_layers": layers}, east, north),
        }
        for layers in (8, 16, 32)
    ]
    resolution = [
        {"cell_km": cell, **quantities({**scenario, "cell_km": cell}, east, north)}
        for cell in (0.5, 1, 2)
    ]
    assert all(
        math.isclose(row["inside_mass_kg"], resolution[1]["inside_mass_kg"], rel_tol=1e-12)
        for row in resolution
    )
    result = {
        "figure_evidence_sha256": hashlib.sha256(figure_path.read_bytes()).hexdigest(),
        "request_sha256": figure["request_sha256"],
        "ten_scalar_figure_values_against_actual_kernel": records,
        "release_layer_sensitivity": release,
        "cell_resolution_sensitivity": resolution,
        "limit": (
            "Fixed synthetic teaching input perturbations; no confidence interval, "
            "historical comparison or physical uncertainty validation."
        ),
    }
    output = ROOT / "qa/gap_closure/independent-figures.json"
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
