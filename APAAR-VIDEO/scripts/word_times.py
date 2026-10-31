"""Whisper word timestamps for each narration segment -> voices/words.json ({id: [[word, start, end], ...]}), times relative to the segment."""
import json, sys
from pathlib import Path
from faster_whisper import WhisperModel
V = Path(sys.argv[1])
model = WhisperModel("base.en", device="cpu", compute_type="int8")
out = {}
for l in json.loads((V / "lines.json").read_text()):
    segs, _ = model.transcribe(str(V / f"{l['id']}.wav"), word_timestamps=True, language="en")
    out[l["id"]] = [[w.word.strip(), round(w.start, 3), round(w.end, 3)] for s in segs for w in s.words]
    print(l["id"], len(out[l["id"]]), "words", flush=True)
(V / "words.json").write_text(json.dumps(out))
