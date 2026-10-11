"""Independent synthetic expectations for the gap-closure contract boundaries."""

import math

import numpy as np
import pytest
from pydantic import ValidationError

from abo_api import evidence, kernel, service
from abo_api.contracts import Criterion, Observation, Receptor, Scenario, SimulationRequest


def synthetic_scenario(**overrides):
    values = {
        "vent_lat": 0,
        "vent_lon": 0,
        "vent_elevation_m": 0,
        "column_height_m": 1000,
        "mass_rate_kg_s": 100000,
        "duration_s": 100,
        "wind_speed_m_s": 0,
        "wind_from_deg": 0,
        "diffusivity_m2_s": 0,
        "initial_spread_m": 1000,
        "bulk_density_kg_m3": 1000,
        "grains": [
            {"diameter_um": 10, "fraction": 0.5, "settling_speed_m_s": 1},
            {"diameter_um": 20, "fraction": 0.3, "settling_speed_m_s": 2},
            {"diameter_um": 40, "fraction": 0.2, "settling_speed_m_s": 4},
        ],
        "release_layers": 1,
        "domain_km": 4,
        "cell_km": 1,
    }
    values.update(overrides)
    return values


def test_interval_and_midpoint_errors_are_different_descriptive_quantities():
    # Scalar residuals: interval[-1,0,0,2], midpoint[-1.5,0,0,3].
    result = kernel.observation_metrics(
        np.array([0.0, 1.0, 4.0, 10.0]),
        np.array([1.0, 0.0, 3.0, 6.0]),
        np.array([2.0, 2.0, 5.0, 8.0]),
    )
    assert result["interval_rmse_mm"] == pytest.approx(math.sqrt(5 / 4))
    assert result["rmse_mm"] == result["interval_rmse_mm"]
    assert result["interval_mae_mm"] == 0.75
    assert result["midpoint_rmse_mm"] == pytest.approx(math.sqrt(11.25 / 4))
    assert result["midpoint_mae_mm"] == 1.125
    assert result["range_coverage_fraction"] == 0.5
    assert result["zero_prediction_positive_observations"] == 1
    assert result["median_factor_error"] is None


def test_interval_equality_is_covered_without_false_positive_error():
    result = kernel.observation_metrics(
        np.array([2.0, 4.0]), np.array([2.0, 2.0]), np.array([4.0, 4.0])
    )
    assert result["interval_rmse_mm"] == 0
    assert result["midpoint_rmse_mm"] == 1
    assert result["range_coverage_fraction"] == 1


def observation(**changes):
    values = {
        "lat": 14,
        "lon": 121,
        "lower_mm": 1,
        "upper_mm": 2,
        "split": "calibration",
        "spatial_group": "a",
        "dependency_group": "independent-a",
    }
    values.update(changes)
    return Observation(**values)


@pytest.mark.parametrize("shared", ["location", "spatial", "dependency"])
def test_split_rejects_each_independent_leakage_path(shared):
    a = observation()
    b = observation(
        lat=15,
        lon=122,
        spatial_group="b",
        dependency_group="independent-b",
        split="evaluation",
    )
    if shared == "location":
        b.lat, b.lon = a.lat, a.lon
    elif shared == "spatial":
        b.spatial_group = a.spatial_group
    else:
        b.dependency_group = a.dependency_group
    with pytest.raises(ValueError, match="leakage"):
        evidence.check_split_independence([a, b])


def test_duplicate_locations_within_one_partition_are_a_valid_counterexample():
    assert evidence.check_split_independence([observation(), observation(id="duplicate")])


def test_group_split_does_not_split_duplicate_group_occurrences():
    groups = [f"group-{index:02d}" for index in range(10)]
    result = evidence.spatial_group_split([*groups, groups[0], groups[0]])
    assert len(result) == 10
    assert list(result.values()).count("calibration") == 7
    assert list(result.values()).count("evaluation") == 3
    assert result == evidence.spatial_group_split(reversed(groups))


def wind_profile(directions, speeds, heights=None):
    heights = heights or [1000, 21000]
    return {
        "station_id": "synthetic",
        "date": "2020-01-12",
        "nominal_hour_utc": 12,
        "release_hhmm": "1140",
        "lat": 0,
        "lon": 0,
        "levels": [
            {
                "height_geopotential_m_asl": height,
                "height_processing_flag": " ",
                "wind_from_deg": direction,
                "wind_speed_tenths_m_s": speed,
            }
            for height, direction, speed in zip(heights, directions, speeds, strict=True)
        ],
    }


def test_wind_bearing_wrap_uses_vector_average():
    result = evidence.effective_wind([wind_profile([359, 1], [100, 100])])
    assert result["available"]
    assert result["speed_m_s"] == pytest.approx(10 * math.cos(math.radians(1)))
    assert result["from_deg"] == pytest.approx(0, abs=1e-10)


def test_opposite_equal_winds_are_calm_without_invented_bearing():
    result = evidence.effective_wind([wind_profile([90, 270], [100, 100])])
    assert result["speed_m_s"] < 0.1
    assert result["from_deg"] is None


def test_height_coverage_is_not_filled_by_vertical_extrapolation():
    result = evidence.effective_wind([wind_profile([0, 0], [100, 100], [2000, 16000])])
    assert not result["available"]
    assert result["profiles"][0]["height_grid_coverage_fraction"] == 15 / 21


def test_duplicate_height_vectors_are_consolidated_before_height_grid_average():
    result = evidence.effective_wind(
        [wind_profile([0, 180, 0], [100, 100, 100], [1000, 1000, 21000])]
    )
    assert result["available"]
    assert result["wind_north_m_s"] == pytest.approx(-5)
    assert result["speed_m_s"] == pytest.approx(5)


def criterion(**changes):
    values = {
        "id": "synthetic-roof",
        "label": "Synthetic QA threshold",
        "quantity": "load_kg_m2",
        "threshold": 1,
        "scope": "Synthetic test only",
        "source_ids": ["assumptions"],
        "review_status": "reviewed",
        "receptor_kinds": ["municipality"],
        "required_conditions": {"roof": "synthetic-flat", "moisture": "dry"},
        "applicability_basis": "Synthetic test fixture; not a curated criterion",
    }
    values.update(changes)
    return Criterion(**values)


@pytest.mark.parametrize("kind", ["airport", "water"])
def test_matching_conditions_do_not_override_wrong_receptor_type(kind):
    receptor = Receptor(id="synthetic", name="Synthetic", lat=0, lon=0, kind=kind)
    allowed, reason = service.criterion_applicability(
        criterion(), receptor, {"roof": "synthetic-flat", "moisture": "dry"}
    )
    assert not allowed
    assert "type" in reason


@pytest.mark.parametrize("context", [{}, {"roof": "synthetic-flat"}, {"roof": "other"}])
def test_missing_or_mismatched_conditions_are_unknown(context):
    receptor = Receptor(id="synthetic", name="Synthetic", lat=0, lon=0)
    assert not service.criterion_applicability(criterion(), receptor, context)[0]


def test_receptor_specific_conditions_override_global_selection():
    receptor = Receptor(
        id="synthetic",
        name="Synthetic",
        lat=0,
        lon=0,
        screening_conditions={"moisture": "wet"},
    )
    allowed, reason = service.criterion_applicability(
        criterion(), receptor, {"roof": "synthetic-flat", "moisture": "dry"}
    )
    assert not allowed
    assert "moisture" in reason


def test_threshold_equality_counts_only_applicable_municipality():
    result = kernel.exposure(
        np.array([1.0, 1.0, 1.0]),
        1000,
        np.array([True, True, True]),
        np.array([True, True, False]),
        np.array([12, 30, 50]),
        np.array([1.0]),
        np.array([0]),
        np.array([[True, False, True]]),
    )
    assert result["criterion_counts"].tolist() == [1]
    assert result["criterion_population"].tolist() == [12]
    assert result["exceeded"].tolist() == [[True, False, True]]


def test_year_selection_preserves_missing_historical_population(monkeypatch):
    catalog = service.catalog().model_copy(deep=True)
    catalog.receptors = [
        Receptor(
            id="synthetic",
            name="Synthetic",
            lat=0,
            lon=0,
            population=55,
            population_year=2024,
            population_records={"2024": 55, "2020": None},
        )
    ]
    monkeypatch.setattr(service, "catalog", lambda: catalog)
    result = service.simulate(
        SimulationRequest(scenario=synthetic_scenario(), population_year=2020)
    )
    assert result.receptors[0].population is None
    assert result.receptors[0].population_year == 2020
    assert result.summary.indicative_population == 0
    assert result.summary.reported_population_unknown == 1


def test_population_record_values_cannot_bypass_population_validation():
    with pytest.raises(ValidationError):
        Receptor(id="synthetic", name="Synthetic", lat=0, lon=0, population_records={"2020": -1})


def test_simulation_excludes_inapplicable_thresholds_from_population_counts(monkeypatch):
    catalog = service.catalog().model_copy(deep=True)
    catalog.criteria = [criterion(threshold=0)]
    monkeypatch.setattr(service, "catalog", lambda: catalog)
    receptors = [
        Receptor(id="match", name="Match", lat=0, lon=0, population=12, population_year=2024),
        Receptor(
            id="wet",
            name="Wet",
            lat=0,
            lon=0,
            population=30,
            population_year=2024,
            screening_conditions={"moisture": "wet"},
        ),
        Receptor(id="airport", name="Airport", lat=0, lon=0, kind="airport"),
        Receptor(id="outside", name="Outside", lat=1, lon=1, population=50, population_year=2024),
    ]
    result = service.simulate(
        SimulationRequest(
            scenario=synthetic_scenario(),
            receptors=receptors,
            screening_context={"roof": "synthetic-flat", "moisture": "dry"},
        )
    )
    assert [r.screening["synthetic-roof"] for r in result.receptors] == [
        "exceeded",
        "unknown",
        "unknown",
        "unknown",
    ]
    assert result.summary.criterion_counts["synthetic-roof"] == 1
    assert result.summary.criterion_population["synthetic-roof"] == 12
    assert "moisture" in result.receptors[1].screening_reasons["synthetic-roof"]
    assert "type" in result.receptors[2].screening_reasons["synthetic-roof"]
    assert "outside" in result.receptors[3].screening_reasons["synthetic-roof"].lower()


def test_caller_review_flag_cannot_promote_an_unregistered_criterion():
    result = service.simulate(
        SimulationRequest(
            scenario=synthetic_scenario(),
            criteria=[criterion(threshold=0)],
            receptors=[Receptor(id="point", name="Point", lat=0, lon=0)],
            screening_context={"roof": "synthetic-flat", "moisture": "dry"},
        )
    )
    assert result.receptors[0].screening["synthetic-roof"] == "unknown"
    assert result.summary.criterion_counts == {}


def test_historical_spatial_residuals_exclude_outside_points_and_use_2020(monkeypatch):
    catalog = service.catalog().model_copy(deep=True)
    catalog.receptors = [
        Receptor(
            id="synthetic",
            name="Synthetic",
            lat=0,
            lon=0,
            population=55,
            population_year=2024,
            population_records={"2024": 55, "2020": 40},
        )
    ]
    catalog.historical.available = True
    catalog.historical.scenario = Scenario.model_validate(synthetic_scenario())
    catalog.historical.reference_footprint_geojson = None
    catalog.historical.observations = [
        observation(id="inside", lat=0, lon=0, split="evaluation", lower_mm=2, upper_mm=3),
        observation(id="outside", lat=1, lon=1, split="evaluation", lower_mm=5, upper_mm=6),
    ]
    monkeypatch.setattr(service, "catalog", lambda: catalog)
    result = service.replication()
    expected = 10_000_000 / (2 * math.pi * 1_000**2)
    assert result.available
    assert result.validation_status == "evaluated_not_validated"
    assert result.simulation.receptors[0].population == 40
    assert result.simulation.receptors[0].population_year == 2020
    inside, outside = result.observation_results
    assert inside.predicted_mm == pytest.approx(expected)
    assert inside.interval_residual_mm == pytest.approx(expected - 2)
    assert inside.midpoint_residual_mm == pytest.approx(expected - 2.5)
    assert outside.predicted_mm is None
    assert outside.interval_residual_mm is None
    assert not outside.in_domain
    assert result.metrics["evaluation_observations_covered"] == 1
    assert result.metrics["evaluation_observations_outside_domain"] == 1
    assert result.metrics["interval_rmse_mm"] == pytest.approx(2 - expected)
