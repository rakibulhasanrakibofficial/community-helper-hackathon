
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL =
  process.env.HF_MODEL || "openai/gpt-oss-20b:fastest";

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    model: HF_MODEL,
    inference: "Hugging Face Inference Providers"
  });
});

app.post("/api/help", async (req, res) => {
  const problem =
    typeof req.body?.problem === "string"
      ? req.body.problem.trim()
      : "";

  if (!problem) {
    return res.status(400).json({
      error: "Please describe a community problem first."
    });
  }

  if (problem.length > 2000) {
    return res.status(400).json({
      error: "Please keep the problem under 2000 characters."
    });
  }

  if (!HF_TOKEN) {
    return res.status(503).json({
      error: "AI service is not configured. Please try again later."
    });
  }

  let upstream;

  try {
    upstream = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: HF_MODEL,
          stream: true,
          max_tokens: 300,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are a community problem-solving assistant. " +
                "Respond concisely using this exact structure:\n\n" +
                "Category: [problem category]\n\n" +
                "Analysis: [brief explanation]\n\n" +
                "Action Plan:\n" +
                "1. [practical step]\n" +
                "2. [practical step]\n" +
                "3. [practical step]\n\n" +
                "Who to Contact: [relevant authority or organization]. " +
                "Never invent contact details. Make clear that suggestions " +
                "are not verified official advice."
            },
            {
              role: "user",
              content: problem
            }
          ]
        }),
        signal: AbortSignal.timeout(90000)
      }
    );

    if (!upstream.ok || !upstream.body) {
      const details = await upstream.text().catch(() => "");
      console.error(
        "Hugging Face error:",
        upstream.status,
        details.slice(0, 500)
      );

      return res.status(502).json({
        error:
          "The AI provider could not complete the request. " +
          "Check model availability and Hugging Face access."
      });
    }

    res.status(200);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let clientDisconnected = false;

    res.on("close", () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        reader.cancel().catch(() => {});
      }
    });

    while (!clientDisconnected) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n");
      buffer = events.pop() || "";

      for (const line of events) {
        if (clientDisconnected) break;
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();

        if (!data || data === "[DONE]") continue;

        let event;

        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }

        if (event.error) {
          throw new Error("Inference provider returned an error.");
        }

        const content = event.choices?.[0]?.delta?.content;

        if (typeof content === "string" && content.length > 0) {
          if (!res.write(content)) {
            await new Promise(resolve => res.once("drain", resolve));
          }
        }
      }
    }

    if (!clientDisconnected) {
      buffer += decoder.decode();

      for (const line of buffer.split("\n")) {
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const event = JSON.parse(data);
          const content = event.choices?.[0]?.delta?.content;

          if (typeof content === "string") {
            res.write(content);
          }
        } catch {
          // Ignore incomplete final stream events.
        }
      }

      res.end();
    }
  } catch (error) {
    console.error("AI request failed:", error.message);

    if (!res.headersSent) {
      return res.status(502).json({
        error: "AI request failed. Please try again later."
      });
    }

    if (!res.destroyed) {
      res.end();
    }
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Configured model: ${HF_MODEL}`);
});
