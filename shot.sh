#!/bin/bash
# shot.sh <page.html> <scrollY> <out.png> [w] [h]
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W=${4:-1440}; H=${5:-900}
"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 --disable-gpu \
  --run-all-compositor-stages-before-draw --virtual-time-budget=8000 \
  --window-size=$W,$H --screenshot="$3" "http://localhost:8527/$1?cap=1&y=$2" >/dev/null 2>&1
