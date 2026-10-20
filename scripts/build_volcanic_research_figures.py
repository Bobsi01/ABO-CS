"""Plot archived volcanic observations and source-map digitizations."""

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


def main():
    plt.rcParams.update({"font.family": "Times New Roman", "font.size": 8})
    wind_path = ROOT / "data/source/igra/tanay-effective-wind.json"
    wind = json.loads(wind_path.read_text(encoding="utf-8"))
    figure, axes = plt.subplots(1, 2, figsize=(3.1, 2.75), sharey=True, layout="constrained")
    styles = (("#154e83", "o", "-"), ("#ad4b12", "s", "--"))
    for profile, (color, marker, line) in zip(wind["profiles"], styles, strict=True):
        heights = [h / 1000 for h in profile["height_geopotential_m_asl"]]
        launch = profile["release_hhmm"]
        for axis, component in zip(axes, ("east", "north"), strict=True):
            axis.plot(
                profile[f"wind_{component}_m_s"],
                heights,
                color=color,
                marker=marker,
                linestyle=line,
                markersize=3,
                linewidth=1,
                label=f"{launch[:2]}:{launch[2:]} UTC",
            )
            axis.axhspan(17, 21, color="#eeeeee", zorder=-1)
            axis.set_ylim(1, 21)
            axis.set_yticks((2, 6, 10, 14, 18, 21))
            axis.set_xlabel(f"{component.capitalize()} (m/s)")
            axis.tick_params(labelsize=7)
            axis.grid(axis="y", alpha=0.2)
    axes[0].set_ylabel("Geopotential height (km ASL)")
    axes[1].legend(loc="lower right", fontsize=6, handlelength=1.4)
    wind_figure = OUTPUT / "volcanic-wind-evidence.png"
    figure.savefig(wind_figure, dpi=300)
    plt.close(figure)

    traces = (
        ROOT / "data/source/taal-study/trace-science.geojson",
        ROOT / "data/source/taal-study/trace-qa.geojson",
    )
    figure, axis = plt.subplots(figsize=(3.1, 3), layout="constrained")
    for trace_path, label, style in zip(traces, ("Trace A", "Trace B"), styles, strict=True):
        trace = json.loads(trace_path.read_text(encoding="utf-8"))
        ring = trace["geometry"]["coordinates"][0]
        axis.plot(
            [p[0] for p in ring],
            [p[1] for p in ring],
            color=style[0],
            linestyle=style[2],
            linewidth=1,
            label=label,
        )
    axis.plot(120.9975, 14.0106, "^", color="#242424", markersize=4, label="Catalog reference")
    axis.set_xlabel("Longitude (degrees east)")
    axis.set_ylabel("Latitude (degrees north)")
    axis.set_aspect(1 / math.cos(math.radians(14.5)))
    axis.tick_params(labelsize=7)
    axis.grid(alpha=0.2)
    axis.legend(fontsize=6.5, loc="upper left", handlelength=1.5)
    contour_figure = OUTPUT / "volcanic-contour-evidence.png"
    figure.savefig(contour_figure, dpi=300)
    plt.close(figure)

    record = {
        "matplotlib_version": matplotlib.__version__,
        "font_family": "Times New Roman",
        "scope": (
            "Archived wind observations and digitizations of one published contour; "
            "no scenario outputs"
        ),
        "wind_limit": (
            "Nine retained levels per launch; no extrapolation into the 17-21 km shaded layer"
        ),
        "contour_source": (
            "Balangue-Tarriela et al. (2022), Figure 4a, doi:10.1007/s00445-022-01534-y, CC BY 4.0"
        ),
        "contour_limit": (
            "Two digitizations share one source figure and are not independent field observations"
        ),
        "reference_location": (
            "GVP catalog reference [120.9975 E, 14.0106 N]; not a surveyed 2020 vent"
        ),
        "input_sha256": {
            str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in (wind_path, *traces)
        },
        "output_sha256": {
            str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in (wind_figure, contour_figure)
        },
    }
    (OUTPUT / "volcanic-evidence-figures.json").write_bytes(
        (json.dumps(record, indent=2) + "\n").encode("utf-8")
    )
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
