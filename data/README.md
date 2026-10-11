# Manual scientific inputs

`catalog.json` contains source-reviewed geographic transcriptions and separately labeled illustrative teaching physics. Missing real wind, criterion and historical inputs remain unavailable. The running application never retrieves live scientific data.

For every dataset record the publisher, publication title, direct URL or DOI, observation/publication date, retrieval date, table/page, units, transcription notes, and review status. Population values require a census/reference year; municipalities require a stable identifier and coordinate order. Derived values must name their source inputs and calculation.

Python contracts define the catalog schema. `source/` retains published boundary/coastline snapshots, derived centroids and hashes. `examples/` contains three reproducible illustrative requests. `scripts/build_catalog.py` holds explicit population/PSGC transcriptions and a bounded name/location crosswalk; ambiguous unmatched records are withheld. `docs/INPUT_VALUES.md` documents assumptions, conversions and inventory limits.

Do not enter guessed damage thresholds or present incomplete coverage as zero exposure. Teaching scenarios are an explicitly approved learning mode, never scientific evidence. Synthetic QA fixtures remain separate. Normal use needs no external scientific-data service. The current catalog has 318 municipality/city records and two airports; this remains a partial inventory. See `source/domain-inventory.json` for included and unresolved records, and `docs/GAP_REGISTER.md` for missing historical populations and criteria.
