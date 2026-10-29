const express = require("express");
const multer = require("multer");
const path = require("path");

const DEFAULT_URL = "http://127.0.0.1:3900";
const STATUS_TIMEOUT_MS = 3000;
const REQUEST_TIMEOUT_MS = 120000;
const MAX_TEXT_LENGTH = 4096;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_TTS_AUDIO_BYTES = 32 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const AUDIO_EXTENSIONS = new Set([".aac", ".flac", ".m4a", ".mp3", ".mp4", ".oga", ".ogg", ".wav", ".webm"]);

function resolveBaseUrl(configuredUrl) {
  const raw = typeof configuredUrl === "function" ? configuredUrl() : configuredUrl;
  let base;
  try {
    base = new URL(raw || DEFAULT_URL);
  } catch {
    return { error: "VoiceStudio URL is invalid." };
  }

  const host = base.hostname.toLowerCase();
  const loopback = host === "127.0.0.1" || host === "localhost" || host === "[::1]" || host === "::1";
  if (base.protocol !== "http:" || !loopback || base.username || base.password) {
    return { error: "Only a local HTTP VoiceStudio service is supported by this bridge." };
  }
  return { base };
}

function withTimeout(fetchImpl, url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetchImpl(url, { ...options, redirect: "error", signal })
    .catch(error => {
      if (signal.aborted) {
        const timeoutError = new Error("VoiceStudio request timed out.");
        timeoutError.code = "ETIMEDOUT";
        throw timeoutError;
      }
      throw error;
    });
}

function isTimeoutError(error) {
  return error?.code === "ETIMEDOUT" || error?.name === "AbortError" || error?.name === "TimeoutError";
}

async function readLimited(response, limitBytes) {
  if (!response.body || typeof response.body.getReader !== "function") {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > limitBytes) throw new Error("VoiceStudio response exceeded the size limit.");
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limitBytes) {
        await reader.cancel();
        throw new Error("VoiceStudio response exceeded the size limit.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

async function fetchJson(fetchImpl, base, route, timeoutMs = STATUS_TIMEOUT_MS) {
  try {
    const response = await withTimeout(fetchImpl, new URL(route, base), {}, timeoutMs);
    if (!response.ok) return null;
    const body = await readLimited(response, MAX_RESPONSE_BYTES);
    return JSON.parse(body.toString("utf8"));
  } catch {
    return null;
  }
}

function activeEngine(familyPayload) {
  const id = typeof familyPayload?.active === "string" ? familyPayload.active : "";
  const backend = Array.isArray(familyPayload?.backends)
    ? familyPayload.backends.find(item => item?.id === id)
    : null;
  return { id, model: typeof familyPayload?.active_model === "string" ? familyPayload.active_model : "", available: backend?.available === true };
}

function hasInstalledActiveModel(catalog, role, engineId, activeModel) {
  if (!Array.isArray(catalog) || !engineId || !activeModel) return false;
  return catalog.some(item => item?.role === role
    && item?.repo_id === activeModel
    && Array.isArray(item?.engines)
    && item.engines.includes(engineId)
    && item.installed === true
    && item.incomplete !== true);
}

function hasAlias(models, kind) {
  return Array.isArray(models?.data) && models.data.some(item => item?.voicestudio?.kind === kind && item?.voicestudio?.alias_for_active_engine === true);
}

function pathExists(openapi, route, method) {
  return Boolean(openapi?.paths?.[route]?.[method]);
}

async function inspectService(fetchImpl, base, statusTimeoutMs = STATUS_TIMEOUT_MS) {
  const [health, capabilities, ttsPayload, asrPayload, modelCatalog, openapi, aliases] = await Promise.all([
    fetchJson(fetchImpl, base, "/health", statusTimeoutMs),
    fetchJson(fetchImpl, base, "/.well-known/voicestudio-speech", statusTimeoutMs),
    fetchJson(fetchImpl, base, "/engines/tts", statusTimeoutMs),
    fetchJson(fetchImpl, base, "/engines/asr", statusTimeoutMs),
    fetchJson(fetchImpl, base, "/models", statusTimeoutMs),
    fetchJson(fetchImpl, base, "/openapi.json", statusTimeoutMs),
    fetchJson(fetchImpl, base, "/v1/models", statusTimeoutMs)
  ]);
  const connected = health?.status === "ok" || health?.ok === true;
  const tts = activeEngine(ttsPayload);
  const asr = activeEngine(asrPayload);
  const ttsReady = connected
    && tts.available
    && hasInstalledActiveModel(modelCatalog?.models, "TTS", tts.id, tts.model)
    && pathExists(openapi, "/v1/audio/speech", "post")
    && hasAlias(aliases, "tts");
  const sttReady = connected
    && asr.available
    && hasInstalledActiveModel(modelCatalog?.models, "ASR", asr.id, asr.model)
    && capabilities?.endpoints?.batch_transcription?.path === "/v1/audio/transcriptions"
    && capabilities?.endpoints?.batch_transcription?.method === "POST"
    && pathExists(openapi, "/v1/audio/transcriptions", "post")
    && hasAlias(aliases, "stt");

  const ttsMessage = !connected
    ? "VoiceStudio is not reachable on this device."
    : !tts.available
      ? "VoiceStudio has no available text-to-speech engine."
      : !hasInstalledActiveModel(modelCatalog?.models, "TTS", tts.id, tts.model)
        ? "The active text-to-speech model is not installed. Install it in VoiceStudio; Community Helper will not download it."
        : !ttsReady
          ? "VoiceStudio does not advertise the compatible text-to-speech API."
          : "Text-to-speech is ready.";
  const sttMessage = !connected
    ? "VoiceStudio is not reachable on this device."
    : !asr.available
      ? "VoiceStudio has no available speech-recognition engine."
      : !hasInstalledActiveModel(modelCatalog?.models, "ASR", asr.id, asr.model)
        ? "The active speech-recognition model is not installed. Install it in VoiceStudio; Community Helper will not download it."
        : !sttReady
          ? "VoiceStudio does not advertise the compatible transcription API."
          : "Audio transcription is ready.";

  return {
    connected,
    openUrl: new URL("/", base).toString(),
    version: typeof health?.version === "string" ? health.version : "",
    device: typeof health?.device === "string" ? health.device : "",
    ttsReady,
    sttReady,
    ttsMessage,
    sttMessage,
    message: !connected ? "VoiceStudio is not reachable on this device." : ttsReady || sttReady ? "Local VoiceStudio is responding." : "VoiceStudio is running, but compatible installed models are not ready."
  };
}

function safeFilename(originalName) {
  const normalized = String(originalName || "audio").replace(/\\/g, "/");
  const name = path.basename(normalized).replace(/[\u0000-\u001f\u007f]/g, "_").slice(0, 100);
  return name || "audio";
}

function isAllowedAudioFile(file) {
  const extension = path.extname(file.originalname || "").toLowerCase();
  return AUDIO_EXTENSIONS.has(extension) && (file.mimetype === "application/octet-stream" || file.mimetype.startsWith("audio/") || extension === ".mp4");
}

function createVoiceStudioRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl || global.fetch;
  const configuredUrl = options.configuredUrl || (() => process.env.VOICESTUDIO_URL || DEFAULT_URL);
  const statusTimeoutMs = options.statusTimeoutMs ?? STATUS_TIMEOUT_MS;
  const requestTimeoutMs = options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const maxAudioBytes = options.maxAudioBytes ?? MAX_AUDIO_BYTES;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxAudioBytes, files: 1, fields: 2, parts: 3 },
    fileFilter(_req, file, callback) {
      callback(isAllowedAudioFile(file) ? null : Object.assign(new Error("Choose a supported audio file."), { code: "INVALID_AUDIO_TYPE" }), isAllowedAudioFile(file));
    }
  });

  async function readiness(req, res) {
    const resolved = resolveBaseUrl(configuredUrl);
    if (resolved.error) {
      req.voiceStudioError = resolved.error;
      return null;
    }
    req.voiceStudioBase = resolved.base;
    req.voiceStudioStatus = await inspectService(fetchImpl, resolved.base, statusTimeoutMs);
    if (!req.voiceStudioStatus.connected) {
      req.voiceStudioError = req.voiceStudioStatus.message;
      return null;
    }
    return req.voiceStudioStatus;
  }

  router.get("/status", async (req, res) => {
    const resolved = resolveBaseUrl(configuredUrl);
    if (resolved.error) return res.json({ connected: false, ttsReady: false, sttReady: false, ttsMessage: resolved.error, sttMessage: resolved.error, message: resolved.error });
    try {
      return res.json(await inspectService(fetchImpl, resolved.base, statusTimeoutMs));
    } catch {
      return res.json({ connected: false, ttsReady: false, sttReady: false, ttsMessage: "Could not check VoiceStudio readiness.", sttMessage: "Could not check VoiceStudio readiness.", message: "Could not check VoiceStudio status." });
    }
  });

  router.post("/speech", async (req, res) => {
    const input = typeof req.body?.input === "string" ? req.body.input.trim() : "";
    if (!input) return res.status(400).json({ error: "Enter text before generating speech." });
    if (input.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: `Text must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.` });
    const status = await readiness(req, res);
    if (!status) return res.status(503).json({ error: req.voiceStudioError || "VoiceStudio is unavailable." });
    if (!status.ttsReady) return res.status(503).json({ error: status.ttsMessage, unavailable: true });

    try {
      const upstream = await withTimeout(fetchImpl, new URL("/v1/audio/speech", req.voiceStudioBase), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "audio/wav" },
        body: JSON.stringify({ model: "tts-1", input, voice: "alloy", response_format: "wav", speed: 1 })
      }, requestTimeoutMs);
      if (!upstream.ok) {
        return res.status(upstream.status === 400 || upstream.status === 422 ? 422 : 502).json({ error: upstream.status === 400 || upstream.status === 422 ? "VoiceStudio rejected this text or speech request." : "VoiceStudio could not generate audio." });
      }
      const contentType = upstream.headers.get("content-type") || "";
      if (!contentType.toLowerCase().startsWith("audio/") && contentType !== "application/octet-stream") {
        return res.status(502).json({ error: "VoiceStudio returned an unexpected audio response." });
      }
      const audio = await readLimited(upstream, MAX_TTS_AUDIO_BYTES);
      if (audio.length === 0) return res.status(502).json({ error: "VoiceStudio returned an empty audio response." });
      res.set({ "content-type": contentType, "content-length": String(audio.length), "cache-control": "no-store" });
      return res.send(audio);
    } catch (error) {
      if (isTimeoutError(error)) return res.status(504).json({ error: "VoiceStudio took too long to generate speech. Try a shorter response." });
      return res.status(502).json({ error: "Could not complete the VoiceStudio speech request." });
    }
  });

  router.post("/transcribe", async (req, res, next) => {
    const status = await readiness(req, res);
    if (!status) return res.status(503).json({ error: req.voiceStudioError || "VoiceStudio is unavailable." });
    if (!status.sttReady) return res.status(503).json({ error: status.sttMessage, unavailable: true });
    return upload.single("audio")(req, res, error => {
      if (error) {
        if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: `Audio files must be ${Math.floor(maxAudioBytes / (1024 * 1024)) || 1} MB or smaller.` });
        if (error.code === "INVALID_AUDIO_TYPE") return res.status(415).json({ error: "Choose a WAV, MP3, M4A, MP4, AAC, OGG, FLAC, or WebM audio file." });
        if (error instanceof multer.MulterError) return res.status(400).json({ error: "Upload one audio file using the audio field." });
        return next(error);
      }
      return next();
    });
  }, async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Select an audio file to transcribe." });
    const form = new FormData();
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype || "application/octet-stream" }), safeFilename(req.file.originalname));
    form.append("model", "whisper-1");
    form.append("response_format", "json");

    try {
      const upstream = await withTimeout(fetchImpl, new URL("/v1/audio/transcriptions", req.voiceStudioBase), {
        method: "POST",
        body: form,
        headers: { accept: "application/json" }
      }, requestTimeoutMs);
      if (!upstream.ok) {
        return res.status(upstream.status === 400 || upstream.status === 422 ? 422 : 502).json({ error: upstream.status === 400 || upstream.status === 422 ? "VoiceStudio could not transcribe this audio. Check that the file is readable and supported." : "VoiceStudio could not transcribe this audio." });
      }
      const body = await readLimited(upstream, MAX_RESPONSE_BYTES);
      let result;
      try { result = JSON.parse(body.toString("utf8")); } catch { return res.status(502).json({ error: "VoiceStudio returned an invalid transcription response." }); }
      if (typeof result?.text !== "string") return res.status(502).json({ error: "VoiceStudio returned no transcription text." });
      return res.json({ text: result.text.slice(0, 100000) });
    } catch (error) {
      if (isTimeoutError(error)) return res.status(504).json({ error: "VoiceStudio took too long to transcribe this file." });
      return res.status(502).json({ error: "Could not complete the VoiceStudio transcription request." });
    }
  });

  return router;
}

module.exports = { createVoiceStudioRouter, MAX_AUDIO_BYTES, MAX_TEXT_LENGTH, resolveBaseUrl };
