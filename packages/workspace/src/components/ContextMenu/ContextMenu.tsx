'use client';

/**
 * VastuContextMenu — reusable context menu component.
 *
 * Renders a portaled menu at the cursor position when the user right-clicks
 * a `[data-context]` child element. Reads `data-context-type` and
 * `data-context-value` attributes to expose context to the caller.
 *
 * Positioning:
 * - Opens at cursor (x, y).
 * - Flips horizontally and/or vertically when near the viewport edge so
 *   the menu always stays within the visible area.
 *
 * Keyboard navigation (US-113 AC-10):
 * - ArrowDown / ArrowUp: move focus through menu items
 * - Enter / Space: activate focused item
 * - Escape: close menu, return focus to trigger
 * - Home / End: jump to first / last item
 *
 * ARIA (US-113):
 * - Container: role="menu"
 * - Items: role="menuitem" (managed by ContextMenuItem)
 * - Focus trap: Tab key does not escape the menu
 *
 * Portal:
 * - Rendered via ReactDOM.createPortal into document.body to avoid
 *   overflow:hidden clipping from ancestor containers.
 *
 * MCP NOTE (Phase 2):
 * - Intent: expose `contextmenu.open(type, value)` and `contextmenu.select(action)`
 *   as MCP tools so the agent can trigger and interact with context menus.
 *
 * Implements US-113 (all ACs).
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { t } from '../../lib/i18n';
import classes from './ContextMenu.module.css';

export interface ContextMenuContextData {
  /** The data-context-type attribute value of the right-clicked element. */
  contextType: string;
  /** The data-context-value attribute value of the right-clicked element. */
  contextValue: string;
  /** The element that was right-clicked. */
  target: HTMLElement;
}

export interface ContextMenuProps {
  /**
   * Render function that receives the context data and returns menu content.
   * Return null to suppress the menu for a given context type.
   */
  renderMenu: (context: ContextMenuContextData) => React.ReactNode;
  /** The content area in which right-click is captured. */
  children: React.ReactNode;
  /** Additional class name on the wrapper element. */
  className?: string;
}

interface MenuPosition {
  x: number;
  y: number;
}

/** Padding kept between menu and viewport edge (px). */
const VIEWPORT_PADDING = 8;

/** Estimated max menu height used for flip calculation before first paint. */
const ESTIMATED_MENU_HEIGHT = 240;

/** Estimated max menu width used for flip calculation before first paint. */
const ESTIMATED_MENU_WIDTH = 240;

export function ContextMenu({ renderMenu, children, className }: ContextMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState<MenuPosition>({ x: 0, y: 0 });
  const [contextData, setContextData] = React.useState<ContextMenuContextData | null>(null);

  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // ─── Close helpers ───────────────────────────────────────────────────
  const close = React.useCallback(() => {
    setIsOpen(false);
    setContextData(null);
    // Return focus to the element that was right-clicked
    if (triggerRef.current) {
      triggerRef.current.focus({ preventScroll: true });
      triggerRef.current = null;
    }
  }, []);

  // ─── Intercept right-click on [data-context] descendants ─────────────
  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-context]');
      if (!target) return;

      e.preventDefault();

      const contextType = target.dataset.contextType ?? '';
      const contextValue = target.dataset.contextValue ?? '';

      // Compute safe position: flip when near viewport edge
      const menuWidth = ESTIMATED_MENU_WIDTH;
      const menuHeight = ESTIMATED_MENU_HEIGHT;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let x = e.clientX;
      let y = e.clientY;

      if (x + menuWidth + VIEWPORT_PADDING > vw) {
        x = vw - menuWidth - VIEWPORT_PADDING;
      }
      if (y + menuHeight + VIEWPORT_PADDING > vh) {
        y = vh - menuHeight - VIEWPORT_PADDING;
      }
      // Clamp to avoid negative positions
      x = Math.max(VIEWPORT_PADDING, x);
      y = Math.max(VIEWPORT_PADDING, y);

      triggerRef.current = target;
      setPosition({ x, y });
      setContextData({ contextType, contextValue, target });
      setIsOpen(true);
    },
    [],
  );

  // ─── After menu renders, adjust position based on actual dimensions ──
  React.useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let { x, y } = position;
    let changed = false;

    if (rect.right + VIEWPORT_PADDING > vw) {
      x = vw - rect.width - VIEWPORT_PADDING;
      changed = true;
    }
    if (rect.bottom + VIEWPORT_PADDING > vh) {
      y = vh - rect.height - VIEWPORT_PADDING;
      changed = true;
    }
    x = Math.max(VIEWPORT_PADDING, x);
    y = Math.max(VIEWPORT_PADDING, y);

    if (changed) {
      setPosition({ x, y });
    }
  }, [isOpen, position]);

  // ─── Focus first item when menu opens ───────────────────────────────
  React.useEffect(() => {
    if (!isOpen) return;
    // Defer so the DOM is rendered first
    requestAnimationFrame(() => {
      const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    });
  }, [isOpen]);

  // ─── Keyboard navigation inside menu ─────────────────────────────────
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!menuRef.current) return;

      const items = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
      );
      if (items.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const currentIndex = active ? items.indexOf(active) : -1;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[next]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          items[prev]?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          items[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
        }
        case 'Escape': {
          e.preventDefault();
          close();
          break;
        }
        case 'Tab': {
          // Trap focus within the menu
          e.preventDefault();
          break;
        }
        default:
          break;
      }
    },
    [close],
  );

  // ─── Close on outside click or when overlay is clicked ──────────────
  const handleOverlayClick = React.useCallback(() => {
    close();
  }, [close]);

  // ─── Render ──────────────────────────────────────────────────────────
  const menuContent =
    isOpen && contextData ? renderMenu(contextData) : null;

  // Suppress the menu when renderMenu returns null
  const shouldShow = isOpen && contextData !== null && menuContent !== null;

  return (
    <>
      <div
        ref={wrapperRef}
        className={className}
        onContextMenu={handleContextMenu}
      >
        {children}
      </div>

      {shouldShow &&
        ReactDOM.createPortal(
          <>
            {/* Invisible overlay to capture outside clicks */}
            <div
              className={classes.overlay}
              onClick={handleOverlayClick}
              onContextMenu={(e) => {
                e.preventDefault();
                close();
              }}
              aria-hidden="true"
            />

            {/* Menu panel */}
            <div
              ref={menuRef}
              role="menu"
              aria-label={t('contextMenu.ariaLabel')}
              className={classes.menu}
              style={{ left: position.x, top: position.y }}
              onKeyDown={handleKeyDown}
              // Prevent clicks inside the menu from closing via the overlay
              onClick={(e) => e.stopPropagation()}
            >
              {menuContent}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
