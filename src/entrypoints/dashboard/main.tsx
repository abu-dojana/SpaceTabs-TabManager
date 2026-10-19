import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@/styles/globals.css';
// Dynamically force Chrome to refresh the tab's favicon (bypasses browser pinned tab cache)
try {
  const iconUrl = chrome.runtime.getURL('icon-32.png?v=rose');
  let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'shortcut icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = iconUrl;
} catch {
  // Ignore in non-extension environments
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
