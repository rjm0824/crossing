# Crossing App: build handoff (Nov 17, 2026)

Everything a new build session needs, pulled from the planning chats. Decisions here are RJ's unless marked as a recommendation. The Google project doc ("Crossing App — Project Doc (shared)") has the full dated history.

## Update: Nov 26, 2026, 12:20 AM (read this first)

**Everything planned for the crossing home is built, merged and passed on
RJ's real helm iPad and iPhone.** Only Saturday's test on the water is left.

**Merged on Nov 25 to 26 (all in `/next/` plus `privacy.html` and docs):**

| PR | What |
| --- | --- |
| #12 | Pull request 1: Start trip, Live page, send queue, start gate, family page, practice mode |
| #13 | Notes: PR 1 test results, D16 and D17 |
| #14 | Pull request 2: arrived page, Send link to family (message version A), Remind me, Delete this trip, local time zones |
| #15 | Status line survives a reload; PR 2 test notes |
| #16 | D17: the tracker's arrived answer carries the named points and start time, so every follower sees the arrived map (tracker republished on Cloudflare) |
| #17 | Home port (D15): ends within 500 yards of the dock; "heading in"; "✓ RJ is home!" with "✓ Made it in" |
| #18 | Home port picker on iPad: a fixed crosshair, Save always on (a tap alone did not register on RJ's iPad) |

**Passed on RJ's devices:** all 65 checks; practice crossings to the inlet
and to a test home port; Airplane Mode; overdue and "add 1 hour"; Stop
sharing; Delete; the share screen and the calendar reminder; "RJ has
arrived!" and "RJ is home!" with the map, including a first open after
arrival; the status line after a reload; the crosshair picker.

**Not yet tested:** real GPS on the water (the gate, "heading in" and the
end at the real dock); keep-awake over hours; Starlink drop-outs.

### Before the crossing (RJ, about 5 minutes, any time)

1.  **Set the real home port** on the helm iPad: open
    `…/next/live.html?trip=home`, **Set home port**, drag the crosshair onto
    the dock, **Save as home port**. It stays on the iPad only.
2.  **Messages on the iPad:** Settings › Messages › Send & Receive › "Start
    new conversations from" your own number, so the family text does not
    arrive from "Mom". Or send the link from the iPhone.
3.  **Delete old practice trips** if any are still on the Ended screen
    (otherwise the tracker removes them after 7 days).

### Saturday Nov 28: the water test (about 30 minutes, daylight, away from the house)

On the iPad open `…/next/live.html?trip=home` **without** `practice=1`.
The trip-home rules apply, so for a test near Palm Beach turn **Hide my
start off** (the Green Turtle line would otherwise keep everything hidden).

1.  Start a real trip (Hide my start off). Tap **Send link to family** and
    send it to yourself.
2.  Run the boat 10 to 15 minutes. Check the dot moves on the iPhone; tap
    "All good"; tap "Remind me" on the iPhone (then delete the reminder).
3.  Run in to the home port, or tap **Stop sharing now**.
4.  **Delete this trip.**

If the dock is set and you come in through the inlet, the iPhone should
show "heading in" and then "✓ RJ is home!". If anything is off, the
fallback needs no code: RJ's text with planned arrival and overdue time,
plus Apple Find My.

### Crossing day (about Nov 29 to 30)

*   Helm iPad charged and on power; **Auto-Lock: Never**; close other tabs
    and apps; **one** Live tab only.
*   Open `…/next/live.html?trip=home` (not practice). **Hide my start: on.**
    Home port set. Start trip at the dock.
*   **Send link to family.** Keep the Live page in front. If the amber
    "screen may lock" note shows, tap the page once.
*   The trip ends by itself near home. Tidy up with **Delete this trip**
    once family have seen "RJ is home!" (or let it expire after 7 days).

### After the crossing (not started)

*   Sprint 2 in `live-family.md` (remove the old tracking code from the
    Plan page, points passed, Resume sharing, radar on the Live map, the
    interval choice, Add to Google Calendar, Track from another device).
*   Then the rest of `mvp.md`'s build order (onboarding, settings, routes),
    and promote (`/next/` to the live page), with phone numbers on the
    overdue notice checked first (D6).

## Update: Nov 25, 2026, late evening (read after the Nov 26 update)

**Pull request 2 is merged (#14) and passed RJ's test on the helm iPad and
iPhone (10:18 to 10:32 PM):** 59 checks; Delete this trip; times with "EST";
"Send link to family" (the share screen opened with version A, received in
Messages); "Remind me" (Calendar opened "Check on RJ's trip" at the overdue
time with the alert at the start); a newer family link taking over; "✓ RJ has
arrived!" on the iPhone. Built in that pull request: the family-link reload
fix, D16 (arrived page), Send link (RJ chose version A of the message), Remind
me, Delete this trip, and local times (RJ: every screen in the viewer's own
time zone with the zone's name; the message uses the captain's zone).

**Found in the test:**

*   Fixed in the next pull request: after Safari reloads the Live page in the
    background, the status line said "Nothing to send yet." although
    everything had been sent. The time of the tracker's last confirmation is
    now kept on the device (`cx:next:lastrx`).
*   **Crossing-day reminder:** the helm iPad's iMessage account shows as
    "Mom" on RJ's phone, so "Send link to family" from the iPad sends from
    that account. Before the crossing: set the iPad's Messages to send from
    RJ's own number or address (Settings › Messages › Send & Receive), or
    copy the family link on the iPad and send it from the iPhone.
*   **Decided by RJ, Nov 25 (late):** (1) D17 brought forward from Sprint 2:
    the tracker's arrived answer now carries the route's named points and the
    start time (never a position), so every follower sees the arrived map and
    crossing time, even after a reload or a late first open. Pull request:
    "arrived map for every follower". (2) Home port (D15) built before the
    crossing, as its own pull request after that one, against the
    recommendation to wait; tested on Saturday's water run. (3) RJ sets the
    helm iPad's Messages to send from his own number.
*   **Home port (D15) built Nov 25 (late), RJ's option A for the ending:**
    set on the Ready screen by tapping a map (saved as `cx:next:homeport` on
    the device only). With it, the Start request's destination is "Home"
    (never where it is); passing the route's last point sends a "Passed Palm
    Beach Inlet" waypoint; the trip ends within 500 yards of the home port;
    no position is recorded inside those 500 yards. Followers see "RJ has
    passed Palm Beach Inlet and is heading in." (no distance or estimate),
    then "✓ RJ is home!" with the time and the map, the boat parked on the
    inlet point under "✓ Made it in". Without a home port nothing changes.
    `privacy.html` says so. Test it on Saturday's water run.
*   Open question Q1 in `live-family.md` is closed: the share screen opens
    from the button on the iPad.
*   Next: home port (D15), its own small pull request, if RJ wants it before
    the crossing.
*   The build workspace cannot reach `*.workers.dev`, so the preview tracker
    cannot be checked from there; use a local copy (see "Local testing").

## Update: Nov 25, 2026, evening (read after the late-evening update)

**Pull request 1 of `docs/designs/live-family.md` is merged (#12) and passed
RJ's test on the real helm iPad and iPhone on Nov 25, two days early.** Next
session: pull request 2 (see "Pull request 2" below). Go or fallback: by the
design doc's rule the crossing can use the preview; Saturday's on-the-water
test and the no-code fallback stay as the backstop.

*   **New in the preview:** `next/live.html` (Ready, Live and Ended screens,
    practice mode with `?practice=1` and `&overdue=1`), `next/family.html`
    (the family page, opened from `family.html#k=` + family key),
    `next/trip-test.html` (53 calculation and queue checks), and a "Start
    trip & share with family" button on the Plan page. The Plan page's old
    tracking code is still there (removed in Sprint 2).
*   **Code:** `next/js/trip-math.js` (calculations), `queue.js` (send queue),
    `tracker-api.js` (the only code that talks to the tracker), `tripmap.js`
    (map with recenter), `live.js`, `family.js`. Checks:
    `node --test next/test/trip.test.js` (the same file runs in
    `trip-test.html`).
*   **Passed on RJ's iPad and iPhone (Nov 25, 8:24 to 9:20 PM):** all 53
    checks; Start trip with the invite code; "Screen will stay awake"; chart
    images load; the wait before Green Turtle, then sharing; the family link
    on the iPhone; a full practice crossing ending by itself at Palm Beach
    Inlet on both screens; Airplane Mode ("Couldn't send. Saved, will retry.",
    then everything delivered, twice); the overdue notice on both screens with
    the position read aloud; "Stopped" and "On hold"; "I'm fine, add 1 hour"
    (twice) clearing the notice on the iPhone; "Sharing was paused for about
    13 min … It's back on now"; Stop sharing with its confirm step.
*   **Learned on the devices:** an iPad pauses the Live page when it is not in
    front (expected; the note says so). Tapping the page brings back
    keep-awake after switching apps. Two Live tabs open at once both run the
    trip: on crossing day keep one tab only.
*   **Choices made while building** (none changes a decision): the Live and
    family pages use the mockup's light look, while the Plan page stays dark;
    Saturday's "Moving slowly" and "stopped" wording on the family page came
    early; in practice mode the arrival estimate is in real time while the
    boat runs 60 times fast, so it looks far off; the family page says "the
    boat's last known position".
*   **Not yet tested:** real GPS on the water (Saturday), keep-awake over
    hours, Starlink drop-outs.
*   **Local testing** as in `live-family.md` "Settled Details": a made-up
    invite code goes in `tracker-service/.dev.vars` (ignored by git) with
    `ALLOWED_ORIGINS="http://localhost:8788"`; run
    `npx wrangler d1 migrations apply DB --local` once. Leaflet's address on
    cdnjs may be blocked in the build workspace: install `leaflet@1.9.4` into
    the scratchpad and route the page's Leaflet requests to it.

**Decided by RJ on Nov 25 (evening), for pull request 2** (also in
`live-family.md`, D16 and D17):

*   **D16. The arrived page celebrates and keeps a map.** Wording: "✓ RJ has
    arrived!", then "Palm Beach Inlet · 8:35 PM", "Crossing time about 3 h
    25 m", "Position sharing has stopped. This page closes 2 hours after
    arrival." The map stays, with the route and the boat parked on the
    destination's named point (option A). It never shows a real position after
    arrival, so `privacy.html` needs no change. "Sharing stopped" stays plain.
*   **D17. Followers who first open the link after arrival** get the
    celebration without the map, because the tracker sends the route only
    while underway. The small tracker change that lets them see the map too
    is Sprint 2.

**Pull request 2 (ready for RJ by noon Sat Nov 28), in this order:**

1.  **Bug found in RJ's test:** the family page does not reload when a newer
    family link is opened while an older one is open in Safari (only the part
    after `#` changes, so Safari keeps the old page). Fix: reload on
    `hashchange` in `family.js`.
2.  D16: the arrived page.
3.  From `live-family.md`: "Send link to family" with the ready-written text;
    "Remind me at [overdue time]"; "Delete this trip"; time-zone names on the
    family page; `privacy.html` (the reminder line).
4.  Home port (D15), only if 1 to 3 are done and checked by 10:00 AM.

## Update: Nov 25, 2026

**Next build session: pull request 1 of `docs/designs/live-family.md`, on Opus
5.5.** Read its One-Page Summary first.

*   RJ crosses home from Abaco to Palm Beach on about Nov 29 or 30 and tracks
    it with the preview and the new tracker service. That is the real trip
    promote needs. The old Apps Script tracker stopped accepting positions on
    Nov 25; why is not known.
*   Fri Nov 27: pull request 1, end to end (Start trip, Live page, send
    queue, start gate, plain family page, practice mode), ready for RJ by
    3:00 PM. Sat Nov 28: pull request 2 (family text, "Remind me", delete
    trip, polish), ready by noon. Sprint 2 (the rest) only if ahead.
*   Decided by RJ on Nov 25: start gate is 500 yards plus today's line for
    the direction; the trip ends within 500 yards of the route's last point;
    Start trip is two steps; this crossing is started on the helm iPad; no
    phone numbers on the overdue notice until checked; Guana Cay stays as the
    route's first point; the app should know a captain's home port, kept in
    the profile on the device only (`live-family.md` D15: Saturday if time
    allows, first to drop, else Sprint 2).
*   Calendar test (`mvp.md` Q1) is closed: use a calendar file made on the
    phone.
*   Review: `docs/designs/live-family_review_report.md`. Round 1 findings
    are applied in revision 2 of the doc; revision 2 has not been reviewed
    again.
*   The Plan page (`next/index.html`) gains one button only. Its old
    tracking code stays until Sprint 2.

## Update: Nov 19, 2026

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
*   Done Nov 19 (MVP step 2): the tracker service, PR #4. Preview copy is
    published at `https://crossing-tracker-preview.rj-2a3.workers.dev`
    (Worker `crossing-tracker-preview`, D1 database `crossing-preview`, invite
    code set as a Cloudflare secret and kept in Keeper). All 10 checks on
    `next/tracker-test.html` passed on RJ's iPhone. Every merge to `main`
    republishes it. How it is set up: `tracker-service/README.md`.
*   Closed Nov 20 (open question Q1 in `tracker-service.md`): CPU time
    measured on the published preview copy, including a 100-position batch,
    was P50 2.37 ms and P99 5.69 ms against the free plan's 10 ms limit. The
    batch cap stays at 100.
*   Still to check (RJ, 1 to 2 minutes): the daily clean-up ran at 08:00 UTC
    the next morning.
*   Nov 20 (MVP build order row 2): the preview page `next/index.html` is
    split into `next/css/app.css` and `next/js/` files, no change in
    behaviour. File addresses carry a version tag (`?v=20261120`); bump it in
    `next/index.html` whenever a file changes so phones fetch the new copy.
*   Nov 25: the split preview page passed RJ's iPhone check (PR #8).
*   Nov 25: calendar question answered on RJ's iPhone (test page from PR #9,
    removed afterwards); see `mvp.md`, Q1.
*   Nov 25: the old Apps Script tracker is not accepting positions. Two test
    points, sent with the key pasted from the password manager, never reached
    the Crossing Tracker sheet. Not fixed. RJ crosses home about Nov 29 to 30.
    Plan: track that crossing with the preview's new Live screen and family
    link. If they aren't ready by Sat Nov 28, fix the old tracker that day.
*   **Schedule to that crossing (RJ, Nov 25):** Live screen and family page
    design doc and review on Fable 5.2 (Nov 25 to 26); pull request for Start
    trip, Live screen, send queue and start gate (Fri Nov 27); pull request
    for the family page, reminder and "Track from another device" (Sat Nov 28).
    **Changed later on Nov 25:** see the Nov 25 update at the top and
    `live-family.md` for the split now in force.
*   **For the Live screen and family page design doc (RJ, Nov 25):**
    *   A recenter icon on the map, next to + and −. During a trip it
        centres on the boat; before a trip it shows the whole route. Same
        icon on the Plan screen map.
    *   Every button shows it was pressed, then the real result: "Sending…",
        then "✓ Received" or "Couldn't send, will retry".
    *   Never say "sent" or "set" until it has happened. ("Send test point"
        and the calendar test page both did.)
*   Next: design doc and review for the Live screen and family page; then the
    list in `mvp.md`, "Build Order".
*   Approved but not built: a guard in `.claude/settings.json` that blocks
    edits to the live `index.html` and `original/`; a `/pr-check` command
    (phone and iPad screenshots of `/next/`, a scan for secrets, the "Planning
    aid" line, a drafted pull request description).

**Which model for what:** build on Opus 5.5 in a fresh session. Use Fable 5.2
for the Live screen and family page design doc and review, and for a review of
the tracker service code before it is merged.

**Plugins in cloud sessions:** start every Crossing App session in the cloud
environment named **crossing** (pick it instead of Default when starting the
session). Its setup script installs the three plugins in
`.claude/settings.json` (Elephant-Goldfish, Claude Code Setup, Frontend design)
at session start. Created Nov 19; not yet proven in a fresh session. To check:
type `/` and look for `egm:egm-review`.

If the plugins are missing (a session started on Default, or the script did
not work), install them by hand from the repo folder: `claude plugin
marketplace add google/elephant-goldfish-model`, then `claude plugin install
egm@egm --scope user`, and the same for
`claude-code-setup@claude-plugins-official` and
`frontend-design@claude-plugins-official`. They load a few minutes later and do
not survive into a new session. A build does not need the plugins; a design
review does.

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
