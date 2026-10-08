# HANDOFF 1c-2 — Enforce Prettier in `make check` and remove the unused `@` alias

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

The architect's end-of-Phase-1 review found two problems.

**1. Prettier is configured but never enforced.** The repo has `.prettierrc.json` and a `format` script, but `make check` does not run Prettier. Six code files have drifted:
- `apps/web/src/components/ui/Switch.module.css`
- `apps/web/src/components/ui/Switch.tsx`
- `apps/web/src/components/ui/TextField.tsx`
- `apps/web/src/main.tsx`
- `apps/web/src/pages/design/DesignPage.tsx`
- `apps/web/src/styles/tokens.css`

Markdown files are hand-written by the architect (Vietnamese prose, wide tables, nested lists). Prettier must not reflow them.

**2. The `@` → `src` path alias is unused.** It is configured in `apps/web/vite.config.ts` and `apps/web/tsconfig.json`, but no file imports from `@/`. It is dead configuration. If a later phase needs it, it can be re-added together with its first use.

## Scope
- R1: ignore Markdown in Prettier.
- R2: format the drifted code files.
- R3: add a Prettier check to `pnpm check`, so `make check` enforces formatting.
- R4: remove the unused `@` alias.

## Out of scope (do NOT do)
- Editing any `*.md` file, including `CLAUDE.md` and `docs/**`.
- Changing `.prettierrc.json` options, ESLint config or rules.
- Any change beyond what Prettier itself produces in R2. No manual refactors, renames or logic changes.
- New dependencies.
- Render, snapshot or E2E tests.

## Files to modify
- `.prettierignore`: add Markdown.
- `package.json` (root): scripts only.
- The six files listed above: Prettier output only.
- `apps/web/vite.config.ts`, `apps/web/tsconfig.json`: remove the alias.

## Allowed dependencies
None. Prettier is already a root devDependency.

## Requirements

### R1. Ignore Markdown
Append `*.md` to `.prettierignore`. Prettier's ignore file uses gitignore syntax, so this pattern matches Markdown files at any depth.

### R2. Format code
Run `pnpm exec prettier --write .` inside the dev container. The diff may touch only the six files above:
- If Prettier changes any other file, stop and report the list.
- If Prettier changes anything beyond whitespace, wrapping or quotes in those six files, stop and report it.

### R3. Enforce formatting
Root `package.json`:
- add `"format:check": "prettier --check ."`
- change `check` to `"pnpm typecheck && pnpm lint && pnpm format:check && pnpm test"`

Keep the existing `format` script.

### R4. Remove the unused alias
- `apps/web/vite.config.ts`:
  - remove the `resolve.alias` block
  - remove the `sourceDirectory`, `path` and `fileURLToPath` imports and variables, unless they are still used elsewhere in the file
- `apps/web/tsconfig.json`: remove `compilerOptions.paths`.
- Confirm that `git grep -n "from '@/" -- apps` prints nothing.

## Acceptance criteria
- [ ] `pnpm exec prettier --check .` passes, and Markdown files are not checked.
- [ ] `make check` now runs `format:check`, and it passes.
- [ ] The diff touches only the files listed above. The six code files contain formatting-only changes.
- [ ] No `alias`, `paths` or `@/` remains in `apps/web`.
- [ ] `make dev` still serves `localhost:5173` and `/design`.
- [ ] The prod web build has no `/design` leak, and main JS gzip is unchanged (about 91.72 kB).

## Validation
Run these and include the trimmed output in the report:
```bash
make check
docker compose -f compose.dev.yaml run --rm --no-deps install pnpm exec prettier --check .
git diff --stat
git grep -nE "alias|paths|from '@/" -- apps/web
docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c \
  'pnpm --filter @piko/web build && \
   (grep -rl "DesignPage\|ẤẦẨẪẬ\|Xoay kèo ngay" apps/web/dist && echo "LEAK" || echo "no /design in prod build")'
```
Afterwards delete `apps/web/dist`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `chore/1c-2-format-gate` from `main`.
- Make exactly **one** commit: `chore: enforce prettier in check and drop unused path alias`.
- Do not commit to `main`, merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including the main JS gzip size
4. Deviations from this handoff and why
5. Known issues / open questions
6. What the owner should check in the browser: `localhost:5173` and `/design` load as before
