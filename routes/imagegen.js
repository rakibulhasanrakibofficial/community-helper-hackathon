const express = require("express");

const DEFAULT_MODEL = "gpt-image-2.5-flare";
const MAX_PROMPT_LENGTH = 1800;
const REQUEST_TIMEOUT_MS = 180000;
const MAX_IMAGE_BASE64_LENGTH = 18 * 1024 * 1024;

function createImageGenerationRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl || global.fetch;
  const apiKey = options.apiKey || (() => process.env.OPENAI_API_KEY);
  const model = options.model || (() => process.env.OPENAI_IMAGE_MODEL || DEFAULT_MODEL);

  router.post("/generate", async (req, res) => {
    const userPrompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!userPrompt) return res.status(400).json({ error: "Describe the community scene you want to illustrate." });
    if (userPrompt.length > MAX_PROMPT_LENGTH) {
      return res.status(400).json({ error: `Keep the image description under ${MAX_PROMPT_LENGTH} characters.` });
    }

    const token = typeof apiKey === "function" ? apiKey() : apiKey;
    if (!token) {
      return res.status(503).json({ error: "Image generation is not configured. Add OPENAI_API_KEY to the server environment." });
    }

    const prompt = [
      "Create a safe, non-graphic editorial illustration for a community support service.",
      "Show the described local issue and a constructive, hopeful community response.",
      "Use a polished, realistic-but-friendly visual style suitable for a public information campaign.",
      "Do not show identifiable real people, private information, brand logos, readable text, injuries, or graphic content.",
      `Scene description: ${userPrompt}`
    ].join("\n");

    try {
      const response = await fetchImpl("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: typeof model === "function" ? model() : model,
          prompt,
          size: "1024x1024",
          quality: "low",
          output_format: "png",
          n: 1
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return res.status(502).json({ error: "Image provider authentication failed. Check the server-side API key." });
        }
        if (response.status === 429) {
          return res.status(429).json({ error: "Image generation rate limit reached. Please try again later." });
        }
        if (response.status === 400) {
          return res.status(422).json({ error: "The image request was rejected. Adjust the description and try again." });
        }
        console.error("Image generation provider error:", response.status, data.error?.type || "unknown");
        return res.status(502).json({ error: "The image provider could not complete this request." });
      }

      const encoded = data.data?.[0]?.b64_json;
      if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
        return res.status(502).json({ error: "The image provider returned an invalid image." });
      }
      if (encoded.length > MAX_IMAGE_BASE64_LENGTH) {
        return res.status(502).json({ error: "The generated image exceeded the app's size limit." });
      }

      return res.json({
        image: `data:image/png;base64,${encoded}`,
        model: typeof model === "function" ? model() : model
      });
    } catch (error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        return res.status(504).json({ error: "Image generation timed out. Try a shorter description." });
      }
      console.error("Image generation request failed:", error.message);
      return res.status(502).json({ error: "Could not connect to the image generation service." });
    }
  });

  return router;
}

module.exports = { createImageGenerationRouter, DEFAULT_MODEL, MAX_PROMPT_LENGTH };
