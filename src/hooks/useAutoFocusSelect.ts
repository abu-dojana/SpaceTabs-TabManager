import React from 'react';

/**
 * Automatically focuses and selects the text of an input element when `active` becomes truthy.
 */
export function useAutoFocusSelect(
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  active: unknown
): void {
  React.useEffect(() => {
    if (active && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [active, inputRef]);
}
