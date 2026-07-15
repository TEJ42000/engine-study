// D2L Brightspace uses several patterns to serve files:
// 1. Direct links: href ending in .pdf/.pptx/.docx
// 2. D2L topic viewer: /d2l/le/lessons/<course>/topics/<id> — the file is
//    embedded in an <iframe> whose src is a /d2l/lor/... or /d2l/lp/... URL
// 3. D2L content list: topic rows with data-topic-id attributes and a file icon
// 4. The current page URL itself may be a streamed file viewer

function courseNameClean(text) {
  if (!text) return "";
  return text.split(' - ')[0].split(' | ')[0].trim().replace(/\s+/g, ' ');
}

function getCourseName() {
  const selectors = [
    '.d2l-navigation-sitetitle-text',
    '.d2l-navigation-sitetitle-link',
    'h1.d2l-page-title',
    'd2l-navigation-link-text',
    '.d2l-course-name',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.innerText?.trim()) return courseNameClean(el.innerText.trim());
  }
  return courseNameClean(document.title);
}

function isFileUrl(url) {
  const u = url.toLowerCase();
  return u.includes('.pdf') || u.includes('.pptx') || u.includes('.docx') ||
         u.includes('.ppt') || u.includes('.doc');
}

function isD2LFileRoute(url) {
  // D2L serves files through /d2l/lor/ or /d2l/lp/ or /content/
  return url.includes('/d2l/lor/') || url.includes('/d2l/lp/') ||
         url.includes('/content/') || url.includes('/d2l/common/');
}

function getFilenameFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const last = parts[parts.length - 1];
    if (last && last.includes('.')) return decodeURIComponent(last);
  } catch (e) {}
  return null;
}

function scanDocument(doc, baseLabel) {
  const files = [];

  // 1. Direct file links (<a href="...pdf">)
  doc.querySelectorAll('a[href]').forEach(a => {
    if (isFileUrl(a.href) && !a.closest('.d2l-navigation, .d2l-footer, .d2l-minibar')) {
      const name = a.innerText.trim() || a.title || getFilenameFromUrl(a.href) || 'File';
      files.push({ name, url: a.href });
    }
  });

  // 2. D2L topic list items — each row may have a data attribute or link
  //    that points to a viewer page. We extract the viewer URL and let
  //    fetchFile handle the redirect to the real file.
  doc.querySelectorAll('[data-topic-id], .d2l-le-lesson-topic').forEach(row => {
    const link = row.querySelector('a[href]');
    if (!link) return;
    const href = link.href;
    if (!href || href === '#') return;
    // Only include topic viewer URLs (they serve files)
    if (href.includes('/d2l/le/lessons/') || href.includes('/d2l/lp/') ||
        href.includes('/d2l/lor/')) {
      const name = link.innerText.trim() || link.title || 'Topic';
      files.push({ name, url: href, isD2LTopic: true });
    }
  });

  // 3. Embedded iframes (D2L wraps files in iframes)
  doc.querySelectorAll('iframe[src]').forEach(iframe => {
    const src = iframe.src;
    if (isFileUrl(src) || isD2LFileRoute(src)) {
      const name = getFilenameFromUrl(src) || iframe.title || 'Embedded file';
      files.push({ name, url: src });
    }
    // Try to scan same-origin iframe content
    try {
      const iDoc = iframe.contentDocument;
      if (iDoc) scanDocument(iDoc, name).forEach(f => files.push(f));
    } catch (e) { /* cross-origin, skip */ }
  });

  // 4. Object/embed tags (some D2L versions use these for PDFs)
  doc.querySelectorAll('object[data], embed[src]').forEach(el => {
    const src = el.data || el.src;
    if (src && isFileUrl(src)) {
      files.push({ name: getFilenameFromUrl(src) || 'Embedded', url: src });
    }
  });

  return files;
}

function findCourseInfo() {
  const courseName = getCourseName();
  const allFiles = scanDocument(document, '');

  // Deduplicate by URL
  const seen = new Set();
  const files = allFiles.filter(f => {
    const key = f.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { courseName, files };
}

async function fetchFileAsBase64(url) {
  // For D2L topic viewer pages, follow the redirect chain to get the real file
  const resp = await fetch(url, { credentials: 'include', redirect: 'follow' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const contentType = resp.headers.get('content-type') || '';

  // If D2L returned HTML (viewer page), try to extract the real file URL from it
  if (contentType.includes('text/html')) {
    const html = await resp.text();
    // Look for the actual file URL in the HTML
    const patterns = [
      /["'](https?:\/\/[^"']+\.(?:pdf|pptx|docx|ppt|doc))[?#"']/gi,
      /src=["'](\/[^"']+\.(?:pdf|pptx|docx|ppt|doc))[?#"']/gi,
      /href=["'](\/[^"']+\.(?:pdf|pptx|docx|ppt|doc))[?#"']/gi,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match) {
        const fileUrl = match[1].startsWith('http')
          ? match[1]
          : new URL(match[1], url).href;
        const fileResp = await fetch(fileUrl, { credentials: 'include' });
        if (fileResp.ok) {
          return arrayBufferToBase64(await fileResp.arrayBuffer());
        }
      }
    }
    throw new Error('Could not find file in viewer page');
  }

  return arrayBufferToBase64(await resp.arrayBuffer());
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Process in chunks to avoid call stack overflow on large files
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan") {
    try {
      const info = findCourseInfo();
      sendResponse(info);
    } catch (e) {
      sendResponse({ courseName: '', files: [], error: e.message });
    }
    return false;
  }

  if (request.action === "fetchFile") {
    fetchFileAsBase64(request.url)
      .then(base64 => sendResponse({ ok: true, base64 }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async response
  }
});
