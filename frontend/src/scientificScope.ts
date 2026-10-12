// Volcano scope wording from docs/TAAL_IMPLEMENTATION_PLAN.md (Taal focus).
// Taal is the only volcano with a curated historical reference (published 2020 contour traces);
// that reference does not establish agreement, so the wording must never say "validated".
const SCOPE_NOTES: Record<string, string> = {
  taal: 'Scientific focus. The published 2020 contour is available for reference in Taal 2020; historical agreement is not established.',
  mayon: 'Teaching illustration only. No historical reference event is curated for this volcano.',
  kanlaon: 'Teaching illustration only. No historical reference event is curated for this volcano.',
}

export function scientificScopeNote(volcanoId: string): string | null {
  return SCOPE_NOTES[volcanoId] ?? null
}
