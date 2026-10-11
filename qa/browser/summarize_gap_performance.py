"""Summarize saved browser timestamps without executing another animation."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def summarize(times):
    gaps = sorted(b - a for a, b in zip(times, times[1:], strict=False))
    windows = []
    start, end = times[0], times[-1]
    while start + 10_000 <= end:
        windows.append(sum(start <= time < start + 10_000 for time in times) / 10)
        start += 1_000
    return {
        "count": len(times),
        "duration_ms": end - times[0],
        "mean_fps": (len(times) - 1) * 1_000 / (end - times[0]),
        "p50_frame_ms": gaps[int((len(gaps) - 1) * 0.5)],
        "p95_frame_ms": gaps[int((len(gaps) - 1) * 0.95)],
        "p99_frame_ms": gaps[int((len(gaps) - 1) * 0.99)],
        "minimum_steady_10s_fps": min(windows) if windows else None,
        "windows_fps": windows,
    }


def main():
    chrome = json.loads((HERE / "gap-engineering-performance.json").read_text())
    evidence = {
        "executor": "orchestrator",
        "viewport": [1440, 1000],
        "device_pixel_ratio": 1,
        "scenario": chrome["scenario"],
        "chrome": {
            "completed": chrome["completed"],
            "os_foreground_samples": len(chrome["foreground"]),
            "all_foreground_samples_matched": all(x["matched"] for x in chrome["foreground"]),
            "replays": [
                {"number": row["number"], "warmup": row["warmup"], **row["render_summary"]}
                for row in chrome["replays"]
            ],
        },
        "in_app": {"replays": [], "os_foreground_samples": []},
        "sources_sha256": {},
        "limits": [
            "Foreground ownership is sampled, not a continuous OS trace.",
            "Chrome replays 2 and 3 overlap an earlier in-app warm-up; "
            "the later in-app campaign is sequential.",
            "Recorded hardware and settings only; not a universal performance guarantee.",
        ],
    }
    for index in range(4):
        source = HERE / f"gap-iab-replay-{index}.json"
        row = json.loads(source.read_text())
        evidence["sources_sha256"][source.name] = hashlib.sha256(source.read_bytes()).hexdigest()
        evidence["in_app"]["replays"].append(
            {
                "number": index,
                "warmup": index == 0,
                "assets": row["assets"],
                "captured_at": row["captured_at"],
                "hidden": row["hidden"],
                "has_focus": row["has_focus"],
                "rendered": summarize(row["rendered"]),
                "callbacks": summarize(row["callbacks"]),
            }
        )
    for source in sorted(HERE.glob("gap-iab-foreground-*.json")):
        rows = json.loads(source.read_text(encoding="utf-8-sig"))
        evidence["in_app"]["os_foreground_samples"].extend(
            rows if isinstance(rows, list) else [rows]
        )
    evidence["in_app"]["all_foreground_samples_matched"] = all(
        row["matched"] for row in evidence["in_app"]["os_foreground_samples"]
    )
    evidence["in_app"]["foreground_process"] = {
        "pid": 26592,
        "process_name": "ChatGPT",
        "file_product_name": "Codex",
        "main_window_handle": 591568,
    }
    evidence["measured_replays_meet_30fps"] = all(
        row["render_summary"]["minimum_steady_10s_fps"] >= 30
        for row in chrome["replays"]
        if not row["warmup"]
    ) and all(
        row["rendered"]["minimum_steady_10s_fps"] >= 30
        for row in evidence["in_app"]["replays"]
        if not row["warmup"]
    )
    (HERE / "gap-performance-summary.json").write_text(
        json.dumps(evidence, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"measured_replays_meet_30fps": evidence["measured_replays_meet_30fps"]}))


if __name__ == "__main__":
    main()
