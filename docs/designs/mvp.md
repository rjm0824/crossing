# Crossing App MVP (Phase 1, friends version)

*   **Author:** RJ (rjm0824)
*   **Status:** Draft
*   **Date:** 2026-11-19

--------------------------------------------------------------------------------

## Overview

The Crossing App answers one question for a boat captain: "Should I go?" It
checks seas, wind and tides along the route against the captain's own limits.
Once the captain leaves, the people on shore can watch the boat on a map from
one link, with no app and no login.

Today it is one web page built for one boat and one route. The MVP turns it
into something any friend can set up in about two minutes for their own boat,
route and family. It stays a free web page (no App Store yet) and is shared
only with friends.

This document is the umbrella spec. It says what the MVP is, how the pieces fit,
and the order they get built. Each piece then gets its own short design doc and
its own pull request to the preview at `/next/`.

It is a planning aid, never a navigation tool. The captain decides.

## The Problem

1.  **Only RJ can use it.** The boat, the limits and the route are written into
    the page. A friend cannot enter their own.
2.  **Tracking needs hand-work per captain.** Each captain would have to copy a
    Google Sheet, paste a script, deploy it and type a key. No friend will do
    that.
3.  **The family link is the same for everyone and never expires.** There is
    one tracker and one public page. A link per trip that stops working on
    arrival does not exist.
4.  **Nothing is remembered.** There are no saved trips, no trip history, and
    no way to plan a trip that is weeks away.

The proposed solution has two halves:

*   **On the phone:** a set of plain web pages that hold the captain's boat,
    limits, routes, followers and trips on the phone itself.
*   **On a server:** one small shared "tracker service" that gives every
    captain a private tracker and a private family link per trip, and that
    holds the one secret the app needs (the AI key for the setup chat).

## Goals

*   A friend can go from opening the link to a first GO / NO-GO answer for their
    own boat and route in about 2 minutes, without help from RJ.
*   A captain can start a trip with one tap and send one link. Whoever opens
    that link sees the boat on a map with an arrival estimate, with no app and
    no login.
*   The family link stops showing the boat's position once the trip ends.
*   A captain can save trips ahead of time, see past trips, and copy a past trip
    as a new one.
*   Positions recorded with no signal are kept on the phone and sent when signal
    returns.
*   Running cost at friends scale (up to about 25 captains): $0 per month for
    hosting, plus about 1 to 2 cents per setup chat, with a hard cap of $5 per
    month on the AI key.
*   RJ's current tracker (Apps Script + Google Sheet) and the live page keep
    working unchanged until RJ approves a separate "promote" pull request.

## Non-Goals

*   **Navigation.** No course to steer, no turn-by-turn, no "safe" wording, no
    weather routing.
*   **Tracking while the phone is locked or the page is in the background.**
    That needs a native app (Phase 3). In the MVP the page must stay open in
    front.
*   **Automatic text messages from the app.** A web page cannot send a text by
    itself, and a texting service costs money and needs carrier registration.
    See Open Question 1.
*   **Accounts, logins, passwords, payments.** Phase 2.
*   **Route library, GPX import, ActiveCaptain, inReach, AIS, SOS, find my
    friends, limits per trip, maintenance log, document storage, AI line
    drawings.** All listed as Next or Later in `docs/feature-map.md`.
*   **Selling it.** Open-Meteo's free tier is non-commercial, and the map tile
    and radar licences are unchecked. Both must change before any paid version.

## Open Questions

These need RJ's decision. Each has a recommendation.

*   **Q1. How do followers get told things when they are not looking at the
    link?** The mockups say contacts get the float plan by text, waypoint
    pings, a "Made it" text and an overdue alert. A web page can open the
    Messages app with a text already written, but the captain has to tap Send.
    It cannot send texts in the background.
    *   Option A (recommended for MVP): one text at Start trip, sent by the
        captain from the phone's own share sheet, containing the family link
        and a short float plan. Everything after that (waypoints, "All good",
        arrived, overdue) appears on the family link page, which updates by
        itself. Cost $0.
    *   Option B: add a texting service (for example Twilio). About $1.15 per
        month for a number plus about 1 cent per text, and a carrier
        registration that takes days to weeks. Move to Phase 2.
    *   Consequence of A: if nobody on shore has the link open, nobody is told
        the boat is overdue. The family page must say so in plain words: "Keep
        this page open, or check back at [time]."
*   **Q2. Invite code.** Anyone who finds the page could otherwise register a
    tracker and use the setup chat, which costs RJ money. Recommendation: a
    short invite code that RJ gives to friends (kept as a server setting, never
    in the page). The invite link RJ texts can carry it so the friend types
    nothing.
*   **Q3. "Talk" button.** In-page speech recognition is unreliable on iPhone
    Safari. Recommendation: in the MVP the Talk button puts the cursor in the
    answer box and points at the keyboard's own microphone key, which works on
    every iPhone. Real in-page voice comes with the native app.
*   **Q4. "Add from Contacts".** iPhone Safari does not let a web page read the
    address book. Recommendation: the captain types a first name for each
    follower (a phone number is optional and only used to pre-fill the text in
    Q1). Names stay on the phone.
*   **Q5. Notifications.** A web page on iPhone can only show notifications
    after the user adds it to the Home Screen. Recommendation: drop
    "Notifications" from the MVP permissions step. Trip reminders become an
    "Add to calendar" button (a calendar file, $0).
*   **Q6. Saved data can be wiped by Safari.** Safari deletes a website's saved
    data after 7 days without a visit, unless the page was added to the Home
    Screen. A trip saved for next summer would vanish. Recommendation: make
    "Add to Home Screen" a real step at the end of setup (not just a tip), ask
    the browser to keep the data, and offer "Back up my setup" (the same link
    as Share my setup, sent to yourself). A server-side backup waits for
    accounts in Phase 2.
*   **Q7. Position detail.** Today positions are rounded to about 1.2 nm, which
    makes the boat jump on the map and makes the arrival estimate noisy.
    Recommendation: round to about 0.1 nm for the per-trip private link.
*   **Q8. How long the server keeps a trip.** The privacy page currently says
    "until you ask us to delete". Recommendation: the server deletes positions
    7 days after the trip ends; the captain's own phone keeps its copy for My
    Trips. This is stricter than today and needs a `privacy.html` update.
*   **Q9. How long the family link works after arrival.** "Expires on arrival"
    taken literally means family never sees "Arrived". Recommendation: on
    arrival the page switches to "Arrived at [time]" and hides the live
    position trail after 2 hours; the link then shows "This trip has ended."
*   **Q10. Battery and signal on the family link.** iPhone Safari does not give
    a web page the battery level or signal strength. Recommendation: show
    battery only where the phone provides it (Android), and replace "signal"
    with "No update for X min", which is what family needs to know.
*   **Q11. "Usual seas" for trips too far out to forecast.** The mockup shows
    typical seas for the month. That needs historical data the app does not
    have. Recommendation: show "Forecast opens [date]" without typical numbers
    in the MVP.
*   **Q12. How tracker service updates get published.** Recommendation: connect
    the Cloudflare project to this GitHub repo (RJ clicks "Connect" once in his
    own Cloudflare account). After that, merging a pull request that changes
    `tracker-service/` publishes it. No Cloudflare key is ever in the repo or
    in chat. Alternative: RJ pastes the code by hand, as he does with Apps
    Script today.
*   **Q13. Sprint order.** The handoff targets Phases 0 to 2 by Nov 29. With
    one 45-minute test block per day, all eight MVP steps will not fit. If RJ
    has a real crossing before then, recommendation: build steps 2, 6 and 7
    first (tracker service, Live screen, family link) so they can be tested on
    real water, and do onboarding after. See Build order.

## Critical User Journeys (CUJs)

### CUJ 1: A friend sets up their boat

*   **Given**: A friend received RJ's invite link. They have never used the app.
*   **When**: They open the link, tap "Set up my boat", tick the safety box,
    answer 7 questions by tapping answer chips or typing, check the filled-in
    boat card, pick limits, pick a route, name who follows them, and allow
    location.
*   **Then**: They see a GO / CROSSABLE / NO-GO answer for their route for
    tomorrow with the best departure time, and the names of who will get the
    watch link. Their settings are saved on the phone. Nothing about their boat
    is stored on the server.

### CUJ 2: A friend uses someone else's setup

*   **Given**: A captain tapped "Share my setup" and texted the link.
*   **When**: The friend opens it, taps "A friend sent me their setup" (or
    arrives there directly from the link) and ticks the safety box.
*   **Then**: The chat is skipped. Boat, limits and route are pre-filled and
    marked "Pre-filled from your friend's setup". Followers and photo are not
    copied.

### CUJ 3: Setup with no signal

*   **Given**: The phone has no connection during the setup chat.
*   **When**: The captain answers with chips or taps "Skip, I'll fill the
    forms".
*   **Then**: Setup still completes. Chip answers fill the forms without the
    AI. Anything typed in free text is kept and shown in the form for the
    captain to tidy by hand.

### CUJ 4: Deciding to go

*   **Given**: Setup is done and the trip is within forecast range.
*   **When**: The captain opens the Plan screen.
*   **Then**: The verdict is the first thing on screen, with seas, wind,
    arrival time, water and air temperature, sunrise and a plain-words brief.
    Scrolling shows the reasons: departure-time chips, best day this week, hour
    by hour along the route, forecast model agreement, map and radar, tides,
    inside water, fuel, and Get ready. "Planning aid, not for navigation" stays
    visible.

### CUJ 5: Saving a trip that is weeks away

*   **Given**: The captain taps "+ New trip" and picks a route and a date 39
    days out.
*   **When**: They open that trip over the following weeks.
*   **Then**: It shows "Forecast opens [date]" until the forecast reaches that
    day, then an early outlook marked "could still change", then the full
    GO answer 2 to 3 days out. An "Add to calendar" button sets a reminder for
    the day the full answer appears.

### CUJ 6: Starting a trip and sharing it

*   **Given**: The captain is at the dock with signal.
*   **When**: They tap "Start trip & share with family".
*   **Then**: The app creates a private trip on the tracker service, opens the
    phone's share sheet with a ready-written message containing the family link
    and a short float plan, and switches to the Live screen. The screen stays
    awake. The phone sends its position every 5 minutes.

### CUJ 7: Family follows along

*   **Given**: A follower received the link. They have no app and no account.
*   **When**: They tap the link.
*   **Then**: They see a map with the boat, its trail and the route; then a
    status card ("RJ is 38 nm out", arrival estimate, last update time, speed);
    then check-ins. The page refreshes by itself. If updates stop it says "No
    update for X min" and explains that boats lose signal offshore.

### CUJ 8: No signal offshore

*   **Given**: A trip is running and the phone loses its connection.
*   **When**: 40 minutes pass, then signal returns.
*   **Then**: The phone kept recording positions. On reconnect it sends all of
    them in one batch. The family map fills in the gap in the trail.

### CUJ 9: Arriving

*   **Given**: A trip is running.
*   **When**: The boat comes within about half a nautical mile of the
    destination, or the captain taps "Stop sharing now".
*   **Then**: Sharing stops. The family page shows "Arrived at [time]" (or
    "Sharing stopped at [time]"). The trip moves to Past trips on the captain's
    phone with duration and distance. After the period in Q9 the link shows
    "This trip has ended."

### CUJ 10: Overdue

*   **Given**: The captain set a check-in time (default: planned arrival plus
    80 minutes). The trip has not ended.
*   **When**: That time passes.
*   **Then**: The family page shows an overdue notice with the last known
    position and time, and the words "If you are worried, call the Coast Guard.
    This page cannot call for help." The captain's Live screen shows the same
    notice with "I'm fine, extend 1 hour".

### CUJ 11: Repeating a trip

*   **Given**: A past trip exists in My Trips.
*   **When**: The captain taps "Duplicate as new" and picks a date.
*   **Then**: A new upcoming trip appears with the same route, boat, limits,
    followers and checklist (ticks cleared).

## Technical Plan (Architecture)

### The two halves

```text
 CAPTAIN'S PHONE (web pages from GitHub Pages)        FAMILY'S PHONE
 +-----------------------------------------+          +------------------+
 | Onboarding . Plan . Live . My Trips     |          | follow page      |
 | Saved on the phone: boat, limits,       |          | (map, status,    |
 | routes, followers, trips, photo,        |          |  check-ins)      |
 | queued positions                        |          +---------+--------+
 +----+----------------------+-------------+                    |
      | weather, tides,      | positions, check-ins,            | reads one trip
      | radar, map tiles     | setup chat answers               | by its secret link
      v                      v                                  v
 +----------------+   +--------------------------------------------------+
 | Open-Meteo,    |   | TRACKER SERVICE (Cloudflare Worker, free tier)   |
 | NOAA, NWS,     |   |  - database: captains, trips, positions, events  |
 | RainViewer,    |   |  - secrets: AI key, invite code                  |
 | Esri, OpenSeaMap|  |  - forwards setup answers to Claude Haiku        |
 +----------------+   +--------------------------------------------------+
```

The weather and tide sources stay the same as today and are called straight
from the phone. The tracker service never sees forecasts or boat details.

### What lives where

| Data | Where | Why |
| --- | --- | --- |
| Boat details, limits, routes, follower names, trips, checklist ticks | Captain's phone | Privacy page already promises this. |
| Boat photo | Captain's phone only | No upload means no new data collected. Family does not see the photo in the MVP. |
| Positions and check-ins during a trip | Tracker service, plus a copy on the phone | Family needs to read them. The phone copy feeds Past trips. |
| Route, boat name, captain's first name, planned arrival, check-in time for a running trip | Tracker service, for that trip only | The family page needs them to draw the route and write "RJ is 38 nm out". |
| Setup chat answers | Sent through the tracker service to the AI, not stored | Fills the forms. |
| AI key, invite code | Tracker service settings | Never in the repo or the page. |

### App pages (captain)

The app stays plain web pages with no build step: HTML, CSS and JavaScript
files that GitHub Pages serves as they are. The single 43 KB page is split into
several files so each build step touches a small part.

*   **Bottom bar:** Plan, Live, My Trips, Family, Menu.
*   **Plan** is the home screen ("Should I go?"). Trip chips across the top:
    Next trip, each saved trip, + New trip.
*   **Family** (captain's view) shows what followers see, the current link, and
    a "Share again" button.
*   **Menu** holds the side tools: Setup, My Boat (profile only in the MVP),
    Customs (documents checklist and links, as today), Safety (gear checklist),
    My Trips, Settings (tracking interval, check-in window, keep screen on).
*   Items the mockup tags "Soon" or "Later" are left out of the MVP menu
    rather than shown as dead buttons.
*   The preview keeps its PREVIEW banner. `[App name]` stays as the placeholder
    until RJ picks a name.

### Tracker service (step 2)

One Cloudflare Worker with one D1 database. A Worker is a small program
Cloudflare runs on request; D1 is its built-in database. Both have a free tier.

**Identity without logins.** The first time a captain finishes setup, the app
sends the invite code to the service and gets back a long random "captain
token". The phone keeps it. It proves "this is the same phone as before". It is
not a password the captain ever sees or types.

**One trip, one link.** Starting a trip creates a trip record and a second long
random token, the "family token". The family link is the follow page address
with that token after a `#`. The part after `#` is not sent to GitHub, so it
does not land in GitHub's logs. Guessing a token is not practical (it is 128
random bits). Only a scrambled copy (a hash) of each token is stored, so a leak
of the database does not hand out working links.

**Requests the service answers:**

| Request | Who | What it does |
| --- | --- | --- |
| Register | Captain's phone, with invite code | Returns a captain token. |
| Start trip | Captain's phone | Stores route, boat name, first name, planned arrival, check-in time. Returns the family token. |
| Add positions | Captain's phone | Accepts one position or a batch (for store-and-send). Each has time, place, speed. |
| Add event | Captain's phone | "All good", passed a waypoint, extended check-in. |
| End trip | Captain's phone | Marks arrived or stopped, with the time. |
| Read trip | Anyone with the family token | Returns status, trail, events, route, planned arrival, overdue flag. After expiry returns only "This trip has ended." |
| Setup chat | Captain's phone | Sends the 7 answers to Claude Haiku and returns form values. |
| Delete my data | Captain's phone | Deletes that captain's trips and positions at once. |

**Rules the service enforces:**

*   Only the app's own web address may call it from a browser.
*   Limits per captain and per internet address on every request type, and a
    daily ceiling on setup chats across all captains.
*   A trip with no end and no position for 24 hours is ended automatically.
*   Overdue is worked out when the family page asks ("is it past the check-in
    time and the trip has not ended?"). Nothing has to run on a timer for it.
*   One small daily clean-up job deletes positions older than the period in Q8.
    This is the only part that runs on its own. It is free.

**Free-tier headroom.** Cloudflare's free tier allows 100,000 requests a day.
Ten boats crossing on the same day, each with three followers whose pages
refresh every 30 seconds for six hours, is about 22,000 requests. Cloudflare's
current free limits must be re-checked in the step 2 design doc.

**Old tracker.** The live page keeps using the Apps Script tracker. Nothing in
the new service touches the Google Sheet. The old one is retired only in the
promote pull request, after the new one has worked on a real crossing.

### Guided setup chat (step 3)

*   The 7 questions and their answer chips are written into the page. The AI
    does not write the questions. This keeps the chat working with no signal
    and keeps the AI from saying anything about safety or navigation.
*   Tapping a chip fills the matching form field directly, with no AI call.
*   If any answer was typed (or dictated with the keyboard microphone), the app
    makes one request at the end with all 7 answers. The service passes them to
    Claude Haiku with fixed instructions to return only form values: boat name,
    boat type, length, engines, cruise speed, tank size, fuel burn, usual
    route, follower names.
*   The service checks every returned value against a sensible range (for
    example cruise speed 5 to 70 kt) and drops anything outside it. The app
    shows the result as editable form rows. The captain confirms with "Looks
    right". Nothing the AI returns is used until the captain has seen it.
*   "Not sure" on fuel burn uses a rough rule based on boat type, length and
    engines, shown in amber as "~12 gph (estimate). Check it after your first
    trip."
*   If the request fails or there is no signal, the typed answers are placed in
    the form as written and the captain edits them.
*   Each answer is limited to 300 characters.

**Cost:** about 1 to 2 cents per setup that uses typed answers; $0 for a setup
done entirely with chips. RJ sets a $5 per month spending cap on the AI key in
his own Anthropic account.

### Boat photo (step 3)

*   "Add a photo of your boat" opens the phone's photo picker or camera.
*   The app shrinks the photo (longest side about 1,200 pixels) and saves it on
    the phone. It is not uploaded.
*   The boat card shows the photo. With no photo it shows a simple outline for
    the chosen boat type; `docs/mockups/boat.png` is the center console
    outline.
*   The mockup line "We'll turn it into a line drawing" is removed for the MVP,
    because line drawings are Later. The copy becomes "A side view works best."
*   `privacy.html` gains one sentence: the boat photo stays on your phone.

### Saved trips and My Trips (step 5)

*   A trip holds: name, route, direction (out or home), date, followers,
    limits (the captain's global limits; limits per trip is Next), checklist
    ticks, and a state.
*   States: **upcoming** (three sub-states below), **underway**, **past**.
*   Upcoming sub-states, decided by how far away the date is compared with how
    far the forecast reaches:
    *   Beyond the forecast: "Forecast opens [date]".
    *   Inside the forecast but more than 3 days out: early outlook, labelled
        "Early outlook. Could still change." It shows a range for seas and
        wind and no departure-time advice.
    *   3 days out or less: the full Plan screen answer.
*   The exact forecast reach of the sea-state data is confirmed in the step 5
    design doc; the mockup's "10 to 16 days" is an estimate.
*   "Next trip" is the soonest upcoming trip. If there is none, Plan shows
    tomorrow on the captain's usual route, as today.
*   Past trips keep: date, route, duration, distance, highest and average
    speed, and the track for "View track". Fuel used is typed in by the captain
    afterwards (optional); the app cannot measure it.
*   "Duplicate as new" copies route, followers and checklist items, clears the
    ticks, and asks for a date.
*   This replaces the Logbook.

### Live screen with ETA (step 6)

*   A note at the top: "Keep this page open in front while sharing."
*   The app asks the phone to keep the screen awake and re-asks whenever the
    page comes back to the front (this exists in the Phase 0 preview).
*   Position is read every 5 minutes by default (1, 5, 10 or 30 in Settings)
    and sent to the tracker service.
*   **Distance left** is measured along the planned route from the point on the
    route nearest the boat, not in a straight line.
*   **Speed** is the average over the last 10 to 15 minutes.
*   **Live ETA** is now plus distance left divided by that average speed.
    *   Under about 10 kt the card says "Slow" and still shows an ETA.
    *   Under about 3 kt it says "Stopped" and shows "ETA on hold" instead of a
        time.
    *   With no recent update it says "No update for X min" and shows the last
        ETA greyed out.
*   The same ETA code runs on the Live screen and on the family page, so both
    always show the same numbers.
*   "Send 'All good' to family" adds a check-in with the time.
*   Waypoints: when the boat passes within about 1 nm of a named point on the
    route, the app records "Passed [name] · [time]".
*   Arrival: within about half a nautical mile of the destination, the app ends
    the trip and stops sharing. "Stop sharing now" does the same by hand.
*   Wording on this screen describes where the boat is and when it may arrive.
    It never tells the captain where to steer.

### Store-and-send (step 8)

*   GPS works without a phone signal. Each position is first saved on the
    phone, then sent. If sending fails it stays in a queue.
*   When the connection returns, the queue is sent as one batch, oldest first.
*   The app's own files are saved for offline use, so reopening the page with
    no signal still loads it.
*   The Live screen shows "Saved 6 positions, will send when signal returns."

### Family link (step 7)

*   A separate, small page (`follow`) that needs nothing saved on the
    follower's phone.
*   Order on screen: map (boat, trail, planned route), status card, check-ins,
    then the overdue explanation.
*   Status card: "[First name] is 38 nm out", "Arriving about 1:52 PM", "last
    update 2 min ago", speed, time underway.
*   Refreshes every 30 seconds while open.
*   Shows "Planning aid, not for navigation" and "This page cannot call for
    help. In an emergency call the Coast Guard."
*   States: not started yet, underway, slow, stopped, no recent update,
    overdue, arrived, sharing stopped, ended.
*   The page carries a "do not index" tag so search engines skip it.

### Share my setup (step 8)

*   Builds a link with boat type, length, engines, speed, tank, burn, limits
    and route packed into the part after `#`. Nothing is sent to a server.
*   Does not include: boat name, followers, photo, trips, captain token.
*   The receiving app always shows the values for checking before saving.

## Alternatives Considered

### Alternative A: Keep one Google Sheet per captain (today's approach)

*   **Pros**: Already works for RJ. $0. Each captain owns their data.
*   **Cons**: Each friend must copy a sheet, paste a script, deploy it and type
    a key. One shared family address, no per-trip links, no expiry.
*   **Reason for Rejection**: Rejected by author. It fails the "no-brainer
    setup" priority in the handoff. Option B was approved Nov 17.

### Alternative B: Supabase or Firebase now

*   **Pros**: Logins, database and file storage in one product. Supabase is
    already planned for Phase 2.
*   **Cons**: More to learn and set up now. Free projects pause when idle.
    Brings accounts into a version that does not need them.
*   **Reason for Rejection**: Rejected by author for the MVP. A Worker with one
    database is smaller and matches the approved recommendation. Revisit at the
    Phase 2 gate.

### Alternative C: Let the AI run the whole setup conversation

*   **Pros**: Feels more natural. Can ask follow-up questions.
*   **Cons**: Fails with no signal. Costs more. The AI could say something that
    sounds like safety or navigation advice.
*   **Reason for Rejection**: Rejected by author. Fixed questions with the AI
    only filling in forms keeps the hard rule "planning aid, never a navigation
    tool" enforceable.

### Alternative D: Upload the boat photo so family sees it

*   **Pros**: A nicer family page.
*   **Cons**: New personal data on the server, file storage to set up, a
    privacy statement change, and photos to moderate.
*   **Reason for Rejection**: Rejected by author for the MVP. The handoff says
    keep the photo on the phone unless a design doc decides otherwise.

### Alternative E: Rebuild with an app framework (React or similar)

*   **Pros**: Easier to manage many screens as the app grows.
*   **Cons**: Adds a build step and tooling RJ would have to learn and that
    GitHub Pages does not run by itself.
*   **Reason for Rejection**: Rejected by author for the MVP. Revisit when the
    native shell is chosen in Phase 3.

--------------------------------------------------------------------------------

## Non-Functional Requirements

**Safety wording**

*   "Planning aid, not for navigation. The captain decides." appears on Plan,
    Live and the family page.
*   The words "safe" and "safely" are not used for conditions or routes.
    Verdicts are GO, CROSSABLE and NO-GO "against your limits".
*   The family page and the overdue notice say the app cannot call for help.
*   The safety tick-box wording is a placeholder until RJ's attorney reviews it.

**Privacy**

*   Location is sent only between Start trip and arrival or Stop sharing.
*   `privacy.html` changes in the same pull request as each of these:
    *   Step 2: positions are stored with Cloudflare (replacing Google) and the
        retention period from Q8; self-service delete.
    *   Step 3: the boat photo stays on the phone.
    *   Step 6: battery level only where the phone provides it.
*   The tracker service stores no phone numbers, no follower names and no boat
    details beyond the boat name and captain's first name for a running trip.
*   The service does not store internet addresses with positions. Addresses are
    used only briefly for request limits.

**Secrets**

*   The AI key and the invite code live only in the tracker service's settings
    and in RJ's Keeper. They are never in the repo, the page or chat.
*   Captain tokens and family tokens are made by the service, not chosen by
    people.

**Cost**

| Item | Cost | Notes |
| --- | --- | --- |
| GitHub Pages | $0 | As today. |
| Cloudflare Worker + database | $0 | Free tier. No card needed. RJ creates the account. |
| Setup chat AI | About 1 to 2 cents per typed setup | RJ's own Anthropic API account; $5 minimum credit purchase; $5 per month cap. |
| Daily clean-up job | $0 | The only thing that runs on its own. |
| Texting service | Not in MVP | See Q1. |

**Rollout and undo**

*   Every step lands in `/next/` behind the PREVIEW banner. The live page does
    not change.
*   Undo for any step: revert that pull request on GitHub (one button).
*   Undo for the tracker service: disable the Worker in the Cloudflare
    dashboard. The live page is unaffected because it still uses Apps Script.

**Testing**

*   The calculations (verdict, ETA, distance along route, trip states) are
    written as small separate functions with automated checks that run without
    installing anything.
*   Each pull request is checked at phone width (390 px) and iPad width, and
    says what could not be tested: a real iPhone, real GPS, real loss of
    signal.
*   The tracker service, Live screen and family link need one real crossing (or
    a drive along the coast) before promote.

--------------------------------------------------------------------------------

### Additional Resources

*   `docs/HANDOFF.md`: decisions and approved scope.
*   `docs/feature-map.md`: every feature and its phase.
*   `docs/mockups/Main.dc.html`, `docs/mockups/Onboarding.dc.html`: approved
    screens.
*   `next/index.html`: the Phase 0 preview this builds on.
*   `tracker/Code.gs`: the current tracker.
*   `privacy.html`: the live privacy statement.

### Future Improvements

*   **Automatic texts and overdue alerts** to followers who are not watching
    (Phase 2, texting service).
*   **Accounts and server backup** of setup and trips (Phase 2).
*   **Background tracking** with the phone locked (Phase 3, native shell).
*   **Family sees the boat photo or line drawing.**
*   **Limits per trip**, GPX import, inReach on the map.

--------------------------------------------------------------------------------

## Build order

Each step is its own design doc in `docs/designs/`, reviewed, then its own pull
request to `/next/`. A step is done when RJ has tested and merged it.

| Step | What | Depends on | RJ does (outside the pull request) |
| --- | --- | --- | --- |
| 1 | This spec | Nothing | Answer the open questions. |
| 2 | Tracker service | 1 | Create a free Cloudflare account. Connect the repo (Q12). Add the invite code as a setting. |
| 3 | Onboarding: welcome, safety box, setup chat, boat and photo, limits, route, followers, permissions, first answer | 2 for the chat's AI call; the rest stands alone | Create an Anthropic API key with a $5 cap and add it as a Cloudflare setting. |
| 4 | Plan screen: trip chips, GO card with temperatures, brief, warnings, model agreement, best day, fuel with sea-state adjustment, Get ready, float plan PDF | 3 (uses the saved boat, limits, route) | Nothing. |
| 5 | Saved trips and My Trips | 4 | Nothing. |
| 6 | Live screen with ETA | 2 | Test on the water or in a car. |
| 7 | Family link | 2, 6 | Open the link on a second phone. |
| 8 | Share my setup; store-and-send | 3, 6 | Test with airplane mode. |
| Promote | Move `/next/` to the live page; retire Apps Script | All, plus one real crossing | Approve the promote pull request. |

**Splitting the page.** Step 2 does not touch the page. The first page step
(whichever comes first of 3 or 6) splits `next/index.html` into separate files
with no change in behaviour, as its own small pull request, so later steps are
easy to review.

**Crossing-first order (see Q13).** Steps 2, 6 and 7 can be built before 3, 4
and 5 by using the boat and route already written into the preview page. That
gets the tracker, Live screen and family link onto real water sooner.

--------------------------------------------------------------------------------

*Drafted with EGM*
