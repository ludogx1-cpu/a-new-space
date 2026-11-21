#!/usr/bin/env bash
# Fill in your real domain and AdSense publisher ID across the whole site.
#
#   ./scripts/configure.sh https://yourdomain.com ca-pub-1234567890123456
#
# The publisher ID is optional: run it with just the domain first, then
# again with the ID once AdSense gives you one. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/../public"

DOMAIN="${1:-}"; PUB="${2:-}"
if [[ -z "$DOMAIN" || ! "$DOMAIN" =~ ^https?:// ]]; then
  echo "Usage: $0 https://yourdomain.com [ca-pub-XXXXXXXXXXXXXXXX]" >&2; exit 1
fi
DOMAIN="${DOMAIN%/}"
STATE=../.site-config
OLD_DOMAIN="https://example.com"; OLD_PUB="ca-pub-XXXXXXXXXXXXXXXX"
[[ -f "$STATE" ]] && source "$STATE"

FILES=$(grep -rlF -e "$OLD_DOMAIN" -e "${OLD_PUB#ca-}" --include='*.html' --include='*.xml' --include='*.txt' --include='*.js' . || true)

for f in $FILES; do
  sed -i.bak "s#${OLD_DOMAIN}#${DOMAIN}#g" "$f"
  if [[ -n "$PUB" ]]; then
    [[ "$PUB" =~ ^ca-pub-[0-9]{16}$ ]] || { echo "Publisher ID should look like ca-pub-1234567890123456" >&2; exit 1; }
    sed -i.bak "s#${OLD_PUB}#${PUB}#g; s#${OLD_PUB#ca-}#${PUB#ca-}#g" "$f"
  fi
  rm -f "$f.bak"
done

echo "OLD_DOMAIN=\"$DOMAIN\"" > "$STATE"
echo "OLD_PUB=\"${PUB:-$OLD_PUB}\"" >> "$STATE"
echo "Done. Domain: $DOMAIN  Publisher: ${PUB:-$OLD_PUB (unchanged)}"
echo "Ad slot IDs, GA4 ID, tip-jar link and contact email live in public/assets/site.js."
