# AI Community Helper

A practice hackathon web app that turns a community problem into an AI-generated category, short analysis, and practical next steps.

## Features
- Responsive web interface and example problems
- Express API with input validation
- Local open-weight model inference through Ollama
- Clear errors when the model is unavailable

## Stack
HTML, CSS, JavaScript, Node.js, Express, Ollama, Gemma 4 E2B (configured model tag; verify with `ollama list`).

## Prerequisites
- Node.js 18+
- Ollama installed and running
- Compatible model pulled into Ollama

## Run locally
1. Install dependencies: `npm install`
2. If needed, pull the model: `ollama pull gemma4:e2b`
3. Start the server: `npm start`
4. Open http://localhost:5000

Optional environment variables are documented in `.env.example`.

## API
- `GET /api/health` — app status and configured model
- `POST /api/help` — JSON body, e.g. `{ "problem": "Streetlights are not working." }`

## Models and AI disclosure
- Default model tag: `gemma4:e2b`; verify its exact availability with `ollama list`.
- Inference: local Ollama at `127.0.0.1:11434`.
- AI assistant used during practice development: ChatGPT. Review, test, and understand generated code before presenting it.
- Model output may be incorrect; independently verify suggestions.

## Deployment limitation
This configuration expects Ollama on the same machine as the backend. A cloud host cannot access your laptop's `127.0.0.1` endpoint. For public deployment, configure an approved hosted open-weight inference endpoint and keep credentials in environment variables, or use the event's permitted local-demo approach and document it accurately.

## License
MIT
