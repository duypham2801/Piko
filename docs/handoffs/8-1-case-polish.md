# HANDOFF 8-1 — Case polish

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 8 is the polish phase. The architect audited the app in the browser before the phase started. The findings and the owner's choices are in `docs/IMPLEMENTATION_PLAN.md` ("Phase 8 kickoff") and in **D-035** in `docs/DECISIONS.md`. This task covers the case overlay and how options without an emoji are shown.

Relevant existing code:
- **Overlay:** `apps/web/src/features/case-opening/CaseOpening.tsx` and `CaseOpening.module.css` (D-033).
  - Below `48rem` it is full-screen.
  - From `48rem` it is a dialog anchored `--space-8` from the top, with `height: fit-content` and `max-height: calc(100dvh - var(--space-8) - var(--space-6))`.
- **Strip:** `CaseCarousel.tsx` / `CaseCarousel.module.css` (the `.marker` element and its arrow pseudo-elements), and `CaseItem.tsx` / `CaseItem.module.css`.
- **Winner panel:** `WinnerPanel.tsx` / `WinnerPanel.module.css`. It is also used by `/s/:id`.

The audit found four problems:

- **P1: the marker crosses the winner.**
  - After the reveal, the coral marker line (`.marker`, 3 px, full height) still runs through the middle of the winner cell, across its emoji and label.
  - The winner cell cannot rise above it, because `.strip` has `will-change: transform` and is therefore its own stacking context.
- **P2: the overlay scrolls inside at 1280×800.**
  - Measured with a 2-option decision after the reveal: the dialog's `scrollHeight` is 719 against a `clientHeight` of 698.
  - The content stack is header 64, stage 184, result 96, actions 215, with 3 × 32 px gaps.
  - Inside the actions there is the hint line (21 px) plus an always-rendered empty history status `<p>`, which still costs a 12 px grid gap.
  - The same thing happens with the "Chưa lưu được vào lịch sử…" error, so a scrollbar appears at the moment of the result.
- **P3: options without an emoji look broken.**
  - In a strip cell, the empty emoji `<span>` plus the grid gap puts the label higher than in its neighbours.
  - The winner panel has no icon.
  - Preview rows, the `/s/:id` option list and winner rows in History and the sidebar indent their labels differently with and without an emoji.
- **P4: the initial focus scrolls the dialog.**
  - At 1280×500, `showModal()` followed by `focus()` on "Mở case" scrolls the dialog to `scrollTop` 164, so the strip's top is out of view when the case opens.

## Scope
- P1–P4 as specified below.

## Out of scope (do NOT do)
- **Tasks 8-2 and 8-3:**
  - hover and pressed states
  - loading states
  - the focused error field
  - CTA colours
  - History empty alignment
  - the sidebar "Gần đây"
  - active styles
  - the sticky preview CTA
  - scrolling the active sidebar row into view
- Any change to selection, the animation plan, `revealAtMs`, timing, routes, requests, copy or i18n keys.
- `packages/domain`, `apps/api`, and dependencies.
- The builder's emoji trigger (`OptionRow`, showing "+"), the `EmojiPicker`, and the `ExistingOptionsPanel` chips.
- Decision cards on Home and in the sidebar "Của bạn". These use the first emoji of a decision, not an option icon.
- The inline winner text in `SharedCasePage` (the "latest winner" line) and in `SharedLinkList`. These render the emoji inside a sentence, not as an icon.

## Files to create / modify
- `apps/web/src/components/ui/OptionGlyph.tsx` + `OptionGlyph.module.css` (new): the option icon, with the monogram fallback.
- `apps/web/src/features/case-opening/CaseCarousel.tsx`, `CaseCarousel.module.css`: P1.
- `apps/web/src/features/case-opening/CaseItem.tsx`, `CaseItem.module.css`: P3.
- `apps/web/src/features/case-opening/WinnerPanel.tsx`, `WinnerPanel.module.css`: P3.
- `apps/web/src/features/case-opening/CaseOpening.tsx`, `CaseOpening.module.css`: P2, P4.
- `apps/web/src/features/preview/DecisionPreview.tsx`, `DecisionPreview.module.css`: P3.
- `apps/web/src/features/share/SharedCasePage.tsx`, `SharedCasePage.module.css`: P3, option list only.
- `apps/web/src/features/history/HistoryList.tsx`, `HistoryList.module.css`: P3.
- `apps/web/src/app/NavLists.tsx`, `NavLists.module.css`: P3, the "Gần đây" winner rows only.
- `apps/web/src/pages/design/*`: add an `OptionGlyph` demo to `/design`, with an emoji, a monogram, and a label starting with "Ẩ".
- `apps/web/src/styles/tokens.css`: only if a new semantic token is needed. Prefer existing tokens.

## Requirements

### P1 — Fade the marker line at the reveal
- `CaseCarousel` already receives `revealed`. Expose it on the marker, for example `data-revealed`.
- Draw the vertical line on its own element (for example a child `<span>` of `.marker`), so its opacity can change without hiding the two arrow heads.
- **When revealed:**
  - The line goes to `opacity: 0`, with a transition of `--duration-normal` / `--ease-standard`.
  - The arrow heads stay fully visible and keep pointing at the winner.
- When the next spin starts ("Mở lại" or "Không phải hôm nay"), the line is visible again immediately.
- Animate only `opacity` (CLAUDE.md rule 10).
- **Reduced motion:** no transition. The line is simply hidden once revealed.

### P2 — No inner scroll at 1280×800
- Below the overlay's `max-height`, the revealed overlay must fit without an inner scroll at **1280×800** in every revealed state:
  - (a) normal
  - (b) the "Chỉ còn 2 lựa chọn cuối." hint showing
  - (c) the history save error showing
  - (d) after "Đi thôi" succeeded ("Đã lưu")
  - (e) the hint and the error together, for example a 2-option decision with the API down
- **Required:**
  - Do not reserve a grid gap for an empty status line.
  - Keep the `aria-live` region mounted, so the error is still announced when it appears. For example, render the hint and the status inside one wrapper that is the last item of `.actions`, with no row gap of its own when empty. Any equivalent that keeps the region mounted is fine.
- **Then tighten the desktop vertical rhythm only as much as needed,** using spacing tokens only.
  - For example, `.content` `gap: var(--space-5)` from `48rem`.
  - Do not shrink the strip cells, the result reserve (`calc(var(--space-8) * 1.5)`) or the buttons.
- **Keep the 7-4 invariants:**
  - From `48rem`, the dialog's top edge is at `--space-8` (64 px) before and after the reveal.
  - The strip does not move when the winner lands.
  - At 1280×500 the dialog still scrolls inside.
  - At 360×740 the revealed case needs no scrolling.
- Report the measured `scrollHeight`/`clientHeight` for states (a)–(e) at 1280×800 and (a) at 360×740.

### P3 — `OptionGlyph` with a monogram fallback (D-035)
- **New primitive `OptionGlyph`:**
  - **Props:** `{ emoji?: string; label: string; className?: string }`.
  - **Always `aria-hidden="true"`.** The label is rendered by the caller.
  - **With an emoji:** it renders the emoji, as each site does today.
  - **Without an emoji:** it renders a **monogram**. This is the first character of the label:
    - computed as `[...label.normalize('NFC').trim()][0]`
    - then `toLocaleUpperCase('vi')`
    - for example "Ẩm thực" → "Ẩ", "lẩu" → "L"
- **Monogram look:**
  - a circle with `--color-secondary` (teal) background and `--color-on-secondary` (navy) text
  - `--font-display` at `--font-weight-display`
  - no border, no shadow
  - white text is forbidden on teal (CLAUDE.md)
- **Size:**
  - The glyph is a square box sized in `em`, so it takes the font size each site already uses for its emoji. Every site keeps controlling the size through its existing `font-size`.
  - The monogram circle fills the same box as an emoji glyph in that place, for example `width`/`height: 1.25em` with the letter at about `0.6em`.
  - Check the box against the real emoji at each site, so text lines up whether or not an option has an emoji.
- **Use it at these sites, replacing the conditional emoji spans:**
  - `CaseItem`
  - `WinnerPanel`
  - `DecisionPreview` option rows: remove the `data-no-emoji` grid variant, since every row now has an icon
  - the `SharedCasePage` option list
  - `HistoryList` winner rows
  - `NavLists` "Gần đây" winner rows
- After this change, labels in these lists and in the strip start at the same x / sit at the same baseline whether or not the option has an emoji.
- A dimmed strip cell dims the monogram the same way, through the existing cell opacity.
- `OptionGlyph` is a pure presentational component. No tests (Testing policy).

### P4 — Initial focus without scrolling
- In `CaseOpening.tsx`, focus `[data-initial-focus]` with `focus({ preventScroll: true })`.
- Make sure the dialog's `scrollTop` is `0` when it opens.
- At 1280×500, when the case opens, the header and the strip's top edge are visible and "Mở case" still has focus. Keyboard users then reach the button with the normal focus ring.
- Do not change any other focus logic (the share-toggle return focus stays as it is).

## Allowed dependencies
- None.

## Acceptance criteria
- [ ] **P1:**
  - After the reveal, no part of the marker line crosses the winner cell. The two arrow heads remain.
  - The line is back during the next spin.
  - With `prefers-reduced-motion: reduce` the line is hidden with no transition.
- [ ] **P2:** at 1280×800 there is no inner scroll in revealed states (a)–(e).
- [ ] **P2:**
  - The top edge stays at 64 px before and after the reveal at 1280×800 and 1920×1080.
  - At 1280×500 the dialog still scrolls inside.
  - At 360×740 the revealed case needs no scrolling.
- [ ] **P2:** with the API refused, "Đi thôi" still shows "Chưa lưu được vào lịch sử. Bạn cứ đi, thử lại sau nhé." and screen readers announce it (the live region existed before the message).
- [ ] **P3:**
  - A decision mixing options with and without an emoji shows monograms in the strip, in the winner panel (when it wins), in the preview, on `/s/:id`, in History and in the sidebar "Gần đây".
  - Labels line up in every one of these places.
- [ ] **P3:** "ẩm thực" shows "Ẩ" as one character, not a base letter plus a loose combining mark.
- [ ] **P3:** `/design` shows `OptionGlyph` with an emoji, a monogram, and "Ẩ".
- [ ] **P4:** at 1280×500, opening a case leaves the dialog at `scrollTop` 0, and `document.activeElement` is "Mở case".
- [ ] No raw colour, duration or shadow literals. No horizontal scroll at 360, 768, 1280 or 1920 px.
- [ ] `make check` passes with 0 lint warnings: domain 48, api 50. Lockfile unchanged.

## Validation
```bash
make check
git diff --name-only feat/phase-8-polish... -- apps/web/src | grep "\.css$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" --
git diff --stat feat/phase-8-polish...
```
- The literal grep must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.
- To test state (c) and (e), block only `/api/*` requests in the browser's devtools (Network request blocking). Do not block `*/api/*`: that pattern also blocks Vite's `/src/lib/api/*` modules and gives a blank page.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `feat/8-1-case-polish` from `feat/phase-8-polish`.
- Commits (suggested):
  - `feat(web): add OptionGlyph with a monogram fallback`
  - `fix(web): fade the case marker at the reveal`
  - `fix(web): fit the revealed case overlay and keep the initial focus in place`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts and the lint summary
4. Deviations from this handoff and why
5. Known issues / open questions
6. **The P2 measurements** (`scrollHeight`/`clientHeight` per state) and the **P4** `scrollTop` at 1280×500
7. What the owner should check in the browser:
   - the reveal on desktop and on a phone (the marker fades, the arrows stay)
   - a decision with emoji-less options in the strip, the result, the preview, History and the sidebar
