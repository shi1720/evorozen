# Remainder: final video and reproduction

## Final files

- [Final narrated and captioned MP4](../deliverables/remainder-demo-final.mp4): 1920 × 1080, H.264 video, AAC narration, maximum three-minute requirement met.
- [SRT captions](../deliverables/remainder-demo.srt) and [WebVTT captions](../deliverables/remainder-demo.vtt).
- [Verbatim script](video-script.md).
- [YouTube title and description](youtube.md).

The previous [silent master](../deliverables/remainder-walkthrough-silent.mp4) is retained as an earlier artifact. It uses sample replay and is not the new film.

## Editorial boundaries

The new film uses fictional Northstar evidence in a normal account with actual OpenAI requests. Setup occurs off camera to keep login credentials and recovery keys out of the recording. Screenshots and recorded actions are held for narration. No result is fabricated, and no sample replay is described as a new model response. The film is edited for explanation, not a provider latency benchmark.

The narration is an AI-generated stock presenter voice. It does not say "I'm Shivam" or imitate a real person. Shivam Gupta receives the builder credit. The disclosure remains visible in the caption area. No music masks the speech.

Captions occupy a dedicated 120-pixel lower strip, outside the application image. Approved wording is aligned to independently transcribed word timestamps. Names and small recognizer errors are corrected to match the narration script. The closing address is written as `remainder-desk.web.app`.

## Reproduce the optional media

These are artifact-generation tools, not part of the application's build or deployment. Install ffmpeg and Python with Pillow, and use the repository's Node dependencies and Playwright Chromium. Keep a valid `OPENAI_API_KEY` in the ignored local `.env`; never put it in a command argument or a client environment variable.

1. Run `node scripts/narrate-demo.mjs --generate`. This explicitly spends speech API quota and caches matching generated segments locally. The script refuses to assemble narration above 176 seconds.
2. Run `node scripts/narrate-demo.mjs --transcribe`. This explicitly spends transcription quota and preserves word timestamps locally.
3. Start an isolated application on port 3224 with a persistent local test database, `AI_PROVIDER=openai`, `OPENAI_MODEL=gpt-5.4-mini`, and fallbacks and optional memory disabled. Use `ALLOW_LOCAL_DATABASE=1` if running a production build locally. Never point this recording setup at production data.
4. Run `node scripts/record-live-demo.mjs`. It creates a disposable normal account, prepares fictional source records, films two live analyses, verifies the final amounts, downloads exports, and deletes the account. Provider requests consume quota. `--fast-debug` captures the same real steps without narration holds for diagnosis.
5. Run `python3 scripts/render-narrated-demo.py` using a Python installation with Pillow. It reads the verified recording, narration, and timestamp files and assembles the MP4 plus SRT/VTT captions. It refuses a failed workflow capture.
6. Verify full decode, audio levels, representative frames, beginning and ending, captions, and playback after any edit. Upload the completed SRT to YouTube in addition to the visible captions.

Generated working files, audio segments, exports, and sanitized workflow evidence are in `.artifacts/live-video`, which is ignored by Git. No authentication credentials or recovery keys are written into those artifacts.

## Release check

The publishing owner must verify that the final Firebase app link and public YouTube watch page load in a signed-out browser. Local render success does not establish public publication. Confirm the real upload result before adding a YouTube URL to Devpost.
