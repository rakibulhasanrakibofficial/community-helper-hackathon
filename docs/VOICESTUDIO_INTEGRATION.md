# VoiceStudio integration

Community Helper now includes an initial in-app integration for a VoiceStudio backend running on the **same computer as the Community Helper Node server**. The UI supports narration of the latest AI action plan and transcription of an uploaded audio file.

## Local setup

1. Start the existing VoiceStudio installation. Its default backend URL is `http://127.0.0.1:3900`.
2. Confirm `GET /health` and `GET /openapi.json` work in the browser.
3. Set `VOICESTUDIO_URL=http://127.0.0.1:3900` in the Community Helper server environment if needed.
4. Install the Community Helper project dependencies if needed, then start the frontend and server using the existing project scripts.
5. Generate an action plan and use **VoiceStudio TTS** to generate audio. In the VoiceStudio section, select an audio file up to 20 MB and choose **Transcribe audio** to display its transcript.

## Backend routes

- `GET /api/voicestudio/status` checks VoiceStudio health and queries its OpenAPI, speech-capability, engine, and model endpoints when available. API support and installed-model readiness are reported separately.
- `POST /api/voicestudio/speech` accepts JSON `{ "input": "..." }` and proxies it to the OpenAI-compatible `POST /v1/audio/speech` endpoint with `model=tts-1`, `voice=alloy`, and WAV output.
- `POST /api/voicestudio/transcribe` accepts raw audio bytes (up to 20 MB) and forwards them as multipart data to `POST /v1/audio/transcriptions` using `model=whisper-1`.
- Both routes return errors if VoiceStudio or the relevant endpoint/model is unavailable. Models are never installed or downloaded automatically.
- Existing browser speech input and browser read-aloud remain available independently.

## Limitations and security

- The bridge only allows loopback HTTP addresses and is not a general URL proxy.
- VoiceStudio must run on the same computer/network namespace as the Community Helper server. A remote Render deployment's localhost is the Render machine, not the user's PC.
- Actual API support and model readiness depend on the running VoiceStudio version and installed models. The live `/openapi.json` is authoritative.
- This phase does not integrate cloning, voice design, dubbing, live streaming, or call workflows inside Community Helper.
- Review each model's license, voice-input permissions, and output rights before commercial use.
- VoiceStudio is licensed under AGPL-3.0. This project calls its HTTP API and does not copy VoiceStudio source code; review licensing before redistributing or tightly combining components.
