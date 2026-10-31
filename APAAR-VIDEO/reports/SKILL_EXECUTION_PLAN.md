# Skill execution plan (what was asked, what was used)

| Requested | What was done | Substitution / limit |
|---|---|---|
| Lemo-Opuscar (motion graphics, animated text, transitions, painted mascot) | Used the library's **Living Screencast** style, rebuilt as a code-rendered page (`apaar-register/`): treatment, model sheet, actor/cursor/camera engine, chapter pills, brush wipes, spotlight, ×N tag, keystroke HUD, diegetic title and end card | Mascot made **hand-painted style**, which departs from the style's pixel-sprite rule at the user's request |
| Clawd | The user chose an **original** mascot instead of Clawd (Clawd is Anthropic's character; using it could imply endorsement) | Original painted admission slip |
| OneTake / HyperFrames | Their craft ideas (restrained motion, easing language, rhythm checks) were applied; no HyperFrames/OneTake code was used. Render is Lemo's deterministic frame-by-frame page capture | Not run as tools |
| NullMotion | Craft rules adopted earlier (pop easing, blur-to-crisp, press dip, ripple); no footage or code reused | Study only |
| Higgsfield / Katana / Gemini | Not usable (0 credits / absent / quota 0) | Everything is code-drawn |
| Chatterbox voice | 12 narration segments generated, checked with speech-to-text | — |
| Playwright recordings | Real interaction with the live app; used here as DOM snapshots plus MP4 clips in `recordings/` | Film redraws the DOM, so the picture is not a video of the screen |
| Remotion | An earlier Remotion cut exists in `remotion/` (real screen recordings); the Lemo rebuild is the final film | Two cuts exist; the Lemo one is the deliverable |

Rebuild: `LIB=<lemo-opuscar> sh apaar-register/build.sh` (needs the recorded DOM snapshots; see `scripts/recorder/record_all.py`).
