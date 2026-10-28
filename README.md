# Community Helper AI

Community Helper AI turns a resident's description of a local issue into a practical, safety-aware action plan using a Gemma model through Ollama Cloud.

## Features

- Responsive React interface with subtle entrance, hover, scroll-reveal, loading and result animations.
- Motion for React (Motion 3 animation API) for motion that supports prefers-reduced-motion styling.
- Community issue examples and clear, prioritized action steps.
- AI response summaries with safety advice and guidance for contacting the appropriate local authority.
- English and Bengali voice-to-text where the browser supports Speech Recognition.
- Browser-based text-to-speech playback, without a separate voice API key.
- Copy and print/save-as-PDF actions.
- Express endpoint validation and user-friendly error handling.

## Technology stack

**Frontend:** React, Vite, Motion for React, CSS.

**Backend:** Node.js, Express.

**AI and voice:** Ollama Cloud (default configured model tag: `gemma4:cloud`); browser Web Speech APIs for voice input/output.

**Version control:** Git and GitHub.

## Requirements

- Node.js 20.19+ (or a compatible newer Node.js release supported by Vite 7)
- npm
- An Ollama Cloud API key
- A modern browser; microphone input requires browser support and HTTPS or localhost

## Run locally

Clone the project and install dependencies:

```bash
git clone https://github.com/rakibulhasanrakibofficial/community-helper-hackathon.git
cd community-helper-hackathon
npm install
```

Create a `.env` file based on `.env.example` and set `OLLAMA_API_KEY`. You may optionally configure `OLLAMA_MODEL`; the backend defaults to `gemma4:cloud`. Never commit a real API key or place it in frontend code.

Start both the Express API and Vite development server:

```bash
npm run dev
```

Open the Vite URL displayed in the terminal (usually `http://localhost:5173`). Vite proxies `/api` requests to the Express server on port 3000.

For a production-like local run:

```bash
npm install
npm start
```

The start script builds the frontend and then serves the generated `dist` folder through Express. The listening port defaults to 3000; set `PORT` to override it.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `OLLAMA_API_KEY` | Yes for AI requests | Ollama Cloud API key. Store it only in server environment variables. |
| `OLLAMA_MODEL` | No | Model tag; defaults to `gemma4:cloud`. |
| `PORT` | No | Express listening port; defaults to `3000`. |

## API

### `GET /api/health`

Returns service status, provider and configured model metadata.

### `POST /api/help`

Accepts a JSON body with a community issue description (up to 2,000 characters) and returns the AI-generated answer.

Example request:

```json
{
  "problem": "Streetlights in our area are not working."
}
```

The frontend displays the response as a short overview, suggested actions, precautions, contact guidance and the full AI response. The display parser is a presentation aid, not a verified assessment engine.

## Deployment

Set the service's build/install step to install dependencies, and its start command to `npm start`. The start script creates `dist` before launching Express. Configure `OLLAMA_API_KEY` in the hosting provider's environment settings. Do not put that value into Vite-prefixed public variables or frontend files.

**Deployment status:** The live deployment URL has not been verified and is intentionally not claimed here.

## AI disclosure and limitations

- Plans are AI-generated suggestions; they are not official instructions, verified reports, live sensor readings or validated risk scores.
- Never assume an issue has been reported because the app generated a plan.
- Verify important details and official contact information locally.
- Contact local emergency services directly in an immediate-danger situation.
- Speech recognition and Bengali voice availability depend on the browser, operating system, installed voices and secure-context permissions.
- This project uses the hosted Ollama Cloud API, not a local Ollama instance on the developer's machine.

## License

MIT. See [LICENSE](LICENSE).
