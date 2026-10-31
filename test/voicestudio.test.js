const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const express = require("express");
const { createVoiceStudioRouter, resolveBaseUrl } = require("../routes/voicestudio");

const BASE_URL = "http://127.0.0.1:3900";
let server;
let origin;

before(async () => {
  const app = express();
  app.use(express.json({ limit: "30kb" }));
  app.use("/api/voicestudio", createVoiceStudioRouter({
    configuredUrl: BASE_URL,
    fetchImpl: (...args) => global.testVoiceStudioFetch(...args)
  }));
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

function voiceStudioFetch({ installed = true, unavailable = false, speechStatus = 200, transcriptionStatus = 200, speechTimeout = false } = {}) {
  const calls = [];
  const response = (body, status = 200, headers = { "content-type": "application/json" }) => new Response(body, { status, headers });
  const fetchImpl = async (url, options = {}) => {
    const route = new URL(url).pathname;
    calls.push({ route, options });
    if (unavailable) throw new Error("service unavailable");
    if (route === "/health") return response(JSON.stringify({ status: "ok", version: "test", device: "cpu" }));
    if (route === "/.well-known/voicestudio-speech") return response(JSON.stringify({ endpoints: { batch_transcription: { path: "/v1/audio/transcriptions", method: "POST" } } }));
    if (route === "/engines/tts") return response(JSON.stringify({ active: "omnivoice", active_model: "k2-fsa/OmniVoice", backends: [{ id: "omnivoice", available: true }] }));
    if (route === "/engines/asr") return response(JSON.stringify({ active: "whisperx", active_model: "Systran/faster-whisper-large-v3", backends: [{ id: "whisperx", available: true }] }));
    if (route === "/models") return response(JSON.stringify({ models: [
      { role: "TTS", repo_id: "k2-fsa/OmniVoice", engines: ["omnivoice"], installed, incomplete: false },
      { role: "ASR", repo_id: "Systran/faster-whisper-large-v3", engines: ["whisperx"], installed, incomplete: false }
    ] }));
    if (route === "/openapi.json") return response(JSON.stringify({ paths: { "/v1/audio/speech": { post: {} }, "/v1/audio/transcriptions": { post: {} } } }));
    if (route === "/v1/models") return response(JSON.stringify({ data: [
      { id: "tts-1", voicestudio: { kind: "tts", alias_for_active_engine: true } },
      { id: "whisper-1", voicestudio: { kind: "stt", alias_for_active_engine: true } }
    ] }));
    if (route === "/v1/audio/speech") {
      if (speechTimeout) return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
      if (speechStatus !== 200) return response(JSON.stringify({ detail: "private upstream detail" }), speechStatus);
      return response(Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0]), 200, { "content-type": "audio/wav" });
    }
    if (route === "/v1/audio/transcriptions") {
      if (transcriptionStatus !== 200) return response(JSON.stringify({ detail: "private upstream detail" }), transcriptionStatus);
      return response(JSON.stringify({ text: "The road is flooded." }));
    }
    throw new Error(`Unexpected upstream route: ${route}`);
  };
  return { fetchImpl, calls };
}

async function requestJson(route, init = {}) {
  return fetch(`${origin}${route}`, init);
}

test("remote VoiceStudio requires exact HTTPS allowlist and both Access secrets", () => {
  const previous = {
    host: process.env.VOICESTUDIO_ALLOWED_HOST,
    id: process.env.VOICESTUDIO_ACCESS_CLIENT_ID,
    secret: process.env.VOICESTUDIO_ACCESS_CLIENT_SECRET
  };
  try {
    process.env.VOICESTUDIO_ALLOWED_HOST = "voice.example.com";
    process.env.VOICESTUDIO_ACCESS_CLIENT_ID = "test-client-id";
    process.env.VOICESTUDIO_ACCESS_CLIENT_SECRET = "test-client-secret";
    assert.equal(resolveBaseUrl("https://voice.example.com").base.hostname, "voice.example.com");
    assert.match(resolveBaseUrl("https://other.example.com").error, /allowlisted HTTPS hostname/i);
    assert.match(resolveBaseUrl("http://voice.example.com").error, /allowlisted HTTPS hostname/i);
    assert.match(resolveBaseUrl("https://voice.example.com:8443").error, /allowlisted HTTPS hostname/i);
    assert.match(resolveBaseUrl("https://voice.example.com/untrusted-path").error, /allowlisted HTTPS hostname/i);
    delete process.env.VOICESTUDIO_ACCESS_CLIENT_SECRET;
    assert.match(resolveBaseUrl("https://voice.example.com").error, /allowlisted HTTPS hostname/i);
  } finally {
    if (previous.host === undefined) delete process.env.VOICESTUDIO_ALLOWED_HOST; else process.env.VOICESTUDIO_ALLOWED_HOST = previous.host;
    if (previous.id === undefined) delete process.env.VOICESTUDIO_ACCESS_CLIENT_ID; else process.env.VOICESTUDIO_ACCESS_CLIENT_ID = previous.id;
    if (previous.secret === undefined) delete process.env.VOICESTUDIO_ACCESS_CLIENT_SECRET; else process.env.VOICESTUDIO_ACCESS_CLIENT_SECRET = previous.secret;
  }
});

test("status requires an installed active model and confirms API capabilities", async () => {
  const stub = voiceStudioFetch({ installed: false });
  global.testVoiceStudioFetch = stub.fetchImpl;
  const response = await requestJson("/api/voicestudio/status");
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.connected, true);
  assert.equal(data.openUrl, `${BASE_URL}/`);
  assert.equal(data.ttsReady, false);
  assert.equal(data.sttReady, false);
  assert.match(data.ttsMessage, /not installed/i);
  assert.ok(stub.calls.some(call => call.route === "/openapi.json"));
});

test("status refuses a non-loopback configured service URL", async () => {
  const app = express();
  app.use("/api/voicestudio", createVoiceStudioRouter({ configuredUrl: "http://example.com", fetchImpl: async () => { throw new Error("must not be called"); } }));
  const isolated = app.listen(0, "127.0.0.1");
  await new Promise(resolve => isolated.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${isolated.address().port}/api/voicestudio/status`);
    const data = await response.json();
    assert.equal(data.connected, false);
    assert.match(data.message, /loopback HTTP/i);
  } finally {
    await new Promise(resolve => isolated.close(resolve));
  }
});

test("speech proxies WAV bytes only after readiness checks", async () => {
  const stub = voiceStudioFetch();
  global.testVoiceStudioFetch = stub.fetchImpl;
  const response = await requestJson("/api/voicestudio/speech", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "Community action plan." })
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "audio/wav");
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [82, 73, 70, 70, 0, 0, 0, 0]);
  const forwarded = stub.calls.find(call => call.route === "/v1/audio/speech");
  assert.equal(forwarded.options.method, "POST");
  assert.equal(JSON.parse(forwarded.options.body).model, "tts-1");
  assert.equal(JSON.parse(forwarded.options.body).response_format, "wav");
});

test("speech rejects empty or oversized input and unavailable models", async () => {
  const stub = voiceStudioFetch({ installed: false });
  global.testVoiceStudioFetch = stub.fetchImpl;
  let response = await requestJson("/api/voicestudio/speech", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "  " }) });
  assert.equal(response.status, 400);
  response = await requestJson("/api/voicestudio/speech", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "x".repeat(4097) }) });
  assert.equal(response.status, 400);
  response = await requestJson("/api/voicestudio/speech", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "hello" }) });
  assert.equal(response.status, 503);
  assert.equal(stub.calls.some(call => call.route === "/v1/audio/speech"), false);
});

test("speech fails closed when VoiceStudio cannot be reached", async () => {
  const stub = voiceStudioFetch({ unavailable: true });
  global.testVoiceStudioFetch = stub.fetchImpl;
  const response = await requestJson("/api/voicestudio/speech", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "hello" })
  });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not reachable/i);
  assert.equal(stub.calls.some(call => call.route === "/v1/audio/speech"), false);
});

test("speech maps VoiceStudio errors and timeouts to safe client messages", async () => {
  const stub = voiceStudioFetch({ speechStatus: 500 });
  global.testVoiceStudioFetch = stub.fetchImpl;
  let response = await requestJson("/api/voicestudio/speech", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "hello" }) });
  assert.equal(response.status, 502);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private upstream detail/);

  const timeoutStub = voiceStudioFetch({ speechTimeout: true });
  global.testVoiceStudioFetch = timeoutStub.fetchImpl;
  const app = express();
  app.use(express.json());
  app.use("/api/voicestudio", createVoiceStudioRouter({ configuredUrl: BASE_URL, fetchImpl: (...args) => global.testVoiceStudioFetch(...args), requestTimeoutMs: 10 }));
  const isolated = app.listen(0, "127.0.0.1");
  await new Promise(resolve => isolated.once("listening", resolve));
  try {
    response = await fetch(`http://127.0.0.1:${isolated.address().port}/api/voicestudio/speech`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "hello" }) });
    assert.equal(response.status, 504);
  } finally {
    await new Promise(resolve => isolated.close(resolve));
  }
});

test("transcription forwards multipart as VoiceStudio's required file field", async () => {
  const stub = voiceStudioFetch();
  global.testVoiceStudioFetch = stub.fetchImpl;
  const form = new FormData();
  form.append("audio", new Blob(["fake wav data"], { type: "audio/wav" }), "community.wav");
  const response = await requestJson("/api/voicestudio/transcribe", { method: "POST", body: form });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.text, "The road is flooded.");
  const forwarded = stub.calls.find(call => call.route === "/v1/audio/transcriptions");
  assert.ok(forwarded.options.body instanceof FormData);
  assert.equal(forwarded.options.body.get("model"), "whisper-1");
  assert.equal(forwarded.options.body.get("response_format"), "json");
  assert.equal(forwarded.options.body.get("file").name, "community.wav");
});

test("transcription rejects unsupported and oversized uploads", async () => {
  const stub = voiceStudioFetch();
  global.testVoiceStudioFetch = stub.fetchImpl;
  const invalid = new FormData();
  invalid.append("audio", new Blob(["text"], { type: "text/plain" }), "notes.txt");
  let response = await requestJson("/api/voicestudio/transcribe", { method: "POST", body: invalid });
  assert.equal(response.status, 415);

  const app = express();
  app.use("/api/voicestudio", createVoiceStudioRouter({ configuredUrl: BASE_URL, fetchImpl: (...args) => global.testVoiceStudioFetch(...args), maxAudioBytes: 4 }));
  const isolated = app.listen(0, "127.0.0.1");
  await new Promise(resolve => isolated.once("listening", resolve));
  try {
    const tooLarge = new FormData();
    tooLarge.append("audio", new Blob(["12345"], { type: "audio/wav" }), "big.wav");
    response = await fetch(`http://127.0.0.1:${isolated.address().port}/api/voicestudio/transcribe`, { method: "POST", body: tooLarge });
    assert.equal(response.status, 413);
  } finally {
    await new Promise(resolve => isolated.close(resolve));
  }
});

test("transcription maps upstream errors without exposing internals", async () => {
  const stub = voiceStudioFetch({ transcriptionStatus: 422 });
  global.testVoiceStudioFetch = stub.fetchImpl;
  const form = new FormData();
  form.append("audio", new Blob(["fake"], { type: "audio/wav" }), "community.wav");
  const response = await requestJson("/api/voicestudio/transcribe", { method: "POST", body: form });
  assert.equal(response.status, 422);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private upstream detail/);
});
