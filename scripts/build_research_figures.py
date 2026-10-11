"""Plot archived wind evidence and an explicitly synthetic sensitivity example."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "figures"


def point_thickness(scenario, east, north):
    """Independent scalar equation 4; this is not a historical fit."""
    bearing = math.radians(scenario["wind_from_deg"])
    speed = scenario["wind_speed_m_s"]
    mass = scenario["mass_rate_kg_s"] * scenario["duration_s"]
    total = 0.0
    for grain in scenario["grains"]:
        for layer in range(scenario["release_layers"]):
            height = scenario["column_height_m"] * (layer + 0.5) / scenario["release_layers"]
            fall = height / grain["settling_speed_m_s"]
            spread = scenario["initial_spread_m"] ** 2 + 2 * scenario["diffusivity_m2_s"] * fall
            dx = east + speed * math.sin(bearing) * fall
            dy = north + speed * math.cos(bearing) * fall
            total += (
                mass
                * grain["fraction"]
                / scenario["release_layers"]
                / (2 * math.pi * spread)
                * math.exp(-(dx * dx + dy * dy) / (2 * spread))
            )
    return 1000 * total / scenario["bulk_density_kg_m3"]


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.family": "Arial", "font.size": 11})
    wind_path = ROOT / "data/source/igra/tanay-effective-wind.json"
    wind = json.loads(wind_path.read_text(encoding="utf-8"))
    figure, axes = plt.subplots(1, 2, figsize=(6.27, 3.7), sharey=True, layout="constrained")
    styles = (("#154e83", "o", "-"), ("#ad4b12", "s", "--"))
    for profile, (color, marker, line) in zip(wind["profiles"], styles, strict=True):
        height = [value / 1000 for value in profile["height_geopotential_m_asl"]]
        label = f"{profile['release_hhmm'][:2]}:{profile['release_hhmm'][2:]} UTC"
        for axis, component in zip(axes, ("east", "north"), strict=True):
            axis.plot(
                profile[f"wind_{component}_m_s"],
                height,
                color=color,
                marker=marker,
                linestyle=line,
                label=label,
                markersize=4,
            )
            axis.set_xlabel(f"{component.capitalize()} wind (m/s)")
            axis.set_ylim(1, 21)
            axis.axhspan(17, 21, color="#efefef", zorder=-1)
            axis.grid(axis="y", alpha=0.25)
    axes[0].set_ylabel("Geopotential height (km ASL)")
    axes[1].legend(loc="lower right", fontsize=9)
    figure.savefig(OUTPUT / "taal-wind-coverage.png", dpi=200)
    plt.close(figure)

    request_path = ROOT / "data/examples/mayon-eruption-request.json"
    request = json.loads(request_path.read_text(encoding="utf-8"))
    scenario = request["simulation"]["scenario"]
    # A fixed geographic test point 50 km northeast of the vent, in model metres.
    east = north = 50000 / math.sqrt(2)
    factors = (0.8, 0.9, 1, 1.1, 1.2)
    baseline = point_thickness(scenario, east, north)
    records = []
    figure, axis = plt.subplots(figsize=(6.27, 3.5), layout="constrained")
    parameters = (
        ("wind_speed_m_s", "Wind speed", "#154e83", "o"),
        ("column_height_m", "Column height", "#ad4b12", "s"),
    )
    for parameter, label, color, marker in parameters:
        values = []
        for factor in factors:
            changed = dict(scenario)
            changed[parameter] *= factor
            value = point_thickness(changed, east, north)
            values.append(value)
            records.append({"parameter": parameter, "factor": factor, "thickness_mm": value})
        axis.plot([100 * f for f in factors], values, label=label, color=color, marker=marker)
    axis.set_xlabel("Percentage of the teaching input (%)")
    axis.set_ylabel("Point thickness (mm)")
    axis.grid(axis="y", alpha=0.25)
    axis.legend()
    figure.savefig(OUTPUT / "teaching-sensitivity.png", dpi=200)
    plt.close(figure)
    trace_paths = (
        ROOT / "data/source/taal-study/trace-science.geojson",
        ROOT / "data/source/taal-study/trace-qa.geojson",
    )
    figure, axis = plt.subplots(figsize=(6.27, 4.1), layout="constrained")
    for trace_path, label, style in zip(
        trace_paths,
        ("Scientific digitizer", "Independent QA digitizer"),
        (("#154e83", "-"), ("#ad4b12", "--")),
        strict=True,
    ):
        trace = json.loads(trace_path.read_text(encoding="utf-8"))
        ring = trace["geometry"]["coordinates"][0]
        axis.plot(
            [point[0] for point in ring],
            [point[1] for point in ring],
            color=style[0],
            linestyle=style[1],
            label=label,
        )
    axis.plot(120.9975, 14.0106, "^", color="#242424", label="Taal model vent")
    axis.set_xlabel("Longitude (degrees east)")
    axis.set_ylabel("Latitude (degrees north)")
    axis.set_aspect(1 / math.cos(math.radians(14.5)))
    axis.grid(alpha=0.2)
    axis.legend(fontsize=9)
    figure.savefig(OUTPUT / "taal-contour-traces.png", dpi=200)
    plt.close(figure)
    evidence = {
        "wind_input_sha256": hashlib.sha256(wind_path.read_bytes()).hexdigest(),
        "request_sha256": hashlib.sha256(request_path.read_bytes()).hexdigest(),
        "wind": (
            "Actual Jan 12 Tanay levels; insufficient frozen altitude coverage; no effective wind"
        ),
        "sensitivity": (
            "Synthetic Mayon teaching example, independent scalar equation, no fitted parameters"
        ),
        "uncertainty": (
            "80-120% is a teaching perturbation, not a source-supported confidence interval"
        ),
        "receptor_east_north_m": [east, north],
        "baseline_thickness_mm": baseline,
        "records": records,
        "contours": (
            "Two independent traces of one published 0.5 mm contour; "
            "source repeatability, not model agreement"
        ),
        "trace_input_sha256": {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in trace_paths
        },
        "figure_sha256": {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in OUTPUT.glob("*.png")
        },
    }
    (OUTPUT / "figure-evidence.json").write_text(
        json.dumps(evidence, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()
