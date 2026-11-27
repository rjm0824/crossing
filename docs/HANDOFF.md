# Crossing App: build handoff (Nov 17, 2026)

Everything a new build session needs, pulled from the planning chats. Decisions here are RJ's unless marked as a recommendation. The Google project doc ("Crossing App — Project Doc (shared)") has the full dated history.

## Update: Nov 26, 2026, late night: beta opens with no signal (row 17) in beta

RJ chose **B** (saved pages plus the last forecast).
*   **`beta/sw.js`** (service worker), registered by `beta/js/offline.js` on
    beta's captain pages (not `family.html` or the test pages). Scope is
    `/crossing/beta/` only, so `/next/` and the live page are out of reach.
    Network first with a 4-second fallback to the saved copy, so testing
    always gets the newest version with signal. Saves beta's pages,
    scripts, styles, icons and Leaflet; never data (forecast, NWS, tracker,
    tiles, radar). Undo: delete `sw.js`; phones drop the saved copy at
    their next check with signal.
*   **Every change to beta must bump `VERSION` in `beta/sw.js`** and list any
    new page, script or style in `FILES`; `/pr-check` fails otherwise.
*   **Saved forecast** (`forecast.js`): every good forecast is kept in
    `cx:beta:lastfc` (three newest route/direction pairs). With no signal,
    the Plan page only (`FC_USE_SAVED`) uses one under **36 hours** old for
    the same route and direction, with an amber "No signal. This is the
    forecast saved on …" box and "Saved forecast from …" at the top.
*   Menu shows "Saved for no signal: version …" and **Refresh saved copy**.
*   Tested here with the browser switched offline: every beta page opens;
    a 40-hour-old forecast is refused; back online clears the warning;
    `/next/` is not controlled. Needs RJ's Airplane Mode test on the iPhone
    and iPad. `docs/promote-plan.md`: the saved copy moves to `next/` with
    "beta replaces next". `privacy.html` updated.

## Update: Nov 26, 2026, late night: Share my setup and backup (row 15) in beta

*   **Menu → Share or back up** (`beta/share.html`, `beta/js/share.js`). Both
    links point to that page with the data after `#` (JSON, UTF-8,
    base64url; `#s=` share, `#b=` backup; version 1). Nothing goes to a server.
*   **Share:** boat type, length, engines, speed, tank, burn, limits, route
    (and own route points). **Backup:** also boat name, My Boat details,
    papers link, followers' first names (no phones), settings, upcoming
    trips. **Never:** invite code, trip keys, photo, home port, past trips.
*   **Opening a link:** every value checked against the same ranges as the
    forms; anything wrong is left out and listed; review first, nothing
    saved until **Use these**. A friend's setup keeps the friend's own boat
    name, followers and trips, sets `prefilled: 'friend'`, and onboarding
    then goes from the safety box straight to "Your boat" marked
    "Pre-filled from your friend's setup" (questions skipped, CUJ 2). A
    backup restore replaces boat, limits, route and followers (keeping phone
    numbers already on the device for the same names), merges trips and
    settings.
*   `privacy.html` describes both links.

## Update: Nov 26, 2026, late night: past trips (row 14b) in beta

*   **Past trips** (`beta/js/mytrips.js`, `capture()`): when a real (not
    practice) trip ends, its summary is copied from what the Live screen
    keeps (`cx:beta:trip` and `cx:beta:trail`) into `cx:beta:pasttrips`
    (device only, up to 30): date, direction, end reason, duration, distance
    shared, average and top speed (a fix implying over 70 kt is treated as a
    bad fix and left out), a track of up to 400 points. Runs on page load
    (Plan, My Trips, Float plan, Live) and every 30 s on the Live page;
    **`live.js` is not changed** (live.html only loads mytrips.js). A saved
    upcoming trip on the same day and direction lends its name and
    followers and is cleared.
*   **My Trips → Past trips:** stats, **Fuel used** (typed; gal an hour shown),
    **View track** (map with first and last shared position), **Duplicate as
    new** (same route, direction, name and followers; pick a date), Delete
    (tap twice).
*   **Add to calendar** on upcoming trips: an all-day entry with a reminder
    at 6 PM the evening before (`calendar.js`'s `CalendarFile`).
*   `privacy.html`: past trips and their track stay on the device.

## Update: Nov 26, 2026, late night: My Trips (row 14a) in beta

RJ split row 14: **14a** (upcoming trips) now; **14b** (past trips from the
Live screen's saved trip and trail, fuel used, View track, Duplicate as new,
Add to calendar) next. RJ kept the sea-allowance table (0/5/10/15%).

*   **My Trips tab** (`beta/mytrips.html`, `beta/js/mytrips.js`,
    `beta/js/mytrips-page.js`); the bottom bar now has five tabs in the
    mockup's order (Plan · Live · My Trips · Family · Menu), on every page
    including Live.
*   **Trips** saved on the device only in `cx:beta:mytrips` (not the Live
    screen's `cx:beta:trip`): name, route, direction, date, followers' first
    names. + New trip, Edit, Delete (tap twice).
*   **States** (forecast reach checked Nov 26: sea data about 9 days ahead):
    0 to 3 days out "Forecast ready" with the seas and wind range and
    **Plan this trip**; 4 to 8 days "Early outlook. Could still change." with
    the range only; further out "Forecast opens [date − 8 days]". Ranges are
    6 AM to 3 PM along the route; no advice.
*   **Plan page:** `index.html?t=<id>` plans that trip (route, direction,
    day, followers; a "Planning" card); without it, a **Next trip** card.
    The Float plan button carries the trip.
*   `privacy.html`: one line for saved trips.

## Update: Nov 26, 2026, late night: Plan page row 13, part 2, in beta

**Network (RJ approved):** the "crossing" cloud environment now allows
`open-meteo.com`, `api.open-meteo.com`, `marine-api.open-meteo.com`,
`api.weather.gov` and `www.weather.gov`, so builds can test against the real
forecast. (Map tiles and radar are still blocked here.)

**Checked against the live services (Nov 26, evening Eastern):**
*   Open-Meteo wave models `ecmwf_wam025`, `ncep_gfswave016` and
    `meteofrance_wave` cover every Abaco route point for 5 days; with
    `models=` the answer has `wave_height_<model>` per point.
    `sea_surface_temperature` arrives in °C (row 12 converts it).
*   NWS marine zones: **AMZ650** Jupiter Inlet to Deerfield Beach out 20 nm,
    **AMZ670** the same from 20 to 60 nm; AMZ555/AMZ575 north of Jupiter;
    AMZ651/AMZ671 south of Deerfield. `api.weather.gov/alerts/active?zone=`
    answers browsers (CORS `*`), no key.

**Built (`beta/js/warnings.js`):** a "Forecast models" line in Hour by hour
(each model's worst seas on the run; "they agree (within 1 ft)" or "they
differ by X ft"), and US marine warnings on the answer card for alerts that
overlap the run ("✓ No US marine warnings…" or "⚠ Small Craft Advisory
until …"), always with "The Bahamas side is not covered"; a failed check says
so. Neither changes the answer. The fuel allowance band now follows the
seas figure shown (one decimal). `privacy.html` names the NWS.

**Date correction:** tonight's notes and pull requests (#36 to #40) were
dated Nov 27 by mistake (the cloud machine's clock is UTC); it was Thu Nov 26
in Florida. Headings above, CLAUDE.md, the promote plan, the feature map and
the privacy page date are corrected. Commit messages and closed PR text keep
the wrong date.

## Update: Nov 26, 2026, night: Plan page row 13, part 1, in beta

RJ split row 13 (Nov 26): **part 1** (no new services) now; **part 2**
(forecast models agree, NWS marine warnings) next session, after this
workspace is allowed to reach `open-meteo.com` and `weather.gov` so the
model names and the marine zones for Palm Beach can be checked against
real answers (both hosts were blocked here, so nothing was guessed).

*   **Fuel for the forecast seas** (RJ's table): worst seas on the run under
    2 ft +0%, 2 to 3 ft +5%, 3 to 4 ft +10%, over 4 ft +15%, shown as
    "Includes +10% for the forecast seas (worst 3.4 ft)".
*   **Float plan page** `beta/float-plan.html` (Get ready → Float plan):
    trip, route points with positions, boat, followers' first names (no phone
    numbers), departure, arrival and overdue time and fuel passed from the
    Plan page in the link; captain, people aboard and notes typed on the
    page and saved on the device (`cx:beta:floatplan`). Prints black on
    white; Share › Print › Save to Files makes a PDF. Emergency line is
    only "VHF channel 16, or call the US Coast Guard" until
    `docs/overdue-numbers.md` is confirmed. `privacy.html` updated.

## Update: Nov 26, 2026, late evening: Plan page row 12 in beta

*   **Water · Air · Sunrise tiles** after Seas · Wind · Arrive (°F only, RJ).
    Open-Meteo now also returns `sea_surface_temperature` (marine; converted
    to °F when it answers in °C) and `temperature_2m` (°F). Same service, no
    new data about the user.
*   **Written summary** under the tiles (`briefText` in `beta/js/plan.js`):
    fixed rules, no AI, describes conditions only (seas range and where they
    peak, wind range and gusts, water and air, rain or thunderstorms). Never
    advice, none of the wording CLAUDE.md rules out.
*   **Best day this week** card: the best morning departure for each of the
    4 days, scored like the answer card; tap a day to plan it.
*   **Hour by hour:** "Water 79° · Air 77°" under each point.

Row 13 (models agreeing, marine warnings, fuel for sea state, float plan
page) is next on the Plan page.

## Update: Nov 26, 2026, evening: Plan page part A (row 11) and papers link, in beta

**Crossing-day card** (https://claude.ai/artifact/2BNtygYUVDFkJmzBJnWBm1)
updated: Saturday's crossing log and bottom-bar checks, the heads-up text
for Haile and Mom with a Copy button, and "amber PREVIEW, not violet BETA"
at the dock.

**Pull request (beta only; `next/` untouched):**
*   **Plan page part A (MVP row 11):** boat name from setup in the heading
    and tab title; route line with a **⇄ Trip home / Trip over** button;
    **Seas · Wind · Arrive** tiles on the answer card (worst seas, strongest
    wind, arrival); sections in the mockup's order and names (Departure
    times, Hour by hour, Route map + radar, Tides, Inside water, Fuel and
    arrival, Get ready, Start trip); "Fuel needed: X–Y gal of Z · reserve
    left"; **Get ready** (was the go-day checklist) built from setup:
    followers' names, tank and fuel for this run, "Starlink or Wi-Fi set for
    offshore" (RJ's wording), a general list on routes other than Abaco.
    Ticks are kept by item id. RJ's private Drive folder link is removed.
*   **Papers link (option 1, RJ):** Menu → My Boat has an optional "Link to
    your boat papers" (https only, saved in `cx:beta:setup` as
    `boat.papers`, on the device only). Get ready shows **Open my papers**.
    `privacy.html` says so.
*   **Document photos** (registration and insurance on the phone, never
    passports) moved to **Phase 2** in `docs/feature-map.md` (RJ); its own
    design review first.

Water and air temperatures, the brief and best day are row 12.

## Update: Nov 26, 2026, evening: second preview copy `/beta/`; `next/` frozen for the crossing

**Why (RJ):** keep building and trying features before the crossing home
(Nov 29 to 30) without touching `/next/`, which the helm iPad runs.

**What (one pull request, not merged until RJ tests it):**
*   `beta/` is a copy of `next/` as it was on main (commit 387f324), with a
    **violet BETA banner** on every page and "BETA ·" tab titles.
*   **Own saved data:** every saved name in beta starts `cx:beta:`, including
    the day, departure and go-day ticks that next/ saves without a prefix
    (`crossDay`, `crossDep`, `goday-ticks`); the boat photo store is `cx-beta`.
    Beta never reads or changes what `/next/` saved, so on first open beta is
    empty: RJ types the invite code once (from Keeper) and runs onboarding.
*   **Family links** come out as `beta/family.html` (built from the page's own
    address). Beta uses the **existing preview tracker**: beta and /next/
    trips are separate trips with their own keys. Family only see a beta trip
    if RJ sends them a beta link. Beta test trips count toward the tracker's
    50 trip starts a day.
*   **Onboarding (#29) then routes (#31)** applied to `beta/` instead of
    `next/`, with beta's names. `privacy.html` takes #29's wording plus one
    line about the beta copy. `docs/route-points.md` comes with #31.
*   **Guard:** `.claude/hooks/protect-live.sh` now blocks `next/` too while
    `FREEZE_NEXT=1`. `/pr-check` and the GitHub checks fail if `next/` changes
    while frozen or if beta code names `cx:next:`, and run beta's trip checks.
    CLAUDE.md: new work goes in `beta/`.
*   `docs/promote-plan.md`: after the crossing, beta replaces next first (its
    own pull request and tests), then next goes live later as planned.

**#29 and #31:** closed Nov 26 on RJ's OK after #36 merged (their work now
lives in beta). Their branches are kept for history.

**After the crossing:** RJ lifts the freeze (`FREEZE_NEXT=0`), then the
"beta replaces next" pull request. The Dec 1 Live screen work goes in beta.

**Cost:** $0. Nothing new runs on its own.

## Update: Nov 26, 2026, evening (wrap-up): bottom bar merged and passed on RJ's iPhone

**Merged today:** #33 (☰ menu sheet on the Live page) and #34 (the same
bottom bar as the rest of the app, replacing the ☰). RJ tested both on his
iPhone after merging (all steps passed; "it's perfect"). The details are in
the next section. A small docs PR adds a bottom-bar check to Saturday's
water test in `docs/crossing-test-plan.md`.

**Testing a pull request on the phone:** GitHub Pages publishes only `main`,
and the tracker accepts only `rjm0824.github.io`, so a preview change can
only be tried on RJ's phone **after** merging. Say so in every PR's test
steps; the undo is Revert.

**Nothing else is open from this session.** #29 and #31 stay held for Dec 1
(no conflicts with #33 or #34).

**Next:** Saturday's water test (Sat Nov 28, 9 AM), including the bottom-bar
check; then the crossing (Nov 29 to 30, no building); Dec 1 debrief (Sonnet
5.5), then merge #29 and #31 and connect Settings (Opus 5.5).

## Update: Nov 26, 2026, evening: bottom bar on the Live screen (the one freeze exception)

RJ asked for a way back to the app's menus from `next/live.html` (Start
trip, Live and Trip ended are all that one page). First built as a ☰ menu
sheet (#33, merged and passed on RJ's iPhone); RJ then asked for the same
bottom bar as every other page instead, and the ☰ was removed.

Now: `live.html` loads `frame.js` (unchanged) and has `data-tab="live"`, so
it shows **Plan · Live · Family · Menu**. `next/js/livemenu.js` adds the
bar's styles (the dark bar colours; `frame.css` is **not** loaded on the
Live page, so its own buttons and messages keep their tested look), room at
the bottom so the bar never covers Stop sharing, keeps the green "underway"
dot on the Live tab matching the trip, and, while a trip is sharing, asks
"Sharing pauses while you're away from this page. Stay on your trip?"
before leaving ("Back to my trip" is the default). Tapping Live does
nothing. `live.js`, `settings.js`, the family page (no bar for followers)
and the tracker are unchanged. It only reads `cx:next:trip`. No new data,
$0, nothing runs on its own. When #29 adds Setup to the Menu, the Live page
reaches it through the Menu tab with no extra work.

## Update: Nov 26, 2026, afternoon (later): test kit merged; row 9 drafted

**Date note:** the work in the two updates below was done on Thu Nov 26.
Some commit messages and draft-branch notes say Nov 27 by mistake (the plan
had row 8 on Fri Nov 27). Saturday's water test is Sat Nov 28; the
crossing is Nov 29 to 30.

**Calendar reminders (RJ's):** Sat Nov 28, 9:00 AM water test with the
crossing log on the iPhone; Sat Nov 28, 6:00 PM text Haile and Mom.
Open Loops rows 226 to 230 hold the follow-ups.

| PR | State | What |
| --- | --- | --- |
| #29 | Draft, after the crossing | Onboarding (row 8), see below |
| #30 | **Merged Nov 26** | Crossing test kit: `docs/crossing-test-plan.md` and the crossing log (`next/log.html`, Menu → Crossing log, iPhone only; `cx:next:crosslog`, no location) |
| #31 | Draft, after the crossing, **merge after #29** | Routes (row 9) |

**Row 9 (#31), built on #29's branch:** `next/js/routes.js` (one route shape;
Abaco built read-only from `settings.js`, 152.7 nm), Setup step 5 of 7 "Your
route", "Tap my own points on the map" (fixed crosshair like the home port
picker; 2 to 12 points, names, Stream ticks; saved as `myRoute` in
`cx:next:setup`), and `next/js/active-route.js` so the Plan page plans the
chosen route. For Abaco the Plan page is unchanged (compared card by card
with `main`). On other routes, Abaco-only cards hide and Start trip is
replaced by a note: the frozen Live screen only knows Abaco until Dec 1.

**Waiting on RJ:** check the Bimini points in `docs/route-points.md` (on the
#31 branch until it merges) against charts (drafted from general knowledge, `ready: false` until approved).
**After the crossing (Opus 5.5):** merge #29 then #31; switch on the Bimini
presets once approved; nearest tide station; make `live.js` follow the
chosen route along with the other Dec 1 Live screen work.

## Update: Nov 26, 2026, afternoon: MVP row 8 built (draft PR, held until after the crossing)

**RJ's decisions at the start of the session:** (1) one saved setup,
`cx:next:setup`, that My Boat moved into (it copies `cx:next:boat` once and
leaves the old key); (2) onboarding at `next/setup.html`, reached from a
**Setup** row in the Menu only; show it on first open after the crossing.
(3) Wind over the captain's max from any direction except north in the
Stream gives **CROSSABLE**, "Crossable, not comfortable", not NO-GO.
(4) **Boat photo instead of the outline** (RJ: the outline looked
cartoonish). "Add a photo of your boat" is built in row 8 (`next/js/photo.js`:
shrunk to 1200 px, saved in IndexedDB on the device, never uploaded). The
line-drawing outline is dropped and moves to a later phase; row 10 now only
needs the boat card on the Plan screen to show the photo.

**Built (draft PR "DO NOT MERGE until after the crossing: onboarding (MVP
row 8)"):** welcome, safety tick box (placeholder wording for RJ's attorney;
no Terms of use page yet), the 7 questions with chips (typed answers kept as
written), your boat (editable, optional photo), limits, followers (first
name, optional phone), tracking (location asked once, keep-screen-on shares
`cx:next:prefs.keepAwake`), and "You're set" with tomorrow's first answer.
`next/js/mysetup.js` gives the Plan page's verdict, hour table, run time and
fuel the saved setup, falling back to today's numbers; with no setup the
verdict matches `main` (compared on 26,000 random departures). The shape of
`cx:next:setup` is documented at the top of `next/js/setup.js`.
`privacy.html` updated (followers, setup answers, the "contacts" line).

**Left for after the crossing (Dec 1, Opus 5.5):** turn on "show Setup on
first open" (one line in the Plan page's boot); make `live.js` use the
saved cruise speed (it still estimates at 26 kt) and fill the Start trip
text with the followers' phone numbers; the "connect Settings" work below.
Not in row 8: routes (row 9; the Bimini chips are left out and step count is
6 until then), the photo on the Plan screen's boat card (row 10), "A friend sent me their setup" (row 15),
Talk and AI (row 16). Some chips are still RJ's own ("Goof n' Off",
"Haile + Mom") and should be made general before friends use it.

## Update: Nov 26, 2026, evening: MVP row 8 next

**Merged tonight:** #25 (old Apps Script tracker removed from the preview
Plan page), #26 (MVP row 7, the app frame) and #27 (privacy page date set to
Nov 26). RJ merged #25 and #26 before the crossing on purpose; both change
only the preview. The live page, the Live screen (`next/live.html`), the
family page and the tracker service are unchanged, so the crossing setup is
exactly as tested. Nothing is open from that session.

**RJ's new pace (recorded in `docs/designs/mvp.md`, Build Order):**

| Date | Work |
| --- | --- |
| Fri Nov 27 | Row 8: onboarding without AI (start it) |
| Sat Nov 28 | Water test in Abaco (30 min), then row 9 (routes) |
| Nov 29 to 30 | The crossing. No building. |
| Dec 1 | Debrief; connect Settings (below); fixes from Saturday |
| Dec 1 to 5 | Rows 10 to 14 |

Stage 2 work goes up as **draft** pull requests ("DO NOT MERGE until after
the crossing"), in steps RJ can check in 5 minutes each, one at a time with
his OK. RJ may still choose to merge a draft early, as he did tonight.

### What row 7 built (in `next/`, all merged)

*   **`js/frame.js` + `css/frame.css`:** the bottom bar, **Plan · Live ·
    Family · Menu**. A page joins the frame with `<body data-tab="...">`, the
    two files, and `frame.js` loaded last. On the Plan page the bar shows only
    in captain mode (`#captain`); on other frame pages always. Links with
    `data-keep-trip` keep `?trip=home` (placed before any `#`). New tabs go
    in the `tabs` list in `frame.js` only once their screen exists (no dead
    buttons); **My Trips** joins in row 14. Frame styles stay out of
    `app.css` because the frozen Live and family pages load `app.css`.
*   **Pages:** `menu.html` (My Boat, Customs, Safety), `family-tab.html`
    (`familytab.js`: reads `cx:next:trip` only, never writes it),
    `boat.html` (`boat.js`), `customs.html`, `safety.html` (`safety.js`),
    `settings.html` (`prefs.js`).
*   **Saved on the device (localStorage):**

| Key | Shape | Written by |
| --- | --- | --- |
| `cx:next:boat` | `{name, make, length, engines, colour, marina, savedAt}` (strings; length 10 to 200 ft; no ID numbers, RJ's rule) | My Boat |
| `cx:next:safety` | `{ticks: {pfd, throw, flares, ...: true}, savedAt}` | Safety |
| `cx:next:prefs` | `{intervalMin: 1/5/10/30, overdueMin: 30/60/80/120, keepAwake: bool, savedAt}` | Settings |
| `cx:next:trip` | the Live screen's trip | Live screen only |

*   **Settings is not connected yet.** It is not in the Menu, and the page
    says so in an amber banner. After the crossing (Dec 1, Opus 5.5): make
    `live.js` read `cx:next:prefs` (interval, overdue minutes in place of the
    fixed 80, keep-awake), add Settings to the Menu, remove the banner. A
    small pull request of its own.

### Row 8: onboarding without AI (Fri Nov 27, Opus 5.5)

Scope from `mvp.md` (Build Order row 8 and Technical Plan "Step 3:
Onboarding"): welcome, safety tick box, the 7 questions with chips (typed
answers go in the form as written; no AI until row 16), your boat, limits,
followers, permissions, first verdict; **the verdict code reads the saved
setup.** Route picking is row 9 and the boat photo is row 10, so row 8 uses
the current Abaco route and shows the boat outline. Screens follow
`docs/mockups/Onboarding.dc.html`, with the "mockup wording that must change"
list in `mvp.md` (App Pages).

**Watch out for these:**

1.  **Code freeze reaches into `settings.js`.** `live.js` reads `CRUISE_KT`,
    `WP`, `TRACK`, `DEST` and `HOME` from `next/js/settings.js`. Do not
    change those, or make them read the saved setup, before the crossing:
    the Live screen would change. Make the Plan page's verdict read the
    saved setup through its own code (falling back to today's numbers when
    there is no setup), and leave `settings.js` as it is until Dec 1.
2.  **One saved shape.** `mvp.md` asks for one documented shape for boat,
    limits, routes and followers. `cx:next:boat` already holds the profile.
    Recommended: a single `cx:next:setup` object whose `boat` part includes
    the profile fields, with My Boat moved over to it (reading the old key
    once). This is a decision for RJ at the start of the session.
3.  **Don't force onboarding on RJ yet.** He uses the preview Plan page
    around the crossing. Recommended: onboarding at its own page, reached
    from a **Setup** row in the Menu, and shown on first open only after the
    crossing. Also RJ's decision.
4.  **Privacy.** Followers' first names and optional phone numbers are new
    data on the device. The "contacts you choose" line in `privacy.html` says
    the app sends them the float plan; the app does not send texts (the
    captain sends one text from the share screen). Fix that line in the same
    pull request.
5.  **Safety tick box wording** is a placeholder until RJ's attorney reviews
    it. Mark it so in the page and the pull request.

### Testing in the cloud workspace

Starting a local web server (`python3 -m http.server`) was blocked by the
session's safety checks, and this workspace cannot reach
`rjm0824.github.io`, cdnjs, Open-Meteo or map tiles. What worked: Playwright
serves the repo's files straight from disk with `page.route`, and Leaflet
1.9.4 comes from npm (`npm pack leaflet@1.9.4` into the scratchpad) in place
of cdnjs. The forecast shows "Offline" and the map is grey for that reason
only; say so in screenshots. Test at 390 x 844 (touch) and 820 x 1180, check
for sideways scroll and page errors, then `/pr-check`.

**Next sessions, and the model for each:**

| Work | Model |
| --- | --- |
| Row 8, onboarding without AI (Fri) | Opus 5.5 |
| Row 9, routes (Sat, after the water test) | Opus 5.5 |
| Fixes from Saturday's test (freeze allows these only) | Opus 5.5; Sonnet 5.5 for a one-line wording fix |
| Dec 1: debrief | Sonnet 5.5 |
| Dec 1: connect Settings to the Live screen; rest of Sprint 2 | Opus 5.5 |
| Any new design doc plus `/egm:egm-review` | Fable 5.2 |

## Update: Nov 26, 2026, afternoon

**Merged:** #23 (filing) and #24 (`docs/promote-plan.md`: the gate, steps,
test and undo for moving `/next/` to the live page; plan only).

**Open, held until after the crossing:** #25, a draft. It removes the old
Apps Script tracker from the preview Plan page (Sprint 2, item 1), and this
update rides along with it. RJ marks it Ready, tests it (2 minutes) and
merges it once he is home.

**Saturday's water test is in Abaco** (correction, 1:15 AM: RJ and the helm
iPad are at Guana Cay, not Palm Beach). Done tonight on the iPad: home port
set; Safari allowed to use location (it was off, so a real Start trip failed
until fixed; practice runs never needed it); a real Start trip with Hide my
start on showed "Waiting until you're past Green Turtle", then was stopped
and deleted. The iPad uses Mom's Apple account: the family link goes from
the iPad to RJ, and RJ forwards it from his iPhone.

Saturday: open the trip home with Hide my start off, start at the dock, send
the link to yourself, run 15 minutes, All good and Remind me, Stop sharing
now, Delete. The home-port ending ("heading in", "RJ is home!") can only
happen at Palm Beach, so the crossing is its first real run; it passed on
practice runs. (Do not run a trip-home test inside the Palm Beach Inlet with
Hide off: anywhere west of 80.035°W counts as arrived, so it ends in seconds.)
Tick-box version: https://claude.ai/artifact/2BNtygYUVDFkJmzBJnWBm1

**Next sessions, and the model for each (CLAUDE.md "Model use"):**

| Work | Model |
| --- | --- |
| Fixes from Saturday's test (the code freeze allows these only) | Opus 5.5; Sonnet 5.5 for a one-line wording fix |
| After the crossing: debrief (what worked, battery, signal) | Sonnet 5.5 |
| After the crossing: merge #25, then the rest of Sprint 2 | Opus 5.5 |
| MVP row 7, the app frame (built from `mvp.md`, lighter check) | Opus 5.5, held as a draft until after the crossing |
| Any new design doc plus `/egm:egm-review` (offline loading W16, promote details) | Fable 5.2 |

Every handoff names the model for the next step.

## Update: Nov 26, 2026, 1:45 AM


**After the crossing build, the same night (all merged, no app changes):**

| PR | What |
| --- | --- |
| #19 | This handoff: the steps to the crossing |
| #20 | Sprint 2 checked against testing (now "after the crossing", code freeze on the Live page, family page and tracker until then; a "Passed …" knock-on found); draft overdue-notice numbers in `docs/overdue-numbers.md` (D6, for RJ or his attorney to confirm) |
| #21 | **Guard:** `.claude/hooks/protect-live.sh` (a PreToolUse hook in `.claude/settings.json`) blocks any Claude session from changing the live `index.html` or `original/`. **`/pr-check`:** `.claude/commands/pr-check.md` and `.claude/pr-check/check.sh`. `docs/old-tracker-check.md` (Q2: likely a key mismatch or Google re-authorisation; a 5-minute check) |
| #22 | **GitHub Actions** (`.github/workflows/checks.yml`): on every pull request and every change to `main`, runs the 65 trip checks, loads every preview script, the 75 tracker checks and the `/pr-check` checks. Read-only, $0. First two runs green. |

*   **Crossing-day card** for RJ (private page, ticks saved on his phone):
    https://claude.ai/artifact/2BNtygYUVDFkJmzBJnWBm1
*   **For future sessions:** the guard will refuse edits to the live page and
    `original/`; that is intended. A shell command that only *mentions*
    those files is allowed; one that writes to them is not. Use `/pr-check`
    before every pull request; the Checks box on each pull request must be
    green before RJ merges.
*   **Still open for RJ:** set the real home port; iPad Messages to his own
    number; optional old-tracker check; optional call to confirm one Coast
    Guard number; Saturday's water test.

## Update: Nov 26, 2026, 12:20 AM

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

### Saturday Nov 28: the water test (SUPERSEDED: see the Nov 26 afternoon update)

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

RJ's tick-box version of these steps (private page, ticks saved on his phone):
https://claude.ai/artifact/2BNtygYUVDFkJmzBJnWBm1

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
