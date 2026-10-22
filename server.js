
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OLLAMA_MODEL || "gemma4:cloud";
const OLLAMA_API_URL = "https://ollama.com/api/chat";

app.disable("x-powered-by");
app.use(express.json({ limit: "30kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "StudyMate AI",
    model: MODEL,
    provider: "Ollama Cloud"
  });
});

app.post("/api/study", async (req, res) => {
  const { topic, mode = "explain", language = "English" } = req.body || {};

  if (typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "Please enter a topic." });
  }

  if (topic.length > 2000) {
    return res.status(400).json({ error: "Topic must be under 2000 characters." });
  }

  const tasks = {
    explain: "Explain the topic simply in 3-5 short sentences and include one example.",
    notes: "Create concise study notes with a definition and 5 key points.",
    quiz: "Create 3 multiple-choice questions with four options each and an answer key."
  };

  if (!tasks[mode]) {
    return res.status(400).json({ error: "Choose Explain, Notes, or Quiz." });
  }

  const apiKey = process.env.OLLAMA_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "Ollama Cloud API key is missing. Set OLLAMA_API_KEY in your environment."
    });
  }

  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          {
            role: "system",
            content: `You are StudyMate, a helpful study assistant. Reply in ${language === "Bangla" ? "Bangla" : "English"}. ${tasks[mode]} Keep the response clear and concise.`
          },
          { role: "user", content: topic.trim() }
        ],
        options: {
          temperature: 0.3,
          num_predict: 220
        }
      }),
      signal: AbortSignal.timeout(90000)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Ollama Cloud error:", response.status, data);
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429
          ? "Cloud usage limit reached. Please try again later."
          : "Ollama Cloud request failed. Check the model and API access."
      });
    }

    const answer = data.message?.content?.trim();

    if (!answer) {
      return res.status(502).json({
        error: "The model returned an empty answer. Please try again."
      });
    }

    return res.json({
      answer,
      model: MODEL,
      provider: "Ollama Cloud"
    });
  } catch (error) {
    console.error("StudyMate request error:", error.message);

    return res.status(504).json({
      error: "Ollama Cloud did not respond in time. Please retry."
    });
  }
});

app.listen(PORT, () => {
  console.log(`StudyMate running on port ${PORT}`);
  console.log(`AI provider: Ollama Cloud | Model: ${MODEL}`);
});
