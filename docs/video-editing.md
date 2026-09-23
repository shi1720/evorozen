# Finish the Remainder demo video

The prepared master is **`deliverables/remainder-walkthrough-silent.mp4`**, exactly **2 minutes 50 seconds**, 1920×1080, H.264, with no audio track. It is actual Chromium footage of the working sample case, with editorial title/caption cards. The recording preserves the fictional sample labels. Its separate live-integration card summarizes two verified Gemini tests; it does not pretend the sample replay invoked the provider.

The public product is [remainder-apex.onrender.com](https://remainder-apex.onrender.com). The existing 170-second master remains accurate and does not need rerecording merely to add the URL; use the video description or a small final-frame link.

The remaining human contribution is Shivam's voice. Read [the supplied narration](video-script.md) in a quiet room, then place it over this master. The script credits Shivam and makes no invented customer or supplier claims. At approximately 350 words, a calm 130–140 words per minute leaves room for the visual pauses. Record once for practice and once cleanly; avoid speeding speech up to fit.

## Editing sequence

1. Import the silent MP4 into any video editor. Keep the project at 1920×1080 and the master at its original speed.
2. Record the verbatim narration, keeping the opening story over the title and early app views. Start within the first second. Use the cues below; natural phrasing matters more than hitting every second exactly.
3. Split the voice track at paragraph boundaries and align each section. Remove accidental long pauses or repeat a paragraph if necessary. Avoid cutting off a sentence at 2:50.
4. The card at 2:08 explicitly separates the real Gemini checks from sample footage. Keep the provider wording in the current script. If replacing this card with footage of a fresh successful request, name the actual provider and keep its provenance visible without keys or private account details.
5. Keep the final title from 2:42 to 2:50. The event allows at most three minutes, including all credits. There is ten seconds of margin, but do not add a long logo animation or extra introduction.
6. Export an H.264 MP4 with AAC audio. Watch it completely with headphones and verify that text is readable, the voice is audible, the ending is complete, and the duration remains below 3:00.
7. Put [the live app](https://remainder-apex.onrender.com) and [public repository](https://github.com/shi1720/evorozen) in the video description. Upload to the selected public or unlisted video host. Test its link in a signed-out window. Add the verified URL to Devpost and the submission file. This repository's silent MP4 is a prepared asset, not a claim that a final narrated video has been uploaded.

## Actual master timeline

| Time | What the recording shows | Narration emphasis |
| --- | --- | --- |
| 0:00–0:08 | Title: “We'll credit you.” But how much? | Cafe delivery and missing stock. |
| 0:08–0:25 | Landing page, isolated sample overview | Introduce Shivam, Remainder, and the fictional case. |
| 0:25–0:51 | Case, invoice quotation, receiving-note quotation | Explain the document comparison. |
| 0:51–1:09 | Shortage findings and explicit selection | $144 + $72 = $216; owner reviews the evidence. |
| 1:09–1:23 | Confirmation and claim draft | Review and prepare the supplier request. |
| 1:23–1:32 | Actual PDF and email-draft downloads | Owner controls what is sent. The PDF download itself is real; this master does not open a separate PDF viewer. |
| 1:32–1:51 | Add CN-208, match and inspect its evidence | Credit covers only $144. |
| 1:51–2:08 | Verification and the updated case balance | $72 remains. Credit-note verification is distinct from applied credit or cash. |
| 2:08–2:24 | Separate Gemini validation card | Two live synthetic checks passed; sponsor inference was unavailable. |
| 2:24–2:33 | First-customer validation plan | Independent operators and hospitality bookkeepers. |
| 2:33–2:42 | $29 pricing hypothesis and finite allowance | Measure request and support costs before expanding. |
| 2:42–2:50 | Remainder closing title | State the goal and close with Shivam's name. |

## Simple audio merge

If the recorded narration already matches the master timing, place it at `deliverables/shivam-voiceover.wav`. Confirm it is no longer than 170 seconds before using the following command; it intentionally fixes the final duration at 170 seconds. Otherwise align it in an editor first rather than truncating speech.

```sh
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 deliverables/shivam-voiceover.wav
ffmpeg -i deliverables/remainder-walkthrough-silent.mp4 -i deliverables/shivam-voiceover.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -af apad -t 170 -movflags +faststart deliverables/remainder-demo-final.mp4
```

No artificial narration or impersonation has been added. Keep raw recordings private until Shivam approves the final video.

## Reproduce or update the master

The capture script requires the repository's Playwright Chromium and `ffmpeg`. Start a stable local server with an isolated data directory; leave provider keys empty because the replay should not spend provider quota. Then run:

```sh
python3 scripts/render-video-proof.py
REMAINDER_DEMO_URL=http://localhost:3210 node scripts/record-demo.mjs
```

The proof-card renderer uses Pillow and the supplied local font paths; adjust those paths on another machine. The recorder makes a fresh isolated demo workspace, performs actual UI actions, verifies final integer totals, captures screenshots, and renders the master. It applies `live-proof.png` only if the card exists. Update that card only from verified evidence. The current capture used a separate stable server on port 3214 so concurrent development did not interrupt the recording.

The sample source PDFs are under `public/samples`; their wording matches the canonical TXT files. The actual claim PDF downloaded during this recording is `deliverables/sample-claim-evidence.pdf`.
