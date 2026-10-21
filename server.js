
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_MODEL =
  process.env.NVIDIA_MODEL ||
  "nvidia/nemotron-3-ultra-550b-a55b";

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    model: NVIDIA_MODEL,
    inference: "NVIDIA API"
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

  if (!NVIDIA_API_KEY) {
    return res.status(503).json({
      error: "AI service is not configured."
    });
  }

  let upstream;

  try {
    upstream = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream"
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          stream: true,
          max_tokens: 1200,
          temperature: 0.6,
          top_p: 0.95,
          chat_template_kwargs: {
            enable_thinking: false
          },
          messages: [
            {
              role: "system",
              content:
                "You are a practical community problem-solving assistant. " +
                "Give concise, actionable advice in this exact structure:\n\n" +
                "Category: [problem category]\n\n" +
                "Analysis: [brief explanation]\n\n" +
                "Action Plan:\n" +
                "1. [practical step]\n" +
                "2. [practical step]\n" +
                "3. [practical step]\n\n" +
                "Who to Contact: [relevant authority or organization].\n\n" +
                "Never invent contact details. Explain that suggestions " +
                "are not verified official advice. Do not expose private data."
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
        "NVIDIA error:",
        upstream.status,
        details.slice(0, 500)
      );

      return res.status(502).json({
        error: "NVIDIA AI request failed. Check the server logs."
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

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (clientDisconnected || !line.startsWith("data:")) {
          continue;
        }

        const data = line.slice(5).trim();

        if (!data || data === "[DONE]") continue;

        let event;

        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }

        if (event.error) {
          throw new Error("NVIDIA stream returned an error.");
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
    console.error("NVIDIA request failed:", error.message);

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
  console.log(`Configured model: ${NVIDIA_MODEL}`);
});
