# Code style

Write code that a classmate can follow from top to bottom. Keep the existing behavior when cleaning up a file.

## Spacing and layout

- Separate imports, types, constants, and functions with blank lines.
- Keep related declarations together. Leave a blank line before the next step or return.
- Leave a blank line inside nonempty JavaScript and TypeScript function bodies, including callbacks.
- Wrap long calls, objects, and JSX so each part is easy to scan.
- Use two spaces in JavaScript, TypeScript, and CSS; four in Python.
- Follow Ruff's Python layout, including two blank lines between top-level functions.

```typescript
const displaySeconds = 20

function elapsedFraction(elapsedSeconds: number) {

  const fraction = elapsedSeconds / displaySeconds

  return Math.min(fraction, 1)

}
```

Use descriptive names and explicit units. Keep short conventional names for coordinates and small loops when their meaning is clear. Keep scientific calculations in Python and display logic in React.

## Comments

Explain a reason, assumption, unit, or surprising constraint in one short sentence. Skip comments that repeat the next line. Retain scientific sources, array shapes, security reasons, and model limitations. Do not edit generated API comments by hand.

Add purpose comments to selected functions. Vary the wording naturally: "This is for...", "For...", "We...", or "The dashboard...". Mix first-person and third-person sentences where they fit, while keeping each comment accurate and brief.

## Commands

From `frontend/`, run `npm run format` to format maintained JavaScript, TypeScript, and CSS across `frontend/`, `scripts/`, and `qa/`. Run `npm run format:check` to check without writing. The formatter uses Prettier, then adds spacing using the TypeScript syntax tree so braces in strings and comments stay untouched.

From the repository root, format Python with:

```powershell
uv run --project backend ruff format --config backend/pyproject.toml app.py backend scripts qa
```

Keep generated contracts, curated data, archived output artifacts, gathered skills, and research documents in their original formats. Run the checks in [CONTRIBUTING.md](../CONTRIBUTING.md) before handing off a change. Formatting and passing tests do not establish historical scientific accuracy.
