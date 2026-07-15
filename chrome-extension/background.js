// Background service worker
// - Receives token from webapp via externally_connectable (chrome.runtime.sendMessage)
// - Also fetches token directly using session cookie (background can send cookies)

const BACKEND_URL = "https://webapp-theta-beige.vercel.app";
const STORAGE_KEY = "engine_study_token";

// Called by the webapp page via chrome.runtime.sendMessage(EXTENSION_ID, ...)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === "ENGINE_STUDY_TOKEN" && message.token) {
    chrome.storage.local.set({ [STORAGE_KEY]: message.token }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});

// Popup can ask background to fetch a fresh token using session cookies
// (background fetch CAN send cookies; popup fetch cannot)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_TOKEN") {
    fetch(`${BACKEND_URL}/api/extension/token`, { credentials: "include" })
      .then(async (resp) => {
        if (!resp.ok) { sendResponse({ ok: false }); return; }
        const { token } = await resp.json();
        chrome.storage.local.set({ [STORAGE_KEY]: token });
        sendResponse({ ok: true, token });
      })
      .catch(() => sendResponse({ ok: false }));
    return true; // keep channel open
  }
});
