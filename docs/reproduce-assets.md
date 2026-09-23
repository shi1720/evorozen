# Reproduce presentation assets

These are **optional authoring tools**, separate from application setup. Running Remainder requires the Node setup in the README; it does not require Python, FFmpeg, Poppler, or the presentation runtime below. The current submission assets are `deliverables/remainder-brief.pdf`, `deliverables/remainder-pitch.pptx`, and the narrated, captioned `deliverables/remainder-demo-final.mp4`.

## Current PDF brief

Use Python 3 with `reportlab`, `pypdf`, `Pillow`, and `lxml`. A separate environment keeps these tools out of the application:

```sh
python3 -m venv "$HOME/.venvs/remainder-assets"
source "$HOME/.venvs/remainder-assets/bin/activate"
python -m pip install reportlab pypdf Pillow lxml
python scripts/generate-brief.py
```

Typography comes from `assets/fonts`, without operating-system font paths. Noto Sans is covered by `assets/fonts/OFL.txt`; Noto Serif is covered by `assets/fonts/OFL-NotoSerif.txt`. `REMAINDER_FONT_DIR` optionally overrides this directory, but it must contain the same three filenames: `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`, and `NotoSerif-Regular.ttf`. Different font versions may change line wrapping; render and inspect after an override.

To recreate the fictional source PDFs and invoice PNG, also install **Poppler** so `pdftoppm` is on `PATH`, or set `REMAINDER_PDFTOPPM` to that executable:

```sh
python scripts/generate-samples.py
```

The source generator checks that each PDF's extracted text matches its canonical TXT after whitespace normalization and writes preview images to `.artifacts/samples/`. The brief generator checks one-page output, story values, the current OpenAI model, and the Firebase address `remainder-desk.web.app`. Inspect every final rendered page after layout changes.

## PowerPoint

`scripts/generate-deliverables.mjs` uses the optional **Codex artifact runtime** and presentation validation helpers. They are not ordinary application dependencies and are not downloaded by `npm ci`. Set both paths explicitly on the authoring machine:

```sh
export REMAINDER_ARTIFACT_RUNTIME="/path/to/artifact-runtime/dependencies"
export REMAINDER_PRESENTATIONS_SKILL="/path/to/presentation-skill"
node scripts/generate-deliverables.mjs
```

The runtime directory must contain `node/bin/node`, `python/bin/python3`, and `node/node_modules/@oai/artifact-tool`. The presentation-helper directory must contain `container_tools/artifact_tool_utils.mjs` plus its package/layout validation scripts. Use a matching installed runtime/helper version. Missing settings fail immediately with a documentation pointer rather than guessing a particular user's installation path.

The deck uses the typeface names **Arial** and **Georgia**; install appropriately licensed copies on the rendering machine or inspect substitutions carefully. It retains editable shapes and a native chart. `scripts/link-deck-ctas.py` adds native PowerPoint hyperlinks; finalization checks package integrity, geometry, slide count, and the chart. Final previews appear in `.artifacts/remainder/`. Opening or editing the committed PPTX does not require this generation runtime.

## Current narrated film and captions

Follow [the narration and editing runbook](video-editing.md) to reproduce the current film with `scripts/narrate-demo.mjs` and `scripts/record-live-demo.mjs`. The runbook covers explicit speech and transcription requests, an isolated normal-account recording, two real OpenAI analyses, caption alignment, and final render verification. The resulting MP4 is `deliverables/remainder-demo-final.mp4`; matching SRT and WebVTT files are alongside it. Keep the API key in the ignored local environment and follow the script's bounded request controls.

The film uses fictional documents and actual model requests: first a $216 reviewed claim, then a $144 credit note, leaving $72 open. Optional signed Evorozen memory has separate verification evidence and is disabled during this recording. The film credits Shivam Gupta and discloses its synthetic presenter voice. [Video validation](validation-video.md) records the final media and workflow checks.

## Historical silent video and screenshots

`scripts/record-demo.mjs` and `scripts/render-video-proof.py` are retained to reproduce the **earlier silent sample-replay artifact**, `deliverables/remainder-walkthrough-silent.mp4`. Their Render/Gemini evidence card reflects that historical recording. These scripts do not create the current narrated submission film and must not be used to describe its AI requests or deployment.

Install the repository's Node dependencies, Playwright Chromium (`npx playwright install chromium`), and `ffmpeg`/`ffprobe`. Start a stable local app with an isolated data directory and no provider keys for sample replay. Then:

```sh
python scripts/render-video-proof.py
REMAINDER_DEMO_URL=http://localhost:3210 node scripts/record-demo.mjs
```

The historical recorder performs sample UI actions, captures screenshots, verifies the final balance, and renders a silent 170-second MP4. It overlays the separate historical validation card only when `.artifacts/video/live-proof.png` exists. The card is preserved integration evidence, not footage of a new request. Rebuilding the card does not alter the existing video.

## Evidence pointers

[Firebase hosted workflow](validation/firebase-browser-workflow.json), [live AI and signed memory](validation-ai.md), [six-case OpenAI model evaluation](validation/model-eval-openai-results.json), [the current video](validation-video.md), and [scheduled backup and restore evidence](validation/scheduled-backup-restore.json) record what was actually checked. These are fictional validation inputs, not customers or commercial traction. The earlier [Render workflow and restore rehearsal](validation-deployment.md) remains historical evidence.
