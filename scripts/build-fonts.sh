#!/usr/bin/env bash
# Build the self-hosted WOFF2 subset from design-kit/fonts/README.md.
#
# The kit ships the recipe, not the binaries. This reproduces it exactly:
# the same three OFL families, the same unicode range, the same layout
# features. Output lands in public/fonts/ and is committed, so a normal
# build never needs to run this.
#
#   ./scripts/build-fonts.sh
#
# Requires python3. Everything else is fetched into a temp dir.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/fonts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Exactly the range in design-kit/fonts/README.md.
UNICODES="U+0000-00FF,U+2013-2014,U+2018-201D,U+2026,U+00A0"
FEATURES="kern,liga,tnum"
GF="https://raw.githubusercontent.com/google/fonts/main/ofl"

echo "==> python env"
python3 -m venv "$TMP/venv"
"$TMP/venv/bin/pip" install --quiet fonttools brotli
PY="$TMP/venv/bin/python"
SUBSET="$TMP/venv/bin/pyftsubset"

echo "==> fetching sources"
curl -sSLf -o "$TMP/BigShouldersDisplay.ttf" "$GF/bigshouldersdisplay/BigShouldersDisplay%5Bwght%5D.ttf"
curl -sSLf -o "$TMP/IBMPlexSans-var.ttf"     "$GF/ibmplexsans/IBMPlexSans%5Bwdth%2Cwght%5D.ttf"
curl -sSLf -o "$TMP/IBMPlexMono-Regular.ttf" "$GF/ibmplexmono/IBMPlexMono-Regular.ttf"
curl -sSLf -o "$TMP/IBMPlexMono-Medium.ttf"  "$GF/ibmplexmono/IBMPlexMono-Medium.ttf"
curl -sSLf -o "$TMP/OFL.txt"                 "$GF/ibmplexmono/OFL.txt"

# Plex Sans ships as a wdth+wght variable font upstream. The kit names three
# static weights, so pin wdth to normal and instance 400/500/600 out of it.
echo "==> instancing IBM Plex Sans statics"
for w in 400 500 600; do
  "$TMP/venv/bin/fonttools" varLib.instancer \
    "$TMP/IBMPlexSans-var.ttf" "wght=$w" "wdth=100" \
    -o "$TMP/IBMPlexSans-$w.ttf" >/dev/null
done

mkdir -p "$OUT"

sub() { # sub <in.ttf> <out.woff2> [extra flags...]
  local in="$1" out="$2"; shift 2
  "$SUBSET" "$in" \
    --unicodes="$UNICODES" \
    --layout-features="$FEATURES" \
    --flavor=woff2 --output-file="$OUT/$out" "$@"
}

echo "==> subsetting"
# Variable display axis 400..900 is kept — the kit declares font-weight: 400 900.
sub "$TMP/BigShouldersDisplay.ttf" big-shoulders-display-var.woff2
for w in 400 500 600; do sub "$TMP/IBMPlexSans-$w.ttf" "ibm-plex-sans-$w.woff2"; done
sub "$TMP/IBMPlexMono-Regular.ttf" ibm-plex-mono-400.woff2
sub "$TMP/IBMPlexMono-Medium.ttf"  ibm-plex-mono-500.woff2
cp "$TMP/OFL.txt" "$OUT/OFL.txt"

echo "==> built"
ls -l "$OUT" | awk 'NR>1 {printf "  %-38s %6.1f KB\n", $9, $5/1024}'
echo "  ------------------------------------------------"
printf "  %-38s %6.1f KB\n" "total (woff2 only)" \
  "$(cat "$OUT"/*.woff2 | wc -c | awk '{print $1/1024}')"
