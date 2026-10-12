"""Sweep coverage and independent scalar expectations across bearing batches."""

import math

import numpy as np
import pytest

from abo_api import kernel, service
from abo_api.contracts import SimulationRequest


@pytest.mark.parametrize("preset_index", [0, 1, 2])
def test_bundled_presets_sweep_full_catalog(preset_index):
    data = service.catalog()
    result = service.sweep(SimulationRequest(scenario=data.scenarios[preset_index].scenario))
    assert len(result.receptors) == len(data.receptors)
    assert any(r.in_domain for r in result.receptors)
    for receptor in result.receptors:
        if receptor.in_domain:
            assert math.isfinite(receptor.maximum_load_kg_m2)
            assert receptor.maximum_load_kg_m2 >= 0
            assert 0 <= receptor.wind_from_deg < 360
        else:
            assert receptor.maximum_load_kg_m2 is None
            assert receptor.wind_from_deg is None


def test_sweep_matches_scalar_oracle_at_batch_edges_and_vent():
    angles = np.asarray([0, 15, 16, 31, 32, 270, 359])
    east = np.r_[0, -100 * np.sin(np.deg2rad(angles))]
    north = np.r_[0, -100 * np.cos(np.deg2rad(angles))]
    times = np.asarray([10.0, 20.0])
    weights = np.asarray([10000.0, 20000.0])
    variance = np.asarray([400.0, 900.0])
    maxima, bearings = kernel.sweep_maxima(east, north, times, weights, variance, 10)
    for index, (x, y) in enumerate(zip(east, north, strict=True)):
        loads = []
        for bearing in range(360):
            radians = math.radians(bearing)
            along = -math.sin(radians) * x - math.cos(radians) * y
            across = math.cos(radians) * x - math.sin(radians) * y
            loads.append(
                sum(
                    mass
                    / (2 * math.pi * var)
                    * math.exp(-((along - 10 * t) ** 2 + across**2) / (2 * var))
                    for t, mass, var in zip(times, weights, variance, strict=True)
                )
            )
        assert maxima[index] == pytest.approx(max(loads), rel=1e-12)
        assert bearings[index] == loads.index(max(loads))
    assert bearings[0] == 0
    assert bearings[1:] == pytest.approx(angles)
    zero, ties = kernel.sweep_maxima(east, north, times, weights * 0, variance, 10)
    assert np.array_equal(zero, np.zeros(east.size))
    assert np.array_equal(ties, np.zeros(east.size))


def test_largest_contract_sweep_fits_retained_budget():
    estimate = kernel.check_budget(160, 400, 2048, kernel.SWEEP_DIRECTION_BATCH)
    assert estimate < kernel.MEMORY_LIMIT_BYTES
    with pytest.raises(ValueError, match="512 MiB"):
        kernel.check_budget(160, 400, 2048, 360)
