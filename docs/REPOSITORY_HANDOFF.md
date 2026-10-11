# Private repository handoff

The GitHub repository is `Bobsi01/ABO-CS`, created privately for this project. [CONTRIBUTING.md](../CONTRIBUTING.md) is the portable installation entry point; [AGENTS.md](../AGENTS.md) and [skills/README.md](../skills/README.md) guide future contributors.

## Included work

The repository preserves Python/React source, both application lockfiles, generated API contracts, processed offline geography, curated catalogs and examples, source snapshots/manifests, the editable IMRaD manuscript and figures, local skills, dated QA reports, screenshots, actual document renders and browser telemetry. Large heap snapshots use Git LFS so the original evidence can be retained without exceeding Git's ordinary object limit.

Local installations (`.venv`, `node_modules`), build output (`dist`), `.runtime`, environment/credential files, Playwright session caches and reproducible raw terrain download caches are ignored. No project files were deleted to prepare this handoff. Processed terrain assets and source hashes/attribution remain available; re-curation scripts document how to regenerate download caches.

`git clone` with Git LFS is the full evidence retrieval path. Standard CI does not fetch the heap snapshots because those large forensic artifacts are not needed for numerical or frontend verification. New screenshots and reports should be deliberately selected, attributed and dated; do not commit authentication state or private browser sessions.

## Provenance and limits

Public source archives and third-party skills keep their original attribution and source-specific terms. This private repository does not grant a new license over those materials. No blanket license is assigned to the project by this handoff. Review manifests before any external redistribution.

Numerical verification, input readiness and historical agreement remain separate. Taal historical validation is not established, and some engineering/accessibility gates remain open. [GAP_REGISTER.md](GAP_REGISTER.md) is authoritative. Creating a private remote or passing CI does not close those findings.

Recorded evidence may contain the original development machine's local paths. Executable startup and optional browser-tool resolution use the current checkout rather than that author's home directory. The repository's top-level organization is documented in [repository_map.md](../repository_map.md).
