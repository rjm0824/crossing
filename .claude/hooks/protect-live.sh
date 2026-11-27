#!/usr/bin/env bash
# Guard (approved by RJ, Nov 19): Claude may not change the live page or the
# archived first version. Blocks Edit/Write/NotebookEdit on index.html at the
# repo root or anything under original/, and shell commands that write to
# them. Changes to the live page go through a "promote" pull request that RJ
# approves; a person can still edit these files by hand.
#
# Crossing freeze (RJ, Nov 27): next/ is what the helm iPad runs for the
# crossing home (Nov 29 to 30), so it is protected too. New work goes in beta/.
# To lift the freeze after the crossing (RJ's call), change the next line to
# FREEZE_NEXT=0 in a pull request.
FREEZE_NEXT=1
# Exit 2 = block (the message goes back to Claude). Exit 0 = allow.
input=$(cat)
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
root="${root%/}"

if command -v jq >/dev/null 2>&1; then
  tool=$(printf '%s' "$input" | jq -r '.tool_name // empty')
  path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
  cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
else
  # No jq (some Macs): read the fields with sed.
  tool=$(printf '%s' "$input" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  path=$(printf '%s' "$input" | sed -n 's/.*"\(file_path\|notebook_path\)"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\2/p')
  cmd=$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')
fi

block() {
  echo "Blocked by the crossing repo guard: $1 is protected (the live page, the archived first version in original/, or next/ while it is frozen for the crossing). Work in beta/ instead; the live page changes only through a promote pull request RJ approves, and next/ only after RJ lifts the freeze. Do not try another way round this." >&2
  exit 2
}

# Protected paths as a word: index.html at the root (not next/index.html),
# original/..., and next/... while frozen.
NAMES='index\.html|original/'
[ "$FREEZE_NEXT" = "1" ] && NAMES="$NAMES|next/"
P='(^|[[:space:]"'"'"'=(])(\./|'"$root"'/)?('"$NAMES"')'

case "$tool" in
  Edit|Write|MultiEdit|NotebookEdit)
    p="$path"
    case "$p" in /*) ;; *) p="$root/$p" ;; esac
    p="${p//\/.\//\/}"
    [ "$p" = "$root/index.html" ] && block "index.html"
    case "$p" in "$root/original/"*) block "original/" ;; esac
    if [ "$FREEZE_NEXT" = "1" ]; then case "$p" in "$root/next/"*) block "next/" ;; esac; fi
    ;;
  *)
    [ -z "$cmd" ] && exit 0
    # Redirected straight into a protected path: > index.html, >> ./original/x
    if printf '%s' "$cmd" | grep -Eq '>>?[[:space:]]*["'"'"']?(\./|'"$root"'/)?('"$NAMES"')'; then
      block "index.html, original/ or next/"
    fi
    # Each simple command on its own (split at ; & | and new lines): does it start
    # with a writing command and name a protected path?
    printf '%s\n' "$cmd" | tr ';&|' '\n\n\n' | while IFS= read -r seg; do
      s="${seg#"${seg%%[![:space:]]*}"}"          # trim leading spaces
      s="${s#sudo }"; s="${s#env }"
      if { printf '%s' "$s" | grep -Eq '^(sed[[:space:]].*-i|perl[[:space:]].*-i|tee|mv|rm|cp|truncate|patch|dd|ln|chmod|install|rsync|git[[:space:]]+(mv|rm|checkout|restore|apply))([[:space:]]|$)' \
           || printf '%s' "$s" | grep -Eq '^(python3?|node|ruby)[[:space:]].*(open\(.*["'"'"'][wa]|writeFile|File\.write)'; } \
         && printf '%s' "$s" | grep -Eq "$P"; then
        exit 3
      fi
    done
    [ $? -eq 3 ] && block "index.html, original/ or next/"
    ;;
esac
exit 0
