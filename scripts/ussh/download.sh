#!/bin/sh
# Shkarkon regjistrin publik të USSH — 1 kërkesë e vetme.
# Nëse në HTML gjendet link Excel/CSV, shkarkohet edhe ai (preferohet si burim).
DIR="$(dirname "$0")"
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

curl -sL -A "$UA" -o "$DIR/regjistri.html" "https://ussh.org.al/regjistri-i-stomatologeve/"
echo "HTML: $(wc -c < "$DIR/regjistri.html") bytes"

EXCEL_URL=$(grep -oiE 'href="[^"]*\.(xlsx?|csv)[^"]*"' "$DIR/regjistri.html" | head -1 | sed 's/href="//;s/"$//')
if [ -n "$EXCEL_URL" ]; then
  echo "Excel i gjetur: $EXCEL_URL"
  sleep 2
  curl -sL -A "$UA" -o "$DIR/regjistri.xlsx" "$EXCEL_URL"
  echo "Excel: $(wc -c < "$DIR/regjistri.xlsx") bytes"
else
  echo "Asnjë link Excel/CSV në HTML — do të përdoret tabela HTML"
fi
