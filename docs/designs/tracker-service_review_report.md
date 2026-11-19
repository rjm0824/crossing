# Review report: tracker service design doc, round 1

*   **Date:** 2026-11-19
*   **Target:** `docs/designs/tracker-service.md` (first draft, 491 lines)
*   **Method:** Elephant-Goldfish review with four fresh reviewers from the
    installed plugin: zoom-out, comprehension, design critic, implementation
    readiness.
*   **Result:** Not ready to build from. No fixes applied yet.

| Reviewer | Blocker | Major | Nit |
| --- | --- | --- | --- |
| Zoom-out | 0 | 6 | 7 |
| Comprehension | 0 | 11 | 8 |
| Design critic | 2 | 9 | 9 |
| Implementation readiness | 6 | 14 | 7 |

After merging duplicates: 6 blockers, 12 major items. Items marked "verify"
rest on a reviewer's memory of Cloudflare or browser behaviour and must be
checked against documentation before the doc relies on them.

## Blockers

### B1. A boat that goes silent loses its last position after a day

*   **Raised by:** design critic.
*   **Problem:** The daily clean-up marks a trip with no position for 24 hours
    as stopped. The doc also says a stopped trip returns no positions and no
    overdue notice. So a boat that went silent offshore would lose its overdue
    notice and last known position 24 to 48 hours later, which is when a search
    needs them. New positions arriving later also cannot bring the trip back.
*   **Proposed fix:** "No updates" is not an ending. It is a state worked out
    when the page reads the trip, like overdue. The last position, its time and
    the overdue notice stay until the trip is deleted. New positions return it
    to underway.

### B2. "Read what is new" loses positions sent late

*   **Raised by:** design critic, zoom-out, comprehension, implementation
    readiness.
*   **Problem:** The doc does not say which clock "since" uses. If it is the
    time the device recorded the position, a batch saved offshore and sent
    later is older than the follower's last read and never shows, so the trail
    never fills in. If it is the time the service received it, the planned
    tables cannot find those rows without reading the whole trip each time,
    which would use about 78% of the free daily read limit, not 3%.
*   **Proposed fix:** Give every stored item a per-trip sequence number in the
    order received. The follower page asks for "everything after number N".
    Late batches then always arrive, and each read touches only new rows.

### B3. No exact message formats

*   **Raised by:** implementation readiness.
*   **Problem:** The doc names the requests but not the exact fields sent and
    returned. The test page and the next design doc both depend on them.
*   **Proposed fix:** Add a section with the exact fields for every request and
    answer, and the exact words used for each status and event kind.

### B4. Events cannot carry what the rules need

*   **Raised by:** implementation readiness, design critic, comprehension.
*   **Problem:** An event has only a kind and a label. "Ended" has nowhere to
    say arrived or stopped by hand. "Overdue time changed" has nowhere for the
    new time.
*   **Proposed fix:** Add a value field to events.

### B5. End, resume and late-arrival rules are incomplete

*   **Raised by:** implementation readiness, design critic, comprehension.
*   **Problem:** Not defined: the order events are applied in; which clock the
    10-minute resume window uses; what a second "ended" does; what happens to a
    trip that never sends a position (it would never be cleaned up, breaking
    the 7-day promise); where the 7 days count from.
*   **Proposed fix:** Apply events in the order of their device time. Drop the
    service's 10-minute resume rule; the device owns that button. Delete any
    trip 7 days after its last activity or its start, whatever its state.

### B6. Publishing steps and RJ's one-time steps cannot work in the order written

*   **Raised by:** implementation readiness, zoom-out, comprehension.
*   **Problem:** RJ was told to connect the repo to a folder that does not
    exist until the pull request is merged. The database ID is needed inside
    the pull request. The secret can only be added once the service exists.
    How database changes get applied on publish is still an open question, and
    if they are not applied every test button fails.
*   **Proposed fix:** Three groups of steps: before the pull request (create
    account, create database, give its ID), at merge (connect the repo), after
    merge (add the invite code, run the test page). Settle the open questions
    before the build by checking Cloudflare's documentation; make the pasted
    database set-up the plan and automatic set-up a later improvement.

## Major items

| # | Item | Raised by | Proposed fix |
| --- | --- | --- | --- |
| M1 | The browser's pre-check may run on every read because the web address changes each time (verify). That roughly doubles requests, to about half the free daily limit. | zoom-out, design critic, implementation readiness | Keep the read address constant. Count pre-checks in the headroom table. Consider the existing page's approach, which avoids pre-checks. |
| M2 | A 500-item batch may exceed free-plan limits per request (verify: about 50 database calls per request, about 100 values per call). | all three technical reviewers | Check the limits. Cap a batch at what fits, likely 50 to 100; the device sends several. |
| M3 | Nothing stops someone flooding the service, which would stop tracking for everyone until midnight UTC. A leaked invite code can use up the daily trip cap. | design critic | Per-trip caps on positions and events; a minimum invite code length; say how RJ learns a cap was hit; state the risk that remains. |
| M4 | Headroom is worked out for 10 boats, but friends scale is 25 captains and the cap allows 50 trips a day. Preview, live and the AI helper share one account's limits. | design critic | Add worst-case rows. Say what slows down first (a slower refresh the service asks the page to use). |
| M5 | Batch failure rules are missing. One bad item could block a device's queue forever. | design critic, implementation readiness | Answer per item: stored, already had, refused. Refused items are dropped by the device. No times before the trip started. |
| M6 | The privacy changes listed are fewer than `mvp.md` requires. Cloudflare may keep database backups for about 7 days (verify), which stretches "deleted". | design critic, zoom-out, implementation readiness | List every change and the exact replacement wording. State the backup period. |
| M7 | No risks section. Missing: lost trip key, Cloudflare outage, failed clean-up, flooding, wrong device clock. | design critic | Add a risks table. |
| M8 | Input checks cover text only. No ranges for positions, speed, battery or times. Error answers are not all assigned. | implementation readiness, design critic | Add ranges and a full error table. |
| M9 | "Every rule has a test" cannot be met, because some rules live outside the tested file. | comprehension, implementation readiness | Move the cap and clean-up choices into testable functions; list the local checks for the rest. |
| M10 | Files missing from the list: a file telling Git to ignore local secrets, and a small settings file so the tests run. The local tool is not named. | implementation readiness | Add them. Name the tool and commands. |
| M11 | The test page is underspecified and larger than needed. | zoom-out, implementation readiness | One "Run all checks" button that lists passes and failures. Say when the page is removed (at promote). |
| M12 | No build phases or checkpoints. | implementation readiness | Four phases: rules and tests; database and service locally; test page, privacy and notes; RJ's Cloudflare steps. |

## Nits

Remove the trip ID from the requests (the key alone finds the trip); drop the
three extra database indexes until measured; use the platform's built-in
comparison instead of a hand-written one; define "promote", "preview" and
"check-in" in this doc; explain that the family link holds the key after `#`
and the page sends it in a header; say why positions are kept for 7 days after
a trip ends; say what an old family link returns; make the day boundary UTC;
turn request logging off so internet addresses are not kept.

## Checked and found sound

The database choice; no live-push feature; overdue worked out at read time; the
device deciding arrival; plain JavaScript with no build step; scrambled keys;
nothing touching the live page or the Apps Script tracker.
