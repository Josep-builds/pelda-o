// Diagnoses GEMINI_API_KEY without ever printing it. Tries the REST
// endpoint directly (both auth styles Google supports) so we see the
// actual error Google returns, independent of the @google/genai SDK.
//
// Run with: node --env-file=.env.local scripts/test-gemini.mjs

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

if (!apiKey) {
  console.error("GEMINI_API_KEY is not set.");
  process.exit(1);
}

console.log("Key length:", apiKey.length);
console.log("Key prefix (first 3 chars only):", apiKey.slice(0, 3));
console.log("Model:", model);

const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

async function tryRequest(label, { headers = {}, query = "" }) {
  const res = await fetch(endpoint + query, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK." }] }] }),
  });
  const text = await res.text();
  console.log(`\n[${label}] status: ${res.status}`);
  console.log(`[${label}] body:`, text.slice(0, 500));
  return res.status;
}

await tryRequest("x-goog-api-key header", { headers: { "x-goog-api-key": apiKey } });
await tryRequest("?key= query param", { query: `?key=${encodeURIComponent(apiKey)}` });
