require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL || "gemma4:e2b";

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "AI Community Helper", model: MODEL });
});

app.post("/api/help", async (req, res) => {
  const problem = typeof req.body?.problem === "string" ? req.body.problem.trim() : "";
  if (!problem) return res.status(400).json({ error: "Please describe your community problem." });
  if (problem.length > 2000) return res.status(400).json({ error: "Please keep the description under 2000 characters." });

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, stream: false, think: false,
        messages: [
          { role: "system", content: "You are AI Community Helper. Analyze a community issue and provide: Category, Brief analysis, and 3 practical next steps. Be concise, realistic, respectful, and clear. Do not claim an authority was contacted or a report submitted. For urgent danger, recommend contacting local emergency services or relevant authorities." },
          { role: "user", content: problem }
        ],
        options: { num_predict: 350 }
      })
    });
    if (!response.ok) {
      console.error("Ollama HTTP error:", response.status);
      return res.status(503).json({ error: `Ollama returned HTTP ${response.status}. Check Ollama and model "${MODEL}".` });
    }
    const data = await response.json();
    const answer = data.message?.content || data.response;
    if (!answer) return res.status(502).json({ error: "The model returned an empty response. Please try again." });
    res.json({ answer, model: MODEL });
  } catch (error) {
    console.error("AI connection error:", error.message);
    res.status(503).json({ error: "Could not connect to Ollama. Start Ollama and check the model name." });
  }
});

app.listen(PORT, () => console.log(`AI Community Helper running at http://localhost:${PORT} | Model: ${MODEL}`));
