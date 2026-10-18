const params = new URLSearchParams(window.location.search);
const realUrl = params.get('url');
const title = params.get('title');

if (title) {
  document.title = title;
  const titleEl = document.getElementById('tab-title');
  if (titleEl) titleEl.textContent = title;
}

// Attach native favicon via Chrome's _favicon endpoint
if (realUrl) {
  try {
    const faviconUrl = chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(realUrl)}&size=32`);
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrl;
    document.head.appendChild(link);
  } catch {
    // Ignore if running outside extension context
  }
}

// Restore destination on click or tab focus
function restore() {
  if (realUrl && realUrl.startsWith('http')) {
    window.location.replace(realUrl);
  }
}

window.addEventListener('click', restore);
window.addEventListener('focus', restore);
