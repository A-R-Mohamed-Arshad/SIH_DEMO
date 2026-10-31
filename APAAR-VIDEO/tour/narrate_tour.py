#!/usr/bin/env python3
"""Chatterbox narration for the detailed demo: one WAV per segment, generated sentence by sentence (cleaner delivery,
no truncation on long text), joined with short natural pauses. Also writes sentence offsets so captions sync exactly.

  /home/user/cbx/bin/python APAAR-VIDEO/tour/narrate_tour.py [all|<ids>]
Outputs: tour/voice/<id>.wav, tour/voice/timing.json  ({id: {duration, sentences: [{text, start, end}]}})
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import torch
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

HERE = Path(__file__).resolve().parent
SCRIPT = json.loads((HERE / "script.json").read_text())
OUT = HERE / "voice"

# Spoken forms (captions keep the written forms). Same pronunciations as the earlier film.
SAY = [
    (r"\bAPAAR\b", "Ah-paar"), (r"\bAICTE\b", "A I C T E"), (r"\bS-I-H two six two six three\b", "S I H, two six two six three"),
    (r"\bFastAPI\b", "Fast A P I"), (r"\bPostgreSQL\b", "Postgres Q L"), (r"\bCSV\b", "C S V"), (r"\bAPI\b", "A P I"),
    (r"\bR015\b", "R zero fifteen"), (r"\bQR\b", "Q R"), (r"\bAISHE\b", "Aishe"), (r"\bMBA\b", "M B A"), (r"\bKaveri\b", "Kaa-vay-ree"), (r"\bproblem statement\b", "problem, statement"),
]
GAP = 0.16          # pause between sentences, seconds


def spoken(text: str) -> str:
    for pat, rep in SAY:
        text = re.sub(pat, rep, text)
    return text


def sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.?!:])\s+(?=[A-Z])", text.strip())
    return [p for p in parts if p]


def trim(wav: torch.Tensor, sr: int, thr: float = 0.01) -> torch.Tensor:
    x = wav[0].abs()
    idx = (x > thr).nonzero()
    if len(idx) == 0:
        return wav
    a = max(0, int(idx[0]) - int(0.03 * sr)); b = min(wav.shape[-1], int(idx[-1]) + int(0.08 * sr))
    return wav[:, a:b]


def main():
    torch.set_num_threads(int(os.environ.get("THREADS", "4")))
    which = sys.argv[1:] or ["all"]
    model = ChatterboxTTS.from_pretrained(device="cpu")
    kw = dict(exaggeration=0.5, cfg_weight=0.4, temperature=0.7)   # a little brighter and quicker than the first film
    OUT.mkdir(exist_ok=True)
    tpath = OUT / os.environ.get("TIMING_FILE", "timing.json")
    timing = json.loads(tpath.read_text()) if tpath.exists() else {}
    for seg in SCRIPT:
        if which != ["all"] and seg["id"] not in which:
            continue
        if which == ["all"] and seg["id"] in timing and (OUT / f"{seg['id']}.wav").exists():
            continue                                    # resume
        parts, sents, t = [], [], 0.0
        for i, s in enumerate(sentences(seg["text"])):
            torch.manual_seed(int(os.environ.get("SEED", "26263")) + i)
            w = trim(model.generate(spoken(s), **kw), model.sr)
            d = w.shape[-1] / model.sr
            sents.append({"text": s, "start": round(t, 3), "end": round(t + d, 3)})
            parts += [w, torch.zeros(1, int(GAP * model.sr))]
            t += d + GAP
        wav = torch.cat(parts[:-1], dim=1)
        ta.save(str(OUT / f"{seg['id']}.wav"), wav, model.sr)
        timing[seg["id"]] = {"duration": round(wav.shape[-1] / model.sr, 3), "sentences": sents}
        tpath.write_text(json.dumps(timing, indent=1))
        print(f"{seg['id']:22} {timing[seg['id']]['duration']:6.2f}s  {len(sents)} sentences", flush=True)
    print("TTS_DONE", flush=True)


if __name__ == "__main__":
    main()
