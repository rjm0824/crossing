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
# next/ is frozen for the crossing (RJ, Nov 27) while the guard's FREEZE_NEXT=1.
if grep -q '^FREEZE_NEXT=1' .claude/hooks/protect-live.sh; then
  if printf '%s\n' "$changed" | grep -q '^next/'; then
    bad "next/ changed while it is frozen for the crossing (new work goes in beta/)"
  else pass "next/ untouched (frozen for the crossing)"; fi
fi

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

# 3. The "Planning aid" line on every app page in next/ and beta/.
for f in next/index.html next/live.html next/family.html beta/index.html beta/live.html beta/family.html; do
  [ -f "$f" ] || continue
  if grep -q "Planning aid, not for navigation" "$f"; then pass "Planning aid line on $f"; else bad "Planning aid line missing on $f"; fi
done

# 4. Scripts load and the checks pass (next/ and beta/).
for d in next beta; do
  [ -d "$d" ] || continue
  loadfail=0
  for f in $d/js/*.js; do node --check "$f" 2>/dev/null || { bad "$f does not load"; loadfail=1; }; done
  [ $loadfail -eq 0 ] && pass "every $d/js file loads"
  if out=$(node --test $d/test/trip.test.js 2>&1); then
    pass "$d trip checks: $(printf '%s' "$out" | grep -E '^# pass' | sed 's/# //')"
  else bad "$d trip checks failed: $(printf '%s' "$out" | grep -E '^not ok' | head -5 | tr '\n' ' ')"; fi
done
# Beta keeps its own saved data: no code line in beta/ may name cx:next: (comments are fine).
if [ -d beta ] && grep -rn "cx:next:" beta --include=*.js --include=*.html | grep -vE '^[^:]+:[0-9]+:[[:space:]]*(//|<!--|\*)' | grep -q .; then
  bad "beta/ code names cx:next: (beta must save under cx:beta: only)"
elif [ -d beta ]; then pass "beta/ saves under its own names (no cx:next: in code)"; fi
if printf '%s\n' "$changed" | grep -q '^tracker-service/'; then
  if [ -d tracker-service/node_modules ]; then
    (cd tracker-service && npm test >/dev/null 2>&1) && pass "tracker-service checks" || bad "tracker-service checks failed"
  else echo "NOTE  tracker-service changed: run npm ci and npm test in tracker-service/"; fi
fi

# 4b. Beta's saved copy for no signal (row 17): every beta page, script and
# style is listed in beta/sw.js, and any change to beta bumps its VERSION so
# phones replace the whole saved copy instead of mixing old and new files.
if [ -f beta/sw.js ]; then
  missing=""
  for f in $(cd beta && ls *.html js/*.js css/*.css); do
    case "$f" in family.html|tracker-test.html|trip-test.html|js/family.js) continue;; esac  # the followers' page and test pages are left alone
    grep -q "'$f'" beta/sw.js || missing="$missing $f"
  done
  if [ -n "$missing" ]; then bad "beta/sw.js does not list:$missing (add them so beta opens with no signal)"; else pass "beta/sw.js lists every beta page, script and style"; fi
  if printf '%s\n' "$changed" | grep -E '^beta/' | grep -vq '^beta/sw\.js$'; then
    nowv=$(grep -o "^var VERSION = '[^']*'" beta/sw.js); oldv=$(git show "$base:beta/sw.js" 2>/dev/null | grep -o "^var VERSION = '[^']*'")
    if [ -n "$oldv" ] && [ "$nowv" = "$oldv" ]; then bad "beta/ changed but VERSION in beta/sw.js did not (phones would keep a mixed saved copy)"; else pass "beta/sw.js VERSION is new for this change"; fi
  fi
fi

# 5. Version tags: a changed next/ or beta/ js or css file should carry a new ?v= tag.
for f in $(printf '%s\n' "$changed" | grep -E '^(next|beta)/(js|css)/'); do
  name=$(basename "$f"); d=${f%%/*}
  now=$(grep -hoE "${name}\?v=[0-9a-z]+" $d/*.html 2>/dev/null | sort -u)
  before=$(for p in $d/*.html; do git show "$base:$p" 2>/dev/null; done | grep -oE "${name}\?v=[0-9a-z]+" | sort -u)
  if [ -n "$now" ] && [ "$now" = "$before" ]; then
    bad "$f changed but its ?v= tag did not (phones may keep the old copy)"
  fi
done

if [ $fail -eq 0 ]; then echo "All mechanical checks passed."; else echo "Some checks FAILED (see above)."; fi
exit $fail
