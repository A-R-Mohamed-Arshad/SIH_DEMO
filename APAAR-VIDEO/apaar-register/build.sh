#!/bin/sh
# APAAR Student Register: a living screencast. Rebuilds the film from this folder.
#   LIB=<lemo-opuscar library>  sh build.sh [--voice]
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/root/lemo-opuscar}
export LIB
export HERE_DIR="$HERE"
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
cd "$LIB"
$PY "$HERE/build_screens.py"                                         # live DOM snapshots -> screens.json
if [ "$1" = "--voice" ]; then $PY "$HERE/../scripts/word_times.py" "$HERE/voices"; fi
node core/render/events.mjs "$HERE"                                  # every key, click, hop, wipe -> events.json
$PY "$HERE/sound.py"                                                 # score + foley + voice -> out/mix.wav
node core/render/video.mjs "$HERE" --fps 30 --workers 4 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/apaar-register.mp4" 30 0
$PY - <<'PYEOF'
import json, os
d = json.load(open(os.path.join(os.environ["HERE_DIR"], "events.json")))
subs = [{"t0": e["t"], "t1": e["t1"], "text": e["text"]} for e in d["ev"] if e["type"] == "sub"]
json.dump(subs, open(os.path.join(os.environ["HERE_DIR"], "out", "subs.json"), "w"))
PYEOF
$PY core/render/srt.py "$HERE/out/subs.json" "$HERE/apaar-register.srt"
echo "built $HERE/apaar-register.mp4"
