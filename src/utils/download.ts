/**
 * Triggers a browser file download for text or JSON content.
 */
export function downloadFile(
  content: string,
  filename: string,
  mime = 'application/json;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
