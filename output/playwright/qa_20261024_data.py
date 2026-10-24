"""Read-only evaluation probes; writes only a new audit evidence file."""
import json
from pathlib import Path
import numpy as np
from abo_api import service, kernel, eruption
from abo_api.contracts import SimulationRequest, EruptionRequest, Scenario

out = {}
cat = service.catalog()
out['catalog'] = {'revision': cat.revision, 'scenarios': len(cat.scenarios), 'receptors': len(cat.receptors), 'municipalities': sum(r.kind == 'municipality' for r in cat.receptors), 'population_2020': sum(r.population_records.get('2020') is not None for r in cat.receptors), 'unknown_source_ids': sorted({sid for p in cat.scenarios for sid in p.scenario.source_ids} - {s.id for s in cat.sources})}
out['presets'] = []
for preset in cat.scenarios:
    req = SimulationRequest(scenario=preset.scenario)
    r = service.simulate(req)
    a = np.asarray(r.grid.load_kg_m2)
    diag = r.diagnostics
    out['presets'].append({'id':preset.id, 'label':preset.name, 'status':preset.scenario.input_status, 'mass_kg':diag.total_ash_mass_kg, 'retained_fraction':diag.retained_fraction, 'mass_balance_error_kg':abs(diag.total_ash_mass_kg-diag.inside_domain_mass_kg-diag.outside_domain_mass_kg), 'grid_mass_error_kg':abs(float(a.sum())*r.grid.cell_m**2-diag.inside_domain_mass_kg), 'grid_finite_nonnegative':bool(np.isfinite(a).all() and (a>=0).all()), 'reported':r.summary.municipalities_reported,'population':r.summary.indicative_population,'peak_centroid_mm':max((x.thickness_mm or 0 for x in r.receptors if x.kind=='municipality'),default=0)})

s = next(p.scenario for p in cat.scenarios if p.id=='taal-regional')
base = service.simulate(SimulationRequest(scenario=s))
fine = service.simulate(SimulationRequest(scenario=s.model_copy(update={'release_layers':32})))
rows=[]
for a,b in zip(base.receptors,fine.receptors):
    if a.in_domain and a.kind=='municipality':
        av,bv=a.thickness_mm,b.thickness_mm
        rows.append({'name':a.name,'mm16':av,'mm32':bv,'relative_percent':abs(av-bv)/max(abs(bv),1e-20)*100,'crosses_0_5':(av>=0.5)!=(bv>=0.5)})
out['regional_refinement']={'largest_absolute_changes':sorted(rows,key=lambda x:abs(x['mm32']-x['mm16']),reverse=True)[:8], 'threshold_crossings':[x for x in rows if x['crosses_0_5']], 'reported16':base.summary.municipalities_reported,'reported32':fine.summary.municipalities_reported}
seq=eruption.sequence(EruptionRequest(simulation=SimulationRequest(scenario=s)))
out['sequence']={'frames':len(seq.frames),'end_h':seq.frames[-1].elapsed_s/3600,'first_max_mm':float(np.max(seq.frames[0].grid.thickness_mm)), 'final_grid_max_difference':float(np.max(np.abs(np.asarray(seq.final_grid.thickness_mm)-np.asarray(base.grid.thickness_mm)))), 'max_emitted_balance_error_kg':max(abs(f.diagnostics.emitted_mass_kg-f.diagnostics.deposited_mass_kg-f.diagnostics.airborne_mass_kg) for f in seq.frames), 'monotone_receptors': bool(np.all(np.diff(np.array([[r.thickness_mm or 0 for r in f.receptors] for f in seq.frames]),axis=0)>=-1e-10))}
out['historical_status']=service.replication().model_dump(mode='json',exclude={'reference_footprints','reference_footprint_geojson','reference_tables','protocol','source_dependencies','sensitivity','footprint_evidence'})
src=service.sources(s)
out['umbrella']={'stationary_mass_fraction':float(src['weights'][src['canopy_mask']].sum()/src['weights'].sum()),'provenance_assumptions':base.provenance.assumptions,'source_wind_m_s':src['middle_wind']}
out['uniform_profile_test'] = {'expected_10_m_s':10,'actual_at_1000m':float(kernel.layer_winds(np.array([1000.]),np.array([500.,2000.]),[10.,10.],[270.,270.],column_integrated=True)[0][0])}
# Scalar wind edits must not change profile-driven calculations: expose misleading UI controls.
changed = service.simulate(SimulationRequest(scenario=s.model_copy(update={'wind_speed_m_s':1.,'wind_from_deg':0.})))
out['scalar_wind_edit_max_grid_difference_mm']=float(np.max(np.abs(np.asarray(base.grid.thickness_mm)-np.asarray(changed.grid.thickness_mm))))
features=json.loads(Path('frontend/public/municipal-boundaries.geojson').read_text(encoding='utf-8'))['features']
ids={r.id for r in base.receptors}
names={r.name.split(',')[0].strip().lower() for r in base.receptors}
unmatched=[f['properties'] for f in features if f['properties'].get('receptor_id') not in ids and f['properties'].get('name','').split(',')[0].strip().lower() not in names]
out['map_boundaries']={'features':len(features),'not_matched_by_ui_lookup':len(unmatched),'calamba_records':[f['properties'] for f in features if f['properties'].get('name')=='City of Calamba, Laguna']}
Path('output/playwright/qa-20261024-data.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in out.items() if k not in ('historical_status','presets')},indent=2))
print('All preset summaries saved to output/playwright/qa-20261024-data.json')
