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

function showNotLoggedIn() {
  fileListDiv.innerHTML = `<p style="font-size:12px;line-height:1.6;color:#333;">
    <a href="${BACKEND_URL}" target="_blank" style="color:#2563eb;font-weight:600;">Sign in to Engine Study</a>
    in this browser, then re-open this popup.</p>`;
  setStatus("Not logged in", true);
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

async function init() {
  setStatus("Connecting...");

  // 1. Ask background to fetch a fresh token via session cookie
  //    (background service workers can send cookies; popups cannot)
  const result = await new Promise(r =>
    chrome.runtime.sendMessage({ type: "FETCH_TOKEN" }, r)
  );

  if (result?.ok && result.token) {
    extensionToken = result.token;
  } else {
    // Fall back to cached token
    extensionToken = await new Promise(r =>
      chrome.storage.local.get(STORAGE_KEY, d => r(d[STORAGE_KEY] || null))
    );
  }

  if (!extensionToken) {
    showNotLoggedIn();
    return;
  }

  // 2. Scan the current Brightspace tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab.id;

  if (!tab.url?.includes('brightspace')) {
    fileListDiv.innerText = "Navigate to a Brightspace course page to detect files.";
    setStatus("Connected ✓");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "scan" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      fileListDiv.innerText = "Could not scan page. Try refreshing the Brightspace tab.";
      setStatus("Connected ✓");
      return;
    }
    detectedFiles = response.files || [];
    detectedCourse = response.courseName || "";
    if (courseTitleH1) courseTitleH1.innerText = detectedCourse || "Course Content";
    setStatus(detectedFiles.length > 0 ? `${detectedFiles.length} file(s) found ✓` : "Connected ✓");
    renderFiles();
  });
}

uploadBtn.addEventListener('click', async () => {
  const selectedIndices = detectedFiles
    .map((_, i) => i)
    .filter(i => document.getElementById(`file-${i}`)?.checked);

  if (selectedIndices.length === 0 || !extensionToken) return;

  uploadBtn.disabled = true;
  const formData = new FormData();
  let fetchedCount = 0;

  for (const i of selectedIndices) {
    const file = detectedFiles[i];
    setStatus(`Fetching ${file.name} (${fetchedCount + 1}/${selectedIndices.length})...`);

    const result = await new Promise(resolve => {
      chrome.tabs.sendMessage(activeTabId, { action: "fetchFile", url: file.url }, resolve);
    });

    if (result?.ok && result.base64) {
      const binary = atob(result.base64);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      formData.append('files', new Blob([bytes]), file.name);
      fetchedCount++;
    } else {
      setStatus(`Could not fetch "${file.name}" — skipping`, true);
      await new Promise(r => setTimeout(r, 800));
    }
  }

  if (fetchedCount === 0) {
    setStatus("No files could be fetched.", true);
    uploadBtn.disabled = false;
    return;
  }

  setStatus(`Uploading ${fetchedCount} file(s)...`);

  try {
    const resp = await fetch(`${BACKEND_URL}/api/ai/extract-batch`, {
      method: 'POST',
      headers: { 'X-Extension-Token': extensionToken },
      body: formData,
    });

    if (resp.ok) {
      const result = await resp.json();
      setStatus("✓ Done! Opening course builder...");
      const params = encodeURIComponent(JSON.stringify(result));
      setTimeout(() => {
        chrome.tabs.create({ url: `${BACKEND_URL}/courses/new?extracted=${params}` });
      }, 800);
    } else {
      const err = await resp.json().catch(() => ({}));
      if (resp.status === 401) {
        chrome.storage.local.remove(STORAGE_KEY);
        showNotLoggedIn();
      } else {
        setStatus(`Error: ${err.error || `Server error ${resp.status}`}`, true);
      }
    }
  } catch (e) {
    setStatus("Upload failed. Check your connection.", true);
  } finally {
    uploadBtn.disabled = false;
  }
});

init();
