
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
  res.json({ status: "ok", model: MODEL });
});

app.post("/api/help", async (req, res) => {
  const problem =
    typeof req.body?.problem === "string" ? req.body.problem.trim() : "";

  if (!problem) {
    return res.status(400).json({ error: "Describe your community problem first." });
  }

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        think: false,
        messages: [
          {
            role: "system",
            content:
  "You are a community problem-solving assistant. Analyze the user's problem and respond in this exact structure:\n\nCategory: [problem category]\n\nAnalysis: [brief explanation]\n\nAction Plan:\n1. [first practical step]\n2. [second practical step]\n3. [third practical step]\n\nWho to Contact: [relevant local authority or organization]. Do not invent specific contact details. Keep the answer concise, safe, and practical."
          { role: "user", content: problem }
        ],
        options: { num_predict: 120, temperature: 0.3 }
      })
    });

    if (!response.ok || !response.body) {
      return res.status(503).json({ error: "Ollama is unavailable. Check that it is running." });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const item = JSON.parse(line);

        if (item.message?.content) {
          res.write(item.message.content);
        }

        if (item.error) {
          throw new Error(item.error);
        }
      }
    }

    if (buffer.trim()) {
      const item = JSON.parse(buffer);
      if (item.message?.content) res.write(item.message.content);
    }

    res.end();
  } catch (error) {
    console.error("Streaming error:", error.message);
    if (!res.headersSent) {
      return res.status(503).json({ error: "AI streaming failed. Check Ollama and the model." });
    }
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}`);
});
