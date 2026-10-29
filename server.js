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
