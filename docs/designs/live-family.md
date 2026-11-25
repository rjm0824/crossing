# Live Screen and Family Page (MVP Steps 6 and 7)

*   **Author:** RJ (rjm0824)
*   **Status:** Draft (first draft, before review)
*   **Date:** 2026-11-25

--------------------------------------------------------------------------------

## Overview

This document covers the screens that use the tracker service: Start trip, the
Live screen on the captain's device, and the family page that followers open
from a link. The service itself is built and published
(`docs/designs/tracker-service.md`). The overall plan is `docs/designs/mvp.md`
(Step 6, Step 7, W1, W15, CUJs 6 to 11).

**The deadline sets the scope.** RJ crosses home from Abaco to Palm Beach on
about Sun Nov 29 or Mon Nov 30, 2026, and wants to track that crossing with
the preview (`/next/`) and the new tracker service. The old Apps Script
tracker stopped accepting positions on Nov 25. That crossing is the real trip
that promote needs.

The work is two pull requests:

*   **Pull request 1, Fri Nov 27:** Start trip, the Live screen, the send
    queue and the start gate.
*   **Pull request 2, Sat Nov 28:** the family page, the "Remind me" button,
    the family link text, and "Track from another device".

If both are not merged and tested by Saturday evening, RJ repairs the old
tracker that day and the live page is used for the crossing. Nothing in this
document changes the live page or the old tracker, so that fallback stays
open.

The preview still has RJ's boat, the Abaco route and the trip home
(`?trip=home`) written into it. Onboarding, saved setups and the bottom bar do
not exist yet. This design is for that page as it is, not for friends' setups.

It is a planning aid, never a navigation tool. The captain decides.

**Words used here** (others are in `tracker-service.md`):

*   **Tracking device:** the phone or iPad that reads GPS and sends positions
    for a trip.
*   **Reading:** one GPS fix from the device. Readings arrive every second or
    so and stay on the device.
*   **Recorded position:** a reading the device keeps and sends to the
    service. One per interval (default every 5 minutes).
*   **Send queue:** the list of recorded positions and events saved on the
    device that the service has not yet confirmed.
*   **Start gate:** the rule that hides the boat near where the trip starts.
*   **Named points:** the route's named waypoints (for the trip home: Guana
    Cay, Whale Cay Passage, Green Turtle Cay, Crab Cay, the two Bank points,
    Memory Rock, Gulf Stream, Palm Beach Inlet).

## The Problem

1.  The preview's tracking code talks to the old Apps Script tracker, which no
    longer accepts positions. Nothing in the preview calls the new service
    except the test page.
2.  The old send cannot tell whether a position arrived
    (`mode: 'no-cors'`), so the screen says "Sent" when it may not have been.
3.  A position that fails to send is lost. There is no queue.
4.  Followers open the same page as the captain. There is no link per trip,
    no overdue notice and nothing closes after arrival.

## Goals

*   RJ can start a trip on the helm iPad or his phone with the preview, and
    the tracker service receives positions for the whole crossing home.
*   A follower who opens the family link sees the boat, its trail, the route,
    an arrival estimate, check-ins, and an overdue notice when it applies,
    with no app and no login.
*   **Nothing is lost to a gap in signal.** What is recorded with no signal is
    sent when signal returns and the page is open in front.
*   **Every button tells the truth.** It shows it was pressed, then the real
    result. The screen never says "sent", "received" or "set" until that has
    happened.
*   **The Abaco house and the Palm Beach dock never show.** The protection is
    at least as strong as today's page.
*   The design splits into the two pull requests above, and each one is
    testable by RJ in his 5:00 to 5:45 PM block.
*   $0. Nothing runs on its own.

## Non-Goals

*   **Friends' setups.** Boat, captain's name, route and cruise speed are read
    from the values written into the preview (`next/js/settings.js`).
*   **The bottom bar, Menu and Settings screens** (build order row 7). Live
    and the family page are separate pages reached by buttons and links.
*   **The live page and `tracker/Code.gs`.** Not touched.
*   **Texts or alerts sent by the app.** The captain sends one text himself
    (W1).
*   **Tracking with the screen locked or the page in the background.** Phase 3.
*   **Loading the page with no signal** (W16). A page that is already open
    keeps working. A device that restarts offshore cannot reopen it until it
    has signal.
*   **Navigation.** No course to steer. Wording says where the boat is and
    when it may arrive.

## Scope: This Crossing and After

| Piece | Pull request | For this crossing |
| --- | --- | --- |
| "Start trip" button on the Plan page, Ready screen, Start request | 1 | In |
| Live screen: map, speed, distance left, live arrival estimate, time underway | 1 | In |
| Send queue with true button and status wording | 1 | In |
| Start gate, with trip-home rule (Decision D1) | 1 | In |
| Arrival ends the trip; "Stop sharing now"; "Resume sharing" for 10 minutes | 1 | In |
| "All good" check-in | 1 | In |
| Overdue notice on Live with "I'm fine, add 1 hour" | 1 | In |
| Recenter icon on the Plan and Live maps | 1 | In |
| Waypoints passed, with estimates for those ahead | 1 | In, first to cut |
| Practice mode (a made-up run, for testing at a desk) | 1 | In |
| Test page for the calculations and the queue | 1 | In |
| Family page: map, status card, check-ins, all states, overdue notice | 2 | In |
| "Send link to family" with the ready-written text | 2 | In |
| "Remind me at [overdue time]" and "Add to Google Calendar" | 2 | In; the Google button is second to cut |
| "Track from another device" | 2 | In, first to cut (Decision D5) |
| "Delete this trip" | 2 | In, third to cut |
| "New family link" (replace a forwarded link) | Later | Waits. The service supports it. |
| Interval choice in a Settings screen | Row 7 | Waits. A simple picker sits on the Ready screen. |
| Battery level, wind on the family page, radar on the family map | Later | Waits. iPhone and iPad give web pages no battery level (W11). |
| Start gate and arrival rule for any route | Row 9 | Waits. This build uses the two written-in directions. |
| Queue and tracks in the browser's database (IndexedDB) | Row 14 | Waits (Decision D4). |
| Followers watching count ("3 watching" in the mockup) | Not planned | The service does not count readers. |
| Loading with no signal (W16) | Row 17 | Waits. |

## Decisions for RJ

RJ decided D1, D2, D3, D5 and D6 on Nov 25. D4, D7 and D8 are recommendations
he has not objected to.

*   **D1. Trip home privacy and the start gate (decided; distance set by
    RJ).** Keep both rules. A position is recorded only when the boat is (a)
    more than 500 yards (about a quarter of a nautical mile) from where the
    trip started **and** (b) past today's line for that
    direction: west of 77.36°W on the trip home (past Green Turtle), east of
    80.02°W on the trip over (outside the inlet). Both rules are checked on
    every reading, so if the boat turns back, it is hidden again. This changes W15 in
    `mvp.md` from about 1 nm to 500 yards: RJ's view is that privacy matters
    but the distance need not be a mile. The distance rule alone would put the
    first dot 500 yards from the Abaco house, which is why the line stays. A switch on the Ready screen, "Hide my start", is on by
    default; turning it off shares from the dock and is meant for test runs
    only.
*   **D2. Start trip is two steps (approved).** The Plan page's "Start trip & share with
    family" button opens the Live page's Ready screen (route, planned arrival,
    overdue time, interval). "Start trip" there talks to the service. "Send
    link to family" is a separate tap after the trip exists. Reason: iPhone
    only opens the share screen directly from a tap, not after waiting for the
    service (to verify on RJ's iPhone in pull request 2). `mvp.md` CUJ 6 had
    one tap.
*   **D3. Distance left is measured along the named points on both screens
    (approved).**
    The service accepts at most 30 route points, each with a name. The
    preview's detailed line has 66 unnamed points. So the trip is started with
    the 9 named points, and both the Live screen and the family page measure
    along those. The figure can differ from the Plan page's distance by about
    1 to 2 nm early in the trip and agrees near the destination. The Live map
    still draws the detailed line; the family map draws straight lines between
    the named points.
*   **D4. The queue is kept in the browser's simple store (localStorage), not
    its database (IndexedDB).** `mvp.md` planned the database. A crossing at
    one position a minute is under 100 KB, the simple store saves at once, and
    it is much less code to get right by Friday. Past-trip tracks for My Trips
    (row 14) can move to the database then.
*   **D5. For this crossing, start the trip on the helm iPad (approved).** Then "Track
    from another device" is not needed on the day, and it is the first thing
    to drop if Saturday runs short.
*   **D6. No phone numbers on the overdue notice yet (approved).** It says
    "call the Coast Guard". Numbers are added only after RJ or his attorney
    supplies and checks them.
*   **D7. The reminder holds the family link.** A follower's calendar entry
    needs the link to be useful. With "Add to Google Calendar" the entry, and
    so the link, goes to Google. The link stops working 2 hours after the trip
    ends. `privacy.html` says so.
*   **D8. The old tracking code is removed from the preview in pull request
    1.** After that the preview cannot use the Apps Script tracker. The live
    page still can.

## Open Questions

*   **Q1. Does the share screen open after the service answers,** or only
    straight from a tap? The design assumes only from a tap (D2). Checked on
    RJ's iPhone and iPad in pull request 2.
*   **Q2. Does an iPhone replace a calendar entry** when the same reminder is
    added again with a new time, or add a second one? The file uses the same
    ID for a trip so that a calendar can replace it. Checked in pull request
    2. If it adds a second one, the page says "Delete the earlier reminder."
*   **Q3. Does the on-phone calendar file work on Android?** Not tested. The
    Google Calendar button is the Android path.
*   **Q4. Does the screen stay awake for a whole crossing on the helm iPad?**
    The keep-awake request was added in Phase 0 and has not run for 6 hours.
    The crossing is the test. Auto-Lock set to Never is the backstop.
*   **Q5. Safari tab or Home Screen icon?** On iPhone and iPad the Home Screen
    app and Safari can keep separate saved data. A trip started in one may not
    appear in the other. Until tested: start and track in the same place.

## Critical User Journeys (CUJs)

### CUJ 1: Start the trip home

*   **Given**: RJ is at the dock on Guana with signal. The invite code was
    typed into this device once.
*   **When**: He opens the preview with `?trip=home`, taps "Start trip & share
    with family", checks the Ready screen, and taps "Start trip".
*   **Then**: The button reads "Starting…". When the service answers, the
    screen becomes the Live screen with "Trip started 7:05 AM" and "Waiting
    until you're past Green Turtle to share your position." Nothing has been
    recorded or sent about where he is.

### CUJ 2: Underway

*   **Given**: The boat is west of Green Turtle.
*   **When**: 5 minutes pass.
*   **Then**: One position is recorded, saved to the queue and sent. The
    status line reads "All sent. Tracker last received 8:02 AM." The map
    follows the boat. Speed, distance left and the live arrival estimate
    change with every reading.

### CUJ 3: A gap in signal

*   **Given**: Starlink drops for 40 minutes.
*   **When**: Positions are recorded and RJ taps "All good".
*   **Then**: The button reads "Sending…", then "Couldn't send. Saved, will
    retry." The status line reads "Saved 9 updates. Will send when signal
    returns. Keep this page open." When signal returns the queue goes in one
    request, the status line returns to "All sent", and the check-in row reads
    "Received by tracker 9:47 AM".

### CUJ 4: Arrival

*   **Given**: The boat comes within 2 nm of Palm Beach Inlet.
*   **When**: Two readings in a row are inside that distance.
*   **Then**: The trip ends on the device. "Trip ended, arrived" is queued
    with the time. No further position is recorded. The screen reads "Arrived
    12:48 PM. Sharing has stopped." with "Resume sharing" for 10 minutes. If
    the queue is not empty it adds "Open this page when you have signal so
    your followers see you arrived."

### CUJ 5: Overdue on the Live screen

*   **Given**: The overdue time passes and the trip has not ended.
*   **When**: RJ looks at the Live screen.
*   **Then**: A notice reads "You are past your overdue time (2:10 PM). Your
    followers see an overdue notice." A button reads "I'm fine, add 1 hour".
    Tapping it shows "Sending…", then "New overdue time 3:10 PM received."

### CUJ 6: A follower watches

*   **Given**: A follower received RJ's text with the family link.
*   **When**: They tap it.
*   **Then**: A map with the boat, its trail and the route; a status card
    ("RJ is 38 nm from Palm Beach Inlet", "Arriving about 12:52 PM", "Last
    update 2 min ago", speed, time underway); then check-ins and points
    passed. It refreshes every 30 seconds while in front.

### CUJ 7: A follower sets a reminder

*   **Given**: The family page is open and the trip is underway.
*   **When**: The follower taps "Remind me at 2:10 PM".
*   **Then**: iPhone's "Add to Calendar" screen opens with "Check on RJ's
    trip", an alert at 2:10 PM and the family link. The page reads "Calendar
    opened. Tap Add there to save the reminder." It never says the reminder is
    set.

### CUJ 8: Overdue on the family page

*   **Given**: The overdue time has passed and the trip has not ended.
*   **When**: A follower opens the family page.
*   **Then**: A notice above the map: "RJ has not arrived by the overdue time,
    2:10 PM." Then the last position in a form that can be read aloud, its
    time and age, and its distance from the destination. Then "This page
    cannot call for help. If you are worried, call the Coast Guard."

### CUJ 9: After arrival

*   **Given**: The service has learned the trip ended.
*   **When**: A follower opens or refreshes the family page.
*   **Then**: The map and position are gone. The page reads "RJ arrived at
    Palm Beach Inlet at 12:48 PM." Two hours later it reads "This trip has
    ended."

### CUJ 10: Move tracking to the iPad

*   **Given**: A trip was started on the phone.
*   **When**: RJ taps "Track from another device", sends the private link to
    the iPad, opens it there and taps "Track this trip on this iPad".
*   **Then**: The iPad shows the Live screen and records positions. The phone
    shows "Tracking is on another device" and can still send "All good" and
    "Stop sharing now".

## Technical Plan (Architecture)

### Pages

```text
 next/index.html   Plan page (exists). Gains a "Start trip" button and the
                   recenter icon. Loses the old tracking code.
        |
        v  link, keeps ?trip=home
 next/live.html    Ready screen -> Live screen -> Ended screen.
        |          Reads GPS. Saves to the queue. Sends to the service.
        |
        |  family link in a text the captain sends (pull request 2)
        v
 next/family.html  Family page. Reads one trip with the family key.
                   Saves nothing on the follower's phone.
```

All three show the PREVIEW banner and "Planning aid, not for navigation. The
captain decides." The family page and Live page carry `<meta name="robots"
content="noindex">` and `<meta name="referrer" content="no-referrer">`.

The service's address is written into one new file,
`next/js/tracker-api.js`. It is not a secret.

### Shared Calculations

One new file, `next/js/trip-math.js`, holds every calculation as small
functions with no screen code. Both the Live page and the family page load
it, so they cannot drift apart. It does not depend on the written-in route;
the route is passed in.

*   **Distance left.** Find the point on the line through the named points
    that is nearest the boat (checking each straight segment, not only the
    corners). Distance left is the line's length from there to the end.
*   **Speed.** The average of the GPS speed readings from the last 10
    minutes. Where the device gives no speed, it is worked out from the
    distance between readings. Each recorded position carries this average
    as `sog`, so the family page shows the same number the captain saw.
*   **Arrival estimate.** On the Live screen: now plus distance left divided
    by speed. On the family page: the time of the last position plus its
    distance left divided by its speed, so the estimate does not creep later
    while the page waits for the next position.
*   **Slow:** speed under 40% of cruise speed (under about 10 kt for 26 kt).
    **Stopped:** under 3 kt; the estimate reads "On hold".
*   **Quiet (family page):** the last position is older than 20 minutes, or
    older than 2.5 times the gap between the last two positions, whichever is
    longer. The estimate is greyed and reads "was about 12:52 PM".
*   **Age of the last position** uses the service's clock (`now` in the Read
    answer), so a follower's wrong phone clock does not matter.
*   **Positions read aloud:** degrees and decimal minutes, for example
    "26° 48.74' N, 079° 27.40' W".

### Start Gate (D1)

A function `mayShare(reading, trip)` decides for every reading. A reading is
recorded only when all of these are true:

1.  The trip is underway (started, not ended).
2.  "Hide my start" is off, **or both**:
    *   the reading is more than 500 yards from the trip's start point (the first
        reading after Start trip, kept on the device only), and
    *   trip home: longitude is west of 77.36°W; trip over: longitude is east
        of 80.02°W. These are the two lines today's page uses.

A reading that fails is used on the captain's own screen (the map, speed and
distance left still work) but is never saved to the queue and never sent.
While the gate is closed the Live screen says "Waiting until you're past Green
Turtle to share your position" (trip home) or "…outside the inlet…" (trip
over).

The rule for any route (a "share from" point per route) is built with Routes,
build order row 9.

### Arrival and Stopping

*   **Arrival** uses today's rules. Trip home: within 2 nm of Palm Beach
    Inlet, or west of 80.00°W. Trip over: within 4 nm of Green Turtle, or east
    of 77.36°W. Two readings in a row must agree, so one bad GPS fix cannot
    end a trip. The trip ends before the boat is in the inlet, so the Palm
    Beach dock never shows.
*   **Stop sharing now** asks "Stop sharing? Your followers will no longer
    see the boat." with "Stop sharing" and "Keep sharing".
*   Either one queues `ended` (`arrived` or `stopped`) with the time it
    happened, and recording stops.
*   **Resume sharing** shows for 10 minutes and queues `resumed`.
*   The `mvp.md` rule "within 4 nm and stopped for 10 minutes" is for routes
    whose last point is not the dock. It waits for row 9.

### What Is Saved on the Tracking Device

Names start with `cx:next:` on the preview. The live page will use
`cx:live:` at promote, because both pages share one saved-data area and must
not see each other's trip.

| Name | Holds |
| --- | --- |
| `cx:next:invite` | The invite code, typed once on this device. |
| `cx:next:device` | Four random letters that name this device in item IDs. |
| `cx:next:trip` | The current trip: trip key, family key, direction (home or over), boat, captain, started time, planned arrival, overdue time, interval, hide-my-start switch, start point, status, ended time, whether this device is tracking. |
| `cx:next:queue` | Items not yet confirmed by the service. |
| `cx:next:trail` | Recorded positions as time, latitude, longitude, for drawing the trail after a reload. |
| `cx:next:log` | The last 30 things that happened to the trip (check-in, point passed, overdue change), each with "saved" or "received" and a time. |

The trip key is as sensitive as a password for that one trip. It stays in
this saved data and in the "Track from another device" link, nowhere else.

If saving fails (storage full or blocked) the Live screen shows "This device
can't save updates. They will be lost if the page closes." and keeps working
from memory.

### The Send Queue

*   **Everything is saved first, then sent.** A recorded position, a
    check-in, a point passed, an overdue change, "ended" and "resumed" each
    become an item in `cx:next:queue` before any request is made.
*   **Item IDs.** Positions: `p` + time + `-` + device letters. Events: `e-` +
    8 random letters and digits.
*   **When it sends:** right after an item is added; every 30 seconds; when
    the page returns to the front; when the browser reports the connection is
    back. One request at a time. A request is given up after 20 seconds.
*   **What it sends:** events first, then the oldest positions, up to 100
    items (the service's limit).
*   **Reading the answer.** `stored` or `had`: the item is removed from the
    queue and its log row becomes "Received by tracker [time]". `refused`: the
    item is removed and the log row reads "Not accepted by the tracker".
*   **`too_many` or `bad_request` for the whole request:** halve the batch
    and try again. A single item that is still refused alone is dropped.
*   **`not_found`:** the service no longer has this trip. Recording stops and
    the screen reads "This trip is no longer on the tracker."
*   **Any other failure** (no connection, time-out, server error, Cloudflare's
    daily limit): the items stay. Try again after 15 seconds, then 30, then
    every 60.
*   **Size.** At most 3,000 positions are queued. Beyond that every second
    one of the oldest is dropped. Events are never dropped.

**Status line** (one line under the stats, always visible during a trip):

| Situation | Words |
| --- | --- |
| Queue empty, at least one item confirmed | "All sent. Tracker last received 8:02 AM." |
| Request in flight | "Sending 3 updates…" |
| Last request failed, items waiting | "Saved 9 updates. Will send when signal returns. Keep this page open." |
| Gate closed, nothing recorded yet | "Waiting until you're past Green Turtle to share your position." |
| Trip ended, queue not empty | "Open this page when you have signal so your followers see you arrived." |
| Trip ended, queue empty | "Your followers can see the trip has ended. Received 12:49 PM." |

### Button Rule

Every button that causes a request has three looks, in this order:

1.  **Pressed:** the button dims and its label changes at once ("Sending…",
    "Starting…"). It cannot be tapped again while in this state.
2.  **Result, true:** "Received 9:45 AM", "Trip started 7:05 AM".
3.  **Result, not yet:** "Couldn't send. Saved, will retry." When the queue
    later delivers it, the log row changes to "Received by tracker [time]".

Buttons that hand off to another app cannot know what happened there, so they
say only what the page did: "Share screen opened", "Link copied", "Calendar
opened. Tap Add there to save the reminder." The words "sent", "received" and
"set" are used only after the service has answered `stored` or `had`, or (for
"Trip started") returned the keys.

### Ready Screen (Pull Request 1)

Opened from the Plan page's "Start trip & share with family" button, which
keeps `?trip=home`. With no trip in progress, `live.html` shows:

*   Route name, for example "Trip home: Guana Cay to Palm Beach Inlet".
*   **Planned arrival:** now plus the route's length divided by cruise speed
    (26 kt), updated each minute until Start is tapped.
*   **Overdue time:** planned arrival plus 80 minutes, with − and + buttons in
    30-minute steps. It cannot be earlier than planned arrival.
*   **Send my position every:** 1, 5, 10 or 30 minutes. Default 5.
*   **Hide my start:** on. Under it: "On: your position is hidden until you
    are past Green Turtle. Off: shared from the dock, for test runs."
*   **Invite code:** a password box shown only when none is saved. It is
    saved on this device when Start succeeds.
*   **Start trip.** Pressed: "Starting…".

| Start answer | Screen |
| --- | --- |
| Keys returned | Live screen. "Trip started 7:05 AM." Location is requested here, so the phone's permission question follows the tap. |
| `invite` | "Invite code not accepted. Check it and try again." The box reappears. |
| `cap` | "The tracker has reached today's limit for new trips. Try again after 7 PM Eastern." |
| No answer in 20 seconds, or any other failure | "Couldn't reach the tracker. Still trying…" with "Cancel". It retries every 15 seconds while this screen is open. No trip exists until the service answers. |

The Start request sends: boat "Goof n' Off", captain "RJ", the route name, the
named points, the destination name, cruise speed 26, planned arrival and
overdue time. If location permission is refused, the Live screen says
"Location is off for this page. Followers will see 'trip started' and no
position." with the steps to turn it on.

### Live Screen (Pull Request 1)

From top to bottom, following `docs/mockups/Main.dc.html`:

1.  **Note:** "Keep this page open in front while sharing." with the
    keep-awake line from today's page (`keepAwake`, `resumed` are reused).
2.  **Overdue notice**, only when it applies (CUJ 5).
3.  **Map:** route, trail, boat, and radar with its on and off button (the
    Plan map's code, reused). Zoom buttons and the recenter icon.
4.  **Stats:** Speed, Left to go, Live arrival estimate, Underway. "Slow" and
    "Stopped" appear beside the speed.
5.  **Status line** (table above).
6.  **Send "All good" to family.**
7.  **Points:** "✓ Passed Memory Rock · 9:41 AM" for those behind, "○ Bank
    (Mangrove Cay) · about 11:20 AM" for those ahead. A point is passed when
    the boat's place along the line goes beyond it. Points behind the boat
    when the gate first opens are not announced. The mockup's "(family gets a
    ping)" becomes "(shown on the family page)".
8.  **Sharing:** "Sharing: on · every 5 min". "If not arrived by 2:10 PM your
    followers see an overdue notice." with "Add 1 hour". "Stops by itself near
    Palm Beach Inlet." The interval can be changed here.
9.  **Stop sharing now.**
10. "Planning aid, not for navigation. The captain decides."

**GPS.** The page asks for continuous readings with high accuracy. Each
reading updates the map and stats. One reading per interval is recorded if
the gate allows. If no reading has come for longer than the interval, the
page asks for a single reading (today's fallback). The gap note "Sharing was
paused for about N min" is kept.

**Reload.** If the page is reopened during a trip it reads the saved trip,
shows the Live screen and restarts GPS without a tap. Keep-awake may need one
tap after a reload; the note says so.

**After the trip.** The Ended screen shows how and when it ended, time
underway, the status line, "Resume sharing" (10 minutes), and "Start a new
trip" once the queue is empty.

### Recenter Icon (Pull Request 1)

A third square button under the map's + and −, with a target symbol and the
label "Recenter" for screen readers.

*   **Trip underway and a reading exists:** centres the map on the boat and
    turns "follow the boat" back on. If the map is zoomed out past about
    40 nm across, it also zooms in to that.
*   **Otherwise:** shows the whole route.
*   The map follows the boat until the captain drags or zooms it. Then it
    stays put until Recenter is tapped. The icon is filled while following
    and outlined while not, so the press shows.
*   It is on the Plan map (where it replaces the "Fit route" button), the
    Live map and the family map. On the family map "the boat" is the last
    position.

### Family Link and Text (Pull Request 2)

*   **The link:** `https://rjm0824.github.io/crossing/next/family.html#k=` +
    the family key. The part after `#` is never sent to GitHub.
*   In the Live screen's Sharing box: **Send link to family** (opens the
    share screen with the text below; result "Share screen opened"), **Copy
    link** ("Link copied"), and **See what family sees** (opens the link).
*   **Draft text, for RJ to approve in the pull request:**

    > RJ here. Leaving Guana Cay for Palm Beach Inlet on Goof n' Off at
    > 7:05 AM. Planned arrival about 12:50 PM. Follow the boat here:
    > [link]
    > If I'm not in by 2:10 PM, check the link, then try my phone.

### Family Page (Pull Request 2)

A separate page that loads only the map library, `trip-math.js`,
`tracker-api.js`, `calendar.js` and its own script. It does not load the
forecast or the written-in route. It saves nothing on the follower's phone.

**Reading.** On opening it reads the whole trip, then asks every
`pollSeconds` (30) for items after the last one it has. When the page is not
in front it stops asking, and reads at once when it returns. If `more` is
true it reads again straight away.

**Layout, top to bottom:** overdue notice (when it applies); map (boat,
trail, route, named points; zoom and recenter); status card; "Remind me"
buttons; list of check-ins, points passed and overdue-time changes, newest
first; the note "If RJ isn't in by 2:10 PM this page shows an overdue notice
with his last known position. The link closes 2 hours after he arrives.";
"Planning aid, not for navigation. The captain decides. This page cannot call
for help. In an emergency call the Coast Guard."

Times are shown in the follower's own time zone with its short name ("12:52
PM EST"). All text from the service is placed on the page as plain text,
never as page code.

**States:**

| State | When | Headline | Map |
| --- | --- | --- | --- |
| Started | Underway, no position yet | "Trip started at 7:05 AM. The boat's position will appear once it is underway." | Route only |
| Underway | Recent position, speed at or above 40% of cruise | "RJ is 38 nm from Palm Beach Inlet" · "Arriving about 12:52 PM" · "Last update 2 min ago" · "24 kt · 2 h 41 m underway" | Boat, trail, route |
| Slow | Speed under 40% of cruise | Same, with "Moving slowly" | Same |
| Stopped | Speed under 3 kt | "RJ is stopped, 38 nm from Palm Beach Inlet" · "Arrival estimate on hold" | Same |
| Quiet | Last position older than the quiet limit | "No update for 43 min" in amber · last estimate greyed, "was about 12:52 PM" · "The boat may be out of signal. This page fills in when it reconnects." | Same, boat greyed |
| Overdue | Service says `overdue` | The notice in CUJ 8, above everything, with whichever state above applies below it. Under 4 nm from the destination it leads with "Last heard close to Palm Beach Inlet". With no position at all: "No position was received for this trip." It never says the boat is fine. | Same |
| Arrived | Status `arrived` | "RJ arrived at Palm Beach Inlet at 12:48 PM." | Removed |
| Sharing stopped | Status `stopped` | "RJ stopped sharing at 11:15 AM." | Removed |
| Unavailable | A read fails | "Can't reach the tracker right now. Showing what this page had at 10:42 AM. Trying again." The last map stays. | Same |
| Ended | Status `closed` | "This trip has ended." The page stops reading. | Removed |
| Bad link | `not_found`, or no key in the link | "This link doesn't work. Ask the captain for a new one." | None |

### Remind Me (Pull Request 2)

Based on RJ's iPhone test on Nov 25 (`mvp.md` Q1, now closed): a calendar
file made on the phone opens "Add to Calendar" with the alert set, and the
alert went off on time. A calendar file packed into the link did nothing. A
Google Calendar link opens the Google Calendar app filled in, with the
follower's own default alert.

*   **Button 1: "Remind me at 2:10 PM".** The page builds a calendar file on
    the phone (the method of Test 2 in `next/calendar-test.html`) and opens
    it. Title: "Check on RJ's trip". Start: the overdue time. Length: 15
    minutes. Alert: at the start. Notes: "Open the link to see where the boat
    is. The overdue time may have changed." Link: the family link. The file's
    ID is built from the trip's start time, the same each time for one trip.
    Result line: "Calendar opened. Tap Add there to save the reminder."
*   **Button 2: "Add to Google Calendar".** Opens Google Calendar with the
    same title, time, notes and link. Result line: "Google Calendar opened.
    Save it there. It uses your own default alert."
*   The buttons show while the trip is underway and the overdue time is still
    ahead.
*   If the captain changes the overdue time, the list shows "Overdue time
    changed to 3:10 PM" and button 1 reads "Remind me at 3:10 PM" again.
*   The test files `next/calendar-test.html` and `next/calendar-test.ics` are
    deleted in this pull request.

### Track from Another Device (Pull Request 2)

*   **On the first device:** "Track from another device" shows "This link
    controls your trip. Send it only to your own device." and opens the share
    screen with a link to `live.html#join=` followed by the trip key, family
    key, direction, start time, planned arrival, overdue time, interval,
    hide-my-start switch and start point. The route is not in the link,
    because both devices have it written in.
*   **On the second device:** the page reads the link, removes it from the
    address bar, and asks "Track this trip on this iPad?". "Track this trip"
    saves the trip and starts the Live screen.
*   **Back on the first device:** a button "Stop tracking on this phone (the
    trip keeps going)". After it, the Live screen reads "Tracking is on
    another device" and keeps "All good", "Add 1 hour", "Stop sharing now" and
    "See what family sees". When the page returns to the front it reads the
    trip once with the family key to learn whether it has ended.
*   If both devices track at once the service keeps both sets of positions.
    Nothing breaks; the trail has more dots.

### Delete This Trip (Pull Request 2)

On the Ended screen: "Delete this trip from the tracker", with a confirm
step. Pressed: "Deleting…". Result: "Deleted" or "Couldn't delete. Try again
with signal." `privacy.html` already promises this for preview trips.

### What Changes on the Plan Page (Pull Request 1)

*   The "Boat position" box becomes "Share this trip": a short line and the
    "Start trip & share with family" button. If a trip is underway on this
    device the button reads "Back to your trip".
*   The captain key box, "Send test point", and the boat dot fed by the old
    tracker are removed, with `next/js/tracking.js`. The departure time no
    longer comes from the old tracker.
*   The go-day checklist, trip docs and customs buttons stay behind
    `#captain` as today. Checklist lines that say "Box above" are reworded to
    "Start trip button above".
*   The map gains the recenter icon.

## Alternatives Considered

### Alternative A: The Distance-from-Start Gate Alone

*   **Pros**: One rule for every route, as W15 says.
*   **Cons**: On the trip home the first dot would sit 500 yards from the
    Abaco house, and the trail points back at it. Today's page shows nothing until
    past Green Turtle, about 15 nm on.
*   **Reason for Rejection**: Recommendation: reject. It is weaker than what
    RJ has today.

### Alternative B: Send Everything and Let the Service Hide the Start

*   **Pros**: The captain's own record would hold the full track.
*   **Cons**: The house position would be stored on a server. A service
    change, with new tests, two days before the crossing.
*   **Reason for Rejection**: Recommendation: reject. What is never sent
    cannot leak.

### Alternative C: Build Live into the Plan Page

*   **Pros**: One page, as the old tracker did.
*   **Cons**: The tracking screen would load and re-run the forecast code, and
    a fault there could stop tracking. The mockup has Live as its own screen.
*   **Reason for Rejection**: Recommendation: reject. A small separate page
    has less to go wrong offshore, and the bottom bar can link to it later.

### Alternative D: Raise the Service's Route Limit to Carry the Detailed Line

*   **Pros**: The family map would draw the same curved line as the captain's.
*   **Cons**: A service change this week. The 9 named points give the same
    distance within 1 to 2 nm.
*   **Reason for Rejection**: Recommendation: reject for now. Listed under
    Future Improvements.

### Alternative E: Have the Captain's Device Read the Trip Back from the Service

*   **Pros**: The Live screen would show exactly what followers see.
*   **Cons**: Doubles the requests from the boat and makes the Live screen
    depend on signal.
*   **Reason for Rejection**: Recommendation: reject. The device draws from
    its own readings; "See what family sees" opens the family page.

### Alternative F: Fix the Old Tracker Instead

*   **Pros**: Known to work on a crossing.
*   **Cons**: No queue, no true "sent", no link that closes, and the crossing
    would not count as the real trip for promote.
*   **Reason for Rejection**: Kept as the fallback if Saturday's test fails
    (RJ, Nov 25).

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Risks and Mitigations

| Risk | What people see | Mitigation | What remains |
| --- | --- | --- | --- |
| New code fails on its first real crossing | Followers see "No update" or nothing | Practice mode and the test page before Friday; a real run on the water Saturday; the old tracker as fallback; the text RJ sends carries the planned arrival and overdue time | First real use is the crossing itself. RJ should tell followers it is a test. |
| The iPad locks, or the page is closed or reloaded offshore with no signal | "No update for X min", then overdue | Keep-awake; Auto-Lock set to Never; the gap note; a reload restores the trip if the page can load | A page that cannot reload offshore stops tracking (W16). |
| Saved data is cleared mid-trip | The trip key is gone; the trip cannot be ended by hand | Tracking from a second device holds a second copy of the key | Followers see overdue until the trip is deleted at 30 days, or RJ deletes it in the Cloudflare dashboard. |
| The gate lines are wrong for an unusual run (for example a fuel stop back east of Green Turtle) | Positions pause | Both rules are checked on every reading, so the boat is hidden again, never exposed | Followers see "No update" during that time. |
| "Hide my start" left off after a test run | The dock shows on the next trip | The switch is on by default for every new trip and is not remembered | A captain who turns it off for a real trip. |
| Arrival fires 2 nm off the inlet | Followers read "arrived" while the boat is still outside the inlet | Today's page does the same | The inlet itself is not tracked. RJ's text can say he will message when tied up. |
| A follower's reminder is stale after "add 1 hour" | The alert goes off at the old time | The reminder says "Check on", not "overdue", and tells them the time may have changed | They open the page and see the new time. |
| The private device link is sent to the wrong person | That person can end or delete the trip | Warning text; the share screen is the captain's own tap | No way to replace a trip key. Stop the trip and start a new one. |
| The device clock is wrong | Times on the trail are wrong; items more than 10 minutes ahead are refused | The service's clock is used for ages on the family page | A slow clock makes the trail look older than it is. |
| The service is down or over its daily limit | Live: "Saved N updates". Family: "Can't reach the tracker" | The queue keeps everything; the text was already sent | No live tracking until it returns. |

### Safety Wording

*   "Planning aid, not for navigation. The captain decides." is on the Plan
    page, the Live page and the family page.
*   No "safe" or "safely". No course to steer. Estimates say "about".
*   The overdue notice and the family page say the page cannot call for help.
*   The overdue wording and the family text are drafts for RJ's attorney, as
    `mvp.md` says.

### Privacy

`privacy.html` changes in the same pull request as the behaviour.

**Pull request 1:**

*   "In the preview version, your position is not recorded or sent until you
    are more than about 500 yards from where you started and past the
    start of the open-water part of your route. Sharing stops shortly before
    your destination."
*   "Your invite code, the current trip and updates waiting to be sent are
    saved on your device."

**Pull request 2:**

*   Followers: "After a trip ends, followers no longer see any position. For
    2 hours they see that you arrived (or stopped sharing), the place name
    and the time. Then the link closes."
*   Remove "signal strength". Battery level: "where your device provides it;
    iPhone and iPad do not."
*   Reminder: "If a follower taps 'Remind me', a reminder is added to their
    own calendar. It contains the trip's link. If they choose Google
    Calendar, Google receives that reminder."
*   The family page loads map images, so map providers see the follower's
    internet address, as with any web map.
*   The date at the top.

Nothing new is stored by the service. No follower names or phone numbers are
collected.

### Cost

$0. No new accounts. Nothing runs on its own. One follower with the page in
front makes 120 requests an hour; five followers for 7 hours is about 4,200
of the 100,000 free daily requests.

### Rollout and Undo

*   Both pull requests change only `/next/`, `privacy.html` and docs. The
    live page does not change.
*   **Undo:** revert the pull request. A revert leaves behind: the saved
    `cx:next:` data on devices that started a trip (harmless; cleared by
    "Start a new trip" or by clearing website data), trips in the preview
    database (deleted by the service after 7 or 30 days), and the old
    tracking code's removal is restored.
*   The version tag on every changed file address is bumped
    (`?v=20261127`, then `?v=20261128`).
*   **Promote** still needs the remaining MVP steps. This crossing supplies
    the real trip.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### Pull Request 1 (Fri Nov 27)

##### 1. `next/js/trip-math.js` (Create)

*   **Type / Scope**: Calculations only. No screen, storage or network code.
    Depends on nothing else.
*   **Proposed Changes**:
    *   `distNm(a, b)`: distance between two positions.
    *   `lineLength(points)`.
    *   `alongLine(pos, points)`: `{ alongNm, offNm }`, the nearest place on
        the line through `points`.
    *   `leftNm(pos, points)`.
    *   `avgSpeed(readings, now)`: knots over the last 10 minutes, or null.
    *   `motion(sogKt, cruiseKt)`: `'underway'`, `'slow'` or `'stopped'`.
    *   `etaMs(fromMs, leftNm, sogKt)`: a time, or null when stopped.
    *   `quietLimitMs(positions)`.
    *   `mayShare(reading, trip)`: true or false (Start Gate).
    *   `hasArrived(reading, direction)`: true or false (Arrival).
    *   `pointsPassed(alongNm, points)`: indexes of points behind the boat.
    *   `fmtLatLon(lat, lon)`: degrees and decimal minutes.
    *   `familyState(read, nowMs)`: one of the state names in the family
        table, plus the numbers that state shows.

##### 2. `next/js/tracker-api.js` (Create)

*   **Type / Scope**: The only code that talks to the service.
*   **Proposed Changes**: `TRACKER`, the preview address. `call(path, body)`
    posts JSON as plain text exactly as `tracker-service.md` shows, never
    with `mode: 'no-cors'`, gives up after 20 seconds, and returns
    `{ ok, data }` or `{ ok: false, error }` where `error` is the service's
    word (`invite`, `cap`, `not_found`, `bad_request`, `too_many`, `server`)
    or `'network'`.

##### 3. `next/js/queue.js` (Create)

*   **Type / Scope**: Saved data and the sender.
*   **Proposed Changes**: `store.get(name)` and `store.set(name, value)` with
    the `cx:next:` prefix, returning false when saving fails. `enqueue(item,
    logText)`. `sendNow()`. `nextBatch(queue, size)` (events first, then
    oldest positions). `applyResults(queue, results)`. `backoffMs(failures)`.
    `thin(queue)`. A status callback the screen uses for the status line and
    log rows.

##### 4. `next/live.html` and `next/js/live.js` (Create)

*   **Type / Scope**: The Ready, Live and Ended screens.
*   **Proposed Changes**: As described under Ready Screen, Live Screen and
    Arrival and Stopping. Loads `settings.js`, `helpers.js`, `map.js`,
    `trip-math.js`, `tracker-api.js`, `queue.js`, `live.js`. Moves
    `keepAwake`, `resumed` and the gap note here from `tracking.js`.
    **Practice mode:** `live.html?practice=1` replaces GPS with a made-up run
    along the route at 60 times real speed, starts a real trip on the preview
    service with the boat name "Practice run", and shows a "PRACTICE" tag.

##### 5. `next/js/map.js` (Modify)

*   **Type / Scope**: The shared map.
*   **Proposed Changes**: `initMap` takes options (which element; radar on or
    off; detailed line or named points). Adds the recenter control and the
    follow-the-boat switch. Adds `setBoat(pos, heading)` and `setTrail(list)`
    taken from the old `loadTrack`.

##### 6. `next/index.html`, `next/js/boot.js`, `next/js/plan.js`, `next/js/settings.js` (Modify), `next/js/tracking.js` (Delete)

*   **Type / Scope**: The Plan page.
*   **Proposed Changes**: As under "What Changes on the Plan Page". In
    `settings.js`: remove `TRACK_URL`; add `BOAT`, `CAPTAIN`, and per
    direction the route name, gate line and arrival rule. In `plan.js`:
    remove `CAP_PLAN`, `sendPlan` and the family branch of `chosenDep`. In
    `boot.js`: remove `loadTrack`, its timer and `setupCaptain`.

##### 7. `next/css/app.css` (Modify)

*   **Type / Scope**: Styles.
*   **Proposed Changes**: Live screen layout at 390 px and iPad widths;
    button states (pressed, result); status line; notices; recenter control.
    Tap targets at least 48 px high.

##### 8. `next/trip-test.html` (Create)

*   **Type / Scope**: A test page RJ opens in a browser. PREVIEW banner,
    `noindex`, no link from the app.
*   **Proposed Changes**: Runs named checks on `trip-math.js` and on the
    queue's pure functions and lists PASS or FAIL. See Verification Plan.

##### 9. `privacy.html`, `docs/HANDOFF.md`, `docs/designs/mvp.md` (Modify)

*   **Type / Scope**: Statement and docs.
*   **Proposed Changes**: Privacy wording for pull request 1. HANDOFF: where
    the work stands. `mvp.md`: close Q1 with the Nov 25 result; note D1 to D4
    against W15 (now 500 yards), CUJ 6, Step 6 and "What Lives Where"; new dates for rows 4
    to 6.

#### Pull Request 2 (Sat Nov 28)

##### 10. `next/family.html` and `next/js/family.js` (Create)

*   **Type / Scope**: The family page.
*   **Proposed Changes**: As under Family Page. Reads the key from
    `location.hash`. Holds items in memory only.

##### 11. `next/js/calendar.js` (Create)

*   **Type / Scope**: The reminder.
*   **Proposed Changes**: `calendarFile(trip, link)` returns the file text
    (line folding and escaping copied from `next/calendar-test.html`).
    `openCalendarFile(text)`. `googleCalendarUrl(trip, link)`.

##### 12. `next/js/live.js`, `next/live.html` (Modify)

*   **Type / Scope**: Additions to the Live screen.
*   **Proposed Changes**: "Send link to family", "Copy link", "See what
    family sees"; "Track from another device" and the `#join=` reader; "Stop
    tracking on this phone"; "Delete this trip".

##### 13. `next/calendar-test.html`, `next/calendar-test.ics` (Delete); `privacy.html`, `docs/HANDOFF.md`, `next/trip-test.html` (Modify)

*   **Type / Scope**: Tidy-up, statement, tests.
*   **Proposed Changes**: Privacy wording for pull request 2. Checks for
    `familyState` and `calendarFile` added to the test page.

### Settled Details

*   **Saved trip shape:** `{ tripKey, familyKey, dir, boat, captain,
    startedAt, plannedArrival, overdueAt, intervalMin, hideStart, startPoint,
    status, endedAt, endedHow, tracking }`. `status` is `underway` or
    `ended`. `startPoint` is null until the first reading.
*   **Times** on the Live and Plan pages are Eastern (`fmtT`, as today). The
    family page uses the follower's zone.
*   **Start time used for item checks:** the service refuses items dated more
    than 10 minutes before `startedAt`, so the device never records a reading
    from before Start.
*   **Overdue change:** new time is the later of now and the current overdue
    time, plus 1 hour. The Live screen shows the new time at once, marked
    "saved" until the service confirms.
*   **Boat heading on the map:** from the last two recorded positions, as
    today.
*   **Family first read:** no `after`. Later reads: `after` is the highest
    `seq` held.
*   **Join link:** the values are joined into one text, encoded so it is safe
    in a link, and every value is checked on arrival (key shape, direction is
    `home` or `over`, times are numbers).
*   **Map library:** Leaflet 1.9.4 from the same address as today, with its
    published integrity value added on the Live and family pages.
*   **No new libraries. No build step.**

### Build Reminders

Things the build sessions and RJ must not lose track of:

*   **Phone numbers on the overdue notice (D6).** The notice ships without
    any. Before promote, RJ or his attorney supplies and checks the numbers
    to show (for example the US Coast Guard and the Bahamas rescue service),
    and they are added to the family page and the family text.
*   **Start the crossing on the helm iPad (D5),** with "Hide my start" on.
*   **`mvp.md` W15** changes from about 1 nm to 500 yards in pull request 1,
    with `privacy.html`.
*   **The overdue wording and the family text** are drafts until RJ's
    attorney has seen them.

### Build Phases

Each phase leaves the preview working.

**Pull request 1:**

1.  `trip-math.js`, the queue's pure functions and `trip-test.html`. Check:
    every line reads PASS.
2.  `tracker-api.js`, `queue.js`, `live.html` and `live.js` with practice
    mode. Check: a practice run against a locally running service starts,
    opens the gate, records, survives the connection being cut and restored,
    arrives and ends.
3.  The Plan page changes and the recenter icon. Check: the Plan page looks
    and works as before apart from the "Share this trip" box.
4.  `privacy.html` and docs. Screenshots at 390 px and iPad width.

**Pull request 2:**

5.  `family.html`, `family.js`. Check: every row of the state table, driven
    by a practice run and by made-up Read answers.
6.  `calendar.js` and the two buttons.
7.  Family link text, "Track from another device", "Delete this trip".
8.  `privacy.html`, docs, delete the calendar test files.

**Cut order if a day runs short.** Friday: points passed. Saturday: "Track
from another device", then "Add to Google Calendar", then "Delete this trip".
Nothing else is optional for the crossing.

### RJ's Steps

**Fri Nov 27, after merging pull request 1 (about 15 minutes):**

1.  Open `…/next/trip-test.html`. Every line should read PASS.
2.  Open `…/next/live.html?practice=1&trip=home`, type the invite code from
    Keeper, tap "Start trip". Watch a made-up crossing: gate, positions,
    "All good", arrival.
3.  Turn on Airplane Mode for a minute during it, then off. The status line
    should read "Saved N updates", then "All sent".

**Sat Nov 28, after merging pull request 2 (about 30 minutes, on the water if
possible):**

4.  On the helm iPad, start a real trip with "Hide my start" off. Send
    yourself the family link. Open it on the phone.
5.  Run the boat for 10 to 15 minutes. Check the dot moves, tap "All good",
    tap "Remind me" on the phone, then "Stop sharing now". The family page
    should lose its map.
6.  Delete the test trip.

**Crossing day:** on the iPad, open the preview with `?trip=home`, start the
trip with "Hide my start" on, send the text, and leave the page in front with
Auto-Lock set to Never.

**Go or fallback, Saturday evening:** if steps 4 and 5 did not work, repair
the old tracker and use the live page.

### Verification Plan

*   **Compilation/Build**: None; plain JavaScript. `node --check` on each new
    file.
*   **Unit Tests** (`next/trip-test.html`, also runnable with Node), at least:
    *   Distance left at the start equals the line's length; at the last
        point it is 0; a position beside a long segment measures to the
        segment, not the nearest corner.
    *   Gate, trip home: Guana Cay hidden; Whale Cay Passage hidden; a
        position at 77.34°W hidden; a position at 77.40°W more than 500 yards
        from the start shown; a position at 77.40°W within 500 yards of the
        start hidden; 450 yards hidden and 550 yards shown; the same positions with "Hide my start" off shown.
    *   Gate, trip over: a position west of 80.02°W hidden; east of it and
        more than 500 yards from the start shown.
    *   A boat that passes the line and turns back is hidden again.
    *   Arrival: 1.9 nm from the inlet true; 2.5 nm false; one reading inside
        does not end the trip, two do.
    *   Speed: steady 24 kt gives 24; 10 minutes of zeros gives stopped; no
        readings gives null.
    *   Slow and stopped limits at 26 kt cruise.
    *   Quiet limit: 5-minute gaps give 20 minutes; 30-minute gaps give 75.
    *   Queue: events go before positions; `stored`, `had` and `refused`
        remove an item; a failed request removes nothing; `too_many` halves
        the batch; the 3,001st position thins the oldest and keeps events.
    *   Family states: one made-up Read answer for each row of the table.
    *   Calendar file: starts at the overdue time, has an alert, folds long
        lines, escapes commas.
*   **Static Analysis & Linting**: A search of the changed files for the
    invite code, keys, "safe", and `no-cors`.
*   **E2E/Integration**: Practice mode against a locally running service
    (`npx wrangler dev`, as in `tracker-service.md`), driven in a browser at
    390 px and iPad width with the connection cut and restored.
*   **Not testable before merge**: a real iPhone and iPad; real GPS; real
    Starlink drop-outs; keep-awake over hours; the share screen; the calendar
    screens; Android.

--------------------------------------------------------------------------------

### Additional Resources

*   `docs/designs/mvp.md`: Step 6, Step 7, W1, W15, CUJs 6 to 11.
*   `docs/designs/tracker-service.md`: the requests and answers used here.
*   `docs/mockups/Main.dc.html`: the Live and Family screens.
*   `next/js/tracking.js`: today's gate lines, arrival rules and keep-awake
    code.
*   `next/calendar-test.html`: the reminder methods RJ tested on Nov 25.

### Future Improvements

*   A "share from" point and arrival rule for any route (row 9).
*   The service accepts unnamed shape points, so the family map draws the
    detailed line.
*   "New family link" button.
*   Battery level where a device provides it; wind on the family page.
*   The captain's name, boat and route from the saved setup (row 8).
*   Queue and tracks in the browser's database, with past trips (row 14).
*   Phone numbers on the overdue notice, once checked.

--------------------------------------------------------------------------------

*Drafted with EGM*
