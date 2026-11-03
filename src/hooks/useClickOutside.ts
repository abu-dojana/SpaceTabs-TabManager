import React from 'react';

/**
 * Invokes `onOutside` when a mousedown occurs outside all provided `refs`,
 * and optionally when `Escape` is pressed.
 */
export function useClickOutside(
  refs: React.RefObject<HTMLElement | null>[],
  onOutside: () => void,
  enabled = true,
  closeOnEscape = false
): void {
  const onOutsideRef = React.useRef(onOutside);
  React.useEffect(() => {
    onOutsideRef.current = onOutside;
  }, [onOutside]);

  React.useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideAny = refs.some((ref) => ref.current && ref.current.contains(target));
      if (!isInsideAny) {
        onOutsideRef.current();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onOutsideRef.current();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    if (closeOnEscape) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      if (closeOnEscape) {
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [enabled, closeOnEscape, refs]);
}
