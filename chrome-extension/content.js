// Engine Study content script for D2L Brightspace (brightspace.rug.nl + *.brightspace.com)
//
// D2L serves files through a custom viewer — files never appear as plain <a href="...pdf">
// links. Instead we use D2L's own REST API (same origin, user's session cookie is sent
// automatically) to resolve the real file download URL for each topic.
//
// API used:
//   GET /d2l/api/le/1.0/<orgUnitId>/content/topics/<topicId>
//   → returns { Url, ... } where Url is the download URL for the file

function courseNameClean(text) {
  if (!text) return "";
  return text.split(' - ')[0].split(' | ')[0].trim().replace(/\s+/g, ' ');
}

function getCourseName() {
  const selectors = [
    '.d2l-navigation-sitetitle-text',
    '.d2l-navigation-sitetitle-link',
    'h1.d2l-page-title',
    '.d2l-course-name',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.innerText?.trim()) return courseNameClean(el.innerText.trim());
  }
  return courseNameClean(document.title);
}

// Extract orgUnitId and topicId from current URL or page links
// URL pattern: /d2l/le/lessons/<orgUnitId>/topics/<topicId>
function parseD2LUrl(url) {
  const m = url.match(/\/d2l\/le\/lessons\/(\d+)\/topics\/(\d+)/);
  if (m) return { orgUnitId: m[1], topicId: m[2] };
  // Also try /d2l/lp/... pattern
  const m2 = url.match(/\/d2l\/lp\/.*?\/(\d+)\/topics\/(\d+)/);
  if (m2) return { orgUnitId: m2[1], topicId: m2[2] };
  return null;
}

// Get orgUnitId from current page URL or from course links on the page
function getOrgUnitId() {
  // From current URL
  const parsed = parseD2LUrl(window.location.href);
  if (parsed) return parsed.orgUnitId;

  // From any topic link on the page
  const links = document.querySelectorAll('a[href*="/d2l/le/lessons/"]');
  for (const a of links) {
    const p = parseD2LUrl(a.href);
    if (p) return p.orgUnitId;
  }

  // From URL path like /d2l/home/470363
  const m = window.location.pathname.match(/\/(\d{5,})/);
  return m ? m[1] : null;
}

// Collect all topic IDs visible in the left-hand nav sidebar
function getTopicIds() {
  const ids = new Set();

  // Current page topic
  const current = parseD2LUrl(window.location.href);
  if (current) ids.add(current.topicId);

  // All topic links in the sidebar/content list
  document.querySelectorAll('a[href*="/topics/"]').forEach(a => {
    const p = parseD2LUrl(a.href);
    if (p) ids.add(p.topicId);
  });

  // d2l-le-lesson-topic elements (web components)
  document.querySelectorAll('[data-topic-id]').forEach(el => {
    const id = el.getAttribute('data-topic-id');
    if (id) ids.add(id);
  });

  return [...ids];
}

// Call D2L's content API to get topic metadata (including the file URL)
async function getTopicInfo(orgUnitId, topicId) {
  try {
    const resp = await fetch(
      `/d2l/api/le/1.0/${orgUnitId}/content/topics/${topicId}`,
      { credentials: 'include' }
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    return null;
  }
}

// Scan the page and return all detectable files via D2L API
async function findCourseInfoAsync() {
  const courseName = getCourseName();
  const orgUnitId = getOrgUnitId();
  const files = [];

  if (orgUnitId) {
    const topicIds = getTopicIds();

    // Also try getting the full content structure
    try {
      const structResp = await fetch(
        `/d2l/api/le/1.0/${orgUnitId}/content/root/`,
        { credentials: 'include' }
      );
      if (structResp.ok) {
        const modules = await structResp.json();
        // Recursively collect topic IDs from modules
        function collectTopics(items) {
          for (const item of (items || [])) {
            if (item.Type === 1 && item.Id) topicIds.push(String(item.Id)); // Type 1 = topic
            if (item.Modules) collectTopics(item.Modules);
            if (item.Structure) collectTopics(item.Structure);
          }
        }
        collectTopics(Array.isArray(modules) ? modules : [modules]);
      }
    } catch (e) {}

    // Resolve each topic to a file URL
    const uniqueIds = [...new Set(topicIds)];
    await Promise.all(uniqueIds.map(async (topicId) => {
      const info = await getTopicInfo(orgUnitId, topicId);
      if (!info) return;

      const url = info.Url || info.url;
      const title = info.Title || info.title || `Topic ${topicId}`;
      const typeId = info.TypeIdentifier || info.typeIdentifier || '';

      // TypeIdentifier: 'File' means it's a downloadable file
      if (!url) return;
      const urlLower = url.toLowerCase();
      const isFile = urlLower.includes('.pdf') || urlLower.includes('.pptx') ||
                     urlLower.includes('.docx') || urlLower.includes('.ppt') ||
                     urlLower.includes('.doc') || typeId === 'File';
      if (!isFile) return;

      // Make absolute URL
      const absUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      files.push({ name: title, url: absUrl });
    }));
  }

  // Fallback: plain <a> file links (for simpler Brightspace setups)
  if (files.length === 0) {
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href.toLowerCase();
      if ((href.includes('.pdf') || href.includes('.pptx') || href.includes('.docx')) &&
          !a.closest('.d2l-navigation, .d2l-footer, .d2l-minibar')) {
        files.push({
          name: a.innerText.trim() || a.href.split('/').pop(),
          url: a.href
        });
      }
    });
  }

  // Deduplicate by URL
  const seen = new Set();
  const deduped = files.filter(f => {
    if (seen.has(f.url)) return false;
    seen.add(f.url);
    return true;
  });

  return { courseName, files: deduped };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchFileAsBase64(url) {
  const resp = await fetch(url, { credentials: 'include', redirect: 'follow' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return arrayBufferToBase64(await resp.arrayBuffer());
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan") {
    findCourseInfoAsync()
      .then(info => sendResponse(info))
      .catch(e => sendResponse({ courseName: '', files: [], error: e.message }));
    return true; // async
  }

  if (request.action === "fetchFile") {
    fetchFileAsBase64(request.url)
      .then(base64 => sendResponse({ ok: true, base64 }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
