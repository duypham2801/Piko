# FINAL ENGINEERING REVIEW

- **Date:** 2026-10-12.
- **Reviewed at:** `main` `fbc7cd5`, after Phase 8.
- **Format:** master prompt §38–48.
- **Method:**
  - The architect ran four read-only reviews: architecture and code quality, API/security/ops, performance, and accessibility/UX.
  - The architect then re-checked the key findings in the code, measured a production bundle, and reused the Phase 7–8 browser measurements.
- **Not covered:** the visual and product feel is the owner's call (§49).

**Verified facts:**
- **`make check`:** green, domain 48 tests and api 50 tests, 0 lint warnings.
- **Production web bundle:** one JS chunk of 353 kB raw / 110.7 kB gzip (React 19, react-router, `zod/mini`), and 51 kB CSS / 8.7 kB gzip.
- **Fonts:** self-hosted. `unicode-range` means only latin, latin-ext and vietnamese are fetched.
- **Strip size:** about 57–64 cells whatever the option count (max 20 options).

## 1. Overall assessment

| Area | Score | Why |
|---|---|---|
| Architecture | 8/10 | Clean boundaries (domain is framework-free, web → domain only, shared zod schemas, the winner decided before the animation). One coupling blocks Couple/Group and engine evolution (§2, A1). |
| Code quality | 7.5/10 | Strict types, no `any`, no literals outside tokens, all copy in i18n. Three near-copy list hooks, a 348-line `CaseOpening`, and the `ensureSession()` boilerplate repeated in every API call. |
| UX | 7/10 | The core loop is clear and quick, and "Không phải hôm nay" is good anti-fatigue design. The double "Mở case" and "Đi thôi" (which only saves) add steps (owner decisions, §3). |
| Visual consistency | 8/10 | Matches the direction: cream/coral/teal/lemon/navy, chunky type, tactile buttons, monograms, one current style. The owner judges the feel. |
| Performance | 8.5/10 | The animation loop is right: no React state per frame, no layout reads per frame, transform only, bounded DOM. Its main cost is list refetches on every navigation. |
| Accessibility | 7.5/10 | Native dialogs, focus choreography in the case, labelled controls, reduced motion end to end, contrast within rules. Gaps: no skip link, focus loss on the share page, live-region wording. |
| Responsiveness | 8/10 | Measured at 360–1920 px in Phases 7–8. There is no horizontal scroll, the case is centred and the strip still, the CTA sticky on phones, and the landscape phone scrolls. |
| Maintainability | 7.5/10 | Good docs and decisions trail, and deterministic logic is tested. Ops scripts have known gaps, and the test flake makes the gate unreliable. |

**Overall: 7.8 / 10.** This is a solid MVP. Nothing is broken for users today. The gaps that matter are release safety (ops) and one architectural seam that the next modes will need.

## 2. Critical issues

```text
CRITICAL
1. prod-deploy can migrate without a backup (Makefile:68-73). After `prod-down` the volume keeps data, but the backup only runs when `db` is up. ENVIRONMENTS.md promises "always backs up".
2. prod-restore is unsafe (Makefile:126-137). There is no safety backup before `--clean`, no `--single-transaction --exit-on-error`, and the api restarts even after a failed restore.
3. The release gate is unreliable. apps/api has no vitest config, so the 10 s default hookTimeout applies while every test file boots PGlite in beforeAll. Flaky under load (seen in 6-5b, 7-1, 7-4).
```

These three block Phase 9 (the first prod release). They do not affect users today.

## 3. Recommended improvements

```text
HIGH PRIORITY
- A1 Split "play a result" from "pick a winner" (useCaseOpening.ts:217-236).
  open() always calls select(), so the UI can only play a result it computed itself.
  /s/:id replays by recomputing from the seed (SharedCasePage.tsx:61), not from the stored result.
  Needed before Couple/Group (server-decided winner) and before any second selection algorithm.
- S1 Session retry race (lib/api/session.ts:33). Two parallel 401s: the second resetSession()
  drops the first re-bootstrap while it is in flight, so a second /api/me runs and a second
  guest can be created. This violates rule 12.
- S2 withSession should await ensureSession() itself. Today every API function repeats it, and
  one omission would break single-flight.
- O1 A local prod rehearsal before the VPS:
  - `up --wait` with the one-shot migrate exits 0
  - non-root Caddy binds 80/443
  - the CSP works in the built app

MEDIUM PRIORITY
- A2 Shared list store with invalidation for decisions and recent history.
  - Today NavLists refetches both on every pathname change (including opening and closing a case).
  - Desktop Home fetches both twice at once.
  - Fix: a small module-level store with useSyncExternalStore, shared in-flight requests, and
    invalidate() after save/delete/revoke. No React Query without a decision.
  - This also folds the three near-copy list hooks into one.
- A3 Extract useHistorySave from CaseOpening.tsx (348 lines), and build the decision snapshot once
  (it is built twice).
- A4 Record a decision now: SelectionResult.algorithm becomes a union when v2 ships, and
  buildAnimationPlan stops rejecting other algorithm names. Otherwise stored v1 history and
  shares break.
- X1 Accessibility:
  - skip link to <main>
  - focus loss on /s/:id while replaying
  - focus loss after "Tạo link"
  - focus loss on "Xóa" while deleting
  - live regions mounted with their content, and a role swap in DecisionForm
  - DecisionLoadState / share Loading+Error: no <title> or h1
  - EmojiPicker: focus does not move into the panel when it opens
  - space between the spans in the winner, History and sidebar accessible names
- O2 Ops hardening:
  - IPv6 rate limit keyed on the full address, so one /64 is unlimited (normalise to /64)
  - prune expired sessions, abandoned guests and expired shares
  - env.ts rejects CHANGE_ME / documents APP_ORIGIN === SITE_ADDRESS
  - scheduled and off-site backups, plus one restore drill

LOW PRIORITY
- Sidebar headings (h2) come before the page h1 on desktop.
- The min-options hint is not linked to the disabled switches (aria-describedby).
- Baloo 2 devanagari subset in the build (image size only; import per-subset CSS).
- __Host- cookie prefix; /api/healthz exposes APP_VERSION.
- The "first emoji of a decision" lookup is duplicated (HomePage, NavLists); the
  reduced-motion offset `stopPosition - 3` is duplicated.
- The full-screen backdrop blur during the 8 s spin: change only if profiling shows dropped frames.
```

### Owner decisions (product, not engineering)
- **P1, double "Mở case":** preset card → preview "Mở case" → dialog "Mở case" is 3 taps to the spin. Options: auto-start the spin when the overlay opens, or keep it as is (D-033 / D-027 anticipation).
- **P2, "Đi thôi" only saves:** the user stays in the dialog with "Đã lưu", and "Mở lại" allows endless re-rolls. Options: close the overlay after the save, show a short "Xong" state, or keep it as is.
- **P3, ModeSelector on Home:** one enabled radio and two locked ones sit before the quick picks. Options: move it below "Chọn nhanh", shrink it to a small teaser, or keep it.
- **P4, required title in the builder:** a default title for quick, unsaved spins, or keep it as is.

## 4. What should NOT be changed

- **The domain engine and plan math:** seeded PRNG, the weighted pick, item-unit positions, the seeded stop offset, no winner-lookalike next to the winner, `revealAtMs` by bisection, and tests.
- **The three-state case reducer,** with visual phases derived from one easing curve.
- **The animation loop:** direct transform writes through refs, a ResizeObserver re-measure that keeps the item-unit position, full cleanup on unmount or close mid-spin, and the reduced-motion short slide.
- **The trust boundary:**
  - session user only (`and(id, userId)`)
  - server re-derives the winner (`matchesSelection`)
  - spin options must equal the stored set
  - linked `decisionId` ownership is checked
  - caps are enforced in a locked transaction
- **Sessions and request checks:**
  - 32-byte random token, only its SHA-256 stored
  - httpOnly / SameSite=Lax / Secure cookie
  - exact-origin + JSON mutation guard plus `csrf()`
  - a uniform error shape with no leaks
- **The public share route:** a minimal payload, UUIDv4 ids, expiry enforced in SQL, hard-delete revoke, `no-store`.
- **Container hardening:** read-only, `cap_drop: ALL`, non-root, internal DB network, healthchecks, log rotation, images built from `git archive` of the tag.
- **The design-token layering and the small UI primitive set:** Button, `buttonClassName`, Card, Chip, Switch, TextField, Sheet, `OptionGlyph`, `LoadingText`.
- **i18n through `t()`,** no hard-coded copy, `lang="vi"`, a `<title>` per route.
- **The case focus choreography and the single persistent result live region.**

## 5. Optimization plan

```text
Optimization: A1 play(result) / open()
Problem: the case UI recomputes the winner; it cannot play a server- or host-decided result.
Current: open(options, seed) → select() → buildAnimationPlan() → spin.
Recommended: play(result, options) builds the plan and spins; open() = select() + play().
             /s/:id replays share.result through play().
Expected benefit: unblocks Couple/Group and engine v2; replay is exact by construction.
Risk: low (pure refactor of the hook surface); browser check of the case and the replay.
Effort: ~1–2 h.
```

```text
Optimization: A2 shared list store
Problem: 2 GETs per navigation (up to 100 decisions × 20 options parsed); duplicate requests on Home.
Current: useDecisionList(pathname), useHistoryList(5, pathname), separate copies on Home.
Recommended: one module-level store per resource (decisions, recent history), in-flight sharing,
             invalidate() after mutations; the three list hooks become thin readers.
Expected benefit: fewer requests, no refetch during a spin, one loading/error pattern.
Risk: medium (touches the sidebar, Home, builder panel and History); stale-data rules must be explicit.
Effort: ~0.5 day.
```

```text
Optimization: S1/S2 session single-flight
Problem: parallel 401 retries can create two guests; ensureSession() is repeated by hand.
Current: resetSession() on every 401; each API function awaits ensureSession() itself.
Recommended: reset only if the failed request ran under the current session promise (generation
             check); withSession awaits ensureSession() internally.
Expected benefit: rule 12 holds on the retry path; less boilerplate.
Risk: low; unit-testable is not required (web), verify in the browser with a cleared cookie.
Effort: ~30 min.
```

```text
Optimization: O0 release safety (critical 1–3)
Problem: deploy without a backup, unsafe restore, flaky gate.
Current: the Makefile backs up only when db is up; restore uses --clean without a safety dump;
         no api vitest config.
Recommended: start db and back up if the volume exists; backup + --single-transaction
             --exit-on-error + keep the api stopped on failure; vitest hookTimeout 30 s.
Expected benefit: safe first release and rollback; a reliable gate.
Risk: low.
Effort: ~1.5 h.
```

## 6. Classification (§48)

**MUST FIX** (before Phase 9):
- critical 1–3 (O0)
- S1 (correctness, rule 12)
- O1 (prod rehearsal)

**SHOULD FIX:**
- A1 (before any Couple/Group or engine-v2 work, and it fixes the replay)
- S2
- A2
- A3
- X1
- O2
- A4 (as a decision)

**NICE TO HAVE:**
- the LOW PRIORITY list above

**DO NOT TOUCH:**
- section 4
