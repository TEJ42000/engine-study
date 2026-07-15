const uploadBtn = document.getElementById('upload-btn');
const fileListDiv = document.getElementById('file-list');
const statusDiv = document.getElementById('status');
const courseTitleH1 = document.getElementById('course-title');

let detectedFiles = [];
let detectedCourse = "";

// Get the Engine Study URL from storage or default
const DEFAULT_URL = "https://webapp-theta-beige.vercel.app";

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: "scan" }, (response) => {
    if (response) {
      detectedFiles = response.files || [];
      detectedCourse = response.courseName || "";
      if (courseTitleH1) courseTitleH1.innerText = detectedCourse || "Course Content";
      renderFiles();
    } else {
      fileListDiv.innerText = "No files detected.";
    }
  });
});

function renderFiles() {
  fileListDiv.innerHTML = '';
  if (detectedFiles.length === 0) {
    fileListDiv.innerText = "No files detected.";
    return;
  }

  detectedFiles.forEach((file, index) => {
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      <input type="checkbox" id="file-${index}" checked>
      <label for="file-${index}">${file.name}</label>
    `;
    fileListDiv.appendChild(div);
  });
  uploadBtn.disabled = false;
}

uploadBtn.addEventListener('click', async () => {
  const selectedIndices = detectedFiles.map((_, i) => i).filter(i => 
    document.getElementById(`file-${i}`).checked
  );

  if (selectedIndices.length === 0) return;

  uploadBtn.disabled = true;
  statusDiv.innerText = "Starting upload...";

  const formData = new FormData();
  
  for (const i of selectedIndices) {
    const file = detectedFiles[i];
    statusDiv.innerText = `Fetching ${file.name}...`;
    try {
      const resp = await fetch(file.url);
      const blob = await resp.blob();
      formData.append('files', blob, file.name);
    } catch (e) {
      console.error("Failed to fetch", file.url);
    }
  }

  statusDiv.innerText = "Sending to Engine Study...";
  
  try {
    const resp = await fetch(`${DEFAULT_URL}/api/ai/extract-batch`, {
      method: 'POST',
      body: formData,
      // Credentials 'include' is key to send the session cookie
      credentials: 'include'
    });

    if (resp.ok) {
      statusDiv.innerText = "Success! Extraction complete.";
      const result = await resp.json();
      console.log("Extracted:", result);
      // Optional: open the course generation page
      // chrome.tabs.create({ url: `${DEFAULT_URL}/courses/new?extracted=${encodeURIComponent(JSON.stringify(result))}` });
    } else {
      const err = await resp.json();
      statusDiv.innerText = `Error: ${err.error || 'Upload failed'}`;
    }
  } catch (e) {
    statusDiv.innerText = "Upload failed. Is Engine Study open?";
  } finally {
    uploadBtn.disabled = false;
  }
});
