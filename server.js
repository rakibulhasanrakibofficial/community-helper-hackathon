
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OLLAMA_MODEL || "gemma4:cloud";
const OLLAMA_URL = "https://ollama.com/api/chat";

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

  const messages = [
    {
      role: "system",
      content: `You are Community Helper AI powered by Google Gemma.
Help residents create practical action plans for community problems.
Identify the likely category, briefly analyze the issue, and provide:
1. Problem category
2. Short assessment
3. Three prioritized action steps
4. What residents should avoid
5. When to contact the relevant local authority

Use clear, concise English with headings.
Prioritize public safety. Never invent official contacts, claim an issue has been reported, or present guesses as verified facts.`
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

    return res.json({
      answer,
      provider: "Ollama Cloud",
      model: MODEL
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

app.listen(PORT, () => {
  console.log(`Community Helper AI running on port ${PORT}`);
  console.log(`Provider: Ollama Cloud | Model: ${MODEL}`);
});
