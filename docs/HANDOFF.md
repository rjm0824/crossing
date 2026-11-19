# Crossing App: build handoff (Nov 17, 2026)

Everything a new build session needs, pulled from the planning chats. Decisions here are RJ's unless marked as a recommendation. The Google project doc ("Crossing App — Project Doc (shared)") has the full dated history.

## Update: Nov 19, 2026 (read this first)

**Start here for the next build session.** The plan and all decisions are now
in two design docs, both reviewed with Elephant-Goldfish:

*   `docs/designs/mvp.md`: the whole MVP. Decisions, working choices, what
    each step contains, risks, and the build order (2 design docs, 15 pull
    requests).
*   `docs/designs/tracker-service.md`: the tracker service, ready to build
    from. Lists every file, message format and database statement, the build
    phases, and RJ's Cloudflare steps.
*   `docs/designs/*_review_report.md`: what the reviewers found and how it was
    resolved.

**Decided by RJ on Nov 19:**

*   The MVP is all eight steps, built in stages and tested as we go. Target:
    all in the preview by Nov 29. A slip is acceptable.
*   The AI setup helper is its own step, after onboarding works without it.
*   Sharing stops only when the boat arrives or the captain stops it. A silent
    boat keeps its last position and overdue notice on the family page.
*   A trip is deleted 7 days after it ends; a trip never ended, 30 days after
    its last update.
*   A second device (the helm iPad) can do the tracking for a trip.
*   Two copies of the tracker service: preview now, live at promote.
*   The service knows only trips. Saved, future and past trips live on the
    captain's device.
*   In-app messages, then real text messages, are the first things after the
    MVP.
*   Only the tracker service and the Live screen with family page get a full
    design doc and review. Other MVP steps are built from `mvp.md` with a
    lighter check.
*   Home Screen test on RJ's iPhone: the Home Screen app kept data saved in
    Safari, so "Add to Home Screen" is the last step of setup.

**Where the work stands:**

*   Done: MVP spec; tracker service design doc; RJ's free Cloudflare account
    (signed in with Google).
*   In progress (RJ): create the D1 database `crossing-preview` and give its
    Database ID to the build session. The ID is not a secret.
*   Next: build the tracker service (`tracker-service.md`, Build Phases 1 to
    3), one pull request, then RJ's Cloudflare steps from that doc.
*   After that: split the preview page into files; design doc and review for
    the Live screen and family page; then the list in `mvp.md`, "Build Order".
*   Approved but not built: a guard in `.claude/settings.json` that blocks
    edits to the live `index.html` and `original/`; a `/pr-check` command
    (phone and iPad screenshots of `/next/`, a scan for secrets, the "Planning
    aid" line, a drafted pull request description).
*   Still to test on RJ's iPhone: a calendar entry with an alert opened from a
    web page (needed for the follower reminder).

**Which model for what:** build on Opus 5.5 in a fresh session. Use Fable 5.2
for the Live screen and family page design doc and review, and for a review of
the tracker service code before it is merged.

**Plugins in cloud sessions:** the three plugins in `.claude/settings.json` did
not load by themselves in the Nov 19 cloud session. They loaded after running,
from the repo folder: `claude plugin marketplace add
google/elephant-goldfish-model`, then `claude plugin install egm@egm --scope
project` and the same for `claude-code-setup@claude-plugins-official` and
`frontend-design@claude-plugins-official`. The install rewrites
`.claude/settings.json` (same content, different layout); restore it with `git
checkout -- .claude/settings.json`. The install does not survive into a new
session. A build does not need the plugins; a design review does.

## Where things stand
- **Live today:** https://rjm0824.github.io/crossing/ (one page, `index.html`). Go/no-go vs RJ's limits, best departure time, route map with radar, tides, hour-by-hour seas and wind, Sea of Abaco inside conditions, fuel and arrival, GPX download, captain tracking to a Google Sheet via Apps Script, family link.
- **Phase 0 (in review):** PR #1 (`claude/wizardly-newton-5jfxv0`) adds the preview at `/next/`: tides always draw, live tide "now" readout, stay-awake box while sharing, saved departure time, time-zone fixes. RJ's to-dos: test on iPhone and iPad in the 5 PM block, merge, paste and redeploy `tracker/Code.gs`, set the Crossing Tracker sheet to Eastern time (Open Loops rows 190-191).
- **Original preserved:** branch `original-v0` (commit 9a4466d) and the view-only copy in `original/`.
- **Sprint goal:** Phases 0-2 Nov 17-29, 2026; RJ wants at least 3 of 4 phases done before leaving the Bahamas (late Nov). Daily test block 5:00-5:45 PM.
- **Path:** Phase 0 fixes → Phase 1 friends version ($0) → Phase 2 paid web beta (Stripe, Supabase; about $30-75/mo) → Phase 3 App Store (native shell for background tracking). A gate between each.
- **Who it's for:** boaters crossing or fishing offshore, and the people on shore who worry about them. Pitch: "Know when to go." plus family can watch you cross, live, from one link. Top priority: no-brainer setup and effortless family tracking.
- **Name:** not final. Use "[App name]" in UI copy. (Shortlist and checks are in the project doc.)

## MVP = Phase 1 friends version (approved Nov 17)
Built in this order, each as its own design doc + PR to `/next/`:

1. **MVP spec** (`docs/designs/mvp.md`) from the mockups, reviewed with `/egm:egm-review`.
2. **Shared tracker service (Option B, approved).** Replace "one Google Sheet per captain" with one small service: each captain gets a private tracker and a private family link automatically, no copying sheets. Recommendation: Cloudflare Worker + D1 (or KV) on the free tier ($0 at friends scale), set up by RJ (he creates the account; never share his login). Keep RJ's current Apps Script tracker working until the new one is proven. The setup-chat AI key moves here as a server secret.
3. **Onboarding** (mockup `docs/mockups/Onboarding.dc.html`):
   - Welcome copy B1: headline "Know when to go." Body: "Seas, wind and tides along your whole route, checked against your limits. And the people who worry about you can watch you cross, live, from one link." Buttons: Set up my boat / A friend sent me their setup.
   - Safety tick box (Continue disabled until ticked): "I understand. I'm the captain and I make the call. I agree to the Terms of use and Privacy statement." (Final wording pending attorney review.)
   - Guided setup chat: one question at a time, talk (mic) or type or tap answer chips, 7 questions: boat name; kind of boat (center console, walkaround, express cruiser, catamaran…); length and engines; cruise speed and fuel tank; fuel burn at cruise ("Not sure" → estimate and flag it); usual route; "Who worries when you're out there?" (pushes the family link). Claude Haiku via the server fills the forms; the captain checks them. No-signal fallback: keyboard mic or skip to forms. About 1-2 cents per setup.
   - **Your boat:** boat type stays a question; **photo upload is in the MVP** (RJ, Nov 17): "Add a photo of your boat" (side view works best), show it on the boat card. No custom boat builder (rejected as cartoonish). Turning the photo into a line drawing: free in-browser sketch filter if easy, AI line drawing later (about 2-10 cents each). Without a photo, show a simple outline for the boat type. Placeholder art: `docs/mockups/boat.png` (RJ's center console drawing). Keep the photo on the phone unless the design doc decides otherwise (privacy statement update if it's uploaded).
   - Limits: presets Cautious (3 ft · 12 kt) / Standard (4 ft · 15 kt) / Experienced (5 ft · 18 kt), +/- steppers, "No north wind in the Gulf Stream" switch.
   - Route: presets (West Palm → Abaco via Green Turtle; Fort Lauderdale → Bimini; Miami → Bimini) or tap your own points (nearest tide station picked automatically). Trip home flips the route.
   - Who follows you: contacts, no app needed for them.
   - Permissions: location during a trip, notifications, keep screen on.
   - Done: first GO answer, names who gets the watch link. "A friend sent me their setup" skips the chat and pre-fills from the share link.
4. **Plan screen** (mockup `docs/mockups/Main.dc.html`): answer first, then scroll for the reasons. Trip chips at the top (Next trip, saved trips, + New trip). GO card: verdict, seas, wind, arrive, **water temp, air temp**, sunrise, plain-words brief, marine-warning and north-wind checks. Departure-time chips, best day this week, hour by hour along the route (water and air temp at each point), forecast models agree/disagree, route map + radar, tides as curves with a "now" marker, inside water, fuel and arrival (sea-state adjusted), Get ready (checklist, documents, GPX, float plan PDF), Start trip.
5. **Saved trips + My Trips tab.** Bottom bar: Plan · Live · My Trips · Family · ☰ Menu (My Trips also listed in the menu). Upcoming trips (name, route, dates, followers, limits, checklist); a trip "wakes up" with the forecast: "Forecast opens [date]" until about 10-16 days out, rough outlook from about 10 days, full GO 2-3 days out, optional reminder. Past trips with stats and "Duplicate as new" (copies route, boat, limits, followers, checklist; pick new dates). Replaces the Logbook.
6. **Live screen** (was "Trip"): keep-screen-on note, map, live ETA and stats (distance left along the route, 10-15 min average speed, Slow under ~10 kt, Stopped under ~3 kt, "No update for X min"), "All good" one-tap check-in, waypoint pings, Stop sharing. Plan for this already in the project doc.
7. **Family link:** map first, then status card ("RJ is 38 nm out", ETA, last update, speed, battery and signal), check-ins, overdue note. Opens with one tap, no app or login, expires on arrival.
8. **Share my setup** link; **store-and-send** when offshore with no signal (Starlink works; tip: use Apple Find My as a backup, the app can't read it).

**Not in the MVP:** route library (committed for later: South Florida ↔ Bahamas first, then opt-in anonymous routes from captains; no button yet), GPX import (next), ActiveCaptain, inReach feed, AIS, SOS, find my friends, limits per trip (next), My Boat extras (maintenance, document storage), AI line drawings, paid features.

## Design rules
- Home = "Should I go?" plus Start trip / Share with family. Side tools live in ☰ Menu (Setup, My Boat, Maintenance, Customs, Safety, My Trips, Settings).
- Plain words, phone first, big tap targets. Match the mockups; they are the approved direction, not pixel specs.

## Legal and safety
- Privacy statement is live at `privacy.html`; update it with any new data use.
- Legal Pack for RJ's attorney (privacy gaps, terms of use, safety screen, family-link consent, App Store privacy answers) is a Google Doc in Claude AI Shared; attorney review before selling.
- Garmin ActiveCaptain: RJ signed up for developer access. Evaluation licence is internal evaluation only, 6 months (to about mid-May 2027); no sharing any app that includes it; the full licence bars apps "where human life may be at stake" and income without Garmin's written OK. Decision: keep it out of the friends version; RJ may test it privately later (Open Loops row 194).

## Tools for this repo (approved Nov 17)
Enabled for every session by `.claude/settings.json`:
- **Elephant-Goldfish Model** (`egm@egm`, google/elephant-goldfish-model, Apache 2.0): `/egm:egm-brainstorm`, `/egm:egm-draft`, `/egm:egm-review <doc>`, `/egm:egm-drift-report docs/designs/`. Uses extra plan usage per review.
- **Claude Code Setup** (`claude-code-setup@claude-plugins-official`): run once at the start to suggest hooks, skills and helpers; recommend only, RJ chooses.
- **Frontend design** (`frontend-design@claude-plugins-official`): screen polish.
- Later: Claude Code Projects (parallel threads) once the spec and tracker exist; App starter stack (Supabase, Stripe…) in Phase 2. Skipped for now: Agency Agents, claude-mem.

## Costs (all on RJ's Max plan unless noted)
- Build sessions: $0 extra; Fable reviews and parallel threads use the weekly limit faster.
- Hosting: GitHub Pages $0. Tracker service: $0 on Cloudflare's free tier at friends scale.
- Setup chat AI: about 1-2 cents per setup; suggest a $5/month cap on the API key.
- Phase 2 later: about $30-75/month plus Stripe fees; Apple $99/yr and Google $25 once at Phase 3.

## Links
- Clickable mockups: https://claude.ai/artifact/VqfNTXgLjGRtLZA3HUCUmX (source copied to `docs/mockups/`)
- Feature map whiteboard: https://claude.ai/artifact/3YYZzkcicwnENCVUT4rVFh (text summary in `docs/feature-map.md`)
- Open Loops sheet (RJ's to-dos): rows 190-194 are the current Crossing App items.
