# Crossing App MVP (Phase 1, Friends Version)

*   **Author:** RJ (rjm0824)
*   **Status:** Draft (revision 3, after review rounds 1 and 2)
*   **Date:** 2026-11-19

--------------------------------------------------------------------------------

## Overview

The Crossing App answers one question for a boat captain: "Should I go?" It
compares forecast seas and wind along the route with the captain's own limits,
and shows tides, fuel and arrival time. Once the captain leaves, followers on
shore can watch the boat on a map from one link, with no app and no login.

Today it is one web page built for one boat and one route. The MVP lets any
invited friend set it up for their own boat, route and followers. It stays a
free web page (no App Store yet) and is shared only with friends.

This document is the plan for the whole MVP: what it is, how the pieces fit,
and the order they are built. It is a planning aid, never a navigation tool.
The captain decides.

**Phases** (from `docs/HANDOFF.md`):

*   Phase 0: fixes to the current page, in the preview at `/next/` (merged).
*   Phase 1: the friends version, free. **This document.**
*   Phase 2: paid web beta with accounts and payments.
*   Phase 3: App Store app, which can track with the phone locked.

**Words used in this document:**

*   **Family link:** the secret web address a captain sends for one trip.
*   **Family page:** what opens when someone taps a family link.
*   **Followers:** the people the captain sends the family link to.
*   **Check-in:** the "All good" message a captain sends with one tap.
*   **Overdue time:** the time after which the family page says the boat is
    overdue. Default: planned arrival plus 80 minutes.
*   **Verdict:** GO, CROSSABLE or NO-GO, always "against your limits". GO means
    forecast seas and wind stay inside the limits along the whole route.
    CROSSABLE means inside the limits but close to them or uncomfortable.
    NO-GO means a limit is exceeded somewhere on the route.

## What Exists Today

*   **Live page** (`index.html`): verdict for RJ's boat on West Palm to Green
    Turtle and back, best departure time, hour-by-hour seas and wind at each
    route point, route map with radar, tides, Sea of Abaco conditions, fuel and
    arrival, a route file (GPX) for the chartplotter, a go-day checklist, and
    customs links.
*   **Preview** (`next/index.html`): the same page plus the Phase 0 fixes. It
    carries a PREVIEW banner.
*   **Tracker** (`tracker/Code.gs`): a Google Apps Script attached to one
    Google Sheet. The captain opens the page in "captain mode" on the helm
    iPad, types a key, and the page sends a rounded position (to about 1.2 nm)
    every 5 minutes. Anyone who opens the page sees the last 24 hours of
    positions. There is one tracker and one page for everyone.
*   **Reusable code in the preview page:** distance (`nm`), the verdict
    (`scoreRun`), distance left and arrival estimate (`loadTrack`), keep the
    screen awake (`keepAwake`, `resumed`), sending positions (`sendPos`,
    `onPos`), the route file (`gpx`), tide curves, and the checklist. Distance
    and keep-awake carry over as they are. The others have RJ's boat, route and
    limits written into them (for example the 4 ft and 15 kt limits, a 4 nm
    arrival distance, and a send that cannot tell whether it failed). The MVP
    reworks those to read the saved setup. That rework is real build time.

## The Problem

1.  **Only RJ can use it.** The boat, the limits and the route are written into
    the page.
2.  **Tracking needs hand-work per captain.** Each captain would have to copy a
    Google Sheet, paste a script, deploy it and type a key. That is too many
    steps for a friend.
3.  **There is one shared tracking page that never closes.** A link per trip
    that closes after arrival does not exist.
4.  **Nothing is remembered.** There are no saved trips and no trip history.

The solution has two halves. On the phone: plain web pages that keep the
captain's boat, limits, routes, followers and trips on the phone. On a server:
one small shared tracker service that gives every trip its own private family
link, and holds the two secrets the app needs (an invite code and the AI key).

## Goals

*   **Setup:** a friend goes from opening the invite link to a first verdict
    for their own boat and route without help from RJ. Target: about 2 minutes
    using answer chips only, timed on a real phone from the welcome screen to
    the first verdict. This is a target, not yet measured.
*   **Sharing:** a captain starts a trip with one tap and sends one link.
    Whoever opens it sees the boat on a map with an arrival estimate, with no
    app and no login.
*   **Location stops on arrival:** when a trip ends, the family page stops
    showing any position at once. It shows "Arrived at [place] at [time]" for 2
    hours, then "This trip has ended."
*   **The home dock is not shown:** no position is sent until the boat is about
    1 nm from where the trip started.
*   **Trips:** a captain can save trips ahead of time, see past trips, and copy
    a past trip as a new one.
*   **No signal:** positions, check-ins and the "trip ended" message recorded
    with no signal are kept on the device and sent when signal returns and the
    app is open in front.
*   **No false alarm from a quiet arrival:** a boat that arrives where there is
    no phone signal is not shown as overdue once the app has been opened with
    signal.
*   **Cost at friends scale (up to about 25 captains):** $0 per month for
    hosting. The AI setup helper costs about 1 to 2 cents per setup that uses
    typed answers, paid from prepaid credit in RJ's own Anthropic account
    (minimum purchase about $5, to verify) with a $5 monthly limit.
*   **Nothing live changes** until RJ approves a separate "promote" pull
    request. RJ's current tracker and live page keep working until then.

## Non-Goals

*   **Navigation.** No course to steer, no turn-by-turn, no weather routing.
*   **Tracking with the phone locked or the page in the background.** That
    needs the Phase 3 app. In the MVP the page must stay open in front on the
    tracking device.
*   **Texts or alerts sent by the app on its own.** A web page cannot send a
    text without the captain tapping Send. Followers are not told anything
    unless they open the family page or set the reminder it offers. A texting
    service is Phase 2.
*   **Loading the app with no signal, during the eight steps.** It is added
    last, before promote (W16). A page that is already open keeps working
    offline.
*   **Accounts, logins, passwords, payments.** Phase 2.
*   **Later features** listed in `docs/feature-map.md`: route library, route
    file import, Garmin ActiveCaptain, satellite messenger (inReach) tracking,
    ship tracking (AIS), SOS, find my friends, limits per trip, maintenance
    log, document storage, AI line drawings of the boat.
*   **Selling it.** Open-Meteo's free tier is non-commercial, and the map and
    radar licences are unchecked.

## Decisions

**Decided by RJ on Nov 19:**

*   The MVP is all eight steps, built in stages and tested as it goes. The
    target for all eight in the preview is Nov 29. A slip is acceptable.
*   The AI setup helper is its own step, built after onboarding works without
    it.
*   A second device (the helm iPad) can do the tracking for a trip.
*   Two copies of the tracker service: preview and live.
*   Messages inside the app between captain and followers, and real text
    messages sent by the app, are the first things built after the MVP, ahead
    of accounts and payments. See Future Improvements.
*   Every captain can save several trips, plan future trips, keep past trips
    and copy a trip. Tracking starts only when the captain taps Start trip.

**Working choices (the reviewers' and author's recommendations; RJ has not
objected and can change any of them):**

| # | Choice | Why |
| --- | --- | --- |
| W1 | Followers are not texted by the app. The captain sends one text at Start trip. The family page offers "Remind me at [overdue time]", a calendar entry on the follower's own phone. | $0. No texting service. |
| W2 | The Talk button points at the keyboard's own microphone key. No in-page voice recognition. | In-page voice recognition is not dependable in iPhone Safari (to verify in the onboarding step). Keyboard dictation can be switched off by the user and may need signal. |
| W3 | Followers are typed in by first name. No reading of the phone's contacts. | iPhone Safari does not offer contact access to web pages. |
| W4 | No notifications in the MVP. Trip reminders are an "Add to calendar" button. | Web notifications on iPhone need the Home Screen app first. |
| W5 | The service keeps a trip's data for 7 days after it ends, then deletes it. The captain's device keeps its own copy for My Trips. | Stricter than today's privacy promise. |
| W6 | The service knows only trips while they are tracked. Saved, future and past trips live on the captain's device. There is no captain record and no register step. | Less to build, less data held. Trip history does not follow the captain to a new phone until accounts exist; the backup link covers that. |
| W7 | One shared invite code, which RJ can change at any time. | Simple. Changing it does not affect trips already started. |
| W10 | Positions are stored at full phone precision while the trip's data is kept. | The family link is private per trip, and the last known position is the number a follower may need to read to the Coast Guard. |
| W11 | Battery level is shown only where the phone provides it. "Signal" is replaced by "No update for X min". | iPhone Safari does not give web pages battery or signal. |
| W12 | Trips beyond the forecast show "Forecast opens [date]" with no typical-conditions numbers. | The app has no historical data. |
| W13 | Service updates publish when a pull request that changes the service folder is merged. RJ connects his Cloudflare account to the repo once. | No Cloudflare key in the repo or in chat. |
| W15 | No position is sent until the boat is about 1 nm from the trip's start. The captain can turn this off per trip. | Today's page sends nothing until the boat is outside the inlet, so the home dock never shows. This keeps that protection for any route. |
| W16 | Loading the app with no signal is added after the eight steps and before promote. | It matters on the water (a restarted iPad cannot reopen the page offshore), but a saved copy can show an old version during daily testing. |
| W14 | Only the tracker service and the Live screen with the family page get their own design doc and full review. Other steps ship as pull requests under this document with a lighter check. | Needed to reach Nov 29. This changes the "design doc per feature" rule in `CLAUDE.md` for the MVP only, and needs RJ's explicit OK. |

## Open Questions

*   **Q1. Does a Home Screen app share saved data with Safari on iPhone?**
    Safari can delete a website's saved data after about 7 days in which the
    site is not used (exact rule to verify). Adding the page to the Home
    Screen is the usual protection. But the Home Screen app may keep its data
    apart from Safari, so a friend who sets up in Safari and then adds the icon
    could open an empty app. RJ ran the test on Nov 19; the result for the
    Home Screen icon is being confirmed. The answer decides whether "Add to
    Home Screen" comes first or last in setup.
*   **Q2. Does a calendar entry with an alert open correctly from a web page**
    on iPhone and Android? The follower reminder and the trip reminder depend
    on it. To test on RJ's iPhone before the family page is built. If it does
    not work, the fallback is the overdue time written in the Start trip text.
*   **Q3. Will a real trip on the water happen before Nov 29?** Promote needs
    one. If RJ has one coming, Stage 1 must be merged before it.

## Critical User Journeys (CUJs)

### CUJ 1: A friend sets up their boat

*   **Given**: A friend received RJ's invite link. They have never used the app.
*   **When**: They open the link, tap "Set up my boat", tick the safety box,
    answer 7 questions by tapping chips or typing, check the boat card, pick
    limits, pick a route, name their followers, and allow location.
*   **Then**: They see a verdict for their route for tomorrow with the best
    departure time, and the names of their followers. Their settings are saved
    on the phone. Nothing has been sent to the tracker service unless they
    typed an answer and the AI helper is switched on.

### CUJ 2: A friend uses someone else's setup

*   **Given**: A captain tapped "Share my setup" and texted the link.
*   **When**: The friend opens it and ticks the safety box.
*   **Then**: The questions are skipped. Boat type, numbers, limits and route
    are pre-filled and marked "Pre-filled from your friend's setup." Followers,
    boat name and photo are not copied. Without an invite code the friend can
    plan but not track, and sees "Ask RJ for an invite to share trips."

### CUJ 3: Setup with no signal

*   **Given**: The phone has no connection during setup.
*   **When**: The captain answers with chips or taps "Skip, I'll fill the
    forms".
*   **Then**: Setup completes. Typed answers appear in the form as written for
    the captain to tidy by hand.

### CUJ 4: Deciding to go

*   **Given**: Setup is done and the trip is within forecast range.
*   **When**: The captain opens the Plan screen.
*   **Then**: The verdict is the first thing on screen, with seas, wind,
    arrival time, water and air temperature, sunrise and a brief. Scrolling
    shows the reasons. "Planning aid, not for navigation. The captain decides."
    stays visible.

### CUJ 5: Saving a trip that is weeks away

*   **Given**: The captain taps "+ New trip" and picks a route and a date 39
    days out.
*   **When**: They open that trip over the following weeks.
*   **Then**: It shows "Forecast opens [date]" until the forecast reaches that
    day, then an early outlook marked "Could still change", then the full
    verdict from 3 days out. "Add to calendar" sets a reminder for that day.

### CUJ 6: Starting a trip and sharing it

*   **Given**: The captain is at the dock with signal and has an invite code
    saved from the invite link.
*   **When**: They tap "Start trip & share with family" on the Plan screen.
*   **Then**: The app asks the tracker service for a new trip, opens the
    phone's share screen with a ready-written text (family link, route, planned
    arrival, overdue time), and switches to the Live screen. If the service
    cannot be reached, the share screen still opens with the float plan text,
    the app keeps retrying, and the captain sends the family link when it
    exists.

### CUJ 7: Tracking from the helm iPad

*   **Given**: A trip was started on the captain's phone.
*   **When**: The captain taps "Track from another device", sends the link
    it offers to the iPad (AirDrop or a text to self), and opens it there.
*   **Then**: The iPad opens the Live screen for that trip and does the
    tracking. The phone is free for calls and photos.

### CUJ 8: Followers watch

*   **Given**: A follower received the family link. They have no app.
*   **When**: They tap it.
*   **Then**: They see a map with the boat, its trail and the route; then a
    status card ("RJ is 38 nm out", arrival estimate, last update, speed); then
    check-ins. The page refreshes by itself. A button offers "Remind me at
    3:00 PM", the overdue time.

### CUJ 9: No signal offshore

*   **Given**: A trip is running and the tracking device loses its connection.
*   **When**: 40 minutes pass, then signal returns.
*   **Then**: Everything recorded in the gap is sent in one batch. The family
    page, which said "No update for 40 min", fills in the trail.

### CUJ 10: Arriving with no signal

*   **Given**: The boat reaches the destination where the device has no data.
*   **When**: The overdue time passes. Later the device gets signal.
*   **Then**: The device ends the trip itself and queues "trip ended" with the
    arrival time. It shows "Open this page when you have signal so your
    followers see you arrived." Until then the family page says overdue, with
    how old the last position is and how far it was from the destination. Once
    the page is open with signal, the queue is sent, and the family page shows
    "Arrived at [place] at [time]" for 2 hours counted from that moment.

### CUJ 11: Overdue

*   **Given**: The overdue time passes and the trip has not ended.
*   **When**: A follower opens the family page.
*   **Then**: It shows an overdue notice with the last known position, its age
    and its distance from the destination, and the words "This page cannot call
    for help. If you are worried, call the Coast Guard." The captain's Live
    screen shows the same notice with "I'm fine, add 1 hour".

### CUJ 12: Repeating a trip

*   **Given**: A past trip exists in My Trips.
*   **When**: The captain taps "Duplicate as new" and picks a date.
*   **Then**: A new upcoming trip appears with the same route, followers and
    go-day checklist (ticks cleared).

## Technical Plan (Architecture)

### The Two Halves

```text
 CAPTAIN'S PHONE or HELM IPAD                      FOLLOWER'S PHONE
 (web pages from GitHub Pages)
 +----------------------------------------+       +-------------------+
 | Onboarding, Plan, Live, My Trips, Menu |       | family page       |
 | Saved on the device: boat, limits,     |       | (map, status,     |
 | routes, followers, trips, photo, queue |       |  check-ins)       |
 +----+----------------------+------------+       +---------+---------+
      | weather, tides,      | positions, check-ins,        | reads one trip
      | radar, map tiles     | trip ended, typed setup      | by its family link
      v                      v answers                      v
 +----------------+   +-----------------------------------------------+
 | weather, tide  |   | TRACKER SERVICE (Cloudflare, free tier)       |
 | and map        |   |  1. trips: positions and events               |
 | providers      |   |  2. AI helper: passes typed answers to Claude |
 +----------------+   |  secrets: invite code, AI key                 |
                      +-----------------------------------------------+
```

Weather, tide and map providers are the ones the page uses today (Open-Meteo
for forecasts, NOAA for US tides, RainViewer for radar, Esri and OpenSeaMap for
the chart). The device calls them directly.

The tracker service has two jobs. Tracking is the main one. Passing typed setup
answers to the AI is the second, kept in the same service because that is where
secrets can live.

### What Lives Where

| Data | Where | Notes |
| --- | --- | --- |
| Boat details, limits, routes, follower first names, trips, checklist ticks | Captain's device | Not sent to the service, except as listed below. |
| Boat photo | Captain's device only | Followers do not see it in the MVP. |
| For each trip: boat name, captain's first name, route, planned arrival, overdue time, positions, check-ins | Tracker service for 7 days after the trip ends, and the captain's device | The family page needs them. |
| Typed setup answers (may include boat details and follower first names) | Pass through the tracker service to the AI. Not stored by the service. | Only when the captain types and the AI helper is on. |
| AI key | Tracker service settings and RJ's password manager | Never in the repo, the page or chat. |
| Invite code | Tracker service settings, RJ's password manager, the invite link RJ texts, and each invited friend's device | A shared, low-value code. Never in the repo or the page's code. RJ can change it. |

Storage on the device: small settings in the browser's simple key-value store;
the photo, trip tracks and the send queue in the browser's database (IndexedDB),
which has room for them. The step docs set a size budget.

### App Pages

The app stays plain web pages with no build step: HTML, CSS and JavaScript
files that GitHub Pages serves as they are. Before the first screen step, the
single preview page is split into separate files with no change in behaviour,
as its own small pull request.

*   **Bottom bar:** Plan, Live, My Trips, Family, Menu.
*   **Plan** is the home screen and holds "Start trip & share with family".
*   **Family** (captain's view) shows what followers see, the family link,
    "Share again", and "Track from another device".
*   **Menu:** Setup, My Boat (profile only), Customs (as today), Safety (gear
    checklist), My Trips, Settings (tracking interval, overdue time, keep
    screen on).
*   Items the mockups tag "Soon" or "Later" are left out, not shown as dead
    buttons.
*   `[App name]` stays as the placeholder until RJ picks a name.

**Mockup wording that must change** because of W1, W3 and W4:

*   "They get: your float plan when you start, waypoint pings, 'Made it' when
    you arrive, and an alert if you're overdue" becomes a line that says the
    captain sends one text and the family page shows the rest.
*   "+ Add from Contacts" becomes "+ Add a follower".
*   "Stops by itself at Green Turtle and texts 'Made it'" loses the text.
*   "Waypoints (family gets a ping)" becomes "Waypoints (shown on the family
    page)".
*   The Notifications row is removed from the permissions step.
*   "We'll turn it into a line drawing" is removed from the photo box.

### Step 2: Tracker Service

A small program on Cloudflare with a built-in database, both on the free tier.

**Secrets per trip, no logins.** Starting a trip returns two long random
secrets:

*   The **trip key** lets a device add positions and events, change the overdue
    time, end the trip and delete it. The captain's device keeps it. "Track
    from another device" hands it to the helm iPad in a link, with the route
    and cruise speed the iPad needs.
*   The **family key** only lets someone read the trip. The family link is the
    family page address with the family key after a `#`. The part after `#` is
    not sent to GitHub.

These secrets, plus the invite code, are the access control. The browser rule
that only the app's own address may call the service is a convenience, not
protection. The service stores only a scrambled copy of each secret.

**Requests the service answers:**

| Request | Needs | What it does |
| --- | --- | --- |
| Start trip | Invite code | Stores boat name, first name, route, planned arrival, overdue time. Returns the trip key and family key. |
| Add to trip | Trip key | Accepts a batch of positions and events (check-in, passed a waypoint, overdue time changed, trip ended, sharing resumed). Each carries the time it happened, so "trip ended" can be in the past. Duplicates are ignored. |
| New family link | Trip key | Replaces the family key, so a forwarded link stops working. |
| Read trip | Family key | Returns status, everything the service has received since the page last asked (so positions sent late still arrive), events, route, planned arrival, and whether the trip is overdue. After the family link closes it returns only "This trip has ended." |
| Delete trip | Trip key | Deletes the trip and its positions. |
| AI helper | Invite code | Passes the typed answers to Claude Haiku and returns form values. Added in the AI step. |

**Rules:**

*   **The device decides arrival** (see Step 6) and tells the service. The
    service does not work out arrival itself.
*   **Overdue** is worked out when the family page asks: the overdue time has
    passed and the trip has not ended. Nothing runs on a timer for it.
*   **After a trip ends** the service stops returning positions at once. For
    2 hours, counted from when it learned of the end, it returns only how the
    trip ended, the place name and the time. Then the family link closes.
*   **Silence never ends a trip.** Sharing stops only when the boat arrives
    or the captain stops it. A boat that goes quiet keeps its last position and
    overdue notice on the family page (decided by RJ, Nov 19).
*   **The daily clean-up job** deletes trips 7 days after they end, and trips
    that never ended 30 days after their last update. It is the only thing
    that runs on its own. It is free.
*   **All text from devices** (boat name, first name, waypoint names) is
    length-limited by the service and shown as plain text only, never as page
    code.
*   **Request limits:** one daily cap on trips started and one on AI helper
    calls.
*   **Preview and live copies.** Until promote only the preview copy exists,
    and merging a service change publishes it there. The live copy is created
    at promote. After that, a merged change publishes to the preview copy and
    reaches the live copy through a promote pull request.
*   **Free-tier check (to verify in the step doc):** the limits that matter are
    daily requests and daily database rows read. The design keeps both low: the
    family page asks only for what is new and refreshes less often when it is
    not in front. If a daily limit is
    reached, devices keep queuing and the family page says "Tracking is
    temporarily unavailable. Last update [time]."

**Old tracker.** The live page keeps using the Apps Script tracker. Nothing in
the new service touches the Google Sheet. The old one is retired in the promote
pull request.

**Phase 2.** The tracker service is expected to stay when accounts arrive; an
account would own trips that today are owned by whoever holds the trip key.

### Step 3: Onboarding

Screens follow `docs/mockups/Onboarding.dc.html`: welcome, safety tick box, the
question screen, your boat, limits, route, followers, permissions, first
verdict.

*   **Welcome:** "Know when to go." with two buttons: "Set up my boat" and "A
    friend sent me their setup".
*   **Safety tick box:** Continue is disabled until ticked. The wording is a
    placeholder until RJ's attorney reviews it.
*   **The 7 questions**, written into the page, each with answer chips and a
    box to type in:
    1.  What do you call her? (boat name)
    2.  What kind of boat is she? (center console, walkaround, express cruiser,
        catamaran)
    3.  How long, and what's pushing her? (length and engines)
    4.  Cruise speed and fuel tank?
    5.  About how much fuel does she burn at cruise? ("Not sure" gives a rough
        estimate by boat type, length and engines, shown in amber as an
        estimate to check after the first trip)
    6.  Where do you usually go? (route)
    7.  Who worries when you're out there? (followers)
*   Tapping a chip fills the matching form field. Typed answers are placed in
    the form as written until the AI step exists.
*   **Your boat:** the filled-in form rows, each editable, plus the photo box.
*   **Limits:** presets Cautious (3 ft, 12 kt), Standard (4 ft, 15 kt),
    Experienced (5 ft, 18 kt); plus and minus buttons; a "No north wind in the
    Gulf Stream" switch.
*   **Route:** a route is an ordered list of named points with a start, a
    destination, an arrival distance, and a mark on each point that lies in the
    Gulf Stream (the north-wind rule applies there). Presets carry these. For a
    tapped route the captain ticks which points are in the Stream. The captain picks a preset (West Palm to Abaco via Green
    Turtle; Fort Lauderdale to Bimini; Miami to Bimini) or taps points on the
    map and names them. The nearest tide station is picked automatically. The
    trip home is the route reversed; the Abaco preset keeps its own home route
    as today.
*   **Followers:** first names typed in. A phone number is optional and only
    pre-fills the text at Start trip.
*   **Permissions:** location during a trip, and keep the screen on.
*   **Saved shape.** Setup saves boat, limits, routes and followers in one
    documented shape that the Plan screen, saved trips, the AI helper and Share
    my setup all read, so later steps add to it without a rebuild.
*   **Add to Home Screen** is a step in setup. Whether it comes first or last
    depends on Q1.

**Boat photo.** "Add a photo of your boat" opens the phone's photo picker or
camera. The app shrinks the photo and saves it on the device. It is not
uploaded. With no photo the boat card shows an outline for the boat type; the
onboarding mockup already holds simple outlines for all four boat types, and
`docs/mockups/boat.png` is the center console drawing.

### Step 4: Plan Screen

Follows `docs/mockups/Main.dc.html`. Built in two parts.

**Part A, re-skin what exists** (uses today's code with the saved boat, limits
and route instead of fixed values): trip chips, the verdict card, departure
time chips, hour by hour along the route, map and radar, tides, inside water,
fuel and arrival, go-day checklist, documents list, route file download, Start
trip.

**Part B, add-ons** (each small, each can ship alone):

| Add-on | Source | Note |
| --- | --- | --- |
| Water and air temperature | Open-Meteo (already used) | On the verdict card and per route point. |
| Brief | Written by fixed rules from the forecast numbers. No AI. | Describes conditions. Never advises. |
| Best day this week | The existing verdict run once per day | |
| Forecast models agree or disagree | Open-Meteo's separate model outputs (to verify which wave models are offered) | |
| Marine warnings | US National Weather Service alerts | Covers US waters only. The card says "No US marine warnings" and that the Bahamas side is not covered. |
| Fuel adjusted for sea state | A fixed percentage added by forecast sea height | Shown as "Includes +8% for the forecast seas". |
| Float plan page | A print-ready page the phone can save as a PDF | No PDF software added. |

"Inside water" exists only for the Abaco preset; other routes hide that card.

### Step 5: Saved Trips and My Trips

*   A trip holds: name, route, direction, date, followers, go-day checklist
    ticks, and a state. Limits are the captain's global limits.
*   **Upcoming** trips show one of three things, by how far away the date is:
    *   Beyond the forecast: "Forecast opens [date]".
    *   Inside the forecast but more than 3 days out: an early outlook with a
        range for seas and wind, marked "Early outlook. Could still change." No
        departure-time advice.
    *   3 days out or less: the full Plan screen.
*   How far the sea forecast reaches is confirmed when this step is built.
*   "Next trip" is the soonest upcoming trip. With none, Plan shows tomorrow on
    the captain's usual route.
*   **Past** trips keep date, route, duration, distance, top and average speed,
    and the track. Fuel used is typed in by the captain (optional).
*   "Duplicate as new" copies route, followers and checklist items, clears the
    ticks, and asks for a date.
*   This replaces the Logbook entry in the mockup's menu.

### Step 6: Live Screen

*   A note at the top: "Keep this page open in front while sharing."
*   The app asks the device to keep the screen awake and asks again whenever
    the page returns to the front. This was added in Phase 0 and has not yet
    been tested on a real iPhone.
*   **GPS is read continuously.** Positions are uploaded at the chosen interval
    (1, 5, 10 or 30 minutes; default 5).
*   **The send queue** is part of this step. Positions, check-ins, overdue-time
    changes and "trip ended" are saved on the device first and then sent. What
    fails to send stays queued and goes as one batch when signal returns and
    the page is open in front. The screen shows "Saved 6 updates, will send
    when signal returns. Keep this page open."
*   **Distance left** is measured along the planned route from the point on the
    route nearest the boat.
*   **Speed** is the GPS speed reading averaged over the last 10 to 15 minutes
    on the tracking device. The family page uses the speeds sent with the
    uploaded positions; at the 10 and 30 minute intervals it uses the latest
    one.
*   **Live ETA** is now plus distance left divided by that speed.
    *   Below about 40% of the boat's cruise speed: "Slow", with an ETA.
    *   Below about 3 kt: "Stopped", "ETA on hold".
    *   No recent update: "No update for X min", last ETA greyed out.
*   The Live screen and the family page use the same calculation. The family
    page can lag by one refresh, or longer when the boat has no signal.
*   **Check-in:** "Send 'All good' to family" adds a check-in with the time.
*   **Waypoints:** passing a named point is detected from the continuous GPS
    readings, not only the uploaded ones.
*   **Arrival:** the trip ends when the boat is inside the route's arrival
    distance of the destination, or is within 4 nm of it and has been stopped
    for 10 minutes (the boat usually ends at a dock, not at the route's last
    point). Presets set their own arrival distance; a tapped route defaults to
    1 nm. "Stop sharing now" ends it by hand. For 10 minutes after either,
    "Resume sharing" undoes it.
*   **After arrival** the screen says "Open this page when you have signal so
    your followers see you arrived" until the queue is empty.
*   **Start gate:** no position is sent until the boat is about 1 nm from the
    start (W15). The family page shows "Trip started. Position appears once
    underway."
*   **Track from another device:** offers a link carrying the trip key, the
    route and the cruise speed. If two devices send positions, the service
    keeps both, ordered by time.
*   Wording describes where the boat is and when it may arrive. It never tells
    the captain where to steer.

### Step 7: Family Page

*   A separate small page that needs nothing saved on the follower's phone.
*   Order on screen: map (boat, trail, route), status card, check-ins and
    waypoints passed, then the overdue explanation.
*   Status card: "[First name] is 38 nm out", "Arriving about 1:52 PM", "last
    update 2 min ago", speed, time underway.
*   Refreshes every 30 seconds while in front, less often when not.
*   States: started (no position yet), underway, slow, stopped, no recent
    update, overdue, arrived, sharing stopped, tracking temporarily
    unavailable, ended.
*   The overdue notice always gives the age of the last position and its
    distance from the destination. When that distance is under 4 nm the notice
    leads with "Last heard close to [place]". It never says the boat is fine.
*   After a trip ends the map and position are removed. The page shows
    "Arrived at [place] at [time]" or "Sharing stopped at [time]".
*   "Remind me at [overdue time]" adds a calendar entry on the follower's phone
    with an alert and a link back to the page. Its text is "Check on [first
    name]'s trip", not "overdue", because the captain may have arrived or added
    time.
*   Shows "Planning aid, not for navigation. The captain decides." and "This
    page cannot call for help. In an emergency call the Coast Guard."
*   Carries a tag asking search engines not to list it.

### Step 8: Share My Setup and Self-Backup

*   **Share my setup** builds a link with boat type, length, engines, speed,
    tank, burn, limits and route after the `#`. Nothing is sent to a server. It
    leaves out boat name, followers, photo, trips, the invite code and any
    trip key.
*   **Back up my setup** is a different link, worded as private ("Keep this for
    yourself"), that also carries boat name, followers and upcoming trips. It
    does not carry past trips or their tracks, which are too large for a link.
    It restores a wiped or new device and moves a setup from phone to iPad.
*   The receiving app checks every value in either link and shows them for
    review before saving.

### AI Step: Setup Helper

*   Built after onboarding works without it.
*   If any answer was typed, the app makes one request at the end with all 7
    answers. The service passes them to Claude Haiku with fixed instructions to
    return only form values.
*   The service checks returned numbers against sensible ranges, limits the
    length of returned text, and drops anything else. The app shows the result
    as editable form rows. Nothing the AI returns is saved until the captain
    taps "Looks right".
*   The AI does not write the questions and its output is never shown as
    advice.
*   If the request fails, the typed answers stay in the form as written.

## Alternatives Considered

### Alternative A: Keep One Google Sheet per Captain

*   **Pros**: Works for RJ today. $0. Each captain owns their data.
*   **Cons**: Each friend must copy a sheet, paste a script, deploy it and type
    a key. One shared page, no per-trip links, no closing.
*   **Reason for Rejection**: Decided Nov 17 in favour of the shared tracker
    service (`docs/HANDOFF.md`, "MVP = Phase 1 friends version", item 2).

### Alternative B: One Shared Apps Script and Sheet with Per-Trip Links

*   **Pros**: No new account. RJ already knows how to deploy it.
*   **Cons**: Apps Script responses take one to several seconds, has daily
    quotas that are easy to reach with many followers refreshing, cannot hold
    the AI key behind request limits, and every change is pasted and redeployed
    by hand.
*   **Reason for Rejection**: Recommendation: reject. It keeps the hand
    deployment the handoff set out to remove.

### Alternative C: Supabase or Firebase Now

*   **Pros**: Logins, database and file storage in one product. Supabase is
    planned for Phase 2.
*   **Cons**: More to set up now. Free projects pause when idle. Brings
    accounts into a version that does not need them.
*   **Reason for Rejection**: `docs/HANDOFF.md` item 2 recommends Cloudflare
    for the MVP. Revisit at the Phase 2 decision point.

### Alternative D: Let the AI Run the Whole Setup Conversation

*   **Pros**: Can ask follow-up questions.
*   **Cons**: Fails with no signal. Costs more per setup. The AI could say
    something that reads as safety or navigation advice.
*   **Reason for Rejection**: Recommendation: reject. Fixed questions keep the
    "planning aid, never a navigation tool" rule checkable.

### Alternative E: No AI; Read Typed Answers with Rules on the Phone

*   **Pros**: $0. No key, no Anthropic account, no AI line in the privacy
    statement.
*   **Cons**: Free-form answers ("she's a 32 Contender with twin 300s") are
    hard to read with rules.
*   **Reason for Rejection**: The AI helper was approved Nov 17
    (`docs/HANDOFF.md`, item 3). Building it as its own late step means the app
    works this way until then.

### Alternative F: Upload the Boat Photo So Followers See It

*   **Pros**: Followers see the actual boat.
*   **Cons**: New personal data on the server, file storage to set up, a
    privacy statement change.
*   **Reason for Rejection**: `docs/HANDOFF.md` item 3 says keep the photo on
    the phone unless a design doc decides otherwise. This one does not.

### Alternative G: Push Updates to the Family Page Instead of Refreshing

*   **Pros**: Followers see changes within a second.
*   **Cons**: Needs a paid or more complex Cloudflare feature. Positions change
    every 5 minutes, so a 30-second refresh shows the same thing.
*   **Reason for Rejection**: Recommendation: reject for the MVP.

### Alternative H: Rebuild with an App Framework

*   **Pros**: Shared screen parts are written once.
*   **Cons**: Adds a build step and tooling RJ would have to learn, and GitHub
    Pages does not run it.
*   **Reason for Rejection**: Recommendation: reject for the MVP. Revisit when
    the Phase 3 app is planned.

--------------------------------------------------------------------------------

## Non-Functional Requirements

### Risks and Mitigations

| Risk | What people see | Mitigation | What remains |
| --- | --- | --- | --- |
| Boat arrives with no signal | Family page says overdue | Device ends the trip itself and queues "trip ended"; prompt to open the page once there is signal; notice shows last position's age and distance from destination | A false overdue notice until the captain opens the page with signal. If the phone stays in a pocket, it stays overdue. Wording goes to RJ's attorney. |
| Tracking device locks, crashes or dies | "No update for X min", then overdue | Keep-awake request; second device can track; captain tells followers the overdue time in the first text | Tracking stops until a device reopens the page. |
| Nobody has the family page open | Nobody is told the boat is overdue | "Remind me" calendar entry; overdue time in the first text | Depends on each follower tapping once. |
| Tracker service down or over its daily limit | Devices queue; family page says tracking unavailable | Low request design; share text still sent at Start trip | No live tracking during the outage. |
| Safari deletes saved data, or a new phone | Setup and trips gone | Add to Home Screen; "Back up my setup" link | A captain who never backed up starts over. Server copies of trips are gone after 7 days. |
| Device holding the trip key is lost mid-trip | Trip cannot be ended by hand | Second device has the key; the trip is deleted 30 days after its last update; RJ can delete it sooner in the dashboard | Followers see the last position and "overdue" until then. |
| Family link is forwarded | Others can watch that trip | Link closes 2 hours after the trip ends; "New link" on the Family tab replaces it | Whoever has the link can watch until then. |
| Invite code leaks | Strangers can start trips and call the AI helper | Daily caps; $5 monthly AI limit; RJ changes the code | Friends not yet set up need the new invite link. |
| Harmful text in a name or a setup link | Could run as code on the page | Plain-text display only; length limits; every link value checked | Reviewed in each step's pull request. |
| A service database leak | Positions, first names, boat names, routes of the last 7 days | Short retention; no phone numbers, no follower names, no accounts stored | That 7 days of trips. |
| Schedule slips | All eight steps not in preview by Nov 29 | Staged order below; usable Stage 1 first | RJ has accepted a slip. At one tested pull request a day the last step lands around Dec 6. |

### Safety Wording

*   One sentence everywhere: "Planning aid, not for navigation. The captain
    decides." It appears on Plan, Live and the family page.
*   The words "safe" and "safely" are not used for conditions or routes.
*   The family page and overdue notice say the app cannot call for help.

### Privacy

Location is sent only between Start trip and the end of the trip. `privacy.html`
is one page for both the live site and the preview, so until promote it
describes both trackers.

| Step | Change to `privacy.html` in the same pull request |
| --- | --- |
| 2 | Preview trips are stored with Cloudflare; the live page still uses Google. Boat name, first name, route and planned arrival are stored for a trip. Kept 7 days after the trip ends. Positions at full precision, none within about 1 nm of the start. Captain can delete a trip from the app. A trip that never ended is kept 30 days after its last update. A deletion request by email needs the trip's family link, because there are no accounts. Replace "your boat details stay on your phone" and "kept until you ask" with the accurate versions. |
| 3 | The boat photo stays on the device. |
| 7 | Followers see no position after the trip ends; the arrival place name and time show for 2 hours. Battery level only where the phone provides it. Remove "signal strength". |
| 8 | The backup link contains follower first names and trips. |
| AI step | Typed setup answers, which may include follower first names, go to Anthropic through the tracker service and are not stored by the service. |

### Secrets

The AI key lives only in the tracker service's settings and RJ's password
manager. The invite code is also held on invited friends' devices. Trip keys
and family keys are made by the service.

### Cost

| Item | Cost | Notes |
| --- | --- | --- |
| GitHub Pages | $0 | As today. |
| Cloudflare service and database, two copies | $0 | Free tier (limits to verify in the step 2 doc). RJ creates the account. |
| AI helper | About 1 to 2 cents per setup with typed answers | Prepaid credit in RJ's Anthropic account, about $5 minimum (to verify); $5 monthly limit set in that account. |
| Daily clean-up job | $0 | Runs on its own once a day. |
| Reviews of step design docs | $0 extra | Uses RJ's weekly plan limit faster. |

### Rollout and Undo

*   Every step lands in `/next/` behind the PREVIEW banner. The live page does
    not change.
*   Reverting a pull request undoes the page change. It does not undo: data
    already saved on devices, rows in the preview database, or a Cloudflare
    setting. Each step's pull request lists what a revert leaves behind.
*   Database changes are written so the previous version of the service still
    works with them.
*   **Promote** needs: all steps merged to preview, and the tracker, Live
    screen and family page used on one real trip on the water. A coastal run
    counts.

### Testing

*   The calculations (verdict, ETA, distance along route, arrival rule, trip
    states) are separate small functions with a test page that RJ opens in a
    browser; it shows a list of passes and failures.
*   Each pull request is checked at phone width (390 px) and iPad width, and
    says what could not be tested: a real iPhone, real GPS, real loss of
    signal.

--------------------------------------------------------------------------------

## Build Order

This section replaces the template's detailed implementation plan. The tracker
service and the Live screen with family page get their own design docs (W14).
The other steps are built from this document.

**Target: all of it in the preview by Nov 29. RJ has accepted that it may
slip.** The list below is 2 design docs and 15 pull requests. At one tested
pull request per day it ends around Dec 6. Reaching Nov 29 needs two small
pull requests tested on about half the days. Dates are given for Stage 1 only;
later stages get dates once Stage 1 shows the real pace.

**Stage 1: usable on the water** (RJ's boat and route, as in the preview page)

| # | Target | Work | RJ does |
| --- | --- | --- | --- |
| 1 | Nov 20 | Design doc and review: tracker service | Read the summary and decide the findings. Create a free Cloudflare account (about 15 minutes, guided). |
| 2 | Nov 21 | Pull request: split the preview page into files, no change in behaviour | Check the preview looks and works as before. |
| 3 | Nov 21 | Pull request: tracker service, preview copy, with a small test page that starts and reads a trip | Connect the repo to Cloudflare; add the invite code as a setting; open the test page. |
| 4 | Nov 22 | Design doc and review: Live screen and family page | Read the summary and decide the findings. Run the calendar test (Q2). |
| 5 | Nov 23 | Pull request: Start trip, Live screen, send queue, start gate | Test in a car. |
| 6 | Nov 24 | Pull request: family page, reminder, "Track from another device" | Open the family link on a second phone; track from the iPad. |

After Stage 1, RJ can start a trip, share a family link that closes, and track
from the helm iPad.

**Stage 2: friends can set up** (in this order)

| # | Work |
| --- | --- |
| 7 | App frame: bottom bar, Menu, Settings, Family tab, My Boat profile, Safety checklist |
| 8 | Onboarding screens without AI: welcome, safety box, questions, boat, limits, followers, permissions, first verdict; verdict code reads the saved setup |
| 9 | Routes: the two Bimini presets and tap-your-own points |
| 10 | Boat photo and outlines |
| 11 | Plan screen part A: re-skin with the saved setup |
| 12 | Plan screen part B: temperatures, brief, best day |
| 13 | Plan screen part B: model agreement, marine warnings, fuel adjustment, float plan page |
| 14 | Saved trips and My Trips |

**Stage 3: finish**

| # | Work | RJ does |
| --- | --- | --- |
| 15 | Share my setup and self-backup | |
| 16 | AI setup helper | Create an Anthropic API key with a $5 limit; add it as a Cloudflare setting. |
| 17 | Loading with no signal (W16), then the promote pull request | One real trip on the water first. Approve or hold. |

Each pull request is tested and merged in RJ's 5:00 to 5:45 PM block. A missed
or failed day moves everything after it by a day.

--------------------------------------------------------------------------------

### Additional Resources

*   `CLAUDE.md`: the hard rules.
*   `docs/HANDOFF.md`: decisions and approved scope.
*   `docs/feature-map.md`: every feature and its phase.
*   `docs/mockups/Main.dc.html`, `docs/mockups/Onboarding.dc.html`,
    `docs/mockups/boat.png`: approved screens and the boat outline.
*   `docs/designs/mvp_review_report.md`: review round 1 findings.
*   `next/index.html`, `tracker/Code.gs`, `privacy.html`: what exists today.

### Future Improvements

*   **Messages inside the app**, first after the MVP: captain and followers
    type to each other on the family page. No outside service. $0.
*   **Real text messages sent by the app**, next: float plan, "Made it" and
    overdue alerts to followers who are not watching. Needs a texting service:
    roughly $5 to $15 per month at friends scale plus a one-time registration
    of about $20 (figures to verify before any purchase). Carrier approval
    takes days to weeks, so the registration can be started during the MVP
    build once RJ says go.
*   **Accounts and server backup** of setup and trips (Phase 2).
*   **Tracking with the phone locked** (Phase 3).
*   **Followers see the boat photo or a line drawing.**
*   **Limits per trip**, route file import, satellite messenger on the map.

--------------------------------------------------------------------------------

*Drafted with EGM*
