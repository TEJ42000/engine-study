const BACKEND_URL = "https://webapp-theta-beige.vercel.app";
const STORAGE_KEY = "engine_study_token";

// Both possible Auth.js session cookie names
const COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Host-authjs.session-token",
];

async function readSessionCookie() {
  for (const name of COOKIE_NAMES) {
    const cookie = await chrome.cookies.get({ url: BACKEND_URL, name });
    console.log(`[Engine Study] cookie "${name}":`, cookie ? "FOUND" : "not found");
    if (cookie?.value) return { name, value: cookie.value };
  }
  return null;
}

async function fetchToken() {
  const cookieResult = await readSessionCookie();

  if (!cookieResult) {
    console.log("[Engine Study] No session cookie found");
    return { ok: false, reason: "no-session" };
  }

  console.log(`[Engine Study] Using cookie: ${cookieResult.name}`);

  // First try /api/extension/debug to verify decode works
  try {
    const debugResp = await fetch(`${BACKEND_URL}/api/extension/debug`, {
      headers: { "X-Session-Token": cookieResult.value },
    });
    const debugData = await debugResp.json();
    console.log("[Engine Study] Debug decode result:", debugData);
  } catch (e) {
    console.log("[Engine Study] Debug endpoint error:", e);
  }

  try {
    const resp = await fetch(`${BACKEND_URL}/api/extension/token`, {
      headers: { "X-Session-Token": cookieResult.value },
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.log(`[Engine Study] Token endpoint ${resp.status}:`, text);
      return { ok: false, reason: `http-${resp.status}` };
    }
    const { token } = await resp.json();
    await chrome.storage.local.set({ [STORAGE_KEY]: token });
    console.log("[Engine Study] Token stored successfully");
    return { ok: true, token };
  } catch (e) {
    console.log("[Engine Study] Token fetch error:", e);
    return { ok: false, reason: "network" };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_TOKEN") {
    fetchToken().then(sendResponse);
    return true;
  }
});
