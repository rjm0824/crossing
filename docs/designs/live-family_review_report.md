# Review report: Live screen and family page design doc, round 1

*   **Date:** 2026-11-25
*   **Target:** `docs/designs/live-family.md` (first draft, 1,067 lines, with
    RJ's Nov 25 decisions D1, D2, D3, D5, D6 already in it)
*   **Method:** Elephant-Goldfish review, run straight through, with five
    fresh reviewers from the installed plugin: zoom-out, comprehension,
    design critic, implementation readiness, codebase details. To save plan
    usage, four reviewers were left out (inventive catalyst, structural,
    style, and the second zoom-out pass, which only audits edits made between
    stages).
*   **Result:** Not ready to build from as first drafted. Resolved in
    revision 2 of the doc on Nov 25; see "Resolution" at the end. Revision 2
    has not been reviewed again.

| Reviewer | Blocker | Major | Nit |
| --- | --- | --- | --- |
| Zoom-out | 2 | 7 | 5 |
| Comprehension | 0 | 13 | 7 |
| Design critic | 2 | 10 | 7 |
| Implementation readiness | 3 | 7 | 4 |
| Codebase details | 2 | 10 | 3 |

After merging duplicates: 7 blockers, 19 major items. Items marked "verify"
rest on a reviewer's memory of iPhone or browser behaviour and must be
checked on a real device.

The codebase reviewer confirmed these claims in the doc against the files:
9 named and 66 detailed points on the trip home; today's arrival rules and
gate lines; the service's limits (30 points, 100 items, 10-minute slack); the
Read answer fields; the calendar file method; the delete promise in
`privacy.html`.

## Blockers

### B1. The first end-to-end test is the evening before the crossing

*   **Raised by:** zoom-out, implementation readiness.
*   **Problem:** Pull request 1 has no family page, so nothing a follower sees
    is tested until Saturday at 5 PM. A fault found then has no time to be
    fixed before a Sunday start, and the same evening is when RJ would repair
    the old tracker.
*   **Proposed fix:** Friday is a thin end-to-end slice: Start, gate, record,
    queue, arrive or stop, **and a bare family page** (map, last position and
    its age, overdue notice, ended state) with "Copy link". Saturday is the
    family text, "Remind me", polish and fixes.
*   **Needs RJ:** yes. It changes the split he set.

### B2. The fallback is not defined

*   **Raised by:** zoom-out, comprehension.
*   **Problem:** The doc does not say why the old tracker stopped on Nov 25,
    what the repair is, or how long it takes. A repair of unknown size,
    started Saturday evening, is not a fallback.
*   **Proposed fix:** State the cause and steps. Either do the repair now (it
    needs no change to the preview), or name a no-code fallback (the text
    with planned arrival and overdue time, plus Apple Find My). Set a time on
    Saturday by which the choice is made.
*   **Needs RJ:** yes.

### B3. "Arrived" is said before it is true, and it switches the overdue notice off

*   **Raised by:** design critic.
*   **Problem:** The trip ends 2 nm before the inlet. The family page then
    says "RJ arrived at Palm Beach Inlet", and from that moment the service
    no longer reports overdue. A problem in the inlet would never be flagged.
    This breaks the doc's own rule about not saying a thing before it has
    happened.
*   **Proposed fix:** Change the words, not the rule: "RJ reached the approach
    to Palm Beach Inlet at 12:48 PM. Position sharing stops here by design.
    This page no longer watches this trip." The same last sentence for
    "stopped sharing".
*   **Needs RJ:** yes (wording).

### B4. The queue can throw away positions and the "trip ended" message

*   **Raised by:** design critic, comprehension.
*   **Problem:** Anything the service answers `refused` is dropped, whatever
    the reason. The service refuses items from a device whose clock is more
    than 10 minutes wrong. So a wrong clock would silently lose every
    position and the "ended" message while the screen says "All sent". The
    halving rule can also drop an event, against "events are never dropped".
    And `not_found` stops recording for good, although the service gives the
    same answer for a mistyped address.
*   **Proposed fix:** Work out the difference between the device clock and
    the service clock from the Start answer and stamp items in service time.
    Keep and retry items refused as `future`. Never drop `ended`, `resumed` or
    `overdue`; show a clear error instead. On `not_found` keep recording and
    queueing, show the message, retry slowly. Add a status row "N positions
    not accepted by the tracker".

### B5. Practice mode cannot work as described

*   **Raised by:** zoom-out, comprehension, implementation readiness,
    codebase details.
*   **Problem:** "60 times real speed" does not say what times and speeds the
    made-up positions carry. Made-up times run ahead of the service clock and
    are refused. Real times make the worked-out speed about 1,500 kt, which is
    also refused. Friday's whole test depends on it.
*   **Proposed fix:** Item times use the real clock; speed is a made-up 26 kt;
    the interval is counted in practice time. Say what the practice trip
    sends as planned arrival and overdue time and how it is ended and removed
    (each one counts against the 50-a-day cap).

### B6. No way to test against a locally running service

*   **Raised by:** comprehension, implementation readiness, codebase details.
*   **Problem:** The service address is fixed to the preview copy, but the
    build check needs a local one. The published service only answers pages
    on `https://rjm0824.github.io`.
*   **Proposed fix:** Write the preview address in the doc. Define one
    override that works only on `localhost` (for example `?api=`), with the
    serve command, the port (8788) and the local settings from
    `tracker-service.md`.

### B7. The map code cannot be reused the way the doc says

*   **Raised by:** zoom-out, comprehension, implementation readiness,
    codebase details.
*   **Problem:** `next/js/map.js` needs the Plan page's buttons, the written-in
    route and a helper from the forecast file. Loaded on a new page it stops
    with an error on its last line. The family page section says it does not
    load the map file at all, yet relies on a control the plan puts there.
*   **Proposed fix:** Leave `map.js` alone. One small new map file for the
    Live and family pages (route line, boat, trail, zoom, recenter and the
    follow switch) that takes the route as an input. No radar on the Live map
    for this crossing.

## Major

### Scope and schedule

*   **M1. "Nothing else is optional" is not true** (zoom-out, readiness).
    These do not serve this crossing and should move to "after" now, not sit
    on a cut list: "Track from another device" and its link; "Add to Google
    Calendar"; the recenter icon on the Plan map; the interval picker (fix it
    at 5 minutes, which also removes the quiet-limit formula); "Resume
    sharing"; points passed; the trip-over gate and arrival rules; the
    `mvp.md` edits. **Needs RJ.**
*   **M2. Rewriting the working Plan page two days out** (zoom-out,
    readiness, codebase). Removing the old tracking code touches `plan.js`,
    `boot.js` and `settings.js` on the page RJ uses for the go or no-go call,
    with hidden knock-ons: the line that reveals the `#captain` tools lives
    in the code to be removed, and `boot.js` writes to a box that would be
    gone. Fix: Friday adds one "Start trip" button that links to the Live
    page. The old code is removed after the crossing. This reverses D8.
    **Needs RJ.**
*   **M3. Both days are overloaded** (readiness). With M1, M2 and B1 applied
    the days fit. RJ's test block is near dusk for an on-water run; name an
    earlier slot and a time by which each pull request must be ready.
*   **M4. The doc is too long for its reader** (zoom-out). Add a one-page top
    section: what works Friday, what works Saturday, what is cut, the go or
    fallback rule. Move function lists and settled details to an appendix.

### Privacy

*   **M5. The route's first point may give the house away** (comprehension,
    design critic). The route sent to the service, drawn on the family map
    and named in the family text starts at "Guana Cay" (26.6950, -77.1300).
    The doc never says how near that is to the house. Fix: start the
    published route at Whale Cay Passage, and say "Leaving Abaco" in the
    text. **Needs RJ.**
*   **M6. The start point leaves the device** (zoom-out, comprehension,
    design critic). The doc says it is "kept on the device only", but the
    "Track from another device" link carries it. Fix: leave it out of the
    link (moot if that feature moves to after the crossing).
*   **M7. Opening the Live page without `?trip=home` in Abaco** (design
    critic, codebase). The trip-over rules would apply: the arrival rule is
    already true at the dock, so the page would send "arrived at Green
    Turtle", and only the 500-yard rule would protect the house. A reload or
    a device link without the query has the same effect. Fix: refuse Start
    unless the device is nearer the route's first point than its last; no
    arrival until the gate has opened; the saved trip's direction wins over
    the address.
*   **M8. The 500-yard rule never changes an outcome on these two routes**
    (zoom-out), because the longitude lines are further out. Zoom-out would
    drop it until Routes. Counter-point from M7: it is the only protection
    when the direction is wrong. Recommendation: keep it; it is one line and
    RJ decided it.
*   **M9. "Resume sharing" after arrival** (comprehension, design critic,
    readiness, codebase). Inside the arrival zone it either ends again at
    once or tracks into the inlet and the dock; today's page blocks positions
    west of 80.02°W in both directions and the new gate drops that. Fix:
    never record inside the arrival zone; keep the 80.02°W line for the trip
    home; or remove Resume for this crossing (M1).
*   **M10. Saturday's test shares from the dock** with "Hide my start" off,
    while "Delete this trip" is on the cut list (comprehension, readiness).
    Fix: Delete is not cuttable, or the test starts away from the house.
*   **M11. Positions are exact; today's page rounds them to about 1 nm**
    (zoom-out, design critic, codebase). `mvp.md` W10 chose exact positions.
    The doc's goal "at least as strong as today's page" should say so.

### What followers see

*   **M12. The "quiet" rule has no upper limit** (design critic). One long
    gap makes the page show a normal "Underway" for hours with no updates.
    Fix: amber after 20 minutes without a position, always (simple once the
    interval is fixed at 5 minutes). "Started" also needs "No position
    received yet, N min after start", and an estimate already in the past
    reads "was due about".
*   **M13. Overdue depends on a successful read** (design critic). If the
    service is unreachable when the overdue time passes, an open page shows
    an old map and no notice. Fix: the page already holds the overdue time;
    show the notice from that.
*   **M14. Wrong order on the family page** (design critic). Events are sent
    before positions, so "Passed Memory Rock" could show while the dot is 40
    minutes behind. Fix: sort by the time each thing happened; take the boat
    from the service's `last`.

### Device behaviour

*   **M15. Start retries** (design critic, codebase). Each retry that reaches
    the service makes another trip and counts toward the daily cap. A badly
    formed request shows "Couldn't reach the tracker. Still trying…" forever.
    Times must be whole numbers or the service refuses them. Fix: 3 automatic
    retries, then a button; its own message for a refused request; round the
    times; write out the exact Start body.
*   **M16. No check on GPS accuracy** (design critic). One coarse fix could
    open the gate, or two could end the trip within seconds. Fix: ignore
    readings worse than about 200 m for the gate, arrival and recording.
*   **M17. "See what family sees" puts the Live page in the background**,
    which pauses tracking (design critic; verify). Fix: warn first, or leave
    it out and use a second device.
*   **M18. Keep-awake is not a lift-and-shift** (codebase). `keepAwake` and
    `resumed` depend on five other pieces of the old file. List them. The
    PREVIEW banner is hidden unless `boot.js` shows it, and the new pages do
    not load `boot.js`.
*   **M19. The plan leaves choices to the builder** (readiness,
    comprehension): how the test page and Node load the calculation file;
    the shapes of a reading, a queue item and a log row; where "two readings
    in a row" lives; one retry rule, not two; a one-table summary of the
    service requests used; a glossary for project terms.

## Nits

*   The status line table lacks rows for: gate closed again after turning
    back; stopped (not arrived); tracking on another device.
*   "I'm fine, add 1 hour" and "Add 1 hour" are two labels for one button;
    CUJ 5 and Settled Details disagree on what shows while it sends.
*   The doc's CUJ numbers collide with `mvp.md`'s.
*   "About 15 nm" from Guana to the line is about 13.5 nm.
*   Two open tabs of the Live page would overwrite each other's queue.
*   The tracking device should act on the status in each Add answer (a trip
    stopped from the phone keeps being fed by the iPad).
*   "Calendar opened" is false if an in-app browser blocks the file. Add "If
    nothing opened, open this page in Safari." (verify)
*   "Delete this trip" straight after arrival turns followers' pages into
    "This link doesn't work". Warn first.
*   Q5 (Safari or Home Screen) is partly answered in `HANDOFF.md` for the
    iPhone; not for the iPad.
*   The Leaflet integrity value and the version-tag bumps are not in the file
    list.

## To check on the real iPhone and iPad

*   The share screen after a wait (Q1); calendar replace (Q2).
*   Whether location permission is asked again after a reload.
*   Whether an iPad reloads a long-open tab by itself. Crossing-day step:
    close other tabs and apps.
*   Whether the helm iPad has its own GPS (cellular models do; Wi-Fi-only
    ones do not).
*   Whether the "connection is back" signal fires on Starlink Wi-Fi.

## Decisions needed from RJ

1.  **B1:** Friday becomes end-to-end with a bare family page; Saturday is
    the text, "Remind me" and fixes.
2.  **M1, M2:** move the listed extras to after the crossing, and leave the
    Plan page alone apart from one button.
3.  **B3:** the "reached the approach" wording in place of "arrived".
4.  **M5:** start the published route at Whale Cay and say "Leaving Abaco".
5.  **B2:** why the old tracker stopped, and when the fallback choice is
    made.

Everything else has a proposed fix that can be applied without a decision.

## Resolution (Nov 25, 2026, revision 2 of the doc)

**RJ's decisions:**

1.  **B1:** approved. Friday is end to end with a plain family page.
2.  **M1, M2:** build the crossing version first, then a second sprint with
    the full build if ahead of schedule. The extras are listed as Sprint 2,
    not dropped. The Plan page gains one button; the old code is removed in
    Sprint 2.
3.  **B3:** RJ chose a different fix. The trip ends within 500 yards of the
    route's last point, so followers see the boat come into the inlet, and
    "arrived at Palm Beach Inlet" is then true. The app does not know where
    the dock is; nothing is shared after the end.
4.  **M5:** Guana Cay stays as the first point. It is a large island and
    followers want to see the boat reach or leave it.
5.  **B2:** the cause is not known. The fallback is the no-code one (RJ's
    text plus Find My); a look at the old tracker happens only if Friday's
    test fails. The call is made after Friday's test, or after Saturday's.

**Applied without a decision:** B4 (service-clock stamping; events never
dropped; `not_found` keeps recording; "not accepted" count), B5 (practice
mode's times and speeds), B6 (the preview address and a `localhost`-only
override), B7 (a new small map file; `map.js` untouched), M3 (ready-by times
and a daylight test), M4 (one-page summary), M6 (start point never in a
link), M7 (direction guard; no arrival before the gate opens), M8 (500-yard
rule kept), M9 and M17 (moved with their features to Sprint 2), M10 (Delete
is required on Saturday; the test starts away from the house), M11 (stated),
M12 (20 minutes, fixed), M13 (overdue shown without a read), M14 (ordered by
time; boat from `last`), M15 (three retries, whole numbers, own message),
M16 (200 m accuracy rule), M18 (keep-awake pieces listed; banner written
into the pages), M19 (shapes, one retry rule, request table, glossary).

**Nits:** applied, except the Leaflet integrity value (left to the build)
and the calendar replace question (moot: the reminder is offered again with
the new time).

**Not done:** a second review round on revision 2. The arrival rule (D11) is
new since the review and no reviewer has seen it.
