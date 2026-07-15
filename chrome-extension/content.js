function findCourseInfo() {
  const courseTitle = document.querySelector(
    '.d2l-navigation-sitetitle-text, .d2l-navigation-sitetitle-link, h1.d2l-page-title'
  )?.innerText?.trim();

  const links = Array.from(document.querySelectorAll('a[href]'));
  const fileLinks = links.filter(a => {
    const href = a.href.toLowerCase();
    return (href.includes('.pdf') || href.includes('.pptx') || href.includes('.docx')) &&
           !a.closest('.d2l-navigation, .d2l-footer, .d2l-minibar');
  });

  // Also scan iframes for content links (D2L often nests content in iframes)
  const iframeLinks = [];
  try {
    Array.from(document.querySelectorAll('iframe')).forEach(iframe => {
      try {
        const iDoc = iframe.contentDocument;
        if (!iDoc) return;
        Array.from(iDoc.querySelectorAll('a[href]')).forEach(a => {
          const href = a.href.toLowerCase();
          if (href.includes('.pdf') || href.includes('.pptx') || href.includes('.docx')) {
            iframeLinks.push({ name: a.innerText.trim() || a.href.split('/').pop(), url: a.href });
          }
        });
      } catch (e) { /* cross-origin iframe, skip */ }
    });
  } catch (e) {}

  const allFiles = [
    ...fileLinks.map(a => ({ name: a.innerText.trim() || a.href.split('/').pop(), url: a.href })),
    ...iframeLinks
  ];

  // Deduplicate by URL
  const seen = new Set();
  const dedupedFiles = allFiles.filter(f => {
    if (seen.has(f.url)) return false;
    seen.add(f.url);
    return true;
  });

  return {
    courseName: courseNameClean(courseTitle || document.title),
    files: dedupedFiles
  };
}

function courseNameClean(text) {
  return text.split(' - ')[0].trim().replace(/\s+/g, ' ');
}

async function fetchFileAsBase64(url) {
  const resp = await fetch(url, { credentials: 'include' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan") {
    const info = findCourseInfo();
    sendResponse(info);
    return false;
  }

  if (request.action === "fetchFile") {
    fetchFileAsBase64(request.url)
      .then(base64 => sendResponse({ ok: true, base64 }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async response
  }
});
