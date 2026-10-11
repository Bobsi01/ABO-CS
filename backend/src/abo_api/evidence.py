"""Auditable evidence transforms, separate from the deposition kernel."""

from datetime import UTC, datetime

import numpy as np

from abo_api.kernel import wind_components


def parse_igra(text):
    """Parse archived IGRA 2.2 records; retain source and processing flags."""
    profiles = []
    for line in text.splitlines():
        if line.startswith("#"):
            current = {
                "station_id": line[1:12],
                "date": f"{line[13:17]}-{line[18:20]}-{line[21:23]}",
                "nominal_hour_utc": int(line[24:26]),
                "release_hhmm": line[27:31],
                "declared_levels": int(line[32:36]),
                "pressure_source": line[37:45].strip(),
                "nonpressure_source": line[46:54].strip(),
                "lat": int(line[55:62]) / 10000,
                "lon": int(line[63:71]) / 10000,
                "levels": [],
            }
            profiles.append(current)
        elif line.strip():
            if not profiles or len(line) < 51:
                raise ValueError("Malformed IGRA level or level without a header")
            current["levels"].append(
                {
                    "height_geopotential_m_asl": int(line[16:21]),
                    "height_processing_flag": line[21:22],
                    "wind_from_deg": int(line[40:45]),
                    "wind_speed_tenths_m_s": int(line[46:51]),
                }
            )
    if any(len(p["levels"]) != p["declared_levels"] for p in profiles):
        raise ValueError("IGRA declared level count does not match the archived records")
    return profiles


def launch_time(profile):
    """Preserve source date; a nominal-00 launch at 23:xx belongs to the previous day."""
    release = profile["release_hhmm"]
    hour, minute = int(release[:2]), int(release[2:])
    nominal = profile["nominal_hour_utc"]
    date = datetime.fromisoformat(profile["date"]).replace(tzinfo=UTC)
    if hour == 99:
        if nominal == 99:
            return None, "release and nominal hour unavailable"
        return date.replace(
            hour=nominal
        ).isoformat(), "nominal fallback; actual release unavailable"
    if hour > 23 or minute not in range(60) and minute != 99:
        raise ValueError("Invalid IGRA release time")
    date = date.replace(hour=hour, minute=0 if minute == 99 else minute)
    # IGRA source dates are synoptic dates. Only this documented crossing is adjusted.
    if nominal == 0 and hour >= 18:
        from datetime import timedelta

        date -= timedelta(days=1)
    return date.isoformat(), "hour only; minute unavailable" if minute == 99 else "actual release"


def effective_wind(profiles):
    """Frozen v1: equal launch means of height-grid vectors, no extrapolation."""
    target = np.arange(1000, 21001, 1000, dtype=float)
    records, means = [], []
    for profile in profiles:
        levels = profile["levels"]
        height = np.asarray([r["height_geopotential_m_asl"] for r in levels], dtype=float)
        direction = np.asarray([r["wind_from_deg"] for r in levels], dtype=float)
        speed_raw = np.asarray([r["wind_speed_tenths_m_s"] for r in levels], dtype=float)
        documented = np.asarray([r["height_processing_flag"] in (" ", "A", "B") for r in levels])
        valid = (
            documented
            & (height >= 1000)
            & (height <= 21000)
            & (direction >= 0)
            & (direction <= 360)
            & (speed_raw >= 0)
        )
        h = height[valid]
        east, north = wind_components(speed_raw[valid] / 10, direction[valid])
        distinct, inverse = np.unique(h, return_inverse=True)
        counts = np.bincount(inverse)
        east = np.bincount(inverse, weights=east) / counts
        north = np.bincount(inverse, weights=north) / counts
        covered = (
            (target >= distinct.min()) & (target <= distinct.max())
            if distinct.size
            else (np.zeros(target.size, dtype=bool))
        )
        usable = distinct.size >= 2 and np.mean(covered) >= 0.75
        stamp, time_basis = launch_time(profile)
        record = {
            "station_id": profile["station_id"],
            "nominal_date": profile["date"],
            "nominal_hour_utc": profile["nominal_hour_utc"],
            "release_hhmm": profile["release_hhmm"],
            "release_utc": stamp,
            "time_basis": time_basis,
            "lat": profile["lat"],
            "lon": profile["lon"],
            "accepted_levels": int(np.count_nonzero(valid)),
            "rejected_levels": int(np.count_nonzero(~valid)),
            "height_processing_flags": {
                flag if flag != " " else "blank": sum(
                    r["height_processing_flag"] == flag for r in levels
                )
                for flag in (" ", "A", "B")
            },
            "wind_qc": "Missing/removed wind values rejected; no separate per-level wind flag",
            "height_grid_coverage_fraction": float(np.mean(covered)),
            "usable_under_coverage_rule": bool(usable),
            "height_geopotential_m_asl": distinct.tolist(),
            "wind_east_m_s": east.tolist(),
            "wind_north_m_s": north.tolist(),
        }
        if usable:
            sampled = np.stack(
                [
                    np.interp(target[covered], distinct, east),
                    np.interp(target[covered], distinct, north),
                ]
            )
            mean = sampled.mean(axis=1)
            means.append(mean)
            record["mean_east_m_s"], record["mean_north_m_s"] = mean.tolist()
            record["grid_height_geopotential_m_asl"] = target[covered].tolist()
            record["grid_wind_east_m_s"], record["grid_wind_north_m_s"] = sampled.tolist()
        records.append(record)
    if not means:
        return {
            "available": False,
            "reason": "No launch satisfies frozen coverage rule",
            "speed_m_s": None,
            "from_deg": None,
            "wind_east_m_s": None,
            "wind_north_m_s": None,
            "profiles": records,
        }
    east, north = np.mean(means, axis=0)
    speed = float(np.hypot(east, north))
    bearing = float(np.rad2deg(np.arctan2(-east, -north)) % 360) if speed >= 0.1 else None
    if bearing == 360.0:
        bearing = 0.0
    return {
        "available": True,
        "speed_m_s": speed,
        "from_deg": bearing,
        "wind_east_m_s": float(east),
        "wind_north_m_s": float(north),
        "profiles": records,
        "review_status": "derived_proxy_not_event_validated",
    }


def check_split_independence(observations):
    """Reject leakage through coordinates, spatial groups or source dependency families."""
    assignments = {}
    for index, observation in enumerate(observations):
        keys = [("location", round(observation.lat, 6), round(observation.lon, 6))]
        if observation.spatial_group:
            keys.append(("spatial", observation.spatial_group))
        if observation.dependency_group:
            keys.append(("dependency", observation.dependency_group))
        for key in keys:
            if key in assignments and assignments[key] != observation.split:
                raise ValueError(f"Calibration/evaluation leakage at observation {index}: {key}")
            assignments[key] = observation.split
    return True


def spatial_group_split(group_ids):
    """Deterministic 70/30 split of distinct frozen group identities; no point-level split."""
    groups = sorted(set(group_ids))
    if len(groups) < 2:
        raise ValueError("At least two independent spatial groups are required")
    calibration_count = max(1, int(np.floor(0.7 * len(groups))))
    return {
        g: "calibration" if i < calibration_count else "evaluation" for i, g in enumerate(groups)
    }
