# Review report: MVP spec (`mvp.md`), round 1

*   **Date:** 2026-11-19
*   **Target:** `docs/designs/mvp.md` as committed in the first draft (646 lines)
*   **Method:** Elephant-Goldfish review, "feature spec only". Six reviewers,
    each started fresh with no knowledge of the planning chats.
*   **Status:** Findings listed. No fixes applied yet. Decisions marked **RJ**
    need RJ's answer.

## Who reviewed and what they returned

| Stage | Reviewer | Blocker | Major | Nit |
| --- | --- | --- | --- | --- |
| 5 Zoom out | Zoom-out (scope and simplicity) | 0 | 6 | 6 |
| 5 Zoom out | Inventive catalyst (missed ideas; advisory) | 0 | 5 | 2 |
| 6 Comprehension | Comprehension (read the spec alone) | 0 | 12 | 8 |
| 7 Critic | Design critic | 1 | 13 | 8 |
| 7 Critic | Structural | 0 | 5 | 5 |
| 7 Critic | Style | 1 | 13 | 12 |

Many findings overlap. After merging duplicates there are 2 blockers and 21
major items. Stage 8 (a second zoom-out) has not run; it runs after the fixes.
Stages 5 to 7 were run at the same time, not one after another, because no
edits were made between them.

Reviewers' claims about iPhone and Cloudflare behaviour came from their own
knowledge. Each is marked "verify" below and must be checked before it is
relied on.

## Blockers

### B1. A false "overdue, call the Coast Guard" would fire in normal conditions

*   **Raised by:** design critic, inventive catalyst.
*   **Problem:** The spec says a trip is overdue when the check-in time has
    passed and the service has not been told the trip ended. The phone tells
    the service. A US phone often has no data on arrival in the Bahamas, so the
    boat arrives, the "ended" message never leaves the phone, and 80 minutes
    later the family page says overdue. A locked phone or dead battery does the
    same. The spec only queues positions for later sending, not the "ended"
    message, and the crossing-first order tests on real water before the queue
    exists.
*   **Proposed fix:**
    *   Queue "ended", "All good" and "extend" the same way as positions, and
        build that queue in the Live screen step, not step 8.
    *   The service also marks a trip arrived when a position lands inside the
        arrival distance of the destination.
    *   The overdue notice always shows how old the last position is and how
        far it was from the destination ("last heard 0.3 nm from Green Turtle
        at 1:48 PM" reads very differently from silence mid-crossing).
    *   Say plainly in the spec that some false alarms remain possible, and
        write the family wording for that. Wording goes to the attorney.

### B2. The spec contradicts itself about what the server sees

*   **Raised by:** style, comprehension, zoom-out.
*   **Problem:** Two lines say the server "never sees" boat details and that
    "nothing about their boat is stored". Other lines send boat details through
    the service to the AI, and store the boat name, first name and route for a
    running trip. This wording is likely to be copied into `privacy.html`.
*   **Proposed fix:** Use one accurate statement everywhere: setup answers pass
    through and are not stored; boat name, first name, route and planned
    arrival are stored only for a trip, and deleted with it.

## Major items that need RJ's decision

### D1. Name the smallest MVP **(RJ)**

*   **Raised by:** zoom-out, design critic.
*   **Problem:** The spec admits eight steps will not fit by Nov 29 and only
    offers a re-ordering. Every step also needs its own design doc and review.
*   **Options:**
    *   A: Smallest first: tracker service, Live screen, family link, and a
        forms-only setup. The AI chat, Plan add-ons, saved trips, photo and
        Share my setup follow as later steps.
    *   B: Keep all eight steps as one MVP and accept a later date.
*   **Recommendation:** A. Also let small steps (photo, Share my setup) ship as
    pull requests under this spec without their own design doc.

### D2. Make the AI setup chat its own late step **(RJ)**

*   **Raised by:** zoom-out.
*   **Problem:** Tapping answers and filling forms already completes setup with
    no AI. The AI call is the only reason the service needs a paid key, a
    spending cap and a third-party privacy line.
*   **Recommendation:** Keep it in the MVP (approved Nov 17), but build it after
    onboarding works without it. Costs stay the same; the Anthropic account is
    needed later, not at step 2.

### D3. Nobody is told about an overdue boat unless the page is open **(RJ)**

*   **Raised by:** design critic, inventive catalyst.
*   **Problem:** The mockups promise followers "an alert if you're overdue".
    With no texting service, that promise is not kept.
*   **Options:**
    *   A: The family page offers "Remind me at 3:00 PM" (a calendar entry with
        an alert on the follower's own phone, linking back to the page), and
        the Start trip text states the check-in time. $0. Needs one tap from
        each follower. The reminder says "check the page", not "overdue".
    *   B: Texting service now (about $1 to $2 per month plus about 1 cent per
        text; prices to re-check; carrier registration takes days to weeks).
    *   C: Neither; page wording only.
*   **Recommendation:** A, and change every mockup line that promises a text or
    an alert.

### D4. "Add to Home Screen" may open an empty app **(RJ, after a test)**

*   **Raised by:** design critic, inventive catalyst.
*   **Problem (verify on a real iPhone):** A Home Screen web app may keep its
    saved data apart from Safari. A friend who sets up in Safari and then adds
    the icon could open an app with no boat and no trips. Links tapped in
    Messages open in Safari, not the Home Screen app. The proposed "Back up my
    setup" link also leaves out trips.
*   **Proposed next step:** A 10-minute test on RJ's iPhone before the
    onboarding design doc. Then choose: ask for Home Screen first, or carry the
    finished setup across with a link. Either way the self-backup link must
    include trips and followers and be worded differently from "share".

### D5. Tracking from the helm iPad **(RJ)**

*   **Raised by:** inventive catalyst, design critic.
*   **Problem:** Today the helm iPad does the tracking. The draft ties
    everything to one phone, which must then stay on the Live screen with the
    display on for the whole crossing. A lost phone or wiped data also leaves
    no way to end a trip or delete data.
*   **Option:** Start trip also produces a "track from another device" link or
    QR code that can only add positions to that one trip. The iPad opens it.
*   **Recommendation:** Include it in the Live screen step. It also gives a
    recovery path if the phone dies. Cost: one more screen and one more kind
    of secret link.

### D6. Simplify the service: no captain record **(RJ, technical)**

*   **Raised by:** zoom-out. Design critic raised the related gap that the
    setup chat is called before the captain has a token, and that a friend who
    arrives through Share my setup has no invite code.
*   **Recommendation:** The service knows only trips. Start trip (with the
    invite code) returns the secrets for that trip. No register step, no
    captain table. "Delete my data" becomes "delete this trip". The invite code
    rides after the `#` in RJ's invite link so it stays out of GitHub's logs.
    A friend without a code can plan but not track, and is told to ask RJ.
*   **Open sub-question:** one shared code (simple, cannot be withdrawn for one
    person) or one code per friend (RJ keeps a short list by hand).

### D7. A preview copy of the service, and the privacy page during preview **(RJ)**

*   **Raised by:** design critic.
*   **Problem:** With one service, every merged service change is live at once
    after promote, which breaks the "preview first" rule. And there is one
    `privacy.html`: changing it to say "Cloudflare" at step 2 makes it wrong
    for the live page, which still uses the Google Sheet.
*   **Recommendation:** Two copies of the service on the same free account
    (preview and live). The privacy page describes both until promote. The
    spec gains a table of privacy changes per step.

### D8. Offline loading of the app **(RJ)**

*   **Raised by:** zoom-out, design critic.
*   **Problem:** "Save the app's files for offline use" is a real new component
    that can serve stale pages during testing and is not undone by reverting a
    pull request.
*   **Recommendation:** Leave it out of the MVP. Keep only the position queue,
    which works while the page stays open. Revisit before promote.

## Major items to fix in the spec without a decision

RJ can object to any of these; otherwise they are applied as written.

| # | Item | Raised by | Fix |
| --- | --- | --- | --- |
| F1 | No "Risks and mitigations" section | structural, design critic | Add a table: risk, what captain and family see, mitigation. Include service outage or quota mid-crossing. |
| F2 | The Plan screen (step 4) has no section | comprehension, zoom-out, structural | Add it: data sources, what exists today, what is new, brief written by rules (no AI), PDF by the phone's print function. Split into "re-skin what exists" and "add-ons". |
| F3 | No description of what exists today | comprehension, zoom-out | Add a short "What exists today" section and name the existing functions the build reuses. |
| F4 | Phases never defined | comprehension | Add four lines defining Phases 0 to 3. |
| F5 | "Check-in" means both a message and a deadline | comprehension, style | "Check-in" = the "All good" message. The deadline becomes "overdue time". |
| F6 | Five names for the link and four for the people | comprehension, style | One each: "family link", "family page", "followers". |
| F7 | "Option B" is ambiguous | structural, comprehension, style | Write "the shared tracker service (approved Nov 17, `docs/HANDOFF.md`)". |
| F8 | When the family link closes is stated three ways | comprehension, style, zoom-out | Define "link closes" once and use it in the Goal. Remove the "not started yet" state. |
| F9 | Free-tier check counts the wrong thing (verify) | zoom-out, catalyst, design critic | The family page asks only for what is new; one summary row per trip; slower refresh when the tab is hidden. Define what everyone sees if the daily quota runs out. Re-check limits in the step 2 doc. |
| F10 | Untrusted text on screen | design critic | All names and labels shown as plain text only, with length limits; strict checks on Share-my-setup links; state that the secret links, not the browser rule, are the access control. |
| F11 | Detection does not match the 5-minute sampling | design critic, comprehension | Read GPS continuously, upload at the chosen interval; detect passing between fixes; two fixes in a row for arrival; add "Resume sharing". Define ETA for each interval. |
| F12 | Batch upload rules missing | design critic, zoom-out | Ignore duplicates; record server receive time; cap batch size; accept late batches after auto-end. |
| F13 | No fallback if the service is unreachable at Start trip | design critic | Still open the share text with the float plan; keep retrying; show the link when it exists. |
| F14 | Plan silently assumes the open-question recommendations | comprehension | Say so in one sentence; replace Q-references with decided values once RJ answers. |
| F15 | Alternatives: "rejected by author" where RJ has not decided; missing options | style, design critic, structural | Cite the handoff where it decided; mark the rest "recommendation". Add: one shared Apps Script with per-trip links; refresh by polling versus push; storage choice on the phone. |
| F16 | Overstated claims | style | Calibrate: "about 2 minutes" is a target with a timing method; costs name the $5 up-front credit (verify); "same numbers" becomes "same calculation"; wake lock "asks the phone" and is untested on a real iPhone; "undo" lists what a revert does not undo; promote gate has one wording. |
| F17 | Section order and headings | structural, style | Order the Technical Plan by step; move Build order up and say it replaces the detailed plan; real sub-headings in Non-Functional Requirements. |
| F18 | Route setup not described | comprehension | State what a route is (presets or tapped points, named waypoints, destination) and that it is part of onboarding. |
| F19 | Token loss and deletion requests | design critic | Covered by D5 and D6; add the behaviour to Risks and align the privacy promise. |
| F20 | Privacy sequencing details | design critic | Covered by D7; also list: follower names pass to the AI, last position visible after arrival, battery under the family link step. |
| F21 | Crossing-first order skips where the token comes from | comprehension, zoom-out | Resolved by D6 (no register step). State which screen holds Start trip. |

## Nits (applied with the fixes above unless RJ objects)

*   Verdict names: always "GO / CROSSABLE / NO-GO", and define CROSSABLE.
*   "2 to 3 days out" versus "3 days out or less": use one.
*   "Slow under 10 kt" is wrong for slow boats: make it relative to the boat's
    cruise speed.
*   List the 7 setup questions.
*   Say which checklist "checklist ticks" means, and what the short float plan
    text contains.
*   Define at first use: share sheet, native app, GPX, inReach, AIS, Keeper.
*   Remove subjective words ("nicer", "easier", "feels more natural").
*   Position rounding (Q7): consider full detail while the trip runs, coarser
    after it ends.
*   A leaked family link cannot be replaced mid-trip: add "New link" or note it.
*   Say whether the Cloudflare service survives Phase 2.
*   Move single numbers (pixel sizes, character limits) to the step docs.
*   Small formatting: diagram border, one disclaimer string, resource list.

## Examined and not flagged

Fixed setup questions with the AI only filling forms; photo kept on the phone;
Worker plus database over Supabase for the MVP; no build step; keeping Apps
Script until promote.

--------------------------------------------------------------------------------

# Round 2: Stage 8 zoom-out on revision 2

*   **Date:** 2026-11-19
*   **Reviewer:** Zoom-out (fresh, via the installed EGM plugin)
*   **Result:** Not ready to approve. 1 blocker, 9 major, 12 nits. No fixes
    applied yet.
*   **Round 1 blockers:** the privacy contradiction is closed. The false
    overdue alarm is mostly closed, with three holes left (R1 to R3).

## Blocker

### S1. The dated build order is not credible **(RJ)**

*   The tracker service and the Live screen are each meant to get a design doc
    and review first, but the table builds them on Nov 20 and 21.
*   Several days hold far more than one pull request that can be tested in 45
    minutes: Nov 21 (file split, Live screen, send queue, iPad tracking), Nov
    23 (nine onboarding screens, route builder, photo), Nov 24 (Plan screen
    plus seven add-ons).
*   Nov 20 has nothing RJ can test, because the service has no screen yet.
*   The bottom bar, Family tab, Menu, Settings, Safety and My Boat belong to no
    day.
*   "It does not rewrite existing code" is overstated. Only the distance and
    keep-awake functions carry over as they are. The verdict, position sending,
    arrival and route-file functions have RJ's boat, route and limits written
    into them and must be reworked.
*   One spare day in ten, with Thanksgiving and two weekends inside.
*   **Reviewer's recommendation:** Nov 29 is the target for Stage 1 only
    (tracker, Live screen, family page, Start trip, on RJ's boat and route).
    Stages 2 and 3 get an order, not dates.

## Major

| # | Item | Proposed fix |
| --- | --- | --- |
| R1 | Queued updates only send while the page is open in front. A captain who docks and pockets the phone stays "overdue" even after signal returns. | Say so everywhere. Add an arrival prompt: "Open the app when you have signal so family sees you arrived." Put it in the Start trip text. |
| R2 | A half-mile arrival distance will miss ordinary arrivals; the boat ends at a dock, not at the route's last point. Today's page uses 4 nm. | Wider distance set per route, or "near the destination and stopped for some minutes". A near-destination overdue notice worded differently from a mid-crossing one. |
| R3 | A late batch marks the trip arrived in the past, but the family link closes 2 hours after the trip ends, so followers may never see "Arrived". | Count the 2 hours from when the service learns of the end, or keep "Arrived at [time]" on the closed page with no position. |
| R4 | Working out arrival on both the device and the service is redundant now that "trip ended" is queued. | The device decides; the service accepts a back-dated end. Drop the service-side rule from the MVP. |
| R5 | The spec says the invite code is "never in the page" but friends' devices hold it. | Describe it as a shared, low-value code held on friends' devices. Only the AI key never leaves the server. |
| R6 | Two privacy protections are dropped without being named: positions rounded to about 1.2 nm, and nothing sent until the boat is outside the inlet so the home dock never shows. Showing the last position for 2 hours after arrival also changes the "stops on arrival" hard rule. **(RJ)** | Keep a "don't share until N nm from the start" rule, and decide the 2 hours as an explicit rule change. |
| R7 | The self-backup link has no size limit; trip tracks will not fit in a link. | Limit it to setup, followers and upcoming trips. |
| R8 | iPad tracking needs the route and cruise speed, which the iPad does not have; a scannable code needs an added library. | Send a link through the share screen (AirDrop or text to self) carrying the trip key and those values. |
| R9 | The calendar reminder for followers is not marked "to verify". | Test it in the same iPhone session as the Home Screen test. |

## Nits

"New link" and "Resume sharing" need matching service requests; reconcile
"publishes on merge" with "live copy at promote"; one daily cap is enough;
reuse the four boat outlines already in the onboarding mockup; list the
existing `privacy.html` lines to remove; say how a tapped route marks Gulf
Stream points for the north-wind rule; carry the "Apple Find My as a backup"
tip into setup.
