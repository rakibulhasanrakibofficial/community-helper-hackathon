# AI Community Helper

## 1. Project Overview

AI Community Helper is a web application that helps users analyze community problems and generate practical action plans using an open-weight AI model.

Users describe an issue in their community and receive a suggested category, a short analysis, three actionable steps, and guidance on which authority or organization may be relevant.

This project was developed as a practice hackathon project.

## 2. Features

- Responsive web interface
- Example community problems for quick input
- AI-generated problem categorization and analysis
- Three practical action steps
- Guidance on relevant authorities or organizations to contact
- AI-generated community action plans via Ollama Cloud
- Voice-to-text input using browser Speech Recognition (English and Bengali selection)
- Text-to-voice playback using the browser's built-in Speech Synthesis API
- No ElevenLabs subscription or voice API key required
- Input validation and error handling

## 3. Technology Stack

**Frontend**
- HTML5
- CSS3
- JavaScript

**Backend**
- Node.js
- Express.js

**AI and voice**
- Ollama Cloud (configured model tag defaults to `gemma4:cloud`)
- Web Speech API for browser speech recognition and synthesis

**Version Control**
- Git
- GitHub

## 4. Templates and Starter Kits

No third-party application template or starter kit has been declared for this practice project. The application uses standard Node.js and Express dependencies.

Any additional template or starter-kit usage should be documented here if applicable.

## 5. Installation and Setup

### Prerequisites

- Node.js 18 or later
- npm
- An Ollama Cloud API key for the hosted AI endpoint
- A modern browser with Web Speech API support for voice features

### Clone the repository

```bash
git clone https://github.com/rakibulhasanrakibofficial/community-helper-hackathon.git
cd community-helper-hackathon
```

### Install dependencies

```bash
npm install
```

### Configure hosted AI

Set `OLLAMA_API_KEY` in your deployment provider's environment settings. Optionally set `OLLAMA_MODEL`; by default the server uses `gemma4:cloud`. Never commit the real API key or put it in frontend JavaScript.

Voice features use browser APIs and do not need a separate voice API key. Speech recognition support varies by browser. Use HTTPS in production and grant microphone permission when prompted.

### Run the application

```bash
npm start
```

Open the application at the port shown in your terminal, or `http://localhost:5000` when `PORT=5000` is configured.

Optional environment variables and their defaults are documented in `.env.example`.

## 6. API Endpoints

### `GET /api/health`

Returns the application's status and configured model information.

### `POST /api/help`

Accepts a JSON request containing a community problem and returns a JSON response containing the generated answer.

Example request:

```json
{
  "problem": "Streetlights in our area are not working."
}
```

The response is intended to include a category, brief analysis, action steps, and suggested contact guidance.

## 7. Models and AI Disclosure

### Open-weight model

- **Configured model tag:** `gemma4:e2b`
- **Model family:** Gemma
- **Model version and size:** Must be verified against the exact model installed in Ollama; not independently confirmed in this README.
- **Inference location:** Ollama Cloud, using the hosted API endpoint in `server.js`.
- **Purpose:** Generates suggested community-problem categories, analyses, action plans, and contact guidance.

Consult the model publisher's documentation for the exact model release, license, and applicable usage terms.

### Proprietary models

No proprietary model is configured as the application's core inference model in the current local setup.

### AI coding assistance

ChatGPT was used during practice development to assist with implementation and documentation. Generated code was reviewed and tested as part of the development process. The developer should understand and be able to explain the submitted code.

AI-generated suggestions may be incorrect, incomplete, or unsuitable for a particular location. Verify important recommendations independently. Do not treat generated contact guidance as verified official information.

## 8. Deployment

**Deployment status:** Pending verification.

The current configuration expects Ollama to run locally on the same machine as the backend. A publicly hosted backend cannot access the developer's computer through `127.0.0.1`.

For public deployment, the application must be configured to use a compatible hosted inference provider that supports the required open-weight model, or the permitted local-demo approach must be used and documented accurately.

The final public HTTPS deployment URL will be added here after deployment and testing:

`Deployment URL: Pending`

## 9. License

This project is licensed under the MIT License. See the `LICENSE` file in this repository.

## 10. Limitations

- AI-generated plans are suggestions and are not verified official advice.
- Voice input depends on browser speech recognition support and HTTPS/secure-context access.
- Browser text-to-speech voices and Bengali voice availability depend on the user's operating system and browser.
- Public deployment requires an `OLLAMA_API_KEY` environment variable for hosted inference.
- Model availability depends on the exact model tag and local environment.
