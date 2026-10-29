require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const HelpRequest = require("./models/HelpRequest");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OLLAMA_MODEL || "gemma4:cloud";
const OLLAMA_URL = "https://ollama.com/api/chat";

// Prefer the Vite production bundle when it exists, while keeping the legacy
// public page available as a fallback during migration or local debugging.
const distPath = path.join(__dirname, "dist");
const publicPath = path.join(__dirname, "public");
const frontendPath = fs.existsSync(path.join(distPath, "index.html"))
  ? distPath
  : publicPath;

app.disable("x-powered-by");
app.use(express.json({ limit: "30kb" }));
app.use(express.static(frontendPath));


function getVoiceStudioBase(res) {
  const configured = process.env.VOICESTUDIO_URL || "http://127.0.0.1:3900";
  let base;
  try {
    base = new URL(configured);
  } catch {
    res.status(503).json({ error: "VoiceStudio URL is invalid." });
    return null;
  }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(base.hostname) || base.protocol !== "http:" || base.username || base.password) {
    res.status(503).json({ error: "Only a local HTTP VoiceStudio service is supported by this bridge." });
    return null;
  }
  base.pathname = "/";
  base.search = "";
  base.hash = "";
  return base;
}

async function fetchVoiceStudio(base, route, options = {}) {
  const { timeoutMs = 7000, ...fetchOptions } = options;
  return fetch(new URL(route, base), { ...fetchOptions, signal: AbortSignal.timeout(timeoutMs) });
}

async function readVoiceStudioJson(base, route) {
  try {
    const response = await fetchVoiceStudio(base, route, { timeoutMs: 3500 });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function hasInstalledModel(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  if (value.installed === true && value.available !== false) return true;
  return Object.values(value).some(item => hasInstalledModel(item, seen));
}

app.get("/api/voicestudio/status", async (_req, res) => {
  const base = getVoiceStudioBase(res);
  if (!base) return;
  try {
    const healthResponse = await fetchVoiceStudio(base, "/health", { timeoutMs: 2500 });
    if (!healthResponse.ok) return res.json({ connected: false, message: "VoiceStudio health check failed." });
    const health = await healthResponse.json();
    if (!(health.status === "ok" || health.ok === true)) {
      return res.json({ connected: false, message: "VoiceStudio returned an unexpected health status." });
    }

    const [openapi, capabilities, ttsEngines, asrEngines, apiModels, catalogModels] = await Promise.all([
      readVoiceStudioJson(base, "/openapi.json"),
      readVoiceStudioJson(base, "/v1/audio/capabilities"),
      readVoiceStudioJson(base, "/engines/tts"),
      readVoiceStudioJson(base, "/engines/asr"),
      readVoiceStudioJson(base, "/v1/models"),
      readVoiceStudioJson(base, "/models")
    ]);
    const paths = openapi?.paths || {};
    const capabilityFlags = capabilities?.capabilities || capabilities?.speech || capabilities || {};
    const ttsAvailable = Boolean(paths["/v1/audio/speech"]?.post || capabilityFlags.tts || capabilityFlags.text_to_speech);
    const transcriptionAvailable = Boolean(paths["/v1/audio/transcriptions"]?.post || capabilityFlags.transcription || capabilityFlags.asr || capabilityFlags.speech_to_text);
    return res.json({
      connected: true,
      version: typeof health.version === "string" ? health.version : "",
      device: typeof health.device === "string" ? health.device : "",
      ttsAvailable,
      transcriptionAvailable,
      ttsReady: hasInstalledModel(ttsEngines) || hasInstalledModel(catalogModels),
      asrReady: hasInstalledModel(asrEngines) || hasInstalledModel(catalogModels),
      message: "VoiceStudio is reachable. API support is discovered from the live schema where possible; installed-model readiness can vary by engine."
    });
  } catch {
    return res.json({ connected: false, message: "VoiceStudio is not reachable on this device." });
  }
});

app.post("/api/voicestudio/speech", async (req, res) => {
  const input = req.body?.input;
  if (typeof input !== "string" || !input.trim()) {
    return res.status(400).json({ error: "Provide text to synthesize." });
  }
  if (input.length > 12000) {
    return res.status(413).json({ error: "Text is too long for one narration request (maximum 12,000 characters)." });
  }
  const base = getVoiceStudioBase(res);
  if (!base) return;
  try {
    const upstream = await fetchVoiceStudio(base, "/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/wav, audio/mpeg, application/octet-stream, application/json" },
      body: JSON.stringify({ model: "tts-1", voice: "alloy", input: input.trim(), response_format: "wav" }),
      timeoutMs: 90000
    });
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 700);
      return res.status(upstream.status === 404 ? 503 : 502).json({
        error: detail || "VoiceStudio TTS request failed. Check the installed engine and model readiness."
      });
    }
    const audio = Buffer.from(await upstream.arrayBuffer());
    if (!audio.length) return res.status(502).json({ error: "VoiceStudio returned an empty audio response." });
    const contentType = upstream.headers.get("content-type") || "audio/wav";
    if (contentType.includes("application/json") || contentType.includes("text/")) {
      return res.status(502).json({ error: "VoiceStudio returned a non-audio response. Check its TTS API error and model readiness." });
    }
    res.set("Content-Type", contentType);
    res.set("Content-Length", String(audio.length));
    res.set("Cache-Control", "no-store");
    return res.send(audio);
  } catch (error) {
    return res.status(error.name === "TimeoutError" ? 504 : 503).json({
      error: error.name === "TimeoutError" ? "VoiceStudio TTS timed out." : "Could not connect to VoiceStudio TTS."
    });
  }
});

app.post("/api/voicestudio/transcribe", express.raw({ type: ["audio/*", "application/octet-stream"], limit: "20mb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: "Upload a non-empty audio file." });
  }
  if (req.body.length > 20 * 1024 * 1024) {
    return res.status(413).json({ error: "Audio file exceeds the 20 MB limit." });
  }
  const contentType = String(req.headers["content-type"] || "");
  if (!(contentType.startsWith("audio/") || contentType === "application/octet-stream")) {
    return res.status(415).json({ error: "Unsupported upload type. Choose an audio file." });
  }
  const base = getVoiceStudioBase(res);
  if (!base) return;
  const rawName = String(req.headers["x-file-name"] || "upload.wav");
  const filename = decodeURIComponent(rawName).replace(/[\\/]/g, "_").slice(0, 180) || "upload.wav";
  try {
    const form = new FormData();
    form.append("file", new Blob([req.body], { type: contentType }), filename);
    form.append("model", "whisper-1");
    form.append("response_format", "json");
    const upstream = await fetchVoiceStudio(base, "/v1/audio/transcriptions", {
      method: "POST",
      body: form,
      timeoutMs: 120000
    });
    const bodyText = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 503 : 502).json({
        error: bodyText.slice(0, 700) || "VoiceStudio transcription failed. Check ASR model readiness."
      });
    }
    let data;
    try { data = JSON.parse(bodyText); } catch { data = { text: bodyText }; }
    return res.json(data);
  } catch (error) {
    return res.status(error.name === "TimeoutError" ? 504 : 503).json({
      error: error.name === "TimeoutError" ? "VoiceStudio transcription timed out." : "Could not connect to VoiceStudio transcription."
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Community Helper AI",
    provider: "Ollama Cloud",
    model: MODEL,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.get("/api/history", async (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database is not connected yet."
    });
  }

  try {
    const requests = await HelpRequest.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("problem answer provider model createdAt")
      .lean();

    return res.json({ requests });
  } catch (error) {
    console.error("Could not load help history:", error.message);
    return res.status(500).json({ error: "Could not load saved history." });
  }
});

app.delete("/api/history", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database is not connected yet." });
  }

  try {
    const { ids, all } = req.body || {};

    if (all === true) {
      const result = await HelpRequest.deleteMany({});
      return res.json({ deletedCount: result.deletedCount || 0, scope: "all" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Select at least one history item to delete." });
    }

    const idsAreValid = ids.every(id =>
      typeof id === "string" && mongoose.Types.ObjectId.isValid(id)
    );
    if (!idsAreValid) {
      return res.status(400).json({ error: "One or more selected history IDs are invalid." });
    }

    const result = await HelpRequest.deleteMany({ _id: { $in: [...new Set(ids)] } });
    return res.json({ deletedCount: result.deletedCount || 0, scope: "selected" });
  } catch (error) {
    console.error("Could not delete help history:", error.message);
    return res.status(500).json({ error: "Could not delete saved history." });
  }
});

app.post("/api/help", async (req, res) => {
  const apiKey = process.env.OLLAMA_API_KEY;
  const problem = req.body?.problem;

  if (!apiKey) {
    return res.status(503).json({
      error: "Ollama Cloud API key is missing. Check Render Environment."
    });
  }

  if (typeof problem !== "string" || !problem.trim()) {
    return res.status(400).json({
      error: "Please describe a community problem."
    });
  }

  if (problem.length > 2000) {
    return res.status(400).json({
      error: "Please keep the problem description under 2000 characters."
    });
  }

  const hasBengaliScript = Array.from(problem).some(char => {
    const codePoint = char.codePointAt(0);
    return codePoint >= 0x0980 && codePoint <= 0x09FF;
  });
  const languageInstruction = hasBengaliScript
    ? `The user wrote the problem in Bengali. You MUST answer entirely in natural Bengali using বাংলা script. Every heading, category, explanation, action step, safety warning, and contact guidance must be in Bengali. Do not use English headings or English paragraphs unless a proper name or technical term must remain in English.`
    : `Answer in the same language as the user. If the user writes Banglish or romanized Bangla (Bangla words written with Latin letters), understand it as Bengali and answer entirely in Bengali using বাংলা script. If the user writes English, answer in English. Do not translate a Bengali problem into an English answer unless the user explicitly requests English.`;

  const headings = hasBengaliScript
    ? `Use these exact Bengali headings:
1. সমস্যার ধরন
2. সংক্ষিপ্ত মূল্যায়ন
3. অগ্রাধিকারভিত্তিক করণীয়
4. যা এড়িয়ে চলবেন
5. কখন স্থানীয় কর্তৃপক্ষের সঙ্গে যোগাযোগ করবেন`
    : `Use these headings in the user's language, translating them naturally when needed:
1. Problem category
2. Short assessment
3. Three prioritized action steps
4. What residents should avoid
5. When to contact the relevant local authority`;

  const messages = [
    {
      role: "system",
      content: `You are Community Helper AI powered by Google Gemma.
Help residents create practical action plans for community problems.

${languageInstruction}

Structure the answer with:
- The likely problem category
- A short, careful assessment
- Three prioritized and practical action steps
- What residents should avoid
- When to contact the relevant local authority

${headings}

Prioritize public safety. Never invent official contacts, claim an issue has been reported, or present guesses as verified facts. Make clear that the plan is AI-generated guidance and important details should be verified locally.`
    },
    {
      role: "user",
      content: problem.trim()
    }
  ];

  try {
    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 450
        }
      }),
      signal: AbortSignal.timeout(90000)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Ollama Cloud error:",
        response.status,
        JSON.stringify(data)
      );

      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({
          error: "Ollama Cloud authentication failed. Check your API key."
        });
      }

      if (response.status === 429) {
        return res.status(429).json({
          error: "Ollama Cloud rate limit reached. Please retry later."
        });
      }

      return res.status(502).json({
        error: data.error || "Ollama Cloud request failed."
      });
    }

    const answer = data.message?.content?.trim();

    if (!answer) {
      console.error("Ollama returned no message content:", data);

      return res.status(502).json({
        error: "The AI returned an empty answer. Please try again."
      });
    }

    let requestId = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const savedRequest = await HelpRequest.create({
          problem: problem.trim(),
          answer,
          provider: "Ollama Cloud",
          model: MODEL
        });
        requestId = savedRequest._id;
      } catch (saveError) {
        // Keep the AI feature available if database persistence temporarily fails.
        console.error("Could not save help request to MongoDB:", saveError.message);
      }
    } else {
      console.warn("MongoDB is not connected; this help request was not saved.");
    }

    return res.json({
      answer,
      provider: "Ollama Cloud",
      model: MODEL,
      requestId
    });
  } catch (error) {
    console.error("Ollama request error:", error.message);

    return res.status(503).json({
      error:
        error.name === "TimeoutError"
          ? "AI took too long to respond. Please try again."
          : "Could not connect to Ollama Cloud. Please try again."
    });
  }
});

async function startServer() {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
      console.log("MongoDB connected successfully");
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      console.warn("Starting API without database; saved history is unavailable.");
    }
  } else {
    console.warn("MONGODB_URI is not set. Starting without MongoDB.");
  }

  app.listen(PORT, () => {
    console.log(`Community Helper AI running on port ${PORT}`);
    console.log(`Serving frontend from: ${frontendPath}`);
    console.log(`Provider: Ollama Cloud | Model: ${MODEL}`);
  });
}

startServer();
