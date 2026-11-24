import React from 'react';

interface FixedPopoverOptions {
  isOpen: boolean;
  align?: 'right' | 'left';
  offset?: number;
}

/**
 * Positions an open dropdown/popover using `position: fixed` relative to its
 * parent element (`menuEl.parentElement`) so it is never clipped by ancestor
 * `overflow-y: auto` or `overflow: hidden` scroll containers, and automatically
 * flips upward or clamps within the viewport when near the bottom of the screen.
 */
export function useFixedPopover<T extends HTMLElement = HTMLDivElement>(
  { isOpen, align = 'right', offset = 6 }: FixedPopoverOptions,
  externalRef?: React.RefObject<T>
): React.RefObject<T> {
  const internalRef = React.useRef<T>(null!);
  const menuRef = externalRef || internalRef;

  React.useLayoutEffect(() => {
    if (!isOpen) return;
    const menuEl = menuRef.current;
    if (!menuEl) return;
    const anchorEl = menuEl.parentElement;
    if (!anchorEl) return;

    const updatePosition = () => {
      const anchorRect = anchorEl.getBoundingClientRect();
      const menuRect = menuEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 8;

      // Vertical placement: prefer opening downward, flip upward if it would overflow bottom
      let top = anchorRect.bottom + offset;
      if (top + menuRect.height > vh - margin) {
        const upTop = anchorRect.top - menuRect.height - offset;
        if (upTop >= margin) {
          top = upTop;
        } else {
          top = Math.max(margin, vh - menuRect.height - margin);
        }
      }

      // Horizontal placement: right-aligned or left-aligned to anchor, clamped to viewport
      let left =
        align === 'right' ? anchorRect.right - menuRect.width : anchorRect.left;
      if (left + menuRect.width > vw - margin) {
        left = vw - menuRect.width - margin;
      }
      if (left < margin) {
        left = margin;
      }

      menuEl.style.position = 'fixed';
      menuEl.style.top = `${Math.round(top)}px`;
      menuEl.style.left = `${Math.round(left)}px`;
      menuEl.style.right = 'auto';
      menuEl.style.bottom = 'auto';
      menuEl.style.zIndex = '9999';
    };

    updatePosition();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updatePosition())
        : null;
    resizeObserver?.observe(menuEl);

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, align, offset, menuRef]);

  return menuRef;
}
