# Final narrated video verification

The [final demo](../deliverables/remainder-demo-final.mp4) is **170.88 seconds**, 1920 × 1080, H.264 video with 48 kHz AAC narration. It contains 44 caption cues in a dedicated lower strip, with separate [SRT](../deliverables/remainder-demo.srt) and [WebVTT](../deliverables/remainder-demo.vtt) files. The previous silent replay master is preserved separately.

## Actual recorded workflow

A disposable normal account used fictional Northstar source records on the production app build running locally. Account setup occurred off camera. The recording performed two actual OpenAI requests using configured model `gpt-5.4-mini`:

| Stage | Live trace | Observed result |
| --- | --- | --- |
| Initial evidence analysis | `req_0b8cdfb8d40e46daa1bd7f2777e44f85` | Two supported shortages totaling USD 216.00 |
| Added credit-note analysis | `req_336bd4e6e9084538beee0f545e22be05` | One matched USD 144.00 credit note |
| Owner verification | Application transaction | USD 216.00 claimed, USD 144.00 verified, USD 72.00 remaining; status `partial` |

The owner selection and approval controls were exercised. PDF and email exports downloaded successfully. The decoded follow-up email acknowledged the credit and requested USD 72.00. No supplier email was sent. No uncaught page errors occurred in the successful capture. Password-confirmed account deletion returned HTTP 200 afterward.

An earlier capture passed initial analysis but failed the expected-credit assertion. Its script did not preserve the credit response before account cleanup, so that cause is unconfirmed. The instrumented fresh-account run above retained its response and passed. This is evidence of a successful integration workflow, not a claim of perfect provider reliability. The final film uses this successful run.

[Sanitized machine-readable evidence](validation/video-workflow.json).

## Presentation and audio checks

All 16 representative scene frames were visually inspected after final rendering. The title, source documents, live provider label, both shortages, approval, credit, remainder, exported follow-up excerpt, commercial plan, and closing URL appear in the intended order. Captions sit outside the application image rather than covering its controls.

Narration uses OpenAI's stock `cedar` voice with `gpt-4o-mini-tts`. The film discloses the AI-generated presenter voice on the title and closing cards and throughout the caption strip. It does not impersonate Shivam Gupta. Speech was not accelerated. Word-level transcription supplied caption timings; approved script spelling corrects automatic transcription of names and minor recognizer errors.

Measured final integrated loudness is **-16.7 LUFS**, loudness range **3.1 LU**, and true peak **-1.4 dBFS**. The full video and audio decode completed without errors. Speech transcription matches the intended narrative and key amounts. Captured screens and recorded actions include holds for explanation; this is an edited walkthrough, not a latency benchmark.

## Final file identity

- File: `deliverables/remainder-demo-final.mp4`
- Size: **9,282,913 bytes**
- Duration: **170.880 seconds**
- SHA-256: `d338d465f4c7b18252ac9375451ba96e8ad8ecddc488413b9eb69c1350f9caf1`

Local verification does not establish YouTube publication. Preserve the actual public watch URL and verify signed-out playback after uploading this exact file. Firebase hosting verification is a separate deployment check.
