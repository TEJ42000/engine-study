/**
 * Content script for Brightspace detection.
 * Scans the DOM for PDF and PPTX links.
 */

function findCourseInfo() {
  // Brightspace specific selectors
  const courseTitle = document.querySelector('.d2l-navigation-sitetitle-text, .d2l-navigation-sitetitle-link')?.innerText?.trim();
  
  const links = Array.from(document.querySelectorAll('a[href]'));
  const fileLinks = links.filter(a => {
    const href = a.href.toLowerCase();
    // Prioritize actual content links, ignore UI noise
    return (href.includes('.pdf') || href.includes('.pptx')) && 
           !a.closest('.d2l-navigation, .d2l-footer, .d2l-minibar');
  });

  return {
    courseName: courseTitle || document.title.split('-')[0].trim(),
    files: fileLinks.map(a => ({
      name: a.innerText.trim() || a.href.split('/').pop(),
      url: a.href
    }))
  };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scan") {
    const info = findCourseInfo();
    sendResponse(info);
  }
});
