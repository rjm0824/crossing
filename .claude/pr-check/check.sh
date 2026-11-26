#!/usr/bin/env bash
# Mechanical checks before a pull request (used by /pr-check). Read-only:
# changes nothing in the repo. Prints PASS/FAIL lines and exits 1 on any FAIL.
cd "$(git rev-parse --show-toplevel)" || exit 1
fail=0
pass(){ echo "PASS  $1"; }
bad(){ echo "FAIL  $1"; fail=1; }

git fetch -q origin main 2>/dev/null
base=$(git merge-base HEAD origin/main 2>/dev/null || echo origin/main)
changed=$( { git diff --name-only "$base"...HEAD; git diff --name-only; git ls-files --others --exclude-standard; } | sort -u | sed '/^$/d')
echo "Files changed against main:"; printf '  %s\n' $changed

# 1. Protected files untouched (the live page, the archive, the hand-deployed tracker).
if printf '%s\n' "$changed" | grep -Eq '^(index\.html|original/|tracker/Code\.gs)'; then
  bad "the live page, original/ or tracker/Code.gs changed (needs a promote PR or a hand redeploy)"
else pass "live page, original/ and tracker/Code.gs untouched"; fi

# 2. Secrets and wording in the added lines.
added=$( { git diff "$base"...HEAD; git diff; } | grep '^+' | grep -v '^+++')
if printf '%s' "$added" | grep -Eiq "(sk-[A-Za-z0-9]{20}|AKfycb|api[_-]?key[[:space:]]*[:=]|BEGIN (RSA|EC|OPENSSH) PRIVATE)"; then
  bad "something that looks like a key was added"; else pass "no keys added"; fi
if printf '%s' "$added" | grep -Eiq "invite[\"']?[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9-]{8,}"; then
  bad "something that looks like an invite code was added"; else pass "no invite codes added"; fi
if printf '%s' "$added" | grep -Ei '\bsafe(ly)?\b' | grep -vqi 'safe-area'; then
  bad "the word \"safe\" was added (house rule: no \"safe\" wording)"; else pass "no \"safe\" wording added"; fi
if printf '%s' "$added" | grep "no-cors" | grep -vq "never no-cors"; then
  bad "no-cors was added (requests must read the real answer)"; else pass "no no-cors"; fi

# 3. The "Planning aid" line on every app page in next/.
for f in next/index.html next/live.html next/family.html; do
  [ -f "$f" ] || continue
  if grep -q "Planning aid, not for navigation" "$f"; then pass "Planning aid line on $f"; else bad "Planning aid line missing on $f"; fi
done

# 4. Scripts load and the checks pass.
loadfail=0
for f in next/js/*.js; do node --check "$f" 2>/dev/null || { bad "$f does not load"; loadfail=1; }; done
[ $loadfail -eq 0 ] && pass "every next/js file loads"
if out=$(node --test next/test/trip.test.js 2>&1); then
  pass "trip checks: $(printf '%s' "$out" | grep -E '^# pass' | sed 's/# //')"
else bad "trip checks failed: $(printf '%s' "$out" | grep -E '^not ok' | head -5 | tr '\n' ' ')"; fi
if printf '%s\n' "$changed" | grep -q '^tracker-service/'; then
  if [ -d tracker-service/node_modules ]; then
    (cd tracker-service && npm test >/dev/null 2>&1) && pass "tracker-service checks" || bad "tracker-service checks failed"
  else echo "NOTE  tracker-service changed: run npm ci and npm test in tracker-service/"; fi
fi

# 5. Version tags: a changed next/js or next/css file should carry a new ?v= tag.
for f in $(printf '%s\n' "$changed" | grep -E '^next/(js|css)/'); do
  name=$(basename "$f")
  now=$(grep -hoE "${name}\?v=[0-9a-z]+" next/*.html 2>/dev/null | sort -u)
  before=$(for p in next/index.html next/live.html next/family.html next/trip-test.html; do git show "$base:$p" 2>/dev/null; done | grep -oE "${name}\?v=[0-9a-z]+" | sort -u)
  if [ -n "$now" ] && [ "$now" = "$before" ]; then
    bad "$f changed but its ?v= tag did not (phones may keep the old copy)"
  fi
done

if [ $fail -eq 0 ]; then echo "All mechanical checks passed."; else echo "Some checks FAILED (see above)."; fi
exit $fail
