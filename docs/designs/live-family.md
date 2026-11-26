# Live Screen and Family Page (MVP Steps 6 and 7)

*   **Author:** RJ (rjm0824)
*   **Status:** Draft (revision 2, after review round 1 and RJ's Nov 25
    decisions)
*   **Date:** 2026-11-25

--------------------------------------------------------------------------------

## One-Page Summary

RJ crosses home from Abaco to Palm Beach on about Sun Nov 29 or Mon Nov 30,
2026. He will track it with the preview (`/next/`) and the new tracker
service. That crossing is the real trip that promote needs.

**Fri Nov 27, pull request 1: everything needed, end to end.**

*   A "Start trip & share with family" button on the Plan page.
*   A new Live page: start the trip, map, speed, distance left, arrival
    estimate, "All good", overdue notice with "add 1 hour", "Stop sharing
    now", "Copy family link".
*   The send queue: nothing is lost in a signal gap, and the screen never
    says "sent" before it is true.
*   The start gate: no position within 500 yards of the start, nor before
    Green Turtle on the trip home.
*   The trip ends by itself within 500 yards of Palm Beach Inlet.
*   A plain family page: map, where the boat is, last update, check-ins,
    overdue notice, and what shows after the trip ends.
*   Practice mode: a made-up crossing that plays in about 6 minutes.

**Sat Nov 28, pull request 2: the finish.**

*   "Send link to family" with the ready-written text.
*   "Remind me at [overdue time]" on the family page.
*   "Delete this trip".
*   Family page polish, and fixes from Friday's test.
*   Home port: the trip ends within 500 yards of where the boat is kept.
    This is the first thing dropped if Saturday runs short; the trip then
    ends at the inlet, as Friday's build does.

**Sprint 2: the full build, only if ahead of schedule** (otherwise after the
crossing). The home port setting first if Saturday dropped it, then "Add to
Google Calendar", "Track from another device", points
passed, the interval choice, "Resume sharing", radar on the Live map, the
recenter icon on the Plan map, and removing the old tracking code from the
Plan page.

**Go or fallback.** Friday evening's test is the real end-to-end test. If it
works, the crossing uses the preview. If it does not, Saturday is for fixes
and the call is made after Saturday's test on the water. The fallback needs
no code: the text RJ sends with planned arrival and overdue time, plus Apple
Find My. See "Fallback".

Nothing here changes the live page or `tracker/Code.gs`. It is a planning
aid, never a navigation tool. The captain decides.

--------------------------------------------------------------------------------

## Overview

This document covers the screens that use the tracker service: Start trip,
the Live screen on the captain's device, and the family page that followers
open from a link. The service is built and published
(`docs/designs/tracker-service.md`). The overall plan is
`docs/designs/mvp.md` (Step 6, Step 7, W1, W15, and its CUJs 6 to 11).

The preview still has RJ's boat, the Abaco route and the trip home
(`?trip=home`) written into it. Onboarding, saved setups and the bottom bar
do not exist yet. This design is for that page as it is, not for friends'
setups.

**Words used here:**

*   **Preview:** the copy of the app at `/next/`, where new work lands. It
    shows a PREVIEW banner. **Live page:** the app at `/crossing/`.
    **Promote:** the pull request that moves the preview to the live page.
*   **Tracker service:** the small program on Cloudflare that stores a trip.
    Preview address: `https://crossing-tracker-preview.rj-2a3.workers.dev`.
*   **Invite code:** the shared code needed to start a trip. RJ set it; it is
    in his password manager (Keeper), never in the repo or in chat.
*   **Trip key:** the secret that lets a device add to, end and delete one
    trip. **Family key:** the secret that only lets someone read it. The
    **family link** is the family page's address with the family key after a
    `#`.
*   **Overdue time:** the time after which the family page says the boat is
    overdue.
*   **Tracking device:** the phone or iPad that reads GPS and sends
    positions.
*   **Reading:** one GPS fix. Readings arrive every second or so and stay on
    the device.
*   **Recorded position:** a reading the device keeps and sends. One every 5
    minutes.
*   **Item:** one thing sent to the service: a recorded position or an event
    (check-in, overdue time changed, trip ended).
*   **Send queue:** items saved on the device that the service has not yet
    confirmed.
*   **Start gate:** the rule that hides the boat near where the trip starts.
*   **Named points:** the route's named waypoints. Trip home: Guana Cay,
    Whale Cay Passage, Green Turtle Cay, Crab Cay, the two Bank points,
    Memory Rock, Gulf Stream, Palm Beach Inlet.
*   **W1, W15 and so on:** numbered choices in `mvp.md`. **Row N:** a line in
    `mvp.md`'s Build Order.

## The Problem

1.  The preview's tracking code talks to the old Apps Script tracker, which
    stopped accepting positions on Nov 25. Nothing in the preview calls the
    new service except the test page.
2.  The old send cannot tell whether a position arrived, so the screen says
    "Sent" when it may not have been.
3.  A position that fails to send is lost. There is no queue.
4.  Followers open the same page as the captain. There is no link per trip,
    no overdue notice, and nothing closes after arrival.

## Goals

*   RJ starts a trip on the helm iPad with the preview, and the tracker
    service receives positions for the whole crossing home.
*   A follower who opens the family link sees the boat, its trail, the
    route, an arrival estimate, check-ins, and an overdue notice when it
    applies, with no app and no login.
*   **Nothing is lost to a gap in signal.** What is recorded with no signal
    is sent when signal returns and the page is open in front.
*   **Every button tells the truth.** It shows it was pressed, then the real
    result. The screen never says "sent", "received" or "set" until that has
    happened.
*   **The Abaco house and the Palm Beach dock do not show.** Nothing is
    shared before Green Turtle on the trip home, nor within 500 yards of the
    start, nor after the boat is within 500 yards of the route's last point.
    One difference from today's page, already chosen in `mvp.md` W10:
    positions are exact, where today's page rounds them to about a mile.
*   **Followers see the boat come in.** The trip stays shared until the boat
    is at the inlet (RJ, Nov 25).
*   Friday's pull request works end to end, so there is a day to fix faults.
*   $0. Nothing runs on its own.

## Non-Goals

*   **Friends' setups.** Boat, captain's name, route and cruise speed are the
    values written into `next/js/settings.js`.
*   **The bottom bar, Menu and Settings screens** (row 7).
*   **The live page and `tracker/Code.gs`.** Not touched.
*   **Rewriting the Plan page.** It gains one button. Its old tracking code
    stays until Sprint 2.
*   **Texts or alerts sent by the app.** The captain sends one text himself
    (W1).
*   **Tracking with the screen locked or the page in the background.**
*   **Loading the page with no signal** (W16). A page that is already open
    keeps working. A device that restarts offshore cannot reopen it until it
    has signal.
*   **Navigation.** No course to steer. Wording says where the boat is and
    when it may arrive.

## Scope

| Piece | When |
| --- | --- |
| "Start trip" button on the Plan page | Fri |
| Ready screen and Start request | Fri |
| Live screen: map with recenter, speed, distance left, arrival estimate, time underway | Fri |
| Send queue and true status wording | Fri |
| Start gate; arrival; "Stop sharing now" | Fri |
| "All good" check-in | Fri |
| Overdue notice on Live with "I'm fine, add 1 hour" | Fri |
| "Copy family link" | Fri |
| Family page: map with recenter, status, check-ins, overdue, ended states | Fri |
| Practice mode; test page for the calculations and queue | Fri |
| "Send link to family" with the ready-written text | Sat |
| "Remind me at [overdue time]" (calendar file made on the phone) | Sat |
| "Delete this trip" | Sat |
| Family page: "Moving slowly" and "Stopped" wording, time-zone labels | Sat |
| Home port: end the trip within 500 yards of it (D15) | Sat, first to drop; then Sprint 2, first |
| "Add to Google Calendar" | Sprint 2 |
| "Track from another device" | Sprint 2 |
| Points passed, with estimates for those ahead | Sprint 2 |
| Interval choice (1, 5, 10, 30 minutes) | Sprint 2 |
| "Resume sharing" for 10 minutes after an end | Sprint 2 |
| Radar on the Live map; recenter icon on the Plan map | Sprint 2 |
| Remove the old tracking code from the Plan page | Sprint 2 |
| "New family link"; battery level; wind on the family page | Later |
| Start gate line for any route (row 9); queue in the browser's database (row 14); loading with no signal (row 17) | Later |

Sprint 2 starts only when Friday's and Saturday's pull requests are merged
and tested. Its details are in "Sprint 2" near the end and get a short check
of their own before building.

## Decisions

**Decided by RJ on Nov 25:**

*   **D1. Start gate.** A position is recorded only when the boat is more
    than 500 yards from where the trip started **and** past today's line for
    that direction (west of 77.36°W on the trip home, which is past Green
    Turtle; east of 80.02°W on the trip over, which is outside the inlet).
    This changes W15 from about 1 nm to 500 yards. "Hide my start" is on by
    default; off is for test runs.
*   **D2. Start trip is two steps:** "Start trip" talks to the service;
    sending the link is a separate tap.
*   **D3. Distance left is measured along the named points** on both
    screens.
*   **D5. This crossing is started on the helm iPad.**
*   **D6. No phone numbers on the overdue notice yet** (see Build
    Reminders).
*   **D9. Friday's pull request is end to end,** including a plain family
    page.
*   **D10. Crossing build first, then a second sprint** for the full build if
    ahead of schedule.
*   **D11. The trip ends within 500 yards of the route's last point,** so
    followers see the boat arrive at the inlet. This replaces today's rule (2
    nm out) and `mvp.md`'s arrival rule for now. The app does not know where
    the dock is; nothing is shared after the end, so the run from the inlet
    to the dock stays hidden.
*   **D12. The route starts at Guana Cay** on the family map and in the
    family text. It is a large island, and followers want to see the boat
    reach or leave it.

**Working choices (recommendations RJ has not objected to):**

*   **D4.** The queue is kept in the browser's simple store (localStorage),
    not its database. A crossing is well under 100 KB and it is far less code
    to get right by Friday.
*   **D7.** A follower's reminder holds the family link.
*   **D13.** The interval is fixed at 5 minutes until Sprint 2.
*   **D14.** A mistaken "Stop sharing now" is fixed by starting a new trip
    and sending the new link, until "Resume sharing" exists.

*   **D15. The app can know a captain's home port (RJ, Nov 25).** It is part
    of the captain's profile. It is saved on the captain's device only: never
    sent to the service, never in a link, never in the repo. When a route
    ends near the home port, the trip keeps being shared past the route's
    last point and ends within 500 yards of the home port, so followers see
    the boat nearly home. **Decided by RJ:** aim to build it in
    Saturday's pull request as a simple setting. If Saturday has to be
    simplified to have a working version before he leaves, it is the first
    thing dropped and the trip ends at the inlet point (D11). It moves into
    the profile when onboarding is built (row 8). See "Home Port".

*   **D16. The arrived page celebrates and keeps a map (RJ, Nov 25
    evening, after testing pull request 1).** Wording: "✓ RJ has arrived!",
    the place and time, the crossing time, and "Position sharing has stopped.
    This page closes 2 hours after arrival." The map stays, with the route
    and the boat parked on the destination's named point, never a real
    position, so the privacy statement is unchanged. This replaces "Map:
    Removed" for the Arrived row of the family table. Pull request 2.
*   **D17. A follower who first opens the link after arrival** sees the
    celebration without the map, because `/v1/read` returns only `dest`
    once a trip has ended. Returning the route's points with the ended
    answer is a small tracker change in Sprint 2.

D8 (remove the old tracking code in pull request 1) was withdrawn after
review; that work moved to Sprint 2.

## Open Questions

*   **Q1. Does the share screen open after the service answers,** or only
    straight from a tap? The design assumes only from a tap. Checked on RJ's
    iPhone and iPad on Saturday. "Copy family link" does not depend on the
    answer.
*   **Q2. Why did the old tracker stop on Nov 25?** Not known. See
    "Fallback".
*   **Q3. Does the screen stay awake for a whole crossing?** The crossing is
    the test. Auto-Lock set to Never is the backstop.
*   **Q4. Does an iPad reload a long-open page by itself?** If it does with
    no signal, tracking stops until signal returns. Crossing-day step: close
    other tabs and apps.
*   **Q5. Safari tab or Home Screen icon on the iPad?** They may keep
    separate saved data. Until tested: start and track in the same place.
*   **Q6. Does the helm iPad have its own GPS?** It tracked the August
    crossing, so probably. Friday's test shows the accuracy figure.

## Critical User Journeys (CUJs)

Numbered L1 to L8 so they are not confused with `mvp.md`'s.

### L1: Start the trip home

*   **Given**: RJ is at the dock on Guana with signal. The invite code was
    typed into the iPad once.
*   **When**: He opens the preview with `?trip=home`, taps "Start trip &
    share with family", checks the Ready screen and taps "Start trip".
*   **Then**: The button reads "Starting…". When the service answers, the
    Live screen shows "Trip started 7:05 AM" and "Waiting until you're past
    Green Turtle to share your position." Nothing about where he is has been
    recorded or sent.

### L2: Underway

*   **Given**: The boat is west of Green Turtle.
*   **When**: 5 minutes pass.
*   **Then**: One position is recorded, saved to the queue and sent. The
    status line reads "All sent. Tracker last received 8:02 AM." The map
    follows the boat.

### L3: A gap in signal

*   **Given**: Starlink drops for 40 minutes.
*   **When**: Positions are recorded and RJ taps "All good".
*   **Then**: The button reads "Sending…", then "Couldn't send. Saved, will
    retry." The status line reads "Saved 9 updates. Will send when signal
    returns. Keep this page open." When signal returns the queue goes in one
    request and the check-in row reads "Received by tracker 9:47 AM".

### L4: Arrival

*   **Given**: The boat comes within 500 yards of the Palm Beach Inlet point.
*   **When**: Two good readings at least 5 seconds apart agree.
*   **Then**: The trip ends on the device. "Trip ended, arrived" is queued
    with the time. Nothing more is recorded. The screen reads "Arrived at
    Palm Beach Inlet 12:48 PM. Sharing has stopped." If the queue is not
    empty it adds "Open this page when you have signal so your followers see
    you arrived."

### L5: Overdue on the Live screen

*   **Given**: The overdue time passes and the trip has not ended.
*   **Then**: A notice reads "You are past your overdue time (2:10 PM). Your
    followers see an overdue notice." A button reads "I'm fine, add 1 hour".
    Tapping it shows "Sending…", then "New overdue time 3:10 PM received", or
    with no signal "Saved, will retry. Followers still see overdue."

### L6: A follower watches

*   **Given**: A follower has the family link.
*   **When**: They tap it.
*   **Then**: A map with the boat, its trail and the route; "RJ is 38 nm from
    Palm Beach Inlet", "Arriving about 12:52 PM", "Last update 2 min ago",
    speed and time underway; then check-ins. It refreshes every 30 seconds
    while in front.

### L7: Overdue on the family page

*   **Given**: The overdue time has passed and the trip has not ended.
*   **Then**: A notice above the map: "RJ has not arrived by the overdue
    time, 2:10 PM." Then the last position in a form that can be read aloud,
    its time and age, and its distance from the destination. Then "This page
    cannot call for help. If you are worried, call the Coast Guard." The
    notice shows even if the page cannot reach the service at that moment.

### L8: After arrival

*   **Given**: The service has learned the trip ended.
*   **Then**: The map and position are gone. The page reads "RJ arrived at
    Palm Beach Inlet at 12:48 PM. Position sharing has stopped." Two hours
    later it reads "This trip has ended."

## Technical Plan (Architecture)

### Pages

```text
 next/index.html   Plan page (exists). Gains one button. Nothing removed.
        |
        v  link, keeps ?trip=home
 next/live.html    Ready screen -> Live screen -> Ended screen.
        |          Reads GPS. Saves to the queue. Sends to the service.
        |
        |  family link, copied or sent by the captain
        v
 next/family.html  Family page. Reads one trip with the family key.
                   Saves nothing on the follower's phone.
```

All three show the PREVIEW banner and "Planning aid, not for navigation. The
captain decides." The two new pages write the banner into their own HTML
(the Plan page's banner is switched on by `boot.js`, which they do not load).
Both carry `<meta name="robots" content="noindex">` and `<meta
name="referrer" content="no-referrer">`.

### Service Requests Used

Full detail is in `tracker-service.md`, "Requests and Answers". All are POST
with a JSON body sent as plain text, never with `mode: 'no-cors'`.

| Request | Sent | Answer |
| --- | --- | --- |
| `/v1/start` | `invite`, `boat`, `captain`, `route: { name, points: [{ name, lat, lon }], dest, cruiseKt }`, `plannedArrival`, `overdueAt` | `tripKey`, `familyKey`, `startedAt` |
| `/v1/add` | `tripKey`, `items` (1 to 100) | `status`, and per item `r`: `stored`, `had` or `refused` with `why` (`future`, `early`, `full`, `invalid`) |
| `/v1/read` | `familyKey`, `after` (the highest `seq` held; left out the first time) | Underway: `status`, `overdue`, `boat`, `captain`, `route`, `startedAt`, `plannedArrival`, `overdueAt`, `last`, `items`, `more`, `now`, `pollSeconds`. Ended: `status` (`arrived` or `stopped`), `dest`, `endedAt`. Later: `status: 'closed'`. |
| `/v1/delete` | `tripKey` | `deleted: true` |

Item kinds used: `pos` (`lat`, `lon`, `sog`), `checkin`, `overdue` (`value`:
the new time), `ended` (`value`: `arrived` or `stopped`). Errors: `invite`,
`cap`, `not_found`, `bad_request`, `too_many` (more than 100 items in one
request), `server`. Times are whole milliseconds; every time and item `t` is
rounded before sending, because the service refuses fractions.

### Shared Calculations

One new file, `next/js/trip-math.js`, holds every calculation as small
functions with no screen code. The Live page and the family page both load
it. The route, gate line and arrival rule are passed in; it reads no other
file.

*   **Distance left.** Find the place on the line through the named points
    nearest the boat (checking each straight segment, not only the corners).
    Distance left is the line's length from there to the end. Planned arrival
    uses the same line's full length.
*   **Speed.** The average of the GPS speed readings from the last 10
    minutes; where the device gives none, worked out from the distance
    between readings. Each recorded position carries it as `sog`. With no
    speed yet, `sog` is left out and the screens show "–".
*   **Arrival estimate.** Live screen: now plus distance left divided by
    speed. Family page: the time of the last position plus its distance left
    divided by its speed. If that time has passed it reads "was due about".
*   **Slow:** under 40% of cruise speed. **Stopped:** under 3 kt; the
    estimate reads "On hold".
*   **Quiet (family page):** the last position is more than 20 minutes old.
*   **Good reading:** accuracy of 200 m or better. Only good readings are
    used for the gate, arrival and recording.
*   **Service clock.** The device works out the difference between its own
    clock and the service's from the Start answer and stamps every item in
    service time. The family page does the same from each Read answer's
    `now`. A wrong clock on either device then does not matter.
*   **Positions read aloud:** degrees and decimal minutes, for example
    "26° 48.74' N, 079° 27.40' W".

### Start Gate (D1)

`mayShare(reading, trip, rules)` decides for every good reading. It is
recorded only when all of these are true:

1.  The trip is underway.
2.  "Hide my start" is off, **or both**: the reading is more than 500 yards
    from the trip's start point, and it is past the line for the direction
    (trip home: west of 77.36°W; trip over: east of 80.02°W).

The start point is the first good reading after Start. It is kept on the
device only and is never put in any link.

A reading that fails still drives the captain's own map and stats. It is
never saved to the queue and never sent. If the boat turns back behind the
gate it is hidden again, and the status line says so.

**Direction guard.** The direction comes from `?trip=home`. Opening the Live
page without it in Abaco would apply the trip-over rules. So:

*   Start is refused unless the device is nearer the route's first point than
    its last: "This looks like the trip home. Switch to trip home" with the
    link (and the reverse).
*   If a saved trip's direction differs from the address, the page reloads
    with the right one.

### Arrival and Stopping (D11)

*   **Arrival:** two good readings at least 5 seconds apart are within 500
    yards of the route's last point (trip home: the Palm Beach Inlet point at
    26.7722, -80.0301), or have gone past it (trip home: west of 80.035°W;
    trip over: east of 77.325°W). Arrival cannot happen until the gate has
    opened once.
*   **Stop sharing now** asks "Stop sharing? Your followers will no longer
    see the boat. To share again you would start a new trip." with "Stop
    sharing" and "Keep sharing".
*   Either one queues `ended` with the time it happened. Nothing is recorded
    after that.

### What Is Saved on the Tracking Device

Names start with `cx:next:` on the preview. The live page will use
`cx:live:` at promote, because both share one saved-data area.

| Name | Holds |
| --- | --- |
| `cx:next:invite` | The invite code, typed once on this device. |
| `cx:next:trip` | The current trip (shape in Settled Details). |
| `cx:next:queue` | Items not yet confirmed by the service. |
| `cx:next:trail` | Recorded positions, for drawing the trail after a reload. |
| `cx:next:log` | The last 30 events, each "saved", "received" or "not accepted", with a time. |

The trip key stays in this saved data and nowhere else. If saving fails the
Live screen shows "This device can't save updates. They will be lost if the
page closes." and keeps working from memory. The queue is read again before
every change and items are removed by ID, so a second open tab cannot
overwrite it.

### The Send Queue

*   **Saved first, then sent.** Every item goes into `cx:next:queue` before
    any request.
*   **Item IDs.** Positions: `p` + time. Events: `e-` + 8 random letters and
    digits.
*   **When it sends:** right after an item is added; every 30 seconds while
    the queue is not empty; when the page returns to the front; when the
    browser reports the connection is back. One request at a time, given up
    after 20 seconds. That is the only retry rule.
*   **What it sends:** events first, then the oldest positions, up to 100.

| Answer | What the queue does |
| --- | --- |
| `stored` or `had` | Removes the item. Its log row becomes "Received by tracker [time]". |
| `refused`, `why: future` | Keeps it and retries. (The service clock rule should prevent this.) |
| Position `refused` for another reason | Removes it and adds one to "not accepted". |
| Event `refused` | Keeps it. Shows "The tracker did not accept '[event]'. Followers may not see it." |
| `too_many`, or `bad_request` for the whole request | Halves the batch and retries. A single position refused alone is removed and counted. A single event is kept, with the message above. |
| `not_found` | Keeps recording and queueing. Shows "The tracker can't find this trip. Still saving. Trying again each minute." |
| No connection, time-out, `server`, Cloudflare's daily limit | Keeps everything. Tries again on the 30-second tick. |

At most 3,000 positions are queued (ten days at 5 minutes). Past that the
oldest position is dropped. Events are never dropped.

**Status line** (always visible during a trip):

| Situation | Words |
| --- | --- |
| Queue empty, something confirmed | "All sent. Tracker last received 8:02 AM." |
| Request in flight | "Sending 3 updates…" |
| Items waiting after a failure | "Saved 9 updates. Will send when signal returns. Keep this page open." |
| Some positions not accepted | Adds "3 positions were not accepted by the tracker." |
| Gate closed (start, or turned back) | "Waiting until you're past Green Turtle to share your position." |
| No good reading for 2 minutes | "No GPS position right now." |
| Ended as arrived, queue not empty | "Open this page when you have signal so your followers see you arrived." |
| Ended as stopped, queue not empty | "Open this page when you have signal so your followers see sharing has stopped." |
| Ended, queue empty | "Your followers can see the trip has ended. Received 12:49 PM." |

### Button Rule

Every button that causes a request has three looks:

1.  **Pressed:** it dims and its label changes at once ("Sending…",
    "Starting…"). It cannot be tapped again in this state.
2.  **True result:** "Received 9:45 AM", "Trip started 7:05 AM".
3.  **Not yet:** "Couldn't send. Saved, will retry." When the queue delivers
    it, the log row changes to "Received by tracker [time]".

Buttons that hand off to another app say only what the page did: "Link
copied", "Share screen opened", "Calendar opened. Tap Add there to save the
reminder." "Sent", "received" and "set" are used only after the service has
answered `stored` or `had`, or returned the keys.

### Ready Screen (Friday)

Opened from the Plan page's button. With no trip in progress `live.html`
shows:

*   Route name: "Trip home: Guana Cay to Palm Beach Inlet".
*   **Planned arrival:** now plus the line's length divided by 26 kt.
*   **Overdue time:** planned arrival plus 80 minutes, with − and + in
    30-minute steps, never earlier than planned arrival.
*   **Hide my start:** on. "On: your position is hidden until you are past
    Green Turtle. Off: shared from the dock, for test runs away from home."
    Not remembered between trips.
*   **Invite code:** a password box, shown only when none is saved.
*   **Start trip.**

Tapping Start asks for one GPS reading (the phone's permission question
follows the tap), runs the direction guard, then calls the service.

| Outcome | Screen |
| --- | --- |
| Keys returned | Live screen. "Trip started 7:05 AM." The invite code is saved. |
| No reading in 20 seconds, or permission refused | "This page needs your location to start a trip." with the steps to allow it. No trip is started. |
| Wrong direction | The direction guard message. |
| `invite` | "Invite code not accepted. Check it and try again." |
| `cap` | "The tracker has reached today's limit for new trips. Try again after 7 PM Eastern." |
| `bad_request` | "The tracker did not accept this trip. Nothing was started." |
| No answer, or any other failure | "Couldn't reach the tracker. Trying again…" Three tries 15 seconds apart, then "Couldn't reach the tracker." with "Try again". Each try that reaches the service without its answer getting back leaves an unused trip there, which the service deletes after 30 days. |

### Live Screen (Friday)

Top to bottom, following `docs/mockups/Main.dc.html`:

1.  **Note:** "Keep this page open in front while sharing." and the
    keep-awake line.
2.  **Overdue notice**, when it applies (L5).
3.  **Map:** the detailed route line, trail and boat; zoom buttons and the
    recenter icon.
4.  **Stats:** Speed, Left to go, Live arrival estimate, Underway. "Slow" and
    "Stopped" appear beside the speed. GPS accuracy in small print.
5.  **Status line.**
6.  **Send "All good" to family.**
7.  **Sharing:** "Sharing: on · every 5 min". "If not arrived by 2:10 PM your
    followers see an overdue notice." with "I'm fine, add 1 hour" (the same
    button as in the notice). "Stops by itself at Palm Beach Inlet." "Copy
    family link" ("Link copied").
8.  **Stop sharing now.**
9.  "Planning aid, not for navigation. The captain decides."

**GPS.** Continuous readings with high accuracy. Each reading updates the map
and stats. Every 5 minutes one good reading is recorded if the gate allows.
If no reading has come for 5 minutes the page asks for a single one.

**Reload.** Reopening the page during a trip shows the Live screen and
restarts GPS without a tap. Keep-awake may need one tap; the note says so.

**Ended screen.** How and when it ended, time underway, the status line, and
"Start a new trip" once the queue is empty.

### Recenter Icon (Friday, Live and Family Maps)

A third square button under the map's + and −, a target symbol, labelled
"Recenter" for screen readers.

*   **A boat position exists:** centres on the boat and turns "follow the
    boat" back on. If the map is zoomed out past about 40 nm across it zooms
    in to that.
*   **Otherwise:** shows the whole route.
*   The map follows the boat until someone drags or zooms it, then stays put
    until Recenter is tapped. The icon is filled while following and
    outlined while not, so the press shows.

### Family Page (Friday Plain, Saturday Polish)

A separate page. It loads the map library, `trip-math.js`, `tracker-api.js`,
`tripmap.js` and its own script. It does not load the forecast or the
written-in route, and saves nothing on the follower's phone.

**The link:** `https://rjm0824.github.io/crossing/next/family.html#k=` + the
family key. The part after `#` is never sent to GitHub.

**Reading.** First the whole trip, then every `pollSeconds` (30) for items
after the last one held. It stops when not in front and reads at once on
return. If `more` is true it reads again straight away. The boat is drawn
from the answer's `last`; the list is ordered by when each thing happened.

**Layout:** overdue notice (when it applies); map (boat, trail, straight
lines between the named points); status; "Remind me" (Saturday); check-ins
and overdue-time changes, newest first; "If RJ isn't in by 2:10 PM this page
shows an overdue notice with his last known position. The link closes 2
hours after the trip ends."; "Planning aid, not for navigation. The captain
decides. This page cannot call for help. In an emergency call the Coast
Guard."

All text from the service is placed on the page as plain text, never as page
code.

| State | When | Words | Map |
| --- | --- | --- | --- |
| Started | Underway, no position yet | "Trip started at 7:05 AM. The boat's position will appear once it is in open water." After 60 minutes, in amber: "No position received yet, 64 min after the start." | Route only |
| Underway | Position 20 minutes old or newer | "RJ is 38 nm from Palm Beach Inlet" · "Arriving about 12:52 PM" · "Last update 2 min ago" · "24 kt · 2 h 41 m underway" | Boat, trail, route |
| Slow (Sat) | Speed under 40% of cruise | Adds "Moving slowly" | Same |
| Stopped (Sat) | Speed under 3 kt | "RJ is stopped, 38 nm from Palm Beach Inlet" · "Arrival estimate on hold" | Same |
| Quiet | Last position older than 20 minutes | Amber: "No update for 43 min" · estimate greyed, "was about 12:52 PM" · "The boat may be out of signal. This page fills in when it reconnects." | Boat greyed |
| Overdue | The service says so, or the page's own check of the overdue time against the service clock | The notice in L7, above whichever state applies. Within 4 nm of the destination it leads with "Last heard close to Palm Beach Inlet". With no position: "No position was received for this trip." It never says the boat is fine. | Same |
| Arrived | Status `arrived` | "RJ arrived at Palm Beach Inlet at 12:48 PM. Position sharing has stopped." | Removed |
| Sharing stopped | Status `stopped` | "RJ stopped sharing at 11:15 AM. This page no longer shows the boat." | Removed |
| Unavailable | A read fails | "Can't reach the tracker right now. Showing what this page had at 10:42 AM. Trying again." | Stays |
| Ended | Status `closed` | "This trip has ended." The page stops reading. | Removed |
| Bad link | `not_found`, or no key | "This link doesn't work. Ask the captain for a new one." | None |

Friday shows times in the follower's own zone. Saturday adds the zone's
short name ("12:52 PM EST").

### Family Text (Saturday)

"Send link to family" opens the share screen with this text; the result line
is "Share screen opened". **Draft, for RJ to approve in the pull request:**

> RJ here. Leaving Guana Cay for Palm Beach Inlet on Goof n' Off at 7:05 AM.
> Planned arrival about 12:50 PM. Follow the boat here: [link]
> If I'm not in by 2:10 PM, check the link, then try my phone.

### Remind Me (Saturday)

From RJ's iPhone test on Nov 25 (`mvp.md` Q1, closed): a calendar file made
on the phone opens "Add to Calendar" with the alert set, and the alert went
off on time. A file packed into the link did nothing. A Google Calendar link
works but uses the follower's own default alert (Sprint 2).

*   **"Remind me at 2:10 PM".** The page builds a calendar file on the phone
    and opens it (Test 2 of the calendar test page, which was removed from
    the preview after the test; its code is in the repo history at commit
    `3678d9d`, file `next/calendar-test.html`). Title: "Check on
    RJ's trip". Start: the overdue time. Length: 15 minutes. Alert: at the
    start. Notes: "Open the link to see where the boat is. The overdue time
    may have changed." Link: the family link.
*   Result line: "Calendar opened. Tap Add there to save the reminder. If
    nothing opened, open this page in Safari."
*   Shown while the trip is underway and the overdue time is ahead. If the
    captain changes the overdue time, the list shows "Overdue time changed to
    3:10 PM" and the button reads "Remind me at 3:10 PM".

### Delete This Trip (Saturday)

On the Ended screen: "Delete this trip from the tracker". It asks "Delete?
Your followers' link will stop working straight away." Pressed: "Deleting…".
Result: "Deleted" or "Couldn't delete. Try again with signal."
`privacy.html` already promises this.

### Home Port (Saturday If Time Allows, Else Sprint 2; D15)

*   **Setting it.** On the Ready screen, "Home port: not set" opens a map.
    The captain taps where the boat is kept and taps "Save as home port".
    It can be changed or removed there. With onboarding (row 8) this moves
    into the profile.
*   **Where it lives.** On the captain's device only, as `cx:next:homeport`.
    It is not in the Start request and not in any link.
*   **What it changes.** If the route's last point is within 15 nm of the
    home port, the trip does not end at the last point. It ends when two good
    readings are within 500 yards of the home port. With no home port, or a
    route that ends elsewhere, D11 applies.
*   **What followers see past the last point:** "RJ has passed Palm Beach
    Inlet and is heading in." with "Last update 2 min ago". No distance and
    no arrival estimate, because the service does not know where the home
    port is. The overdue notice still applies. At the end: "RJ arrived at
    12:58 PM. Position sharing has stopped."
*   **What it means for privacy.** Followers see the boat to within about
    500 yards of the home port, and those positions are stored by the
    service for 7 days after the trip. `privacy.html` says so in the same
    pull request.
*   **Left for the Routes step (row 9):** whether a trip that *starts* at the
    home port should then use only the 500-yard rule, without the "outside
    the inlet" line.

### The Plan Page (Friday)

One change: a "Start trip & share with family" button in the "Boat position"
box, linking to `live.html` and keeping `?trip=home`. If a trip is underway
on this device it reads "Back to your trip". A line in the `#captain` box
reads "The old tracker below stopped working on Nov 25. Use Start trip." No
code is removed.

### Practice Mode (Friday)

`live.html?practice=1` replaces GPS with a made-up boat that runs the route.

*   The boat moves along the line at 26 kt, with the clock running 60 times
    fast: a crossing takes about 6 minutes.
*   A position is recorded every 5 seconds (5 practice minutes).
*   Items carry the **real** time and a made-up speed of 26, so the service
    accepts them.
*   It starts a real trip on the preview service with the boat name "Practice
    run", so the family page can be watched on a second device. Planned
    arrival and overdue time are the normal ones.
*   `&overdue=1` sets planned arrival 2 minutes ahead and the overdue time 3
    minutes ahead, and stops the boat halfway, to show the overdue notices.
*   A "PRACTICE" tag shows on the Live screen. The trip ends by arriving, or
    by "Stop sharing now".

### Fallback

Why the old tracker stopped accepting positions on Nov 25 is not known (Q2).
What is known: two test points, sent with the key pasted from the password
manager, never reached the Crossing Tracker sheet.

*   **The fallback needs no code:** the text RJ sends before leaving, with
    planned arrival and overdue time, plus Apple Find My on his phone. This
    is in place whatever happens.
*   **Optional:** a short separate session to look at the old tracker with
    RJ (the Apps Script's run history usually shows the reason). Worth doing
    only if Friday's test fails.
*   **The call:** after Friday's test if it passes; otherwise after
    Saturday's test on the water.

## Alternatives Considered

### Alternative A: The Distance-from-Start Rule Alone

*   **Pros**: One rule for every route, as W15 says.
*   **Cons**: On the trip home the first dot would sit 500 yards from the
    Abaco house.
*   **Reason for Rejection**: RJ kept both rules (D1). The distance rule is
    also the only protection if the direction is ever wrong.

### Alternative G: Put the Home Port in the Repo or on the Service

*   **Pros**: Works on any device without setting it; the family page could
    show distance to it.
*   **Cons**: The repo is public, and the service would hold the place the
    boat is kept.
*   **Reason for Rejection**: Recommendation: reject. It stays on the
    captain's device.

### Alternative B: End the Trip 2 nm Out, as Today

*   **Pros**: The inlet and everything inside it stay unseen.
*   **Cons**: The page would say "arrived" before the boat had run the inlet,
    and the overdue notice would be off for that stretch.
*   **Reason for Rejection**: Rejected by RJ on Nov 25 (D11): followers
    should see the boat come in.

### Alternative C: Friday Without a Family Page

*   **Pros**: A smaller Friday.
*   **Cons**: Nothing a follower sees would be tested until the evening
    before the crossing.
*   **Reason for Rejection**: Rejected after review (D9).

### Alternative D: Reuse the Plan Page's Map File

*   **Pros**: No second map file.
*   **Cons**: `next/js/map.js` needs the Plan page's buttons, the written-in
    route and a helper from the forecast file, and stops with an error on a
    page without them.
*   **Reason for Rejection**: Recommendation: reject. A small new file is
    safer than changing the Plan page this week.

### Alternative E: Build Live into the Plan Page

*   **Pros**: One page.
*   **Cons**: A fault in the forecast code could stop tracking.
*   **Reason for Rejection**: Recommendation: reject.

### Alternative F: Have the Captain's Device Read the Trip Back

*   **Pros**: The Live screen would show exactly what followers see.
*   **Cons**: Doubles the requests from the boat and makes the Live screen
    depend on signal.
*   **Reason for Rejection**: Recommendation: reject. A second device with
    the family link does this.

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Risks and Mitigations

| Risk | What people see | Mitigation | What remains |
| --- | --- | --- | --- |
| New code fails on its first real crossing | "No update", or nothing | Practice mode and the test page Friday; a run on the water Saturday; the no-code fallback | First real use is the crossing. RJ tells followers it is a test. |
| The iPad locks, or the page closes or reloads offshore with no signal | "No update for X min", then overdue | Keep-awake; Auto-Lock Never; close other tabs and apps; a reload restores the trip when the page can load | A page that cannot reload offshore stops tracking (W16). |
| Saved data is cleared mid-trip | The trip cannot be ended by hand | None in this build | Followers see overdue until the trip is deleted at 30 days, or RJ deletes it in the Cloudflare dashboard. |
| The Live page is opened in the wrong direction | A false "arrived", or a weak gate | The direction guard; no arrival before the gate has opened; the 500-yard rule | None known. |
| "Hide my start" left off | The dock shows | On by default for every trip; not remembered | A captain who turns it off for a real trip. |
| A problem between the inlet and the dock | Followers read "arrived" | The page says "arrived at Palm Beach Inlet", which is true | That stretch is not tracked. RJ's text can say he will message when tied up. |
| A mistaken "Stop sharing now" | Followers lose the boat | A confirm step | A new trip and a new link (D14). |
| A coarse GPS fix | A false gate opening or arrival | Only readings accurate to 200 m count; two readings for arrival | A device with no real GPS would never record. The accuracy figure on screen shows it. |
| The device clock is wrong | Items refused | Items are stamped in service time | A clock that jumps mid-trip; such items are kept and retried. |
| The service is down or over its daily limit | Live: "Saved N updates". Family: "Can't reach the tracker" | The queue keeps everything; the family page still shows overdue from the time it holds | No live tracking until it returns. |
| A follower's reminder is stale after "add 1 hour" | The alert goes off at the old time | It says "Check on", not "overdue", and that the time may have changed | They open the page and see the new time. |

### Safety Wording

*   "Planning aid, not for navigation. The captain decides." on all three
    pages.
*   No "safe" or "safely". No course to steer. Estimates say "about".
*   The overdue notice and the family page say the page cannot call for help.
*   The overdue wording and the family text are drafts for RJ's attorney.

### Privacy

`privacy.html` changes in the same pull request as the behaviour.

**Friday:**

*   "In the preview version, your position is not recorded or sent until you
    are more than about 500 yards from where you started and, on the routes
    built in, past the start of open water. Sharing stops when you are within
    about 500 yards of the end of your route."
*   "Your invite code, the current trip and updates waiting to be sent are
    saved on your device."
*   "After a trip ends, followers no longer see any position. For 2 hours
    they see that you arrived (or stopped sharing), the place name and the
    time. Then the link closes."
*   Remove "signal strength". Battery level: "where your device provides it;
    iPhone and iPad do not."
*   The family page loads map images, so map providers see the follower's
    internet address, as with any web map.
*   The date at the top.

**Saturday:** "If a follower taps 'Remind me', a reminder is added to their
own calendar. It contains the trip's link."

Nothing new is stored by the service. No follower names or phone numbers are
collected.

### Cost

$0. No new accounts. Nothing runs on its own. Five followers with the page in
front for 7 hours make about 4,200 of the 100,000 free daily requests.

### Rollout and Undo

*   Both pull requests change only `/next/`, `privacy.html` and docs.
*   **Undo:** revert the pull request. A revert leaves behind the saved
    `cx:next:` data on devices that started a trip (harmless) and trips in
    the preview database (deleted by the service after 7 or 30 days).
*   The version tag on changed file addresses is bumped (`?v=20261127`, then
    `?v=20261128`).

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### Pull Request 1 (Fri Nov 27)

##### 1. `next/js/trip-math.js` (Create)

*   **Type / Scope**: Calculations only. A classic script that defines one
    global, `TripMath`, and ends with `if (typeof module !== 'undefined')
    module.exports = TripMath;` so Node can load it for tests.
*   **Proposed Changes**:
    *   `distNm(a, b)`. (A copy of `nm` in `helpers.js`, which cannot be
        loaded on the family page; to be merged in Sprint 2.)
    *   `lineLength(points)`; `alongLine(pos, points)` returning `{ alongNm,
        offNm }`; `leftNm(pos, points)`.
    *   `isGood(reading)`: accuracy 200 m or better.
    *   `avgSpeed(readings, nowMs)`: knots, or null.
    *   `motion(sogKt, cruiseKt)`: `'underway'`, `'slow'`, `'stopped'`, or
        `'unknown'` when speed is null.
    *   `etaMs(fromMs, leftNm, sogKt)`: a time, or null.
    *   `mayShare(reading, trip, rules)`; `nearerStart(reading, points)`.
    *   `inArrivalZone(reading, rules)`: true or false for one reading. The
        "two readings 5 seconds apart, after the gate has opened" count is
        kept by `live.js`.
    *   `fmtLatLon(lat, lon)`.
    *   `familyState(read, nowMs)`: `{ state, overdue, leftNm, etaMs,
        etaPast, ageMs, sogKt, motion }`, where `state` is a name from the
        family table.
    *   `GATE_NM = 0.247` (500 yards).

##### 2. `next/js/tracker-api.js` (Create)

*   **Type / Scope**: The only code that talks to the service.
*   **Proposed Changes**: `TRACKER`, the preview address above. On
    `localhost` only, `?api=` replaces it (for example
    `?api=http://localhost:8787`). `call(path, body)` posts as the table
    under "Service Requests Used" shows, gives up after 20 seconds, and
    returns `{ ok: true, data }` or `{ ok: false, error }`, where `error` is
    the service's word or `'network'`.

##### 3. `next/js/queue.js` (Create)

*   **Type / Scope**: Saved data and the sender. Pure parts are on a global
    `QueueRules`, exported for Node like `TripMath`.
*   **Proposed Changes**: `store.get(name)`, `store.set(name, value)` (false
    when saving fails). `QueueRules.nextBatch(queue, size)`;
    `QueueRules.applyResults(queue, results)` returning `{ queue, received,
    notAccepted, eventErrors }`; `QueueRules.cap(queue)`. `enqueue(item,
    logText)`; `sendNow()`; `onStatus(fn)`, called with `{ waiting, sending,
    lastReceivedMs, notAccepted, eventError, notFound, saveFailed }`.

##### 4. `next/js/tripmap.js` (Create)

*   **Type / Scope**: The map for the Live and family pages. `map.js` is not
    changed and not loaded by them.
*   **Proposed Changes**: `makeTripMap(element, { line, points })` draws the
    same three map layers as `map.js`, the route line (`line`, or straight
    lines between `points`), and the named points. It returns `{
    setBoat(pos, headingDeg, greyed), setTrail(list), recenter(), remove()
    }` and adds the recenter control and follow switch. Boat drawing and
    heading are taken from `loadTrack` in `tracking.js`.

##### 5. `next/live.html` and `next/js/live.js` (Create)

*   **Type / Scope**: The Ready, Live and Ended screens.
*   **Proposed Changes**: As under Ready Screen, Live Screen, Arrival and
    Stopping, and Practice Mode. Loads, in order: Leaflet CSS and JS (as
    `index.html` does), `css/app.css`, `settings.js`, `helpers.js`,
    `trip-math.js`, `tracker-api.js`, `queue.js`, `tripmap.js`, `live.js`.
    The page writes its own PREVIEW banner. Keep-awake is copied, not moved,
    from `tracking.js`: `keepAwake`, `showStatus` (with a `#capStatus`
    element on this page), `resumed`, the `visibilitychange` listener and the
    30-second timer. Direction rules, per direction, live in `live.js`: route
    name, gate line, arrival point and past-it line.

##### 6. `next/family.html` and `next/js/family.js` (Create)

*   **Type / Scope**: The plain family page.
*   **Proposed Changes**: As under Family Page, without the Saturday rows.
    Loads Leaflet, `css/app.css`, `trip-math.js`, `tracker-api.js`,
    `tripmap.js`, `family.js`. Holds items in memory only.

##### 7. `next/index.html`, `next/js/boot.js` (Modify)

*   **Type / Scope**: The Plan page.
*   **Proposed Changes**: Add the button and the one line in the `#captain`
    box (see "The Plan Page"). `boot.js` sets the button's address and label.
    Bump the version tags. Nothing else.

##### 8. `next/css/app.css` (Modify)

*   **Type / Scope**: Styles.
*   **Proposed Changes**: Live and family layouts at 390 px and iPad width;
    button states; status line; notices; recenter control. Tap targets at
    least 48 px high. Existing rules are not changed.

##### 9. `next/trip-test.html` (Create)

*   **Type / Scope**: A test page RJ opens. PREVIEW banner, `noindex`, no
    link from the app.
*   **Proposed Changes**: Runs the checks in the Verification Plan on
    `TripMath` and `QueueRules` and lists PASS or FAIL. The same checks run
    under Node from `next/test/trip.test.js` (Create).

##### 10. `privacy.html`, `docs/HANDOFF.md` (Modify)

*   **Type / Scope**: Statement and handoff note.
*   **Proposed Changes**: Friday's privacy wording. Where the work stands.

#### Pull Request 2 (Sat Nov 28)

##### 11. `next/js/calendar.js` (Create)

*   **Type / Scope**: The reminder.
*   **Proposed Changes**: `calendarFile(trip, link)` returns the file text
    (`fold`, `esc`, `utc` and the file's lines copied from
    `next/calendar-test.html` at commit `3678d9d`: a `VCALENDAR` holding one
    `VEVENT` with `UID`, `DTSTAMP`, `DTSTART`, `DTEND`, `SUMMARY`,
    `DESCRIPTION`, `URL` and a `VALARM` with `ACTION:DISPLAY` and
    `TRIGGER:-PT0M`; opened with `location.href` set to a `text/calendar`
    blob address);
    `openCalendarFile(text)`.

##### 12. `next/js/live.js`, `next/live.html`, `next/js/family.js`, `next/family.html` (Modify)

*   **Type / Scope**: Saturday's additions.
*   **Proposed Changes**: "Send link to family"; "Delete this trip"; "Remind
    me"; the Slow and Stopped rows; time-zone names; fixes from Friday.

##### 12a. Home port (Modify `live.js`, `live.html`, `family.js`, `trip-math.js`, `privacy.html`; only if time allows)

*   **Type / Scope**: The setting and the changed ending.
*   **Proposed Changes**: As under "Home Port". `store` name
    `cx:next:homeport` holding `{ lat, lon }`. `TripMath.endRule(rules,
    homePort)` returns the route-end rule, or the home-port rule when the
    last point is within 15 nm of it. `familyState` gains the state
    `heading-in` for a boat past the last point. Practice mode runs on from
    the last point to the home port when one is set. Tests: with no home
    port the ending is unchanged; with one 3 nm past the last point the trip
    does not end at the last point and ends 400 yards from the home port.

##### 13. `privacy.html`, `docs/HANDOFF.md`, `next/trip-test.html` (Modify)

*   **Type / Scope**: Statement, handoff note, tests.
*   **Proposed Changes**: Saturday's privacy line. Checks for
    `calendarFile`. `next/tracker-test.html` stays until promote.

### Settled Details

*   **Reading:** `{ t, lat, lon, speedKt, accM }`; `speedKt` may be null.
*   **Rules for a direction:** `{ dir, name, points, dest, cruiseKt, gate: {
    side: 'west' | 'east', lon }, arrive: { lat, lon, pastSide, pastLon } }`.
*   **Saved trip:** `{ tripKey, familyKey, dir, startedAt, clockOffsetMs,
    plannedArrival, overdueAt, hideStart, startPoint, gateOpened, status,
    endedAt, endedHow, practice }`. `status` is `underway` or `ended`.
*   **Queue item:** exactly what `/v1/add` takes.
*   **Log row:** `{ id, t, text, state }`, `state` being `saved`, `received`
    or `refused`.
*   **Times** on the Live page are Eastern (`fmtT`). The family page uses the
    follower's zone.
*   **Overdue change:** the later of now and the current overdue time, plus
    1 hour. The Live screen shows the new time at once, marked "saved" until
    the service confirms.
*   **Start body:** boat "Goof n' Off", captain "RJ", `route.name` as on the
    Ready screen, the 9 named points for the direction, `dest` the last
    point's name, `cruiseKt` 26.
*   **Local testing:** serve the repo root with `python3 -m http.server
    8788`; run the service with `npx wrangler dev` as in
    `tracker-service.md`, with `.dev.vars` allowing `http://localhost:8788`
    and `DAILY_TRIP_CAP` set to 50; open
    `http://localhost:8788/next/live.html?practice=1&trip=home&api=http://localhost:8787`.
*   **No new libraries. No build step.**

### Build Phases

**Pull request 1, ready for RJ by 3:00 PM Friday:**

1.  `trip-math.js`, `QueueRules`, the Node tests and `trip-test.html`.
2.  `tracker-api.js`, `queue.js`, `tripmap.js`, `live.html`, `live.js` with
    practice mode. Check: a practice run against a local service starts,
    opens the gate, records, survives the connection being cut and restored,
    arrives and ends.
3.  `family.html`, `family.js`. Check: each Friday row of the state table,
    from a practice run and from made-up Read answers.
4.  The Plan page button, `privacy.html`, `HANDOFF.md`. Screenshots at 390 px
    and iPad width.

If Friday runs short, the "All good" list on the family page moves to
Saturday. Nothing else in pull request 1 is optional.

**Pull request 2, ready for RJ by noon Saturday:**

5.  Fixes from Friday's test.
6.  Family text and "Send link to family"; "Delete this trip".
7.  `calendar.js` and "Remind me".
8.  Slow and Stopped rows, time-zone names, `privacy.html`.
9.  Home port, only if steps 5 to 8 are done and checked by 10:00 AM. It is
    built so that with no home port set, nothing changes from Friday's
    behaviour. If it is not solid by noon it is left out of the pull
    request.

### Build Reminders

*   **Phone numbers on the overdue notice (D6).** It ships without any.
    Before promote, RJ or his attorney supplies and checks the numbers (for
    example the US Coast Guard and the Bahamas rescue service), and they are
    added to the family page and the family text.
*   **Start the crossing on the helm iPad (D5),** with "Hide my start" on,
    other tabs and apps closed, Auto-Lock set to Never.
*   **The overdue wording and the family text** are drafts until RJ's
    attorney has seen them.
*   **Exact positions.** The preview no longer rounds positions (W10).
*   **Sprint 2 is not started** until both pull requests are merged and
    tested.

### RJ's Steps

**Fri Nov 27, after merging pull request 1 (about 20 minutes):**

1.  Open `…/next/trip-test.html`. Every line should read PASS.
2.  On the iPad open `…/next/live.html?practice=1&trip=home`, type the
    invite code from Keeper, tap "Start trip", then "Copy family link".
3.  Open that link on the phone. Watch the made-up crossing on both: the
    wait before Green Turtle, the boat, "All good", arrival, and the family
    page losing its map.
4.  During it, turn Airplane Mode on for a minute, then off. The status line
    should read "Saved N updates", then "All sent".
5.  Run `…&overdue=1` once to see both overdue notices.

**Sat Nov 28, after merging pull request 2 (about 30 minutes, on the water,
in daylight, away from the house):**

6.  On the iPad start a real trip with "Hide my start" off. Tap "Send link
    to family" and send it to yourself.
7.  Run the boat for 10 to 15 minutes. Check the dot moves on the phone, tap
    "All good", tap "Remind me" on the phone, then "Stop sharing now".
8.  Tap "Delete this trip".
9.  If home port is in the pull request: on the Ready screen set a home port
    on the map (for this test, any spot near where you are), start a
    practice run, and check the family page reads "has passed … and is
    heading in" before "arrived". Before the crossing, set the real one.

**Crossing day:** see Build Reminders. Open the preview with `?trip=home`,
start the trip, send the text, and leave the page in front.

### Verification Plan

*   **Compilation/Build**: None. `node --check` on each new file.
*   **Unit Tests** (`node --test next/test/trip.test.js`, and the same list
    on `trip-test.html`), at least:
    *   Distance left equals the line's length at the start and 0 at the
        end; a position beside a long segment measures to the segment.
    *   Gate, trip home: Guana Cay hidden; Whale Cay Passage hidden; 77.34°W
        hidden; 77.40°W shown; a start point at 77.40°W with a reading 450
        yards away hidden and 550 yards away shown; all shown with "Hide my
        start" off.
    *   Gate, trip over: west of 80.02°W hidden; east of it and more than 500
        yards from the start shown.
    *   A boat that passes the line and turns back is hidden again.
    *   Direction guard: a reading at Guana is nearer the start of the trip
        home and the end of the trip over.
    *   Arrival zone: 400 yards from the inlet point true; 600 yards false;
        west of 80.035°W true.
    *   Accuracy: 150 m good, 500 m not.
    *   Speed: steady 24 kt gives 24; zeros give stopped; no readings give
        null and motion `unknown`.
    *   Queue: events before positions; `stored` and `had` remove;
        `refused` with `future` keeps; a refused position is removed and
        counted; a refused event is kept and reported; a failed request
        removes nothing; the 3,001st position drops the oldest and keeps
        events.
    *   Family states: one made-up Read answer for each row, including
        overdue worked out with no successful read, and an estimate already
        in the past.
    *   Calendar file (Saturday): starts at the overdue time, has an alert,
        folds long lines, escapes commas.
*   **Static Analysis & Linting**: A search of the changed files for the
    invite code, keys, "safe" and `no-cors`.
*   **E2E/Integration**: Practice mode against a local service, driven in a
    browser at 390 px and iPad width with the connection cut and restored.
*   **Not testable before merge**: a real iPhone and iPad; real GPS; real
    Starlink drop-outs; keep-awake over hours; the share screen; the calendar
    screen.

### Sprint 2 (Only If Ahead of Schedule)

Built in this order after both pull requests are merged and tested, each as
its own small pull request, after a short check of this section against what
the first two taught:

0.  **Home port** (see "Home Port"), if Saturday's pull request left it
    out.
1.  **Remove the old tracking code from the Plan page** (`tracking.js`, the
    captain key box, `TRACK_URL`, the departure time from the old tracker).
    Known knock-ons: the line that reveals `#captain` lives in
    `setupCaptain`; `boot.js` writes to `trackNote`; `saveDep` calls
    `sendPlan`; starting to share used to set the "LEFT" departure time.
2.  **Points passed** on the Live screen and family page (`waypoint`
    events), with estimates for those ahead.
3.  **"Resume sharing"** for 10 minutes after an end. Nothing is recorded
    inside the arrival zone after a resume.
4.  **Recenter icon on the Plan map; radar on the Live map.**
5.  **Interval choice.** The quiet rule then becomes "20 minutes, or 2.5
    times the usual gap, never more than 75 minutes".
6.  **"Add to Google Calendar".**
7.  **"Track from another device."** The link carries the trip key, family
    key and direction, never the start point. The first device then acts on
    the `status` in each Add answer.

--------------------------------------------------------------------------------

### Additional Resources

*   `docs/designs/mvp.md`; `docs/designs/tracker-service.md`.
*   `docs/designs/live-family_review_report.md`: review round 1 and how each
    finding was resolved.
*   `docs/mockups/Main.dc.html`: the Live and Family screens.
*   `next/js/tracking.js`: today's gate lines and keep-awake code.
*   `next/calendar-test.html` at commit `3678d9d` (since removed): the
    reminder methods RJ tested on Nov 25.

### Future Improvements

*   A "share from" line for any route (row 9).
*   The home port in the captain's profile (row 8).
*   The service accepts unnamed shape points, so the family map draws the
    detailed line.
*   "New family link"; battery level; wind on the family page.
*   Captain's name, boat and route from the saved setup (row 8).
*   Queue and tracks in the browser's database, with past trips (row 14).
*   Phone numbers on the overdue notice, once checked.

--------------------------------------------------------------------------------

*Drafted with EGM*
