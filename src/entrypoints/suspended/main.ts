const params = new URLSearchParams(window.location.search);
const hashIdx = window.location.href.indexOf('#');
const hashUrl = hashIdx !== -1 ? window.location.href.slice(hashIdx + 1) : '';
const realUrl = hashUrl || params.get('url');
const title = params.get('title');
const favIconParam = params.get('fav') || params.get('favIconUrl');

if (title) {
  document.title = title;
  const titleEl = document.getElementById('tab-title');
  if (titleEl) titleEl.textContent = title;
} else if (realUrl) {
  document.title = realUrl;
  const titleEl = document.getElementById('tab-title');
  if (titleEl) titleEl.textContent = realUrl;
}

if (realUrl) {
  const urlEl = document.getElementById('tab-url');
  if (urlEl) urlEl.textContent = realUrl;
}

// Attach native favicon via Chrome's _favicon endpoint with stored favIconUrl fallback
if (realUrl) {
  try {
    const chromeFaviconUrl = chrome.runtime.getURL(
      `/_favicon/?pageUrl=${encodeURIComponent(realUrl)}&size=32`
    );
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href =
      favIconParam && favIconParam.startsWith('http') ? favIconParam : chromeFaviconUrl;
    document.head.appendChild(link);

    if (favIconParam && favIconParam.startsWith('http')) {
      const img = new Image();
      img.onerror = () => {
        link.href = chromeFaviconUrl;
      };
      img.src = favIconParam;
    }
  } catch {
    // Ignore if running outside extension context
  }
}

// Track when this page was initialized
const initTime = Date.now();
let isRestoring = false;

function restore() {
  if (isRestoring || !realUrl) return;
  isRestoring = true;

  if (realUrl.startsWith('http://') || realUrl.startsWith('https://')) {
    window.location.replace(realUrl);
  } else {
    try {
      chrome.tabs.getCurrent((tab) => {
        if (tab?.id) {
          chrome.tabs.update(tab.id, { url: realUrl });
        } else {
          window.location.replace(realUrl);
        }
      });
    } catch {
      window.location.replace(realUrl);
    }
  }
}

function checkVisibleAndRestore() {
  if (document.visibilityState !== 'visible') return;
  const elapsed = Date.now() - initTime;
  if (elapsed > 800) {
    restore();
  } else {
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        restore();
      }
    }, 850 - elapsed);
  }
}

// 1. Explicit user click anywhere on the page restores immediately
window.addEventListener('click', restore);

// 2. If already visible on load (e.g. opened from history or active tab), restore after grace period
checkVisibleAndRestore();

// 3. Tab visibility change: restore when the user actively selects this tab
document.addEventListener('visibilitychange', checkVisibleAndRestore);

// 4. Tab focus event: restore when focused and visible
window.addEventListener('focus', checkVisibleAndRestore);

// 4. Support Alt+Shift+W on suspended tabs even if Chrome's command binding is unassigned
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyW') {
    e.preventDefault();
    try {
      chrome.runtime.sendMessage({ type: 'FOCUS_DASHBOARD' });
    } catch {
      // Ignore if outside extension runtime
    }
  }
});
