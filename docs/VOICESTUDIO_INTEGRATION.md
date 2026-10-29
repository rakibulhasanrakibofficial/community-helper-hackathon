# VoiceStudio integration

Community Helper keeps its existing browser Web Speech API voice input and read-aloud. This initial bridge adds a server-side health check and a workspace link for an independently installed VoiceStudio service.

## Local setup
1. Install and start VoiceStudio on the same computer as Community Helper.
2. Copy `.env.example` to `.env` and set `VOICESTUDIO_URL=http://127.0.0.1:3900` if needed.
3. Start Community Helper and open the VoiceStudio section. The status indicator checks `GET /health`.
4. Use **Open VoiceStudio** to access its dedicated interface and features.

## Important limits
- This is a local integration bridge, not a full in-app reimplementation of VoiceStudio’s workflows yet.
- A deployed Community Helper server cannot reach VoiceStudio running on a user’s own computer through its own `localhost`. Remote access requires a deliberately secured deployment, authentication, and encrypted transport.
- Models are not downloaded automatically. Review model size, license, and commercial-use terms before installing or using one.
- VoiceStudio is licensed under AGPL-3.0. This project does not copy VoiceStudio source files; review its license before redistributing or tightly combining components.
- The health check only permits loopback HTTP URLs and is not an arbitrary URL proxy.
