"""SI contracts shared through generated OpenAPI; inputs never imply validation."""

import math
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Grain(StrictModel):
    diameter_um: float = Field(gt=0)
    fraction: float = Field(ge=0, le=1)
    settling_speed_m_s: float = Field(ge=1e-5, le=1000)


class WindLevel(StrictModel):
    """One level of an opt-in wind profile; heights are above the vent like release heights."""

    height_above_vent_m: float = Field(ge=0, le=50000)
    speed_m_s: float = Field(ge=0, le=200)
    wind_from_deg: float = Field(ge=0, lt=360)


class EruptionPulse(StrictModel):
    """One constant-rate emission block of an opt-in multi-pulse source."""

    start_s: float = Field(ge=0, le=31536000)
    duration_s: float = Field(gt=0, le=31536000)
    mass_rate_kg_s: float = Field(ge=0, le=1e12)
    column_height_m: float = Field(gt=0, le=50000)


class Scenario(StrictModel):
    volcano_id: str = "custom"
    label: str = "Manual scenario"
    input_status: Literal["illustrative", "user_entered", "reviewed"] = "user_entered"
    source_ids: list[str] = Field(default_factory=list)
    vent_lat: float = Field(ge=-85, le=85)
    vent_lon: float = Field(ge=-180, le=180)
    vent_elevation_m: float = Field(ge=0, le=10000)
    column_height_m: float = Field(gt=0, le=50000)
    mass_rate_kg_s: float = Field(ge=0, le=1e12)
    duration_s: float = Field(gt=0, le=31536000)
    wind_speed_m_s: float = Field(ge=0, le=200)
    wind_from_deg: float = Field(ge=0, lt=360)
    diffusivity_m2_s: float = Field(ge=0, le=1e7)
    initial_spread_m: float = Field(ge=0.001, le=100000)
    bulk_density_kg_m3: float = Field(ge=0.001, le=10000)
    grains: list[Grain] = Field(min_length=3, max_length=5)
    domain_km: float = Field(default=200, gt=0, le=400)
    cell_km: float = Field(default=1, ge=0.25, le=10)
    release_layers: int = Field(default=16, ge=1, le=32)
    # Opt-in extensions beyond the proposal's uniform-wind, single-block source.
    # When wind_profile is present it replaces the uniform wind in the deposit solver.
    wind_profile: list[WindLevel] | None = Field(default=None, min_length=2, max_length=32)
    # When pulses are present, the summary fields must describe their envelope (validated).
    pulses: list[EruptionPulse] | None = Field(default=None, min_length=1, max_length=8)
    # Optional radial umbrella cloud radius in meters at column top.
    # When provided, initial spread expands with height up to umbrella_radius_m.
    umbrella_radius_m: float | None = Field(default=None, ge=0, le=50000)

    @model_validator(mode="after")
    def coherent(self):
        if not math.isclose(sum(g.fraction for g in self.grains), 1, abs_tol=1e-8):
            raise ValueError("Grain fractions must sum to one; no silent normalization")
        cells = self.domain_km / self.cell_km
        if not math.isclose(cells, round(cells), abs_tol=1e-8) or not 2 <= cells <= 400:
            raise ValueError("Domain/cell size must give an integer count of 2 through 400 cells")
        if not math.isfinite(self.mass_rate_kg_s * self.duration_s):
            raise ValueError("Total ash mass must be finite")
        if self.wind_profile is not None:
            heights = [level.height_above_vent_m for level in self.wind_profile]
            if any(b <= a for a, b in zip(heights, heights[1:], strict=False)):
                raise ValueError("Wind profile heights must be strictly increasing")
        if self.pulses is not None:
            end = max(p.start_s + p.duration_s for p in self.pulses)
            total = sum(p.mass_rate_kg_s * p.duration_s for p in self.pulses)
            if not math.isclose(self.duration_s, end, rel_tol=1e-9):
                raise ValueError("duration_s must equal the end of the last pulse")
            if not math.isclose(
                self.column_height_m, max(p.column_height_m for p in self.pulses), rel_tol=1e-9
            ):
                raise ValueError("column_height_m must equal the highest pulse column")
            if not math.isclose(
                self.mass_rate_kg_s * self.duration_s, total, rel_tol=1e-9, abs_tol=1e-6
            ):
                raise ValueError("mass_rate_kg_s * duration_s must equal the total pulse mass")
        return self


class Receptor(StrictModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    kind: Literal["municipality", "airport", "water"] = "municipality"
    lat: float = Field(ge=-85, le=85)
    lon: float = Field(ge=-180, le=180)
    population: int | None = Field(default=None, ge=0, le=1_000_000_000)
    population_year: int | None = Field(default=None, ge=1900, le=2100)
    source_ids: list[str] = Field(default_factory=list)
    coordinate_role: str = "municipality centroid"
    population_records: dict[str, int | None] = Field(default_factory=dict)
    admin_codes: dict[str, str] = Field(default_factory=dict)
    screening_conditions: dict[str, str] = Field(default_factory=dict)
    province: str | None = None
    region: str | None = None

    @model_validator(mode="after")
    def population_datum(self):
        if self.population is not None and self.population_year is None:
            raise ValueError("Population requires an explicit census/reference year")
        for year, count in self.population_records.items():
            if not year.isdigit() or not 1900 <= int(year) <= 2100:
                raise ValueError("Population record requires a valid reference year")
            if count is not None and not 0 <= count <= 1_000_000_000:
                raise ValueError("Population record count must be between zero and one billion")
        return self


class Criterion(StrictModel):
    id: str
    label: str
    quantity: Literal["load_kg_m2", "thickness_mm"]
    threshold: float = Field(ge=0)
    scope: str
    source_ids: list[str] = Field(default_factory=list)
    review_status: Literal["reviewed", "unreviewed"] = "unreviewed"
    receptor_kinds: list[Literal["municipality", "airport", "water"]] = Field(default_factory=list)
    required_conditions: dict[str, str] = Field(default_factory=dict)
    applicability_basis: str | None = None


class SimulationRequest(StrictModel):
    scenario: Scenario
    receptors: list[Receptor] | None = Field(default=None, max_length=2048)
    criteria: list[Criterion] | None = Field(default=None, max_length=32)
    screening_context: dict[str, str] = Field(default_factory=dict, max_length=16)
    population_year: Literal[2020, 2024] = 2024


class Source(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    title: str
    url: str


class Volcano(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    name: str
    lat: float
    lon: float
    elevation_m: float
    profile: Literal["caldera", "stratovolcano", "cone"]
    source_ids: list[str] = Field(default_factory=list)


class ScenarioPreset(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    name: str
    status: str
    scenario: Scenario


class WindPreset(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    name: str
    status: str
    speed_m_s: float | None = None
    from_deg: float | None = None
    source_ids: list[str] = Field(default_factory=list)


class Observation(BaseModel):
    model_config = ConfigDict(extra="allow", allow_inf_nan=False)
    lat: float = Field(ge=-85, le=85)
    lon: float = Field(ge=-180, le=180)
    lower_mm: float = Field(ge=0)
    upper_mm: float = Field(ge=0)
    split: Literal["calibration", "evaluation"]
    source_ids: list[str] = Field(default_factory=list)
    id: str | None = None
    spatial_group: str | None = None
    dependency_group: str | None = None
    uncertainty_mm: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def ordered(self):
        if self.upper_mm < self.lower_mm:
            raise ValueError("Observation upper thickness must not be below lower thickness")
        return self


class SourceDependency(StrictModel):
    group_id: str
    source_ids: list[str]
    dependent_quantities: list[str]
    disclosure: str


class EvidenceProtocol(StrictModel):
    id: str
    frozen_at: str
    event_start_utc: str
    event_end_utc: str
    duration_s: float
    event_definition: str
    evaluation_rules: list[str]
    acceptance_tolerance: str
    review_status: Literal["pending", "approved", "source_blocked"] = "pending"


class ParameterEvidence(StrictModel):
    id: str
    parameter: str
    classification: Literal["measured", "derived", "calibrated", "assumed"]
    value: float | str | list[float] | None = None
    units: str
    datum: str
    uncertainty: str
    source_ids: list[str]
    locator: str
    license: str
    conversions: str
    dependencies: list[str] = Field(default_factory=list)
    readiness: Literal["usable", "source_blocked", "illustrative"]
    notes: str


class FootprintReference(StrictModel):
    trace_id: str
    label: str
    threshold_mm: float = Field(gt=0)
    geojson: dict
    source_ids: list[str]
    dependency_group: str
    uncertainty_notes: str


class HistoricalRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    available: bool = False
    reason: str = "Reviewed historical inputs and independent observations are unavailable"
    scenario: Scenario | None = None
    observations: list[Observation] = Field(default_factory=list)
    blocked_inputs: list[str] = Field(default_factory=list)
    reference_tables: list[dict] = Field(default_factory=list)
    reference_footprint_geojson: dict | None = None
    reference_footprints: list[FootprintReference] = Field(default_factory=list)
    footprint_evidence: dict = Field(default_factory=dict)
    protocol: EvidenceProtocol | None = None
    dataset_id: str | None = None
    source_dependencies: list[SourceDependency] = Field(default_factory=list)
    assessment_reasons: list[str] = Field(default_factory=list)


class Catalog(BaseModel):
    model_config = ConfigDict(extra="allow")
    revision: str
    sources: list[Source]
    volcanoes: list[Volcano]
    scenarios: list[ScenarioPreset]
    winds: list[WindPreset]
    receptors: list[Receptor]
    criteria: list[Criterion]
    historical: HistoricalRecord
    parameter_evidence: list[ParameterEvidence] = Field(default_factory=list)
    inventory_coverage: dict = Field(default_factory=dict)
    screening_contexts: list[dict] = Field(default_factory=list)


class GeoJSON(StrictModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[dict]


class Grid(StrictModel):
    east_m: list[float]
    north_m: list[float]
    cell_m: float
    extent_m: list[float]
    thickness_mm: list[list[float]]
    load_kg_m2: list[list[float]]


class ReceptorResult(Receptor):
    east_m: float
    north_m: float
    in_domain: bool
    load_kg_m2: float | None
    thickness_mm: float | None
    reported: bool | None
    screening: dict[str, Literal["exceeded", "below", "unknown"]]
    screening_reasons: dict[str, str] = Field(default_factory=dict)


class Summary(StrictModel):
    reporting_cutoff_mm: float = 0.5
    receptors_total: int
    receptors_covered: int
    municipalities_reported: int
    indicative_population: int
    reported_population_unknown: int
    criterion_counts: dict[str, int]
    criterion_population: dict[str, int]


class Diagnostics(StrictModel):
    total_ash_mass_kg: float
    inside_domain_mass_kg: float
    outside_domain_mass_kg: float
    retained_fraction: float
    estimated_working_bytes: int
    elapsed_ms: float
    validation_status: Literal["not_historically_validated"] = "not_historically_validated"


class Trajectory(StrictModel):
    grain_index: int
    diameter_um: float
    settling_time_s: float
    points_m: list[list[float]]


class Illustration(StrictModel):
    wind_east_m_s: float
    wind_north_m_s: float
    column_height_m: float
    paths: list[Trajectory]
    label: str = "Representative settling illustration; not an airborne concentration forecast"


class Provenance(StrictModel):
    solver_version: str = "abo-gaussian-1.0"
    dataset_revision: str
    source_ids: list[str]
    input_status: str
    assumptions: list[str]
    warnings: list[str]


class SimulationResult(StrictModel):
    scenario: Scenario
    grid: Grid
    contours: GeoJSON
    receptors: list[ReceptorResult]
    summary: Summary
    diagnostics: Diagnostics
    illustration: Illustration
    provenance: Provenance


class SweepReceptor(Receptor):
    in_domain: bool
    maximum_thickness_mm: float | None
    maximum_load_kg_m2: float | None
    wind_from_deg: float | None


class SweepResult(StrictModel):
    scenario: Scenario
    step_deg: int = 1
    receptors: list[SweepReceptor]
    elapsed_ms: float
    label: str = "Envelope of individual receptor maxima; not one simultaneous wind scenario"
    provenance: Provenance


class ObservationResult(StrictModel):
    observation_id: str
    spatial_group: str | None
    dependency_group: str | None
    split: Literal["calibration", "evaluation"]
    lat: float
    lon: float
    lower_mm: float
    upper_mm: float
    in_domain: bool
    predicted_mm: float | None
    interval_residual_mm: float | None
    midpoint_residual_mm: float | None
    reason: str


class ReplicationResult(StrictModel):
    available: bool
    reason: str
    simulation: SimulationResult | None = None
    metrics: dict[str, float | None] = Field(default_factory=dict)
    observations: list[Observation] = Field(default_factory=list)
    validation_status: str = "unavailable"
    blocked_inputs: list[str] = Field(default_factory=list)
    reference_tables: list[dict] = Field(default_factory=list)
    protocol: EvidenceProtocol | None = None
    dataset_id: str | None = None
    observation_results: list[ObservationResult] = Field(default_factory=list)
    source_dependencies: list[SourceDependency] = Field(default_factory=list)
    assessment_reasons: list[str] = Field(default_factory=list)
    sensitivity: list[dict] = Field(default_factory=list)
    reference_footprint_geojson: dict | None = None
    reference_footprints: list[FootprintReference] = Field(default_factory=list)
    footprint_evidence: dict = Field(default_factory=dict)


class EruptionOptions(StrictModel):
    frame_count: int = Field(default=37, ge=25, le=49)
    plume_rise_speed_m_s: float = Field(default=30, ge=1, le=300)
    include_lava: bool = False
    lava_effusion_m3_s: float = Field(default=5, ge=0.001, le=1000)
    lava_width_m: float = Field(default=20, ge=1, le=1000)
    lava_viscosity_pa_s: float = Field(default=1000, ge=1, le=1e12)
    lava_density_kg_m3: float = Field(default=2600, ge=1000, le=4000)
    lava_max_distance_m: float = Field(default=20000, ge=250, le=50000)


class EruptionRequest(StrictModel):
    simulation: SimulationRequest
    options: EruptionOptions = Field(default_factory=EruptionOptions)


class FrameDiagnostics(StrictModel):
    emitted_mass_kg: float
    deposited_mass_kg: float
    airborne_mass_kg: float
    inside_domain_mass_kg: float
    outside_domain_mass_kg: float


class PlumeParcel(StrictModel):
    parcel_id: str
    grain_index: int
    east_m: float
    north_m: float
    height_m: float
    radius_m: float
    mass_kg: float


class EruptionFrame(StrictModel):
    elapsed_s: float
    phase: Literal["before", "erupting", "settling", "after"]
    grid: Grid
    contours: GeoJSON
    receptors: list[ReceptorResult]
    diagnostics: FrameDiagnostics
    plume_parcels: list[PlumeParcel]
    column_top_m: float
    fountain_particles_m: list[list[float]]
    lava_footprint: GeoJSON
    lava_affected_receptor_ids: list[str]


class LavaPoint(StrictModel):
    east_m: float
    north_m: float
    elevation_m: float
    lon: float
    lat: float
    arrival_s: float
    width_m: float
    thickness_m: float
    speed_m_s: float


class LavaResult(StrictModel):
    enabled: bool
    path: list[LavaPoint]
    stop_reason: str
    footprint: GeoJSON
    affected_receptor_ids: list[str]
    model_label: str = (
        "Illustrative isothermal Newtonian single-channel routing; not a hazard forecast"
    )
    warnings: list[str]


class EruptionSequence(StrictModel):
    scenario: Scenario
    options: EruptionOptions
    frames: list[EruptionFrame]
    final_grid: Grid
    lava: LavaResult
    fountain_paths_m: list[list[list[float]]]
    fountain_flight_time_s: float
    fountain_label: str
    provenance: Provenance
    solver_version: str = "abo-finite-pulse-1.0"
    warnings: list[str]
    assumptions: list[str]
