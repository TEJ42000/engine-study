const uploadBtn = document.getElementById('upload-btn');
const fileListDiv = document.getElementById('file-list');
const statusDiv = document.getElementById('status');
const courseTitleH1 = document.getElementById('course-title');

const BACKEND_URL = "https://webapp-theta-beige.vercel.app";
const STORAGE_KEY = "engine_study_token";

let detectedFiles = [];
let detectedCourse = "";
let extensionToken = null;
let activeTabId = null;

function setStatus(msg, isError = false) {
  statusDiv.innerText = msg;
  statusDiv.style.color = isError ? '#dc2626' : '#666';
}

function renderFiles() {
  fileListDiv.innerHTML = '';
  if (detectedFiles.length === 0) {
    fileListDiv.innerText = "No PDF, PPTX, or DOCX files found on this page.";
    return;
  }
  detectedFiles.forEach((file, index) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `<input type="checkbox" id="file-${index}" checked>
      <label for="file-${index}" title="${file.url}">${file.name || 'Unnamed file'}</label>`;
    fileListDiv.appendChild(div);
  });
  uploadBtn.disabled = false;
}

async function getAuthToken() {
  // 1. Read session cookie directly from Chrome's cookie jar (bypasses SameSite=Lax)
  const cookieNames = ["__Secure-authjs.session-token", "authjs.session-token"];
  let jwt = null;
  for (const name of cookieNames) {
    const cookie = await new Promise(r =>
      chrome.cookies.get({ url: BACKEND_URL, name }, r)
    );
    if (cookie?.value) { jwt = cookie.value; break; }
  }

  if (!jwt) {
    return { ok: false, error: 'not-logged-in' };
  }

  // 2. Exchange the raw JWT for a stable extension token
  try {
    const resp = await fetch(`${BACKEND_URL}/api/ext-auth`, {
      headers: { "X-Session-Token": jwt }
    });
    if (!resp.ok) return { ok: false, error: `server-${resp.status}` };
    const { token } = await resp.json();
    chrome.storage.local.set({ [STORAGE_KEY]: token });
    return { ok: true, token };
  } catch (e) {
    // Offline: try stale cached token
    const cached = await new Promise(r =>
      chrome.storage.local.get(STORAGE_KEY, d => r(d[STORAGE_KEY] || null))
    );
    if (cached) return { ok: true, token: cached };
    return { ok: false, error: 'network' };
  }
}

async function init() {
  setStatus("Connecting...");

  const auth = await getAuthToken();

  if (!auth.ok) {
    fileListDiv.innerHTML = `<p style="font-size:12px;line-height:1.6;color:#333;">
      <a href="${BACKEND_URL}" target="_blank" style="color:#2563eb;font-weight:600;">Sign in to Engine Study</a>
      in this browser, then re-open this popup.<br>
      <span style="color:#aaa;font-size:10px;">Reason: ${auth.error}</span></p>`;
    setStatus("Not logged in", true);
    return;
  }

  extensionToken = auth.token;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab.id;

  if (!tab.url?.includes('brightspace')) {
    fileListDiv.innerText = "Navigate to a Brightspace course page to detect files.";
    setStatus("Connected \u2713");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "scan" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      fileListDiv.innerText = "Could not scan page. Try refreshing the Brightspace tab.";
      setStatus("Connected \u2713");
      return;
    }
    detectedFiles = response.files || [];
    detectedCourse = response.courseName || "";
    if (courseTitleH1) courseTitleH1.innerText = detectedCourse || "Course Content";
    setStatus(detectedFiles.length > 0 ? `${detectedFiles.length} file(s) found \u2713` : "Connected \u2713");
    renderFiles();
  });
}

uploadBtn.addEventListener('click', async () => {
  const selectedIndices = detectedFiles
    .map((_, i) => i)
    .filter(i => document.getElementById(`file-${i}`)?.checked);

  if (selectedIndices.length === 0 || !extensionToken) return;

  uploadBtn.disabled = true;
  const fetchedCount = selectedIndices.length; // will be checked per batch below
  if (fetchedCount === 0) {
    setStatus("No files selected.", true);
    uploadBtn.disabled = false;
    return;
  }

  // Send in batches of 4 to stay under Vercel's 4.5MB body limit
  const BATCH_SIZE = 1;
  const selectedFiles = selectedIndices.map(i => detectedFiles[i]);
  const batchCount = Math.ceil(selectedFiles.length / BATCH_SIZE);
  let lastResult = null;
  let batchNum = 0;

  for (let start = 0; start < selectedFiles.length; start += BATCH_SIZE) {
    batchNum++;
    const batchFiles = selectedFiles.slice(start, start + BATCH_SIZE);
    const batchForm = new FormData();
    let batchFetched = 0;

    for (const file of batchFiles) {
      setStatus(`Batch ${batchNum}/${batchCount}: fetching ${file.name}...`);
      const result = await new Promise(resolve => {
        chrome.tabs.sendMessage(activeTabId, { action: "fetchFile", url: file.url }, resolve);
      });
      if (result?.ok && result.base64) {
        const binary = atob(result.base64);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
        batchForm.append('files', new Blob([bytes]), file.name);
        batchFetched++;
      }
    }

    if (batchFetched === 0) continue;

    setStatus(`Uploading batch ${batchNum} of ${batchCount}...`);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/ai/extract-batch`, {
        method: 'POST',
        headers: { 'X-Extension-Token': extensionToken },
        body: batchForm,
      });
      if (resp.ok) {
        lastResult = await resp.json();
      } else {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 401) {
          chrome.storage.local.remove(STORAGE_KEY);
          setStatus("Session expired — re-open popup.", true);
          uploadBtn.disabled = false;
          return;
        }
        setStatus(`Error batch ${batchNum}: ${err.error || resp.status}`, true);
        uploadBtn.disabled = false;
        return;
      }
    } catch (e) {
      setStatus(`Upload failed on batch ${batchNum}.`, true);
      uploadBtn.disabled = false;
      return;
    }
  }

  if (lastResult) {
    setStatus("\u2713 Done! Opening course builder...");
    const params = encodeURIComponent(JSON.stringify(lastResult));
    setTimeout(() => {
      chrome.tabs.create({ url: `${BACKEND_URL}/courses/new?extracted=${params}` });
    }, 800);
  }
  uploadBtn.disabled = false;
});

init();
