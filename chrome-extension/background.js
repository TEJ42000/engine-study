// Background service worker.
// Reads the Auth.js session cookie directly from Chrome's cookie jar
// (chrome.cookies bypasses the SameSite=Lax restriction that stops the
// cookie being sent on a normal cross-origin fetch), then exchanges it
// for a short-lived extension token at /api/extension/token.

const BACKEND_URL = "https://webapp-theta-beige.vercel.app";
const STORAGE_KEY = "engine_study_token";

// Auth.js v5 cookie names (HTTPS uses the __Secure- prefix)
const COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

async function readSessionCookie() {
  for (const name of COOKIE_NAMES) {
    const cookie = await chrome.cookies.get({ url: BACKEND_URL, name });
    if (cookie?.value) return cookie.value;
  }
  return null;
}

async function fetchToken() {
  const jwt = await readSessionCookie();
  if (!jwt) return { ok: false, reason: "no-session" };

  try {
    const resp = await fetch(`${BACKEND_URL}/api/extension/token`, {
      headers: { "X-Session-Token": jwt },
    });
    if (!resp.ok) return { ok: false, reason: `http-${resp.status}` };
    const { token } = await resp.json();
    await chrome.storage.local.set({ [STORAGE_KEY]: token });
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: "network" };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_TOKEN") {
    fetchToken().then(sendResponse);
    return true; // async
  }
});
