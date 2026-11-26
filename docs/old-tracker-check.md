# Why did the old Apps Script tracker stop? (Q2, checklist for RJ)

**Status:** not fixed, not urgent. The preview's new tracker (Cloudflare) is
what the crossing uses. This is only worth 5 minutes if you want the old one
back as a spare. Nothing here changes anything until you act on it.

What happened (Nov 25): two test points, sent with the captain key pasted from
Keeper, never reached the "Track" tab of the Crossing Tracker sheet.

## Why the page could not tell you

The old page sends with `mode: 'no-cors'`, so it never sees the tracker's
answer. `tracker/Code.gs` answers `{ ok: false }` and adds nothing when
anything is wrong, and the page still said "Sent". (The new tracker reads
every answer; that is why the new Live page says "Received" only when true.)

## The likely causes, most likely first

1.  **The captain key does not match exactly.** `doPost` compares the key
    character for character with the `KEY` Script Property. The page trims
    spaces from what you type, but a space or new line saved *in the Script
    Property* (easy when pasting from Keeper) would make every point fail
    silently.
2.  **Google needs you to re-authorise the script.** Apps Script web apps
    "Execute as: Me" stop answering when Google asks the owner to approve
    access again (after a password change, a security review, or a change
    in your Google Workspace's settings). The web app then returns a Google
    sign-in page instead of running.
3.  **The web app address changed, or "Who has access" is no longer
    "Anyone".** The page posts to the deployment ending `…6al4hg/exec`. A
    "New deployment" (rather than a new version of the same one) makes a new
    address; a Workspace policy can also stop "Anyone" access.
4.  **The `KEY` property is missing** (deleted or renamed): every point
    fails the same way as 1.

## The 5-minute check (on your Mac)

1.  Open the **Crossing Tracker** sheet › **Extensions** › **Apps Script**.
2.  Left side, the **clock icon (Executions)**. Look at Nov 25 around the time
    you sent the test points:
    *   **No `doPost` runs at all** → the request never reached the script:
        cause 2 or 3. Go to step 4.
    *   **`doPost` runs marked Completed** but no new rows → the script ran
        and refused the point: cause 1 or 4. Go to step 3.
    *   **`doPost` runs marked Failed** → open one and read the error (often
        "Authorization is required": cause 2). Go to step 4.
3.  **Gear icon (Project Settings)** › **Script Properties**: check `KEY`
    exists. Click edit, select all the value, and re-type it from Keeper by
    hand (no paste), with no space at either end. Save.
4.  **Deploy** › **Manage deployments**: check the active deployment's URL
    ends `…6al4hg/exec` and "Who has access" says **Anyone**. Then **pencil**
    › **Version: New version** › **Deploy**. If Google asks you to authorise,
    approve it (it is your own script).
5.  Test: open the Plan page with `#captain`, type the key, tap **Send test
    point**, and look for a new row in the **Track** tab within a minute.
    Then delete that row.

Tell Claude what step 2 showed; it can then say which cause it was and what
to change, if anything, in `tracker/Code.gs`.

## Do you need it at all?

For this crossing, no: the preview's Live page and family link replace it,
and the no-code fallback (your text plus Find My) stays in place. The old
tracking code is removed from the Plan page in Sprint 2, item 1. Fixing the
old tracker only matters if you want a second, separate tracker running on
the crossing (it would need the old Plan page open with `#captain` on a
second device, since one page cannot run both).
