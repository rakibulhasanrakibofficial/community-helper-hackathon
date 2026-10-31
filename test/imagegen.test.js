const assert = require("node:assert/strict");
const { test } = require("node:test");
const express = require("express");
const { createImageGenerationRouter } = require("../routes/imagegen");

async function withServer(router, callback) {
  const app = express();
  app.use(express.json({ limit: "30kb" }));
  app.use("/api/images", router);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test("image generation validates empty and oversized prompts", async () => {
  await withServer(createImageGenerationRouter({ apiKey: "test-key" }), async origin => {
    let response = await fetch(`${origin}/api/images/generate`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: " " })
    });
    assert.equal(response.status, 400);
    response = await fetch(`${origin}/api/images/generate`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "x".repeat(1801) })
    });
    assert.equal(response.status, 400);
  });
});

test("image generation fails clearly when API key is missing", async () => {
  await withServer(createImageGenerationRouter({ apiKey: "" }), async origin => {
    const response = await fetch(`${origin}/api/images/generate`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "A clean community park" })
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /OPENAI_API_KEY/);
  });
});

test("image generation proxies provider request and returns PNG data URL", async () => {
  let captured;
  const fakeFetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from("fake-png").toString("base64") }] }), {
      status: 200, headers: { "content-type": "application/json" }
    });
  };
  await withServer(createImageGenerationRouter({ apiKey: "server-secret", fetchImpl: fakeFetch }), async origin => {
    const response = await fetch(`${origin}/api/images/generate`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "A clean community park" })
    });
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.image, `data:image/png;base64,${Buffer.from("fake-png").toString("base64")}`);
    assert.equal(captured.url, "https://api.openai.com/v1/images/generations");
    assert.equal(captured.options.headers.Authorization, "Bearer server-secret");
    assert.equal(JSON.parse(captured.options.body).n, 1);
  });
});

test("image generation maps provider errors without exposing response internals", async () => {
  const fakeFetch = async () => new Response(JSON.stringify({ error: { message: "secret internal detail" } }), { status: 429 });
  await withServer(createImageGenerationRouter({ apiKey: "test-key", fetchImpl: fakeFetch }), async origin => {
    const response = await fetch(`${origin}/api/images/generate`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "A clean community park" })
    });
    assert.equal(response.status, 429);
    assert.doesNotMatch(JSON.stringify(await response.json()), /secret internal detail/);
  });
});
