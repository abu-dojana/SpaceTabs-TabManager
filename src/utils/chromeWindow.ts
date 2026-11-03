/**
 * Returns the host window ID of the current extension tab (or falls back to the focused window).
 */
export async function getHostWindowId(): Promise<number | null> {
  try {
    const tab = await chrome.tabs.getCurrent().catch(() => null);
    if (tab?.windowId) return tab.windowId;
    const win = await chrome.windows.getCurrent().catch(() => null);
    return win?.id ?? null;
  } catch {
    return null;
  }
}
