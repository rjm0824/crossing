---
description: Check the current branch before a pull request (screenshots, secrets, wording, checks) and draft the PR description
---

Get the current branch ready for a pull request RJ can test. Follow CLAUDE.md. Change nothing in the app; this is a check and a draft.

1. **Mechanical checks.** Run `.claude/pr-check/check.sh` and show its PASS/FAIL lines. If anything fails, stop, explain it in plain words and propose the fix; do not open a pull request.

2. **Screenshots.** Serve the repo root (`python3 -m http.server 8788`) and use Playwright to screenshot every page in `next/` that the branch changed, at phone size (390 x 844, deviceScaleFactor 2) and iPad size (820 x 1180, deviceScaleFactor 1), with a touch device profile for any new tap or drag control. Check there is no sideways scroll and no page error. Map tiles and Leaflet from cdnjs may be blocked in a cloud workspace: route Leaflet to a local copy and say the map background is grey only for that reason. Send RJ the screenshots.

3. **Device reminder.** List what could not be tested here (real iPhone or iPad, real GPS, real signal, share screen, calendar), and any new touch control that needs his thumb.

4. **Draft the pull request description** in plain English, following CLAUDE.md: what changed, how RJ tests it in about 5 minutes (exact links and taps), what could not be tested, how to undo. Write it to the scratchpad and send it to RJ. **Do not open the pull request** until RJ says so.
