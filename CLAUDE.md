# Crossing App: rules for every build session

Read this first, then `docs/HANDOFF.md`. RJ (the owner) is new to app building: explain what you're doing in plain words, one step at a time, and say how to check it worked and how to undo it.

## What this is
A boat-crossing planner (South Florida to the Bahamas first) being turned into an app. Today it is one page, `index.html`, served by GitHub Pages at https://rjm0824.github.io/crossing/. The captain's phone shares position to a tracker (Google Apps Script in `tracker/Code.gs` plus a Google Sheet); family follow a plain link with no login.

## Hard rules
- **Planning aid, never a navigation tool.** The captain decides. Keep the "Planning aid, not for navigation" line visible. No course-to-steer, no turn-by-turn, no "safe" wording.
- **No secrets in the repo or the page.** No API keys, captain keys, logins, passport or card numbers. Keys live server-side (Apps Script Script Properties, later the tracker service's settings) and in RJ's Keeper. Never ask RJ to paste a key into chat.
- **Preview first.** New work goes to the preview at `/next/` (`next/index.html`, shows a PREVIEW banner). The live `index.html` changes only through a separate "promote" pull request RJ approves.
- **Pull requests only.** Never push to `main`. RJ tests each PR in his daily 5:00-5:45 PM block and merges it himself.
- **Don't touch `original/` or the `original-v0` branch.** They preserve the first version for history.
- **Drafts first.** Nothing that sends messages, spends money, creates accounts or publishes outside this repo without RJ's explicit OK. Give a cost estimate for anything that costs money or runs on its own.
- **Privacy.** Location is shared only during a trip and stops on arrival. Anything new that collects data needs a matching update to `privacy.html` in the same PR.
- **Data licences.** Open-Meteo's free tier is non-commercial: fine for the free friends version, must change before selling. Map tiles and radar licences need checking before selling.
- **Garmin ActiveCaptain stays out of the app** (evaluation licence is internal-only; see HANDOFF). Routes come from presets, tapped points or GPX import.

## How we work
- **Design before code.** For any feature bigger than a small fix: write or update a design doc in `docs/designs/`, run `/egm:egm-review` on it (fresh reviewers), resolve findings with RJ, then build. **MVP exception (RJ, Nov 19, 2026):** only the tracker service and the Live screen with family page get their own design doc and full review; the other MVP steps are built from `docs/designs/mvp.md` with a lighter check.
- EGM artifact directory: docs/designs
- **Screens follow the mockups** in `docs/mockups/` (open `Main.dc.html` and `Onboarding.dc.html`). Use the frontend-design plugin for polish. Phone first (390 px wide), big tap targets, plain words.
- **Test** at phone and iPad sizes before opening a PR, and say in the PR what you could not test (real iPhone, real GPS, real network).
- **PR descriptions** in plain English: what changed, how RJ tests it in 5 minutes, how to undo.
- **Model use:** Fable 5.2 for design and reviews only (it drains the weekly limit fast); Opus 5.5 for building; Sonnet 5.5 for small fixes.
- **One thread for now.** Don't split into parallel Claude Code Project threads until the MVP spec and tracker service exist.

## Tools in this repo (Nov 26)
- **Guard:** a hook (`.claude/hooks/protect-live.sh`) blocks edits to the live `index.html` and `original/`. That is intended; work in `next/`.
- **`/pr-check`:** run before every pull request (checks, screenshots, drafted description; it never opens the pull request).
- **Automatic checks:** GitHub Actions runs every check on each pull request; the Checks box must be green before RJ merges.

## Where things live
- `docs/HANDOFF.md`: decisions, MVP scope, open items (start here).
- `docs/feature-map.md`: every feature and its phase.
- `docs/mockups/`: the approved clickable mockups and the boat placeholder drawing.
- `docs/designs/`: design docs (EGM). `mvp.md` is the whole MVP plan; `tracker-service.md` is the first build.
- `next/`: preview of the next version (from PR #1 onward).
- `original/`: archived first version, view only.
- `tracker/Code.gs`: the Apps Script tracker (RJ pastes and redeploys changes by hand).
- Shared project doc (Google Doc, source of truth for decisions): "Crossing App — Project Doc (shared)" in RJ's Claude AI Shared Drive folder.
