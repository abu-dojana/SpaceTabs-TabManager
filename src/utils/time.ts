/**
 * Format relative timestamps (e.g. "Just now", "5m ago", "Yesterday")
 */
export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a due date timestamp into a human-readable badge
 */
export function formatDueDateBadge(dueDateMs?: number): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
} | null {
  if (!dueDateMs) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + 86400000;
  const startOfYesterday = startOfToday - 86400000;

  if (dueDateMs >= startOfToday && dueDateMs < startOfTomorrow) {
    return { label: 'Today', isOverdue: false, isToday: true };
  }
  if (dueDateMs >= startOfTomorrow && dueDateMs < startOfTomorrow + 86400000) {
    return { label: 'Tomorrow', isOverdue: false, isToday: false };
  }
  if (dueDateMs < startOfToday) {
    return {
      label:
        dueDateMs >= startOfYesterday
          ? 'Yesterday'
          : new Date(dueDateMs).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
      isOverdue: true,
      isToday: false,
    };
  }

  return {
    label: new Date(dueDateMs).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    isOverdue: false,
    isToday: false,
  };
}

/**
 * Format a sync timestamp into "HH:MM:SS (DD Mon, YYYY)" or "Never"
 */
export function formatSyncTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return 'Never';
  const d = new Date(timestamp);
  const timeStr = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${timeStr} (${day} ${month}, ${year})`;
}
