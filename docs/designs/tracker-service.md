# Tracker Service (MVP Step 2)

*   **Author:** RJ (rjm0824)
*   **Status:** Draft
*   **Date:** 2026-11-19

--------------------------------------------------------------------------------

## Overview

The tracker service is a small program that runs on Cloudflare. It receives a
boat's positions during a trip and hands them to whoever opens that trip's
family link. It replaces "one Google Sheet per captain" with one shared service
that gives every trip its own private link.

This document covers the service only: what it stores, the requests it
answers, how it is published, and how RJ tests it before any screen uses it.
The screens that call it (Start trip, the Live screen, the family page) are a
separate design doc. The overall plan is `docs/designs/mvp.md`.

**Words used here** (same meaning as in `mvp.md`):

*   **Trip key:** a long random secret that lets a device add to a trip, end it
    and delete it.
*   **Family key:** a long random secret that only lets someone read a trip.
    The family link carries it.
*   **Invite code:** a short shared code RJ gives to friends. Needed to start a
    trip.
*   **Overdue time:** the time after which the family page says the boat is
    overdue.
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
    as a batch, including ones recorded hours earlier.
*   Anyone with the family key can read the trip: status, trail, events, route,
    planned arrival, and whether it is overdue.
*   After a trip ends, the service returns no positions for it. For 2 hours it
    returns how and when it ended. After that it returns only "ended".
*   A trip is deleted 7 days after it ends.
*   It runs on Cloudflare's free plan with wide headroom at friends scale (10
    boats on the same day, each with 3 followers watching for 6 hours).
*   RJ can test it from a web page in the preview before any app screen exists.
*   Nothing in today's live page or Apps Script tracker changes.

## Non-Goals

*   **The screens.** Start trip, Live and the family page come next.
*   **The AI setup helper.** It is added to this same service in a later step.
*   **Accounts or a list of captains.** The service knows only trips.
*   **Sending texts or alerts.** After the MVP.
*   **Working out arrival.** The device decides and tells the service.
*   **A live copy.** Only the preview copy is created in this step. The live
    copy is created at promote.
*   **Pushing updates to open pages.** The family page asks every 30 seconds.

## Open Questions

*   **Q1. Database set-up.** RJ creates the database in the Cloudflare
    dashboard and gives its ID (not a secret) to be written into the service's
    settings file. Newer Cloudflare tooling may create it automatically on
    first publish; to verify during the build. The manual route works either
    way.
*   **Q2. Applying database changes on publish.** The plan is for the publish
    command to apply any new database change files before publishing the
    program. To verify that Cloudflare's GitHub publishing allows this on the
    free plan. Fallback: RJ pastes the change into the dashboard's database
    console (one paste, guided).
*   **Q3. Service address.** Cloudflare gives a free address ending in
    `workers.dev` that includes the account's chosen subdomain. RJ picks that
    subdomain when creating the account. It will be visible in the page's code,
    so it should not include a personal name.

## Critical User Journeys (CUJs)

### CUJ 1: Start a trip

*   **Given**: A device holds the invite code.
*   **When**: It sends "start trip" with the boat name, captain's first name,
    route, planned arrival and overdue time.
*   **Then**: The service stores the trip and returns a trip ID, a trip key and
    a family key. A wrong invite code gets "invite not accepted" and nothing is
    stored.

### CUJ 2: Add positions as they happen

*   **Given**: A trip is underway.
*   **When**: The device sends one position with its time, place and speed.
*   **Then**: The service stores it and a follower's next read includes it.

### CUJ 3: Add a batch after a gap

*   **Given**: The device saved 40 positions and one check-in with no signal.
*   **When**: It sends them in one request, and then sends the same request
    again because the first reply was lost.
*   **Then**: Each item is stored once. The trail has no duplicates.

### CUJ 4: A follower reads the trip

*   **Given**: A follower's page holds the family key.
*   **When**: It asks for the trip, then 30 seconds later asks for "anything
    since my last read".
*   **Then**: The first answer has the whole trail. The second has only what is
    new, usually nothing.

### CUJ 5: Overdue

*   **Given**: The overdue time has passed and the trip has not ended.
*   **When**: A follower's page reads the trip.
*   **Then**: The answer is marked overdue and includes the last position and
    its time.

### CUJ 6: The trip ends, possibly reported late

*   **Given**: The boat arrived at 1:48 PM with no signal. The device queued
    "trip ended, arrived, 1:48 PM".
*   **When**: The device sends it at 4:10 PM.
*   **Then**: The trip is marked arrived at 1:48 PM. From 4:10 PM a follower's
    read returns "Arrived at Green Turtle at 1:48 PM" and no positions. From
    6:10 PM it returns only "ended".

### CUJ 7: Replace a forwarded family link

*   **Given**: The captain learns the family link was passed on.
*   **When**: The device asks for a new family key.
*   **Then**: The old family link stops working at once. The new one works.

### CUJ 8: Clean-up

*   **Given**: A trip ended 8 days ago, and another has had no position for 25
    hours and was never ended.
*   **When**: The daily clean-up runs.
*   **Then**: The first is deleted with its positions and events. The second is
    marked "sharing stopped, no updates".

### CUJ 9: Daily cap reached

*   **Given**: 50 trips were started today.
*   **When**: Another start is attempted.
*   **Then**: The service answers "busy, try again tomorrow" and stores
    nothing. Trips already running are not affected.

## Technical Plan (Architecture)

### Shape

```text
 device (trip key)  --- start, add, end, new link, delete --->  +-----------+
                                                                |  Worker   |
 follower page (family key)  --- read, read since T --------->  |  (one     |
                                                                |  program) |
 Cloudflare timer, once a day  --- clean-up ------------------> +-----+-----+
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
| trips | Trip | Trip ID; scrambled trip key; scrambled family key; boat name; captain's first name; route (named points, destination name); planned arrival; overdue time; status; when it started, ended, and when the service learned it ended; time of the latest position. |
| points | Position | Trip ID; time recorded on the device; latitude; longitude; speed; battery level if the device gave one; time received. |
| events | Event | Trip ID; an ID made by the device; time; kind (check-in, passed a waypoint, overdue time changed, ended, resumed); a short label. |
| counters | Day and kind | How many trips were started that day. |

Not stored: phone numbers, follower names, boat details beyond the name,
internet addresses, the invite code a trip was started with, or the keys
themselves (only a one-way scrambled copy, so a database leak does not hand out
working links; it would still expose the last 7 days of positions, first names,
boat names and routes).

### Keys

*   Each key is 128 random bits, made by the service.
*   Keys travel in a request header, not in the web address, so they do not
    appear in address logs.
*   The service finds a trip by scrambling the presented key the same way and
    looking up the result.
*   The browser rule that only the app's address may call the service is set,
    but the keys are the real protection.

### Requests

| Request | Presents | Does |
| --- | --- | --- |
| Start trip | Invite code | Checks the code and the daily cap. Checks and trims the text. Stores the trip. Returns trip ID, trip key, family key. |
| Add to trip | Trip key | Takes up to 500 items. Stores each position and event once (a repeat of the same position time or event ID is ignored). Applies "overdue time changed", "ended" and "resumed" to the trip. |
| Read trip | Family key, and optionally "since" a time | Returns the trip's status, route, planned arrival, overdue time, an overdue flag, positions and events after "since", and the service's current time. |
| New family key | Trip key | Replaces the family key. Returns the new one. |
| Delete trip | Trip key | Deletes the trip, its positions and its events. |

Every answer is data only. The pages that show it must display names and
labels as plain text.

### Rules

*   **Status** is one of: underway, arrived, stopped (by hand), or stopped for
    no updates.
*   **Overdue** is worked out at read time: the overdue time has passed and the
    status is underway.
*   **Ended trips.** Once a trip has ended, reads return no positions and no
    route. For 2 hours from when the service learned of the end they return the
    status, the destination name and the end time. After that they return only
    "ended".
*   **Resumed.** A "resumed" event within 10 minutes of the end puts the trip
    back to underway.
*   **Late items.** Positions and events for an ended or auto-stopped trip are
    still accepted until the trip is deleted. An "ended" among them sets the
    end time and status.
*   **Times.** Each item carries the device's time. The service also records
    when it received it. An item dated more than 10 minutes in the future is
    refused.
*   **Text limits.** Boat name 40 characters, first name 30, point names 40,
    at most 30 route points, labels 60. Control characters are removed.
*   **Daily cap.** 50 trips started per day across everyone, changeable in the
    settings.
*   **Daily clean-up** (a Cloudflare timer, once a day): marks trips with no
    position for 24 hours as stopped for no updates; deletes trips that ended
    more than 7 days ago; deletes old counter rows.
*   **Over the free limit.** If Cloudflare's daily limit is reached, requests
    fail until midnight UTC. Devices keep their queue; the family page shows
    "Tracking is temporarily unavailable." That wording is built with the
    screens.

### Free-Plan Headroom

Limits checked on Cloudflare's documentation on Nov 19, 2026.

| Limit (free plan, per day) | Allowed | Busy-day estimate | Share used |
| --- | --- | --- | --- |
| Requests to the Worker | 100,000 | About 26,000 (10 boats × 3 followers reading every 30 seconds for 6 hours, plus 3,600 position sends at one a minute) | 26% |
| Database rows read | 5,000,000 | About 150,000 (each read touches the trip row and only the new positions) | 3% |
| Database rows written | 100,000 | About 11,000 (each position writes one row and updates the trip row; index entries may count as extra) | 11% |
| Database size | 500 MB | Under 1 MB with 7-day deletion | Under 1% |
| Processing time per request | 10 ms | Scrambling a key and two small database calls | To measure in the build |
| Daily timers | 5 per account | 1 | 20% |

Reading "only what is new" depends on the database finding a trip's positions
by trip and time without scanning the table. The tables are keyed to make that
so, and the build checks the rows-read count that the database reports.

### Preview and Live

Only the preview copy exists until promote. Its address goes into the preview
pages. Merging a pull request that changes the service folder publishes to the
preview copy. The live copy, with its own database and its own invite code, is
created as part of promote.

## Alternatives Considered

### Alternative A: Cloudflare KV (a simple key-and-value store) Instead of D1

*   **Pros**: Simpler to read and write one value.
*   **Cons**: The free plan allows 1,000 writes a day; ten boats sending a
    position a minute would pass that in under two hours. Appending to a trail
    means rewriting the whole trail each time.
*   **Reason for Rejection**: Recommendation: reject. The free write limit does
    not fit tracking.

### Alternative B: Durable Objects (One Small Live Program per Trip)

*   **Pros**: Could push updates to open pages at once.
*   **Cons**: More concepts to learn and test. Positions arrive every few
    minutes, so pushing shows nothing a 30-second read does not.
*   **Reason for Rejection**: Recommendation: reject for the MVP. Worth another
    look when in-app messages are built.

### Alternative C: Keep the Keys in the Web Address of Each Request

*   **Pros**: Slightly simpler requests; no extra check by the browser before
    each kind of request.
*   **Cons**: Web addresses are the part of a request most often written to
    logs.
*   **Reason for Rejection**: Recommendation: reject. Headers cost one extra
    browser check per page visit.

### Alternative D: The Service Works Out Arrival and Overdue on a Timer

*   **Pros**: Could mark trips overdue without anyone reading them.
*   **Cons**: Needs a timer every few minutes, and nobody is told anyway until
    texting exists.
*   **Reason for Rejection**: Recommendation: reject for the MVP. Revisit with
    texting, where a timer is needed to send the overdue text.

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Security and Privacy

*   The invite code is a Cloudflare secret setting. It is compared in a way
    that does not leak it through timing.
*   Keys are stored scrambled. Internet addresses are not stored.
*   `privacy.html` is updated in the same pull request: preview trips are
    stored with Cloudflare; what is stored for a trip; 7-day deletion; the live
    page still uses Google until promote.
*   A deletion request by email is handled by RJ in the Cloudflare dashboard,
    finding the trip by date and boat name.

### Cost

$0. Cloudflare free plan; no card is needed to create the account (to confirm
at sign-up). The daily clean-up is the only thing that runs on its own, once a
day, at no cost. If a limit is ever reached the service stops until midnight
UTC; it does not start charging.

### Rollout and Undo

*   The preview pages do not call the service until the next step, so
    publishing it changes nothing a visitor sees.
*   Undo: delete the Worker and the database in the Cloudflare dashboard, and
    revert the pull request. The test page and the privacy wording go with the
    revert.
*   Later database changes are written so the previously published program
    still works with them.

--------------------------------------------------------------------------------

### Additional Resources

*   `docs/designs/mvp.md`: the overall plan and the decisions behind this.
*   `tracker/Code.gs`: the tracker this replaces at promote.
*   `privacy.html`: the statement updated in this step.
*   Cloudflare documentation: Workers limits, D1 pricing and limits, Workers
    Builds (publishing from GitHub).

### Future Improvements

*   **AI setup helper** request, with its own daily cap.
*   **In-app messages** between captain and followers.
*   **Text messages** for overdue and arrival, with a timer.
*   **Accounts** that own trips (Phase 2).

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `tracker-service/wrangler.jsonc` (Create)

*   **Type / Scope**: Cloudflare settings file.
*   **Proposed Changes**: Worker name `crossing-tracker-preview`; entry file
    `src/index.js`; a compatibility date of the build day; one D1 binding named
    `DB` with the database ID RJ provides; a plain setting `ALLOWED_ORIGIN` set
    to `https://rjm0824.github.io`; a plain setting `DAILY_TRIP_CAP` set to
    `50`; one daily timer at 08:00 UTC. The invite code is not in this file; it
    is the secret `INVITE_CODE`, added by RJ in the dashboard.

#### 2. `tracker-service/migrations/0001_init.sql` (Create)

*   **Type / Scope**: Database set-up.
*   **Proposed Changes**:
    *   `trips`: `id` text primary key; `trip_key_hash` text unique;
        `family_key_hash` text unique; `boat`, `captain` text; `route_json`
        text; `planned_arrival`, `overdue_at`, `started_at`, `ended_at`,
        `end_learned_at`, `last_pos_t` integer (milliseconds); `status` text.
    *   `points`: `trip_id` text, `t` integer, `lat` real, `lon` real, `sog`
        real, `battery` integer, `recv_t` integer; primary key (`trip_id`,
        `t`).
    *   `events`: `trip_id` text, `id` text, `t` integer, `kind` text, `label`
        text, `recv_t` integer; primary key (`trip_id`, `id`); index on
        (`trip_id`, `t`).
    *   `counters`: `day` text, `name` text, `n` integer; primary key (`day`,
        `name`).
    *   Index on `trips` (`status`, `last_pos_t`) and (`status`, `ended_at`)
        for the clean-up.

#### 3. `tracker-service/src/index.js` (Create)

*   **Type / Scope**: The Worker. Plain JavaScript module, no imports beyond
    the two files below.
*   **Proposed Changes**: Routes requests by method and path under `/v1`:
    *   `POST /v1/trips` (start; invite code in the JSON body)
    *   `POST /v1/trips/:id/updates` (add; `Authorization: Bearer <trip key>`)
    *   `POST /v1/trips/:id/family-key` (new family key; trip key)
    *   `DELETE /v1/trips/:id` (delete; trip key)
    *   `GET /v1/follow?since=<ms>` (read; `Authorization: Bearer <family
        key>`)
    *   `OPTIONS` on all of them (browser check), answered with the allowed
        origin, methods and headers, cacheable for a day.
    *   A `scheduled` handler that runs the clean-up.
    *   Answers are JSON. Errors are `{ "error": "<code>" }` with codes
        `invite`, `cap`, `not_found`, `bad_request`, and HTTP statuses 401,
        429, 404, 400. An ended trip is a normal 200 answer with
        `status: "ended"`.
    *   Database writes for a batch go in one batched call, using "insert or
        ignore" so repeats are dropped.

#### 4. `tracker-service/src/rules.js` (Create)

*   **Type / Scope**: Pure functions with no database or network use, so they
    can be tested alone.
*   **Proposed Changes**: `cleanText(value, max)`; `validateStart(body)`
    returning cleaned fields or an error code; `validateItems(items, now)`;
    `isOverdue(trip, now)`; `shapeRead(trip, points, events, now)` which
    applies the ended-trip rules and decides what a read returns;
    `applyEvent(trip, event, now)` returning the changed trip fields.

#### 5. `tracker-service/src/keys.js` (Create)

*   **Type / Scope**: Key helpers.
*   **Proposed Changes**: `newKey()` (16 random bytes, URL-safe text);
    `hashKey(key)` (SHA-256, hex); `sameText(a, b)` (comparison that takes the
    same time whatever the input).

#### 6. `tracker-service/test/rules.test.js` (Create)

*   **Type / Scope**: Automated checks, run with Node's built-in test runner
    (nothing to install).
*   **Proposed Changes**: Cases for each function in `rules.js`, including:
    text trimmed and control characters removed; over-long route refused;
    future-dated item refused; overdue only when underway and past the time;
    ended trip returns no positions and no route; within 2 hours returns the
    arrival line; after 2 hours returns only "ended"; "ended" dated in the past
    sets the end time; "resumed" within 10 minutes reopens and after 10 minutes
    does not.

#### 7. `next/tracker-test.html` (Create)

*   **Type / Scope**: A plain test page in the preview, for RJ. It carries the
    PREVIEW banner and a "do not list" tag, and is not linked from the app.
*   **Proposed Changes**: A box to type the invite code (kept only in the
    page's memory). Buttons: Start a test trip; Send a position (uses a fixed
    made-up position off Palm Beach, not the device's location); Send "All
    good"; Send the same batch twice; End the trip; Read as a follower; New
    family link; Delete the trip. Each shows the service's answer in plain
    words and a pass or fail mark.

#### 8. `privacy.html` (Modify)

*   **Type / Scope**: Privacy statement.
*   **Proposed Changes**: Add Cloudflare as the place preview trips are stored,
    what is stored for a trip, and the 7-day deletion. Keep the Google wording
    for the live page. Update the date.

#### 9. `tracker-service/README.md` (Create)

*   **Type / Scope**: Plain-words notes for RJ.
*   **Proposed Changes**: What the folder is; the one-time Cloudflare steps;
    how to change the invite code; how to undo.

### RJ's One-Time Steps (Guided, About 15 Minutes)

1.  Create a free Cloudflare account. Save the login in the password manager.
2.  In Workers and Pages, create an application from the GitHub repository,
    with the root directory set to `tracker-service`.
3.  Create a D1 database named `crossing-preview` and tell Claude its ID.
4.  Add the secret `INVITE_CODE` in the Worker's settings. Save it in the
    password manager.
5.  After the pull request is merged, open the test page and tap each button.

### Verification Plan

*   **Compilation/Build**: None; plain JavaScript.
*   **Unit Tests**: `node --test tracker-service/test/`
*   **Static Analysis & Linting**: `node --check` on each source file.
*   **Test Coverage Requirement**: Every rule in "Rules" above has at least one
    passing and one failing case in `rules.test.js`.
*   **E2E/Integration**: Before the pull request, the Worker is run locally
    with Cloudflare's local tool and every button's request is exercised
    against a local database, including the duplicate batch and the rows-read
    count for a "since" read. After merge, RJ runs the test page against the
    published preview copy. Not testable before merge: the published copy
    itself, and the daily timer (checked the next day in the dashboard).

--------------------------------------------------------------------------------

*Drafted with EGM*
