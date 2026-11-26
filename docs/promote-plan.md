# Promote plan: moving the preview to the live page

**Status:** plan only, written Nov 26, 2026. Nothing here is started. Promote
is the pull request that makes `rjm0824.github.io/crossing/` show what
`/crossing/next/` shows today. It happens once, with RJ's approval, after the
conditions below are met. Planning aid, not for navigation.

## When (the gate)

All of these, in this order:

1.  **The crossing home works on the preview** (about Nov 29 to 30): tracking
    from the helm iPad, the family link, and the end at the home port. This is
    the "one real trip on the water" `mvp.md` asks for.
2.  **The rest of the MVP is merged to the preview** (`mvp.md` Build Order
    rows 7 to 16), or RJ decides to promote the crossing part first and the
    rest later (see "Option: promote in two steps").
3.  **Loading with no signal** (row 17, W16).
4.  **Joey has seen the wording:** "Planning aid, not for navigation", the
    overdue notice, the family text, and the terms behind the safety tick box.
5.  **Emergency numbers confirmed** (`docs/overdue-numbers.md`) and added to
    the overdue notice and the family text.
6.  **Data licences** for anything shown to people outside RJ's family still
    fine for a free app (Open-Meteo free tier is non-commercial; map tiles and
    radar to check before selling, per CLAUDE.md).

## What the promote pull request does

| Step | What changes | Why |
| --- | --- | --- |
| 1 | A **live copy of the tracker service** is created on Cloudflare (a second Worker and database from the same `tracker-service` folder, with its own invite code, kept in Keeper). RJ does this in the dashboard, guided, about 15 minutes; the steps follow `tracker-service/README.md`. | Live trips never share a database with test trips. |
| 2 | `next/js/tracker-api.js`: the live page talks to the live tracker; `/next/` keeps the preview tracker. | Testing on the preview never touches live trips. |
| 3 | Saved-data names: `cx:next:` on the preview, `cx:live:` on the live page (`next/js/queue.js`, `boot.js`). | Both pages share one saved-data area on a phone; this keeps a test trip and a real trip apart. |
| 4 | The preview's pages, scripts and styles are copied to the root (`index.html`, `live.html`, `family.html`, `js/`, `css/`), without the PREVIEW banner. | This is the promote itself. |
| 5 | The old tracker is retired: the Plan page's old tracking code is already gone (Sprint 2, item 1); `tracker/Code.gs` stays in the repo for history; RJ archives the Apps Script deployment and the Crossing Tracker sheet. | One tracker, no confusion. |
| 6 | `privacy.html`: "preview version" wording becomes the live wording. | The statement matches what the live page does. |
| 7 | `next/tracker-test.html` and `next/trip-test.html` stay on the preview only. | Test pages are not part of the live app. |

**The guard:** `.claude/hooks/protect-live.sh` blocks Claude from writing the
live `index.html`. For the promote pull request, RJ switches it off for that
one session (delete the `hooks` block in `.claude/settings.json` on the
promote branch, or make the root-page changes himself) and switches it back
on in the same pull request. The check `/pr-check` and the automatic checks
will show the live page changed; that is expected for promote only.

## How RJ tests it (about 20 minutes, on the iPhone and helm iPad)

1.  Before merging, on the promote branch: the preview still works
    (practice run), and the automatic checks are green.
2.  After merging: open `rjm0824.github.io/crossing/` on the iPhone. No
    PREVIEW banner; the Plan page loads with today's forecast.
3.  Start a practice run on the iPad from the live page, send the family link
    to yourself, watch it to "✓ RJ is home!" (or "has arrived"), then delete
    the trip. It should appear only in the live tracker.
4.  Open `/crossing/next/` and start a practice run there too: it should not
    see the live trip, and the live page should not see it.
5.  Home Screen icon: open the Crossing icon on the iPhone and check it shows
    the new page. If it still shows the old one, close it from the app
    switcher and open it again.

## How to undo

*   Revert the promote pull request: the live page goes back to today's page
    within a minute or two. The live tracker copy stays on Cloudflare (free)
    until RJ deletes it.
*   The old Apps Script tracker is archived, not deleted, so it can be
    switched back on if needed.

## Option: promote in two steps

If friends' setups (rows 7 to 16) take weeks, RJ could promote the crossing
part first: the Live page, the family page and the live tracker, linked from
today's live Plan page. That gets the working tracker onto the live address
sooner. The cost is a second promote later and a little extra work to keep
the two Plan pages in step. Recommendation: decide after the crossing, based
on how long rows 7 to 16 look.

## Cost

$0. A second free Cloudflare Worker and database; nothing new runs on its
own except the live copy's own daily clean-up (free).
