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
- Streaming AI responses
- Input validation and error handling
- Local inference through Ollama

## 3. Technology Stack

**Frontend**
- HTML5
- CSS3
- JavaScript

**Backend**
- Node.js
- Express.js

**AI**
- Ollama
- Configured model tag: `gemma4:e2b`

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
- Ollama
- The configured model available in Ollama

### Clone the repository

```bash
git clone https://github.com/rakibulhasanrakibofficial/community-helper-hackathon.git
cd community-helper-hackathon
```

### Install dependencies

```bash
npm install
```

### Prepare the model

Make sure Ollama is installed and running. If the configured model is available in your Ollama installation, download it with:

```bash
ollama pull gemma4:e2b
```

Verify installed models:

```bash
ollama list
```

The exact model version and availability should be verified in the local environment.

### Run the application

```bash
npm start
```

Open the application at:

http://localhost:5000

Optional environment variables and their defaults are documented in `.env.example`.

## 6. API Endpoints

### `GET /api/health`

Returns the application's status and configured model information.

### `POST /api/help`

Accepts a JSON request containing a community problem and streams the AI-generated response as plain text.

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
- **Inference location:** Local Ollama instance by default, at `http://127.0.0.1:11434`.
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

- The default AI configuration requires a running local Ollama instance.
- AI-generated plans are suggestions and are not verified official advice.
- Public deployment requires a compatible inference setup.
- Model availability depends on the exact model tag and local environment.
