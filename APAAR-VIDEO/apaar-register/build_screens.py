"""recordings/dom/*.html (live DOM snapshots of the real app, taken by the recorder) -> screens.json."""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
DOM = HERE.parent / "recordings" / "dom"
out = {}
for f in sorted(DOM.glob("*.html")):
    h = f.read_text()
    m = re.match(r"<!-- (\S*) scrollY=(\d+) -->\n", h)
    hash_, scroll = (m.group(1), int(m.group(2))) if m else ("", 0)
    body = h[m.end():] if m else h
    body = re.sub(r"\s(?:autofocus|aria-live)=\"[^\"]*\"", "", body)
    url = "apaar-student-register.vercel.app/" + re.sub(r"[0-9a-f]{8}-[0-9a-f-]{27,}", "…", hash_)
    out[f.stem] = {"html": body, "scroll": scroll, "url": url}
(HERE / "screens.json").write_text(json.dumps(out))
print(len(out), "screens,", round((HERE / "screens.json").stat().st_size / 1e6, 1), "MB")
