# VoiceStudio integration

Community Helper keeps its browser-based microphone input and browser read-aloud. When a local VoiceStudio service and compatible installed models are ready, the app can also send an AI response for speech generation or an uploaded audio file for transcription. VoiceStudio calls are proxied by the Community Helper backend.

## Local setup

1. Install and start VoiceStudio on the same computer as the Community Helper backend.
2. Install Community Helper dependencies with `npm ci`.
3. Copy `.env.example` to `.env` and set `VOICESTUDIO_URL=http://127.0.0.1:3900` if VoiceStudio uses another local port. The URL must use plain HTTP and `127.0.0.1`, `localhost`, or `::1`.
4. In VoiceStudio, install a TTS model and an ASR model supported by the active engines. Review their size and license information in VoiceStudio first. Community Helper never installs or downloads models.
5. Start the built app with `npm start`, or run `npm run build` and `npm run dev` for development. The existing Vite development proxy targets port 3000; when `.env` sets another `PORT`, set it to 3000 while using `npm run dev`.
6. Open the VoiceStudio section. It checks VoiceStudio health, API capabilities, active engines, and the installed model catalog. Speech and transcription controls stay disabled until their matching active model is present and marked installed.

## Secure Render deployment (remote VoiceStudio)

A deployed Community Helper instance cannot reach VoiceStudio on a user's PC via `127.0.0.1`. For remote use, keep VoiceStudio bound to localhost and create an outbound Cloudflare Tunnel from the PC. Protect its hostname with a Cloudflare Access self-hosted application and a **Service Auth** policy that requires a Cloudflare Access service token. Do not open VoiceStudio's port directly to the public internet.

Configure these values in Render's Environment settings (never commit actual secrets):

- `VOICESTUDIO_URL=https://voice.example.com` — replace with the exact HTTPS tunnel hostname.
- `VOICESTUDIO_ALLOWED_HOST=voice.example.com` — hostname only, without scheme or path.
- `VOICESTUDIO_ACCESS_CLIENT_ID` — Cloudflare Access service-token client ID.
- `VOICESTUDIO_ACCESS_CLIENT_SECRET` — Cloudflare Access service-token secret.

The backend only accepts the exact allowlisted HTTPS hostname when both Access credentials are configured, and sends the credentials only in server-to-server requests. Local loopback HTTP remains supported for local development. Never put the service token in frontend code or expose it in logs or screenshots. After configuring the tunnel and Render variables, verify status, TTS and transcription; do not merge until the CI tests/build and an end-to-end check pass.

## Implemented endpoints

| Community Helper route | VoiceStudio request | Request/response |
| --- | --- | --- |
| `GET /api/voicestudio/status` | `GET /health`, `/.well-known/voicestudio-speech`, `/engines/tts`, `/engines/asr`, `/models`, `/openapi.json`, and `/v1/models` | Reports service connection and independent TTS/STT readiness. A ready flag requires a healthy service, an available active engine, the documented compatible endpoint/model alias, and the active model row marked installed and complete. |
| `POST /api/voicestudio/speech` | `POST /v1/audio/speech` | JSON `{ "model": "tts-1", "input": "…", "voice": "alloy", "response_format": "wav", "speed": 1 }`; VoiceStudio returns WAV bytes. Input is limited to 4,096 characters. |
| `POST /api/voicestudio/transcribe` | `POST /v1/audio/transcriptions` | Multipart field `audio` on Community Helper; backend forwards it as VoiceStudio’s required `file` field with `model=whisper-1` and `response_format=json`. Community Helper returns `{ "text": "…" }`. |

The transcription upload accepts WAV, MP3, M4A, MP4, AAC, OGG/OGA, FLAC, and WebM files up to 20 MB. The backend uses in-memory upload storage, request timeouts, rejects redirects, and refuses non-loopback or non-HTTP service URLs. It does not forward credentials or expose the VoiceStudio URL to the browser.

The result card keeps the browser **Listen** button and adds a separate **VoiceStudio audio** control. Generated audio plays in a browser audio player. The VoiceStudio section includes an audio upload control and an option to copy a reviewed transcript into the problem field.

## Limits and privacy

- TTS and transcription depend on VoiceStudio’s active engine and installed model. A service responding to `/health` alone is not enough to enable either feature.
- The active model’s license may restrict commercial use or require other terms. Check the model’s license and VoiceStudio’s license information before using generated or transcribed content. Community Helper does not make license eligibility decisions.
- Voice cloning, dubbing, translation, phone calls, and other advanced VoiceStudio workflows are not integrated into Community Helper.
- Audio and text are sent to the local VoiceStudio service through the backend. Do not expose this local bridge as an unauthenticated public service.
- A deployed Community Helper server cannot reach VoiceStudio on an end user’s computer through its own `localhost`. Remote access needs a separately designed authenticated and encrypted connection.
- VoiceStudio’s AGPL-3.0 project license remains separate from this integration; this project does not copy VoiceStudio source files. Review the license before redistributing or tightly combining components.
