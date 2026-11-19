# Tracker Service (MVP Step 2)

*   **Author:** RJ (rjm0824)
*   **Status:** Draft (revision 2, after review round 1)
*   **Date:** 2026-11-19

--------------------------------------------------------------------------------

## Overview

The tracker service is a small program that runs on Cloudflare. It receives a
boat's positions during a trip and hands them to whoever opens that trip's
family link. It replaces "one Google Sheet per captain" with one shared service
that gives every trip its own private link.

This document covers the service only: what it stores, the requests it
answers, how it is published, and how RJ tests it before any app screen uses
it. The screens that call it (Start trip, the Live screen, the family page) are
the next design doc. The overall plan is `docs/designs/mvp.md`. RJ does the
Cloudflare clicks; a Claude Code session writes the code.

**Words used here:**

*   **Preview:** the copy of the app at `/next/` on GitHub Pages
    (`https://rjm0824.github.io/crossing/next/`), where new work lands first.
    It shows a PREVIEW banner.
*   **Live page:** the app at `https://rjm0824.github.io/crossing/`. It
    changes only through a "promote" pull request.
*   **Promote:** a pull request RJ approves that moves the preview to the live
    page, after the tracker has worked on a real trip.
*   **Trip key:** a long random secret that lets a device add to a trip, end it
    and delete it.
*   **Family key:** a long random secret that only lets someone read a trip.
    The family link is the family page's address with the family key after a
    `#`. The part after `#` stays in the browser; the page reads it and sends
    it to the service inside the request.
*   **Invite code:** a shared code RJ gives to friends. Needed to start a
    trip.
*   **Check-in:** the "All good" message a captain sends with one tap.
*   **Overdue time:** the time after which the family page says the boat is
    overdue.
*   **Item:** one thing a device sends: a position or an event.
*   **Worker:** Cloudflare's name for a small program it runs on request.
*   **D1:** Cloudflare's built-in database.

## The Problem

Today's tracker (`tracker/Code.gs`) is a Google Apps Script tied to one Google
Sheet. It has one key, one list of positions and one public reading address.
Every captain would need their own copy, set up by hand. It cannot give a link
per trip, cannot stop showing a trip after arrival, and cannot accept a batch
of positions saved while offshore with no signal.

The solution is one service with a database, where each trip is a separate
record with its own two secrets.

## Goals

*   A device with the invite code can start a trip and receives a trip key and
    a family key.
*   A device with the trip key can add positions and events one at a time or
    in batches, including ones recorded hours earlier.
*   Anyone with the family key can read the trip. A follower who already has
    part of the trail receives everything the service has received since,
    whenever it was recorded.
*   **Sharing stops only when the captain stops it or the boat arrives.** A
    boat that goes silent keeps its last position and overdue notice on the
    family page until the trip is deleted.
*   After a trip ends, the service returns no positions for it. For 2 hours it
    returns how and when it ended. After that it returns only "closed".
*   A trip is deleted within a day of 7 days after it ends. A trip that never
    ended is deleted within a day of 30 days after its last activity.
*   It runs on Cloudflare's free plan at friends scale (25 boats on the same
    day, each with 3 followers watching for 6 hours).
*   RJ can test it from a web page in the preview before any app screen exists.
*   Nothing in today's live page or Apps Script tracker changes.

## Non-Goals

*   **The screens.** Start trip, Live and the family page come next.
*   **The AI setup helper.** Added to this same service in a later step.
*   **Accounts or a list of captains.** The service knows only trips.
*   **Sending texts or alerts.** After the MVP.
*   **Working out arrival.** The device decides and tells the service.
*   **Finding a boat.** The service shows the last position a device sent. It
    is not a rescue tool and cannot call for help.
*   **A live copy.** Only the preview copy is created in this step.
*   **Pushing updates to open pages.** The family page asks every 30 seconds.
*   **The device's send queue.** It is built with the screens. This document
    only defines what the service answers so a queue can work.

## Open Questions

*   **Q1. How long to keep a trip that never ended (RJ).** A boat that went
    silent keeps its last position visible. This draft keeps such a trip for
    30 days after its last activity, then deletes it. Ended trips are deleted
    after 7 days. RJ to confirm 30 days.
*   **Q2. Processing time.** The free plan allows 10 ms of processing per
    request. A 100-item batch must be measured against it in the build. If it
    does not fit, the batch cap is lowered.

## Critical User Journeys (CUJs)

### CUJ 1: Start a trip

*   **Given**: A device holds the invite code.
*   **When**: It sends "start" with the boat name, captain's first name, route,
    planned arrival and overdue time.
*   **Then**: The service stores the trip and returns a trip key and a family
    key. A wrong invite code gets "invite not accepted" and nothing is stored.

### CUJ 2: Add positions as they happen

*   **Given**: A trip is underway.
*   **When**: The device sends one position with its time, place and speed.
*   **Then**: The service stores it and a follower's next read includes it.

### CUJ 3: Add a batch after a gap

*   **Given**: The device saved 40 positions and one check-in with no signal. A
    follower's page has been reading the whole time.
*   **When**: The device sends them in one request, and then sends the same
    request again because the first answer was lost.
*   **Then**: Each item is stored once. The follower's next read returns all 41
    items, although they were recorded before that follower's earlier reads.

### CUJ 4: A follower reads the trip

*   **Given**: A follower's page holds the family key.
*   **When**: It asks for the trip, then 30 seconds later asks for "everything
    after the last item I have".
*   **Then**: The first answer has the trail so far. The second has only what
    arrived since, usually nothing.

### CUJ 5: Overdue, and silent

*   **Given**: The overdue time has passed, the trip has not ended, and no
    position has arrived for 3 days.
*   **When**: A follower's page reads the trip.
*   **Then**: The answer is marked overdue and includes the last position and
    its time, however old. Nothing has hidden it.

### CUJ 6: The trip ends, reported late

*   **Given**: The boat arrived at 1:48 PM with no signal. The device queued
    "ended, arrived, 1:48 PM".
*   **When**: The device sends it at 4:10 PM.
*   **Then**: The trip is marked arrived at 1:48 PM. From 4:10 PM a read
    returns the status "arrived", the destination name and the end time, and no
    positions. From 6:10 PM it returns only "closed". (The page turns this into
    words such as "Arrived at Green Turtle at 1:48 PM" in the reader's own time
    zone.)

### CUJ 7: Replace a forwarded family link

*   **Given**: The captain learns the family link was passed on.
*   **When**: The device asks for a new family key.
*   **Then**: The old family link gets "not found" from then on, the same
    answer as a link that never existed. The new one works.

### CUJ 8: Clean-up

*   **Given**: One trip ended 8 days ago. Another was started 31 days ago and
    never received a position or an end.
*   **When**: The daily clean-up runs.
*   **Then**: Both are deleted with all their items.

### CUJ 9: Daily cap reached

*   **Given**: 50 trips were started today (UTC).
*   **When**: Another start is attempted.
*   **Then**: The service answers "cap" and stores nothing. Trips already
    running are not affected.

## Technical Plan (Architecture)

### Shape

```text
 device (trip key)  ----- start, add, new link, delete ----->  +-----------+
                                                               |  Worker   |
 follower page (family key)  ----- read ------------------->   |  (one     |
                                                               |  program) |
 Cloudflare timer, once a day  ----- clean-up ------------->   +-----+-----+
                                                                     |
                                                               +-----v-----+
                                                               | D1        |
                                                               | database  |
                                                               +-----------+
```

One Worker, one database, one secret setting (the invite code). The program is
plain JavaScript with no added libraries and no build step.

### What Is Stored

| Table | One row per | Holds |
| --- | --- | --- |
| trips | Trip | Scrambled trip key; scrambled family key; boat name; captain's first name; route (name, named points, destination name); planned arrival; overdue time; status; when it started; when it ended, how, and when the service learned of it; the last position and its time; how many items it holds. |
| items | Position or event | A sequence number given by the service in the order items are received; the trip; the device's ID for the item; kind; the device's time; for a position: latitude, longitude, speed, battery level if given; for an event: a value and a short label; time received. |
| counters | Day (UTC) | How many trips were started that day. |

Not stored: phone numbers, follower names, boat details beyond the name,
internet addresses, or the keys themselves (only a one-way scrambled copy).
Request logging is left off so Cloudflare's logs do not keep internet
addresses either; Cloudflare still handles them in passing, as any web host
does.

Positions are kept for 7 days after a trip ends, although followers can no
longer see them, so that a captain who asks "what happened on that trip" within
the week can be answered, and so late items have a trip to land on.

### Keys

*   Each key is 128 random bits, made by the service, written as 32 letters and
    digits (hexadecimal).
*   Keys travel inside the request body, never in the web address.
*   The service finds a trip by scrambling the presented key (SHA-256) and
    looking up the result. A trip needs no separate ID.
*   The browser rule that only the app's address may call the service is set,
    but the keys and the invite code are the real protection.

### Requests and Answers

All five requests are HTTP POST with a JSON body sent as plain text, the same
way today's page talks to its tracker. This form does not make the browser
send an extra "pre-check" request first, so every action is one request.

Times are whole milliseconds since 1970 (the form JavaScript uses).

**1. Start: `POST /v1/start`**

```json
{ "invite": "…", "boat": "Goof n' Off", "captain": "RJ",
  "route": { "name": "West Palm to Green Turtle",
             "points": [ { "name": "Lake Worth Inlet", "lat": 26.77, "lon": -80.03 } ],
             "dest": "Green Turtle" },
  "plannedArrival": 1795790400000, "overdueAt": 1795795200000 }
```

Answer: `{ "tripKey": "…", "familyKey": "…", "startedAt": 1795770000000 }`

**2. Add: `POST /v1/add`**

```json
{ "tripKey": "…", "items": [
  { "id": "p1795770300000", "t": 1795770300000, "kind": "pos",
    "lat": 26.7712, "lon": -79.9841, "sog": 24.5, "bat": 76 },
  { "id": "e-7f3a", "t": 1795771000000, "kind": "checkin" },
  { "id": "e-7f3b", "t": 1795772000000, "kind": "waypoint", "label": "Memory Rock" },
  { "id": "e-7f3c", "t": 1795773000000, "kind": "overdue", "value": 1795798800000 },
  { "id": "e-7f3d", "t": 1795780000000, "kind": "ended", "value": "arrived" },
  { "id": "e-7f3e", "t": 1795780200000, "kind": "resumed" } ] }
```

*   `kind` is one of `pos`, `checkin`, `waypoint`, `overdue`, `ended`,
    `resumed`.
*   `sog` is speed in knots. `bat` is battery percent. Both are optional.
*   `ended` carries `"arrived"` or `"stopped"` in `value`.
*   `overdue` carries the new overdue time in `value`.

Answer: one result per item, in the same order, plus the trip's status.

```json
{ "status": "underway",
  "results": [ { "id": "p1795770300000", "r": "stored" },
               { "id": "e-7f3a", "r": "had" },
               { "id": "e-bad", "r": "refused", "why": "future" } ] }
```

*   `stored`: new and saved. `had`: the service already has it. `refused`:
    will never be accepted; the device drops it from its queue.
*   A batch holds at most 100 items. A longer one is refused whole with
    `too_many`, and the device sends smaller ones.

**3. Read: `POST /v1/read`**

```json
{ "familyKey": "…", "after": 412 }
```

`after` is the sequence number of the last item the page already has. Leave it
out for the first read.

Answer while the trip has not ended:

```json
{ "status": "underway", "overdue": false,
  "boat": "Goof n' Off", "captain": "RJ",
  "route": { "name": "…", "points": [ … ], "dest": "Green Turtle" },
  "startedAt": 1795770000000, "plannedArrival": 1795790400000,
  "overdueAt": 1795795200000,
  "last": { "t": 1795777500000, "lat": 26.71, "lon": -78.95, "sog": 23, "bat": 71 },
  "items": [ { "seq": 413, "t": 1795777500000, "kind": "pos", "lat": 26.71, "lon": -78.95, "sog": 23, "bat": 71 } ],
  "more": false, "now": 1795777530000, "pollSeconds": 30 }
```

*   `last` is the newest position by the device's time, or `null` if none has
    arrived. It is always included, so an overdue page has it even when `items`
    is empty.
*   `items` holds up to 500 items after `after`, in sequence order. `more` is
    true when there are further items; the page reads again at once.
*   `pollSeconds` tells the page how long to wait before the next read.

Answer for 2 hours after the service learned the trip ended:

```json
{ "status": "arrived", "boat": "Goof n' Off", "captain": "RJ",
  "dest": "Green Turtle", "endedAt": 1795780000000,
  "now": 1795788600000, "pollSeconds": 300 }
```

`status` is `"arrived"` or `"stopped"`. No positions, no route.

Answer after that: `{ "status": "closed" }`. The page stops reading.

**4. New family link: `POST /v1/new-link`** with `{ "tripKey": "…" }`.
Answer: `{ "familyKey": "…" }`.

**5. Delete: `POST /v1/delete`** with `{ "tripKey": "…" }`.
Answer: `{ "deleted": true }`.

**Errors.** Every answer, including errors, carries the header that lets the
app's address read it.

| Situation | HTTP status | Body |
| --- | --- | --- |
| Wrong or missing invite code; invite code not set on the service | 401 | `{ "error": "invite" }` |
| Daily trip cap reached | 429 | `{ "error": "cap" }` |
| Unknown, replaced or deleted trip key or family key | 404 | `{ "error": "not_found" }` |
| Body is not valid JSON, a required field is missing or out of range, or the body is over 64 KB | 400 | `{ "error": "bad_request" }` |
| More than 100 items | 400 | `{ "error": "too_many" }` |
| Trip already holds 5,000 items | 429 | `{ "error": "trip_full" }` |
| Unknown address or a method other than POST | 404 | `{ "error": "not_found" }` |
| Database failure | 500 | `{ "error": "server" }` |

When Cloudflare's own daily limit is reached, Cloudflare answers before the
Worker runs, with a page the app cannot read. The app sees a plain failed
request. So the screens must treat any failed request as "tracking
unavailable" and keep their queue.

### Rules

**Checking what arrives**

*   Text is cut to its limit after removing control characters and invisible
    direction-changing characters: boat name 40 characters, first name 30,
    route and point names 40, labels 60. A boat name or first name that is
    empty after cleaning is a `bad_request`.
*   A route has 2 to 30 points. Latitude is between -90 and 90, longitude
    between -180 and 180.
*   `plannedArrival` and `overdueAt` must be later than now and within 14
    days. `overdueAt` must not be earlier than `plannedArrival`.
*   An item `id` is 1 to 40 letters, digits, hyphens or underscores.
*   Speed is 0 to 100. Battery is 0 to 100.
*   An item is refused with `"future"` if its time is more than 10 minutes
    ahead of the service's clock, with `"early"` if it is before the trip
    started, and with `"invalid"` if a field fails the checks above. Other
    items in the same batch are still handled.

**Storing**

*   An item whose `id` the trip already holds is answered `had` and not stored
    again.
*   Each stored item gets the next sequence number. Reads use only sequence
    numbers, so an item recorded hours ago and sent late is still delivered to
    every follower.
*   The trip's "last position" is replaced only by a position with a later
    device time.
*   A trip holds at most 5,000 items (a day at one position a minute is
    1,440).

**Status**

*   A trip's stored status is `underway`, `arrived` or `stopped`. There is no
    "stopped for no updates". Silence never ends a trip. The page works out "No
    update for X min" from `last.t` and `now`.
*   `overdue` is worked out at read time: status is `underway` and the overdue
    time has passed.
*   Events that change the trip (`overdue`, `ended`, `resumed`) are applied in
    the order of their device times, whatever order they arrive in. The trip
    remembers the device time of the latest one applied to each of two things:
    the overdue time, and ended-or-resumed. An event older than the one already
    applied is stored but changes nothing.
*   `ended` sets the status to its value and the end time to the event's time.
    The 2-hour window starts when the service first learns the trip has ended.
    A second `ended` does not restart it.
*   `resumed` with a later device time than the `ended` puts the trip back to
    `underway` and clears the end. The service sets no time limit on this; the
    device's Resume button has its own.
*   Positions and check-ins for an ended trip are stored and do not change its
    status.

**Caps and clean-up**

*   At most 50 trips started per UTC day, changeable in the settings. The count
    is raised and checked in one database step, so two starts at the same
    moment cannot both slip through.
*   The invite code must be at least 12 characters. The service compares
    scrambled copies of the code, which avoids leaking it through timing.
*   The daily clean-up (a Cloudflare timer at 08:00 UTC, about 3 or 4 AM
    Eastern) deletes: trips whose end the service learned more than 7 days
    ago; trips not ended whose last activity (start or latest item received)
    is more than 30 days old; counter rows more than 7 days old. Items are
    deleted with their trip.

### Free-Plan Headroom

Limits read from Cloudflare's documentation on Nov 19, 2026. They are per
account, so after promote the preview copy, the live copy and the AI helper
share them.

| Limit (free plan) | Allowed | 10 boats | 25 boats |
| --- | --- | --- | --- |
| Requests per day | 100,000 | About 25,000 | About 63,000 |
| Database rows read per day | 5,000,000 | About 200,000 | About 500,000 |
| Database rows written per day | 100,000 | About 15,000 | About 36,000 |
| Database calls per request | 50; a batched call counts as one | 3 | 3 |
| Values per database statement | 100 | 12 | 12 |
| Database size | 500 MB | Under 5 MB | Under 10 MB |
| Processing time per request | 10 ms | To measure (Q2) | To measure (Q2) |
| Daily timers per account | 5 | 1 | 1 |

Assumptions: each boat has 3 followers reading every 30 seconds for 6 hours
and sends a position every minute (the fastest setting; the default is every 5
minutes). A read touches the trip row and the new items. A stored position
writes about 4 rows (the item, its two index entries and the trip).

Beyond about 35 boats on one day the request limit is the first to go. The
service can then be told, by changing one setting, to answer `pollSeconds: 60`,
which halves the reads. Past that the next step is Cloudflare's paid plan ($5
per month, to confirm at the time). Nothing is charged without RJ choosing it;
on the free plan a reached limit means the service stops until midnight UTC (7
or 8 PM Eastern).

### Preview and Live

Only the preview copy exists until promote. The test page asks for the
service's address, so nothing in the repo depends on it yet; the screens step
writes it into the preview pages. Merging a pull request that changes the
`tracker-service` folder publishes to the preview copy. At promote, a second
Worker and database are created for the live page from the same folder, with
their own invite code, and from then on they are updated only by a promote pull
request.

## Alternatives Considered

The choice of Cloudflare over Apps Script and Supabase is in `mvp.md`,
Alternatives A to C.

### Alternative A: Cloudflare KV (a Simple Key-and-Value Store) Instead of D1

*   **Pros**: Simpler to read and write one value.
*   **Cons**: The free plan allows 1,000 writes a day; ten boats sending a
    position a minute would pass that in under two hours.
*   **Reason for Rejection**: Recommendation: reject. The free write limit does
    not fit tracking.

### Alternative B: Durable Objects (One Small Live Program per Trip)

*   **Pros**: Could push updates to open pages at once.
*   **Cons**: More concepts to learn and test. Positions arrive at most once a
    minute, so pushing shows little that a 30-second read does not.
*   **Reason for Rejection**: Recommendation: reject for the MVP. Worth another
    look when in-app messages are built.

### Alternative C: Send Keys in a Request Header

*   **Pros**: The conventional place for a secret.
*   **Cons**: Makes the browser send an extra pre-check request before reads
    and writes. How long browsers remember the pre-check varies and could
    double the request count.
*   **Reason for Rejection**: Recommendation: reject. Keys in the body are
    equally hidden from address logs and cost no extra requests.

### Alternative D: Ask for "Items Since a Time"

*   **Pros**: No sequence numbers.
*   **Cons**: By device time, items sent late are never delivered. By received
    time, each read scans the whole trip, about 78% of the daily read limit on
    a 10-boat day.
*   **Reason for Rejection**: Recommendation: reject. Sequence numbers deliver
    late items and keep reads small.

### Alternative E: End a Silent Trip Automatically

*   **Pros**: Tidy. No trips left open.
*   **Cons**: Hides the last known position of a boat that may be missing,
    just when it matters.
*   **Reason for Rejection**: Rejected by RJ on Nov 19: sharing stays on until
    the captain turns it off, so a boat in trouble can still be seen.

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Risks and Mitigations

| Risk | What happens | Mitigation | What remains |
| --- | --- | --- | --- |
| Someone floods the service's address with requests | The daily request limit is used up; tracking stops for everyone until midnight UTC | Devices keep their queue; RJ can see the request count in the Cloudflare dashboard | A determined person can do this. Accepted for friends scale; the paid plan removes the daily stop. |
| Invite code leaks | Strangers start trips; the daily cap fills and real captains are refused | 12-character minimum; 50-a-day cap; RJ changes the code in the dashboard | Friends not yet set up need the new invite link. |
| A trip key is misused | Up to 5,000 junk items on that one trip | Per-trip item cap; batch cap | That trip's trail is spoiled. Other trips are unaffected. |
| A trip key is lost (phone wiped) | The trip cannot be ended or deleted by hand | A second device may hold the key; the trip is deleted after 30 days | Followers see the last position and "overdue" until then. RJ can delete it in the dashboard. |
| Device clock is wrong | Times on the trail are wrong; far-future items are refused | 10-minute future limit; the service records its own receive time | A slow clock gives a trail that looks older than it is. |
| Cloudflare is down or the account is suspended | No tracking | The Start trip text still carries the float plan and overdue time | No live tracking during the outage. |
| The daily clean-up fails | Trips kept longer than promised | It runs again the next day; goals say "within a day of" | A longer failure would need RJ to look at the dashboard. |
| The database leaks | Positions, first names, boat names, routes for the kept period | Short retention; keys scrambled; no phone numbers or accounts | That data. |
| Database backups | Deleted trips can be restored from Cloudflare's 7-day point-in-time recovery | Stated in the privacy statement | "Deleted" means gone from the service at once and from backups within 7 more days. |

### Privacy

`privacy.html` is updated in the same pull request. Draft wording, for RJ to
approve in the pull request (the page's attorney review still applies):

*   Short version, replacing "your boat details stay on your phone": "Your boat
    details stay on your device, except the boat name, your first name and your
    route, which are stored with a trip while you share it."
*   Service providers, replacing the Google sentence: "Trip positions are
    stored by Google (the current version) or Cloudflare (the preview version
    being tested)."
*   What is stored for a preview trip: "boat name, your first name, the route,
    your planned arrival and overdue time, your positions at the precision your
    device reports, speed, battery level where your device provides it, and
    your check-ins."
*   How long, replacing "until you ask us to delete them": "In the preview
    version a trip is deleted 7 days after it ends. A trip that is never ended
    is deleted 30 days after its last update. You can delete a trip yourself
    from the app at any time. Deleted trips remain in our provider's backups
    for up to 7 more days."
*   Deletion by email: "We have no accounts, so to delete a trip by email, send
    us its family link."
*   The date at the top.

Not added yet, because the screens that do them are not built: the start gate
(no position near the start) and what followers see after arrival. They are
added with the screens.

### Cost

$0. The account is created; no card was requested. The daily clean-up is the
only thing that runs on its own, once a day, at no cost.

### Rollout and Undo

*   No app screen calls the service until the next step. Only the test page
    does.
*   Undo: delete the Worker and the database in the Cloudflare dashboard, and
    revert the pull request.
*   Later database changes are written so the previously published program
    still works with them.

--------------------------------------------------------------------------------

### Additional Resources

*   `docs/designs/mvp.md`: the overall plan.
*   `docs/designs/tracker-service_review_report.md`: review round 1.
*   `tracker/Code.gs`: the tracker this replaces at promote.
*   `privacy.html`: the statement updated in this step.
*   Cloudflare documentation read on Nov 19, 2026: Workers limits; D1 limits
    and pricing; Workers Builds configuration; D1 local development (applying
    database changes in the publish command); protecting against timing
    attacks.

### Future Improvements

*   **AI setup helper** request, with its own daily cap.
*   **In-app messages** between captain and followers.
*   **Text messages** for overdue and arrival, with a timer.
*   **Accounts** that own trips (Phase 2).

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `tracker-service/package.json` (Create)

*   **Type / Scope**: Settings for Node and Cloudflare's tool.
*   **Proposed Changes**: `"private": true`, `"type": "module"`, and one
    development dependency, `wrangler`, pinned to the exact current version at
    build time. Scripts: `"test": "node --test test/rules.test.js
    test/keys.test.js"`.

#### 2. `tracker-service/wrangler.jsonc` (Create)

*   **Type / Scope**: Cloudflare settings file.
*   **Proposed Changes**: `name`: `crossing-tracker-preview`; `main`:
    `src/index.js`; `compatibility_date`: the build day; `workers_dev`: true;
    `observability`: disabled; `d1_databases`: one entry with `binding` `DB`,
    `database_name` `crossing-preview`, `database_id` from RJ, `migrations_dir`
    `migrations`; `vars`: `ALLOWED_ORIGINS` =
    `https://rjm0824.github.io`, `DAILY_TRIP_CAP` = `"50"`, `POLL_SECONDS` =
    `"30"`; `triggers.crons`: `["0 8 * * *"]`. The secret `INVITE_CODE` is not
    in this file.

#### 3. `tracker-service/migrations/0001_init.sql` (Create)

*   **Type / Scope**: Database set-up.
*   **Proposed Changes**:
    *   `trips`: `id` INTEGER PRIMARY KEY; `trip_key_hash` TEXT NOT NULL
        UNIQUE; `family_key_hash` TEXT NOT NULL UNIQUE; `boat` TEXT NOT NULL;
        `captain` TEXT NOT NULL; `route_json` TEXT NOT NULL; `planned_arrival`
        INTEGER NOT NULL; `overdue_at` INTEGER NOT NULL; `overdue_set_t`
        INTEGER NOT NULL DEFAULT 0; `status` TEXT NOT NULL DEFAULT
        `'underway'`; `state_t` INTEGER NOT NULL DEFAULT 0; `started_at`
        INTEGER NOT NULL; `ended_at` INTEGER; `end_learned_at` INTEGER;
        `last_json` TEXT; `last_t` INTEGER NOT NULL DEFAULT 0; `last_activity`
        INTEGER NOT NULL; `item_count` INTEGER NOT NULL DEFAULT 0.
    *   `items`: `seq` INTEGER PRIMARY KEY AUTOINCREMENT; `trip_id` INTEGER NOT
        NULL; `item_id` TEXT NOT NULL; `kind` TEXT NOT NULL; `t` INTEGER NOT
        NULL; `lat` REAL; `lon` REAL; `sog` REAL; `bat` INTEGER; `value` TEXT;
        `label` TEXT; `recv_t` INTEGER NOT NULL; UNIQUE (`trip_id`,
        `item_id`); INDEX on (`trip_id`, `seq`).
    *   `counters`: `day` TEXT PRIMARY KEY; `n` INTEGER NOT NULL.

#### 4. `tracker-service/src/keys.js` (Create)

*   **Type / Scope**: Key helpers, usable in the Worker and in Node.
*   **Proposed Changes**: `newKey()` returns 16 random bytes as 32 hex
    characters. `async hashKey(text)` returns the SHA-256 of the text as hex.
    `async sameSecret(a, b)` hashes both and compares the two hashes character
    by character without stopping early.

#### 5. `tracker-service/src/rules.js` (Create)

*   **Type / Scope**: Pure functions with no database or network use.
*   **Proposed Changes**:
    *   `cleanText(value, max)`: string or null.
    *   `validateStart(body, now)`: `{ ok, fields }` or `{ error }`.
    *   `checkItem(item, trip, now)`: `{ ok, row }` or `{ refused: why }`.
    *   `applyItems(trip, acceptedItems, now)`: the changed trip fields after
        applying state events in device-time order and updating the last
        position, last activity and item count.
    *   `shapeRead(trip, items, now, pollSeconds)`: the read answer for
        underway, recently ended, or closed.
    *   `capAllows(countAfterIncrement, cap)`: true or false.
    *   `cleanupCutoffs(now)`: `{ endedBefore, idleBefore, countersBefore }`.

#### 6. `tracker-service/src/index.js` (Create)

*   **Type / Scope**: The Worker.
*   **Proposed Changes**:
    *   `fetch` handler: answers the five POST addresses above; anything else
        is 404. Reads the body as text (refusing over 64 KB), parses JSON,
        calls the rules, runs the database statements, and returns JSON with
        `Access-Control-Allow-Origin` set to the caller's origin when it is in
        `ALLOWED_ORIGINS` (a comma-separated list).
    *   Start: one statement inserts or raises today's counter and returns the
        new count; if over the cap, answer `cap` (the raised count is left as
        is). Then insert the trip.
    *   Add: look up the trip; refuse if `item_count` is at 5,000; check each
        item; in one batched call run "insert or ignore" for each accepted
        item, then read back which `item_id`s now exist with a sequence number
        above the trip's previous highest to tell `stored` from `had`; apply
        `applyItems`; update the trip row.
    *   Read: look up the trip by family key hash; select items with `seq`
        greater than `after`, ordered by `seq`, limit 501 (the extra one sets
        `more`); shape the answer.
    *   New link: replace `family_key_hash`.
    *   Delete: in one batched call delete the trip's items, then the trip.
    *   `scheduled` handler: using `cleanupCutoffs`, delete items of the trips
        to remove, then the trips, then old counters, in one batched call.

#### 7. `tracker-service/test/rules.test.js` and `test/keys.test.js` (Create)

*   **Type / Scope**: Automated checks with Node's built-in test runner.
*   **Proposed Changes**: At least one accepted and one refused case for every
    bullet under "Checking what arrives" and "Status", and for `capAllows` and
    `cleanupCutoffs`. Named cases include: a late "ended" sets the end time in
    the past; a second "ended" does not restart the 2-hour window; "resumed"
    after "ended" reopens; an older "overdue" arriving after a newer one
    changes nothing; a silent trip three days past its overdue time still
    returns `last` and `overdue: true`; a read within 2 hours of learning of
    the end has no positions or route; after 2 hours it is `closed`. For keys:
    two new keys differ; the same text hashes the same; `sameSecret` is true
    only for equal text.

#### 8. `tracker-service/test/local-check.mjs` (Create)

*   **Type / Scope**: A script the build session runs against the service
    running locally. Not run by RJ.
*   **Proposed Changes**: Starts a trip, adds items, sends the same batch
    twice, sends a late batch and confirms a reader holding an older sequence
    number receives it, reads, ends, reads again, replaces the link and
    confirms the old key gets 404, starts trips until the cap answers, deletes,
    triggers the clean-up, and prints the rows-read count the database reports
    for an incremental read. Exits with an error if any check fails.

#### 9. `.gitignore` (Create, at the repo root)

*   **Type / Scope**: Tells Git which files never to add.
*   **Proposed Changes**: `node_modules/`, `.wrangler/`, `.dev.vars`. The
    local invite code used for testing lives in `.dev.vars` and must never be
    committed.

#### 10. `next/tracker-test.html` (Create)

*   **Type / Scope**: A plain test page in the preview for RJ, removed at
    promote. It has the PREVIEW banner, `<meta name="robots"
    content="noindex">`, and no link from the app.
*   **Proposed Changes**: Two boxes: the service's address and the invite code
    (both kept only while the page is open). One button, "Run all checks". It
    runs, in order: start a trip; add a made-up position off Palm Beach; add a
    check-in; send the same batch twice and expect `had`; read and expect the
    position; add a late-dated position and expect a second read to return it;
    change the overdue time to one minute ago and expect `overdue: true`; end
    the trip as arrived and expect no positions in the next read; replace the
    family link and expect the old key to get `not_found`; delete the trip.
    Each line shows a plain-words description and PASS or FAIL. All text from
    the service is shown with `textContent`.

#### 11. `privacy.html` (Modify)

*   **Type / Scope**: Privacy statement.
*   **Proposed Changes**: The wording in "Privacy" above.

#### 12. `tracker-service/README.md` (Create)

*   **Type / Scope**: Plain-words notes for RJ.
*   **Proposed Changes**: What the folder is; RJ's steps below; how to change
    the invite code; how to see the request count; how to delete one trip by
    hand; how to undo everything.

### Build Phases

Each phase leaves the repo in a working state.

1.  `package.json`, `.gitignore`, `keys.js`, `rules.js` and their tests. Check:
    `npm test` passes.
2.  `wrangler.jsonc`, the database file, `index.js`, `local-check.mjs`. Check:
    the service runs locally (`npx wrangler d1 migrations apply DB --local`,
    then `npx wrangler dev --test-scheduled`) and `local-check.mjs` passes.
    The processing time for a 100-item batch is noted (Q2).
3.  `tracker-test.html`, `privacy.html`, `README.md`. Check: the page loads at
    phone and iPad widths and passes against the local service.
4.  RJ's steps, then the test page against the published preview copy.

### RJ's Steps (Guided, One at a Time)

**Before the pull request is finished (about 5 minutes):**

1.  In the Cloudflare dashboard, create a D1 database named
    `crossing-preview`.
2.  Copy its Database ID to Claude. It is not a secret.

**When the pull request is merged (about 10 minutes):**

3.  In Workers and Pages, create an application by importing the GitHub
    repository `rjm0824/crossing`. Name it exactly `crossing-tracker-preview`.
    Root directory: `tracker-service`. Deploy command: `npx wrangler d1
    migrations apply DB --remote && npx wrangler deploy`. Build watch path:
    `tracker-service/*`.
4.  In the Worker's Settings, under Variables and Secrets, add a secret named
    `INVITE_CODE` with a code of at least 12 characters. Save it in the
    password manager.
5.  Copy the Worker's address (it ends in `workers.dev`).

**Then (about 5 minutes):**

6.  Open `https://rjm0824.github.io/crossing/next/tracker-test.html`, paste the
    address and the invite code, and tap "Run all checks".

**If step 3's publish fails on the database change:** open the database's
Console in the dashboard, paste the contents of `0001_init.sql`, run it, set
the deploy command to `npx wrangler deploy`, and retry. Claude walks RJ through
it.

### Verification Plan

*   **Compilation/Build**: None; plain JavaScript.
*   **Unit Tests**: `npm test` in `tracker-service/`.
*   **Static Analysis & Linting**: `node --check` on each file in `src/`.
*   **Test Coverage Requirement**: As listed under file 7.
*   **E2E/Integration**: `local-check.mjs` against the local service before the
    pull request. After merge, RJ's "Run all checks". Not testable before
    merge: the published copy itself; the Cloudflare timer on its real
    schedule (checked the next day in the dashboard); iPhone Safari against the
    published copy.

--------------------------------------------------------------------------------

*Drafted with EGM*
