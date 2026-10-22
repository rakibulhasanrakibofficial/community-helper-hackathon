
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OLLAMA_MODEL || "gemma4:31b";

app.disable("x-powered-by");
app.use(express.json({ limit: "30kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Community Helper AI",
    provider: "Ollama Cloud",
    model: MODEL
  });
});

app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.OLLAMA_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "OLLAMA_API_KEY is missing in environment variables."
    });
  }

  const body = req.body || {};
  const issue =
    body.question ||
    body.message ||
    body.prompt ||
    body.text ||
    body.content ||
    body.issue ||
    body.description;

  if (!issue && !Array.isArray(body.messages)) {
    return res.status(400).json({
      error: "Please describe your community issue."
    });
  }

  const messages = Array.isArray(body.messages)
    ? body.messages
    : [
        {
          role: "system",
          content:
            "You are Community Helper AI. Help residents make practical action plans for local problems such as garbage, streetlights, road safety, and water supply. Give clear steps, priorities, and safe suggestions. Never claim an issue has been reported or invent official contacts. Keep answers concise."
        },
        {
          role: "user",
          content: String(issue).slice(0, 4000)
        }
      ];

  try {
    const response = await fetch("https://ollama.com/api/chat", {
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
          num_predict: 400
        }
      }),
      signal: AbortSignal.timeout(90000)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Ollama Cloud error:", response.status, data);
      return res.status(response.status === 429 ? 429 : 502).json({
        error:
          response.status === 429
            ? "Ollama Cloud usage limit reached. Try again later."
            : data.error || "Ollama Cloud request failed."
      });
    }

    const answer = data.message?.content?.trim();

    if (!answer) {
      return res.status(502).json({
        error: "The AI returned an empty response. Please retry."
      });
    }

    return res.json({
      answer,
      response: answer,
      reply: answer,
      provider: "Ollama Cloud",
      model: MODEL
    });
  } catch (error) {
    console.error("AI request failed:", error.message);

    return res.status(503).json({
      error: "Could not connect to Ollama Cloud. Please try again."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Community Helper AI running on port ${PORT}`);
  console.log(`Provider: Ollama Cloud | Model: ${MODEL}`);
});
