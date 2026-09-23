# Client quality review, September 23, 2026

Scope: the landing page, authenticated workspace, account flows, document intake, claims, responsive layout, and recovery from common browser failures. This review used a separate local PGlite database on port 3222. It did not use customer records or consume live model requests.

## Findings corrected

| Finding | Correction |
| --- | --- |
| A failed replacement upload changed the document name before extraction completed, leaving old evidence under a new name. | File name and evidence text are replaced together only after successful extraction. Inputs stay disabled during extraction. |
| Downloading an edited but unsaved claim silently exported the older saved wording. | An explicit unsaved-state notice appears. Claim downloads and the export menu require saving first. A discard action restores saved wording. |
| Expired sessions left users in a workspace that could no longer load data. | The server's unauthenticated response returns the user to login with a clear message. Successful login restores the requested workspace path. Incorrect account-deletion passwords do not trigger this behavior. |
| An initial session-check outage looked like a logout. | The app preserves the distinction between an unavailable server and an unauthenticated session, with an explicit retry action. |
| Changing the API resource could briefly show the previous resource's data. | Data is scoped to the request path and aborted requests cannot replace the current result. |
| Small-phone landing copy was clipped by the decorative illustration's grid width. | The responsive grid can shrink correctly, headings adapt, and the illustration stays contained. The narrow footer wraps. |
| A screen-reader-only table heading expanded the dashboard's document width at phone and tablet sizes. | The scroll container establishes the positioning context. Tables scroll inside their cards instead of expanding the page. |
| Mobile navigation did not contain keyboard focus or support Escape. | Opening the menu moves focus inside, cycles its focusable links, prevents background scrolling, and returns focus when closed. Closed navigation is hidden from keyboard focus. |
| Calendar-only follow-up dates moved to the previous day west of UTC. | Calendar dates are rendered as local calendar dates. An America/Los_Angeles browser regression checks September 30 remains September 30. |
| Unknown case-tab URLs showed an empty content region. | Unknown values display Findings. Arrow keys, Home, and End navigate the case tabs. |
| Empty document searches looked like an unused workspace. | The empty state now identifies a search with no matches. List and settings failures provide a retry action. |
| Provider privacy copy incorrectly assumed every deployment used unpaid Gemini. | The notice follows the configured provider and keeps the unpaid-Gemini conditions explicitly conditional. No unverified OpenAI retention or training claim is made. |
| Deliberate reanalysis reused a cached response when the evidence was unchanged. | Existing analyses now explicitly request a fresh pass, with clear AI-request usage copy and an accurately labeled demo replay. First analysis remains unforced. |
| Completing password recovery left the recovery-key screen visible after navigating to login. | Auth screens are keyed by mode, so the login form mounts fresh. The browser regression completes recovery, logs in with the new password, and deletes its test account. |
| Client copy contained em dashes. | All em dashes were removed from client source copy. |

Additional refinements include blocking dismissal of forms while their mutations are pending, showing clipboard-copy failures beside recovery keys, distinguishing unavailable provider status from an unconfigured provider, and rejecting unexpected non-JSON API responses as recoverable errors.

## Verification

- All 15 Playwright browser tests passed. Nine new regression scenarios complement the six existing end-to-end, PDF-upload, deletion, and accessibility checks.
- TypeScript type checking and formatting checks passed.
- Landing, dashboard, case detail, and settings were inspected at 320, 390, 768, 1024, and 1440 pixels: 20 page/viewport combinations.
- All 20 combinations stayed inside the page viewport. Wide tables retain their own horizontal scroll areas.
- Axe WCAG 2 A/AA checks reported no violations on dashboard, case detail, and settings at both 320 and 768 pixels. Existing desktop and mobile checks also passed. This is automated coverage, not an accessibility certification.
- The responsive browser pass recorded no JavaScript page errors.
- Screenshots are available locally under `output/screenshots/client-review/` and are intentionally excluded from Git.

The live hosted deployment is verified separately after publication. These local checks do not establish broad AI accuracy, guaranteed uptime, or actual customer traction.
