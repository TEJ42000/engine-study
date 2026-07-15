const uploadBtn = document.getElementById('upload-btn');
const fileListDiv = document.getElementById('file-list');
const statusDiv = document.getElementById('status');
const courseTitleH1 = document.getElementById('course-title');

const BACKEND_URL = "https://webapp-theta-beige.vercel.app";

let detectedFiles = [];
let detectedCourse = "";
let extensionToken = null;
let activeTabId = null;

async function fetchExtensionToken() {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/extension/token`, {
      credentials: 'include'
    });
    if (!resp.ok) return null;
    const { token } = await resp.json();
    return token;
  } catch (e) {
    return null;
  }
}

function setStatus(msg, isError = false) {
  statusDiv.innerText = msg;
  statusDiv.style.color = isError ? '#dc2626' : '#666';
}

function renderFiles() {
  fileListDiv.innerHTML = '';
  if (detectedFiles.length === 0) {
    fileListDiv.innerText = "No PDF, PPTX, or DOCX files detected on this page.";
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
  setStatus("Connecting to Engine Study...");

  // 1. Get auth token (requires user to be logged in at the webapp)
  extensionToken = await fetchExtensionToken();
  if (!extensionToken) {
    fileListDiv.innerHTML = `<p style="color:#dc2626;font-size:12px;">Not logged in to Engine Study.<br>
      <a href="${BACKEND_URL}" target="_blank" style="color:#2563eb;">Sign in here</a>, then re-open this popup.</p>`;
    setStatus("");
    return;
  }

  // 2. Scan current Brightspace tab for files
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab.id;

  if (!tab.url?.includes('brightspace.com') && !tab.url?.includes('localhost') && !tab.url?.includes('augmentusercontent.com')) {
    fileListDiv.innerText = "Navigate to a Brightspace course page to detect files.";
    setStatus("");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "scan" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      fileListDiv.innerText = "Could not scan page. Try refreshing the tab.";
      setStatus("");
      return;
    }
    detectedFiles = response.files || [];
    detectedCourse = response.courseName || "";
    if (courseTitleH1) courseTitleH1.innerText = detectedCourse || "Course Content";
    setStatus("Ready");
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

    // Ask content script to fetch the file (it has the correct session context)
    const result = await new Promise(resolve => {
      chrome.tabs.sendMessage(activeTabId, { action: "fetchFile", url: file.url }, resolve);
    });

    if (result?.ok && result.base64) {
      // Convert base64 back to Blob
      const binary = atob(result.base64);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
      const blob = new Blob([bytes]);
      formData.append('files', blob, file.name);
      fetchedCount++;
    } else {
      setStatus(`Warning: could not fetch ${file.name}`, true);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  if (fetchedCount === 0) {
    setStatus("No files could be fetched.", true);
    uploadBtn.disabled = false;
    return;
  }

  setStatus(`Sending ${fetchedCount} file(s) to Engine Study...`);

  try {
    const resp = await fetch(`${BACKEND_URL}/api/ai/extract-batch`, {
      method: 'POST',
      headers: { 'X-Extension-Token': extensionToken },
      body: formData,
    });

    if (resp.ok) {
      const result = await resp.json();
      setStatus("✓ Extraction complete! Opening Dashboard...");
      const params = encodeURIComponent(JSON.stringify(result));
      setTimeout(() => {
        chrome.tabs.create({ url: `${BACKEND_URL}/courses/new?extracted=${params}` });
      }, 800);
    } else {
      const err = await resp.json().catch(() => ({}));
      setStatus(`Error: ${err.error || `Server returned ${resp.status}`}`, true);
    }
  } catch (e) {
    setStatus("Upload failed. Check your connection.", true);
  } finally {
    uploadBtn.disabled = false;
  }
});

init();
