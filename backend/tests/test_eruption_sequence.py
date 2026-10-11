"""Integration regressions for current-time lava screening, with synthetic coordinates."""

import numpy as np

from abo_api import eruption, kernel
from abo_api.contracts import GeoJSON, LavaPoint, LavaResult, Receptor


def test_lava_points_and_width_polygon_follow_the_selected_clock():
    _, inverse = kernel.projection(0, 0)
    lon, lat = inverse.transform(750, 0)
    receptors = [Receptor(id="synthetic", name="Test point", lat=lat, lon=lon)]
    path = [
        LavaPoint(
            east_m=east,
            north_m=0,
            elevation_m=100 - east / 100,
            lon=inverse.transform(east, 0)[0],
            lat=0,
            arrival_s=time,
            width_m=20,
            thickness_m=1,
            speed_m_s=10,
        )
        for east, time in [(0, 0), (1000, 100)]
    ]
    lava = LavaResult(
        enabled=True,
        path=path,
        footprint=GeoJSON(features=[]),
        affected_receptor_ids=["synthetic"],
        stop_reason="duration_limit",
        warnings=[],
    )
    east, north = np.asarray([750.0]), np.asarray([0.0])
    before, ids = eruption.lava_snapshot(lava, 0, inverse, receptors, east, north)
    assert not before.features and ids == []
    during, ids = eruption.lava_snapshot(lava, 50, inverse, receptors, east, north)
    assert during.features and ids == []
    after, ids = eruption.lava_snapshot(lava, 100, inverse, receptors, east, north)
    assert after.features and ids == ["synthetic"]
    # Width is physical rather than the enlarged browser centerline.
    outside_width = np.asarray([11.0])
    _, ids = eruption.lava_snapshot(lava, 100, inverse, receptors, east, outside_width)
    assert ids == []
