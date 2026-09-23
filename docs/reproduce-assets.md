# Reproduce presentation assets

These are **optional authoring tools**, separate from application setup. Running Remainder requires the Node setup in the README; it does not require Python, FFmpeg, Poppler, or the presentation runtime below. The finished PDFs, PowerPoint, images, and silent video are already committed.

## PDFs and the video evidence card

Use Python 3 with `reportlab`, `pypdf`, `Pillow`, and `lxml`. A separate environment keeps these tools out of the application:

```sh
python3 -m venv "$HOME/.venvs/remainder-assets"
source "$HOME/.venvs/remainder-assets/bin/activate"
python -m pip install reportlab pypdf Pillow lxml
python scripts/generate-brief.py
python scripts/render-video-proof.py
```

Typography comes from `assets/fonts`, without operating-system font paths. Noto Sans is covered by `assets/fonts/OFL.txt`; Noto Serif is covered by `assets/fonts/OFL-NotoSerif.txt`. `REMAINDER_FONT_DIR` optionally overrides this directory, but it must contain the same three filenames: `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`, and `NotoSerif-Regular.ttf`. Different font versions may change line wrapping; render and inspect after an override.

To recreate the fictional source PDFs and invoice PNG, also install **Poppler** so `pdftoppm` is on `PATH`, or set `REMAINDER_PDFTOPPM` to that executable:

```sh
python scripts/generate-samples.py
```

The source generator checks that each PDF's extracted text matches its canonical TXT after whitespace normalization and writes preview images to `.artifacts/samples/`. The brief generator checks one-page output and expected story values. Inspect every final rendered page after layout changes.

## PowerPoint

`scripts/generate-deliverables.mjs` uses the optional **Codex artifact runtime** and presentation validation helpers. They are not ordinary application dependencies and are not downloaded by `npm ci`. Set both paths explicitly on the authoring machine:

```sh
export REMAINDER_ARTIFACT_RUNTIME="/path/to/artifact-runtime/dependencies"
export REMAINDER_PRESENTATIONS_SKILL="/path/to/presentation-skill"
node scripts/generate-deliverables.mjs
```

The runtime directory must contain `node/bin/node`, `python/bin/python3`, and `node/node_modules/@oai/artifact-tool`. The presentation-helper directory must contain `container_tools/artifact_tool_utils.mjs` plus its package/layout validation scripts. Use a matching installed runtime/helper version. Missing settings fail immediately with a documentation pointer rather than guessing a particular user's installation path.

The deck uses the typeface names **Arial** and **Georgia**; install appropriately licensed copies on the rendering machine or inspect substitutions carefully. It retains editable shapes and a native chart. `scripts/link-deck-ctas.py` adds native PowerPoint hyperlinks; finalization checks package integrity, geometry, slide count, and the chart. Final previews appear in `.artifacts/remainder/`. Opening or editing the committed PPTX does not require this generation runtime.

## Video and screenshots

Install the repository's Node dependencies, Playwright Chromium (`npx playwright install chromium`), and `ffmpeg`/`ffprobe`. Start a stable local app with an isolated data directory and no provider keys for sample replay. Then:

```sh
python scripts/render-video-proof.py
REMAINDER_DEMO_URL=http://localhost:3210 node scripts/record-demo.mjs
```

The recorder performs real sample UI actions, captures screenshots, verifies the final balance, and renders a silent 170-second MP4. It overlays the separate validation card only when `.artifacts/video/live-proof.png` exists. The card is a statement of preserved integration evidence, not footage of a new request. Do not change it to imply unverified results. Rebuilding just the card does not alter the committed video. See [narration and editing](video-editing.md) before creating the final voiced version.

## Evidence pointers

[Hosted workflow and restore rehearsal](validation-deployment.md), [live AI and signed memory](validation-ai.md), and [six-case model evaluation](validation-model-eval.md) record what was actually checked. These are fictional validation inputs, not customers or commercial traction.
