"""Independent scalar release-height integral, numerical evidence only."""

import json
import math
from pathlib import Path

from scipy.integrate import quad

from abo_api import service


def point_reference(scenario, east, north):
    total = 0.0
    error = 0.0
    angle = math.radians(scenario.wind_from_deg)
    ue = -scenario.wind_speed_m_s * math.sin(angle)
    un = -scenario.wind_speed_m_s * math.cos(angle)
    for grain in scenario.grains:

        def density(height, grain=grain):
            fall = height / grain.settling_speed_m_s
            variance = scenario.initial_spread_m**2 + 2 * scenario.diffusivity_m2_s * fall
            radius2 = (east - ue * fall) ** 2 + (north - un * fall) ** 2
            return math.exp(-radius2 / (2 * variance)) / (2 * math.pi * variance)

        integral, uncertainty = quad(
            density,
            0,
            scenario.column_height_m,
            epsabs=1e-18,
            epsrel=1e-10,
            limit=500,
            points=[scenario.column_height_m * i / 64 for i in range(1, 64)],
        )
        scale = (
            scenario.mass_rate_kg_s
            * scenario.duration_s
            * grain.fraction
            / scenario.column_height_m
        )
        total += integral * scale
        error += uncertainty * scale
    factor = 1000 / scenario.bulk_density_kg_m3
    return total * factor, error * factor


def main():
    data = service.catalog()
    example = next(p.scenario for p in data.scenarios if p.scenario.volcano_id == "mayon")
    east = north = 50000 / math.sqrt(2)
    reference, error = point_reference(example, east, north)
    midpoint = []
    from abo_api import kernel

    for count in [8, 16, 32, 64, 128, 256, 512]:
        times, weights, variance = kernel.components(
            example.column_height_m,
            example.mass_rate_kg_s * example.duration_s,
            __import__("numpy").asarray([g.fraction for g in example.grains]),
            __import__("numpy").asarray([g.settling_speed_m_s for g in example.grains]),
            count,
            example.diffusivity_m2_s,
            example.initial_spread_m,
        )
        ue, un = kernel.wind_components(example.wind_speed_m_s, example.wind_from_deg)
        load = kernel.point_load(
            __import__("numpy").asarray([east]),
            __import__("numpy").asarray([north]),
            times,
            weights,
            variance,
            ue,
            un,
        )[0, 0]
        mm = float(load * 1000 / example.bulk_density_kg_m3)
        midpoint.append(
            dict(
                layers=count,
                thickness_mm=mm,
                relative_reference_error=abs(mm - reference) / reference,
            )
        )
    result = dict(
        label="Numerical quadrature only; no historical accuracy claim",
        scenario=example.model_dump(),
        receptor_east_m=east,
        receptor_north_m=north,
        adaptive_reference_mm=reference,
        integration_error_estimate_mm=error,
        midpoint=midpoint,
    )
    target = Path(__file__).with_name("convergence_probe.json")
    target.write_text(json.dumps(result, indent=2), encoding="utf-8", newline="\n")
    print(json.dumps({k: v for k, v in result.items() if k != "scenario"}, indent=2))


if __name__ == "__main__":
    main()
