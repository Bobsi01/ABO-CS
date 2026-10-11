"""Independent fixed-column NOAA audit using Python scalars, not ABO parsers.

The height and launch processing are frozen by taal-main-plume-2020-v1.
Read only scientific source records; write only this evaluator's JSON evidence.
"""

import bisect
import hashlib
import json
import math
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data/source/igra"
OUTPUT = ROOT / "qa/gap_closure/independent-igra.json"


def parse_profiles(text):
    rows = text.splitlines()
    result = []
    position = 0
    while position < len(rows):
        header = rows[position]
        assert header.startswith("#"), f"Missing header at line {position + 1}"
        count = int(header[32:36])
        levels = rows[position + 1 : position + 1 + count]
        assert len(levels) == count
        result.append((header, levels))
        position += count + 1
    return result


def linear(height, points):
    heights = [row[0] for row in points]
    insertion = bisect.bisect_left(heights, height)
    if insertion < len(points) and heights[insertion] == height:
        return points[insertion][1], points[insertion][2]
    assert 0 < insertion < len(points)
    lower, upper = points[insertion - 1], points[insertion]
    fraction = (height - lower[0]) / (upper[0] - lower[0])
    return tuple(lower[axis] + fraction * (upper[axis] - lower[axis]) for axis in (1, 2))


def profile(header, raw):
    flags = Counter()
    rejected = Counter()
    by_height = {}
    for row in raw:
        height = int(row[16:21])
        flag = row[21]
        direction = int(row[40:45])
        tenths_speed = int(row[46:51])
        flags[flag or "blank"] += 1
        if height in (-8888, -9999):
            rejected["height_missing_or_removed"] += 1
        elif not 1000 <= height <= 21000:
            rejected["height_outside_frozen_band"] += 1
        elif flag not in (" ", "A", "B"):
            rejected["undocumented_height_flag"] += 1
        elif direction in (-8888, -9999) or tenths_speed in (-8888, -9999):
            rejected["wind_missing_or_removed"] += 1
        elif not 0 <= direction <= 360 or tenths_speed < 0:
            rejected["invalid_wind_range"] += 1
        else:
            angle = math.radians(direction)
            speed = tenths_speed / 10
            by_height.setdefault(height, []).append(
                (-speed * math.sin(angle), -speed * math.cos(angle))
            )
    points = [
        (
            height,
            math.fsum(v[0] for v in vectors) / len(vectors),
            math.fsum(v[1] for v in vectors) / len(vectors),
        )
        for height, vectors in sorted(by_height.items())
    ]
    grid = [
        height
        for height in range(1000, 21001, 1000)
        if points and points[0][0] <= height <= points[-1][0]
    ]
    vectors = [linear(height, points) for height in grid]
    east = math.fsum(v[0] for v in vectors) / len(vectors) if vectors else None
    north = math.fsum(v[1] for v in vectors) / len(vectors) if vectors else None
    speed = math.hypot(east, north) if vectors else None
    bearing = math.degrees(math.atan2(-east, -north)) % 360 if speed and speed >= 0.1 else None
    return {
        "header": header,
        "nominal_date": header[13:23].replace(" ", "-"),
        "nominal_hour_utc": int(header[24:26]),
        "raw_release_hhmm_utc": header[27:31],
        "raw_levels": len(raw),
        "gph_processing_flags": dict(flags),
        "rejections": dict(rejected),
        "accepted_unique_heights_m": [p[0] for p in points],
        "covered_grid_heights_m": grid,
        "height_grid_coverage": len(grid) / 21,
        "passes_frozen_coverage_gate": len(points) >= 2 and len(grid) / 21 >= 0.75,
        "east_m_s": east,
        "north_m_s": north,
        "speed_m_s": speed,
        "from_deg": bearing,
    }


def main():
    selected_path = SOURCE / "tanay-2020-01-12-13.txt"
    selected_text = selected_path.read_text(encoding="utf-8")
    parsed = parse_profiles(selected_text)
    with zipfile.ZipFile(SOURCE / "RPM00098433-data.txt.zip") as archive:
        assert len(archive.namelist()) == 1
        full_text = archive.read(archive.namelist()[0]).decode("ascii")
    assert all("\n".join([header, *rows]) in full_text for header, rows in parsed)
    selected = [
        profile(header, rows)
        for header, rows in parsed
        if header[13:23] == "2020 01 12" and int(header[24:26]) in (0, 12)
    ]
    assert len(selected) == 2
    admitted = [row for row in selected if row["passes_frozen_coverage_gate"]]
    east = math.fsum(row["east_m_s"] for row in admitted) / len(admitted) if admitted else None
    north = math.fsum(row["north_m_s"] for row in admitted) / len(admitted) if admitted else None
    speed = math.hypot(east, north) if admitted else None
    bearing = math.degrees(math.atan2(-east, -north)) % 360 if speed and speed >= 0.1 else None
    evidence = {
        "protocol_id": "taal-main-plume-2020-v1",
        "independent_scalar_processing": True,
        "selected_records_verified_against_full_archive": len(parsed),
        "source_sha256": {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest()
            for path in (
                selected_path,
                SOURCE / "RPM00098433-data.txt.zip",
                SOURCE / "igra2-data-format.txt",
                SOURCE / "igra2-station-list.txt",
            )
        },
        "target_profiles": selected,
        "accepted_launch_count": len(admitted),
        "effective_east_m_s": east,
        "effective_north_m_s": north,
        "effective_speed_m_s": speed,
        "effective_from_deg": bearing,
        "limit": (
            "Scalar reconstruction verifies archive extraction and frozen arithmetic, "
            "not plume representativeness, instrument truth or historical model agreement."
        ),
    }
    OUTPUT.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()
