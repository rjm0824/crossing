# Tracker service (preview copy)

The small program on Cloudflare that receives a boat's positions during a trip
and hands them to whoever opens that trip's family link. Full design:
`docs/designs/tracker-service.md`.

*   **What runs:** one Cloudflare Worker named `crossing-tracker-preview` and
    one D1 database named `crossing-preview`, both on the free plan ($0).
*   **What runs on its own:** a clean-up once a day at 08:00 UTC (3 or 4 AM
    Eastern). It deletes trips 7 days after they end, trips never ended 30 days
    after their last update, and old daily counters. No cost.
*   **The one secret:** `INVITE_CODE`, set in the Cloudflare dashboard and kept
    in Keeper. It is never in this folder, the page or chat.
*   **Publishing:** merging a pull request that changes this folder publishes
    it to the preview copy automatically (once step 3 below is done).

Planning aid, not a navigation or rescue tool. It shows the last position a
device sent and cannot call for help.

## RJ's steps (one time, about 15 minutes)

Done already: the free Cloudflare account and the `crossing-preview` database.

1.  **Connect the repo.** Cloudflare dashboard → Workers & Pages → Create →
    Import a repository → `rjm0824/crossing`. Settings:
    *   Project name: `crossing-tracker-preview` (exactly)
    *   Root directory: `tracker-service`
    *   Deploy command: `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`
    *   Build watch paths: include `tracker-service/*`
2.  **Add the invite code.** Worker → Settings → Variables and Secrets → Add →
    type **Secret**, name `INVITE_CODE`, value: a code of at least 12
    characters (Keeper can generate one). Save it in Keeper first.
3.  **Copy the address.** Worker → Settings → Domains & Routes → the address
    ending in `workers.dev`.
4.  **Test it.** Open
    `https://rjm0824.github.io/crossing/next/tracker-test.html`, paste the
    address and the invite code, tap **Run all checks**. All 10 should pass.

**If step 1's publish fails on the database change:** open the
`crossing-preview` database → Console, paste the contents of
`migrations/0001_init.sql`, run it, change the deploy command to
`npx wrangler deploy`, and retry the deploy.

## Everyday tasks

**Change the invite code** (for example if it leaks): Worker → Settings →
Variables and Secrets → `INVITE_CODE` → Edit → new code → Save. Update Keeper.
Trips already running keep working; friends need the new code to start trips.

**See how busy it is:** Worker → Metrics shows requests per day and processing
time. The free plan allows 100,000 requests a day; at friends scale expect
25,000 to 63,000 on a busy day. The database page shows rows read and written.

**Change the daily trip cap or how often family pages ask:** these are
`DAILY_TRIP_CAP` and `POLL_SECONDS` in `wrangler.jsonc`. Change them by pull
request, not in the dashboard (the next publish would undo a dashboard edit).

**Delete one trip by hand** (someone emails a family link and asks): the family
key is the part of the link after `#`. On the Mac, in Terminal:

```bash
printf '%s' 'PASTE-FAMILY-KEY-HERE' | shasum -a 256
```

Copy the long code it prints (before the dash). Then in the dashboard, open the
`crossing-preview` database → Console and run, with that code in both places:

```sql
DELETE FROM items WHERE trip_id IN (SELECT id FROM trips WHERE family_key_hash = 'PASTE-CODE');
DELETE FROM trips WHERE family_key_hash = 'PASTE-CODE';
```

The trip is gone at once, and from Cloudflare's backups within 7 days.

## Undo everything

1.  Cloudflare dashboard: delete the Worker `crossing-tracker-preview`, then
    the database `crossing-preview`.
2.  GitHub: revert the pull request that added this folder.

Nothing in the live page or the Apps Script tracker depends on this service.

## For build sessions

*   Tests: `npm install`, then `npm test` (rules and keys).
*   Local run: create `.dev.vars` (never committed) with `INVITE_CODE`,
    `ALLOWED_ORIGINS=https://rjm0824.github.io,http://localhost:8788`,
    `DAILY_TRIP_CAP=3`, `DEBUG_META=1`. Then
    `npx wrangler d1 migrations apply DB --local` and
    `npx wrangler dev --test-scheduled`.
*   End-to-end: `TRACKER_URL=http://localhost:8787 INVITE_CODE=… node test/local-check.mjs`.
*   Test page locally: `python3 -m http.server 8788` from the repo root, then
    `http://localhost:8788/next/tracker-test.html`.
*   Database changes go in a new numbered file in `migrations/`, written so the
    previously published program still works with them.
