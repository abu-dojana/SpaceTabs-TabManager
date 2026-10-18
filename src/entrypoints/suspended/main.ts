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

// Track when this page was initialized
const initTime = Date.now();
let isRestoring = false;

function restore() {
  if (isRestoring) return;
  if (realUrl && realUrl.startsWith('http')) {
    isRestoring = true;
    window.location.replace(realUrl);
  }
}

// 1. Explicit user click anywhere on the page restores immediately
window.addEventListener('click', restore);

// 2. Tab visibility change: restore ONLY when the user actively selects this tab
// and only after an initial 800ms grace period so background creation never triggers it
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - initTime > 800) {
    restore();
  }
});

// 3. Tab focus event: only restore if actually visible and after grace period
window.addEventListener('focus', () => {
  if (document.visibilityState === 'visible' && Date.now() - initTime > 800) {
    restore();
  }
});

