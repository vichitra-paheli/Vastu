'use client';

/**
 * CommandPalette — global search and command overlay.
 *
 * Built on Mantine Spotlight v7 with custom styling and grouped results.
 *
 * Features:
 *   - Opens via Cmd+K (Ctrl+K on Windows). Cmd+K again = close (toggle).
 *   - Custom search input with debounced filtering (150ms).
 *   - Grouped results: PAGES, RECENT RECORDS, COMMANDS.
 *   - When query starts with ">": switch to commands-only mode.
 *   - Footer hints: arrow key icons + descriptions.
 *   - z-index: --v-z-spotlight (70).
 *   - Shadow: --v-shadow-md.
 *   - No results: show "No results for '{query}'" empty state.
 *   - Escape closes, focus returns to previous element.
 *
 * Implements US-125a.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Spotlight, openSpotlight, closeSpotlight } from '@mantine/spotlight';
import { t } from '../../lib/i18n';
import { useCommandPaletteActions } from '../../hooks/useCommandPaletteActions';
import { openPanelByTypeId } from '../../stores/panelStore';
import classes from './CommandPalette.module.css';

/** Debounce delay for search filtering (ms). */
const SEARCH_DEBOUNCE_MS = 150;

/** Human-readable group header labels. */
const GROUP_LABELS: Record<string, string> = {
  pages: t('commandPalette.group.pages'),
  recent: t('commandPalette.group.recent'),
  commands: t('commandPalette.group.commands'),
};

export function CommandPalette() {
  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the query update so filtering only fires after 150ms of idle.
  const handleQueryChange = useCallback((value: string) => {
    setRawQuery(value);
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  // Clean up the debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const grouped = useCommandPaletteActions(debouncedQuery);
  const { pages, recent, commands, commandsOnly, total } = grouped;

  // Activate a page action: open the panel and close the palette.
  function handlePageActivate(panelTypeId: string) {
    openPanelByTypeId(panelTypeId);
    closeSpotlight();
  }

  // Activate a command action and close the palette.
  function handleCommandActivate(onActivate?: () => void) {
    if (onActivate) {
      onActivate();
    }
    closeSpotlight();
  }

  // Show empty state when there is a query but no results.
  const showEmpty = total === 0 && rawQuery.length > 0;
  // For the empty state message, strip the ">" prefix.
  const effectiveQuery = commandsOnly ? rawQuery.slice(1).trimStart() : rawQuery;

  return (
    <Spotlight.Root
      query={rawQuery}
      onQueryChange={handleQueryChange}
      shortcut="mod + K"
      zIndex={70}
      classNames={{
        content: classes.spotlight,
        search: classes.searchInput,
        actionsList: classes.resultsList,
      }}
      data-testid="command-palette"
    >
      <Spotlight.Search
        placeholder={t('commandPalette.placeholder')}
        aria-label={t('commandPalette.searchAriaLabel')}
      />

      {commandsOnly && (
        <div className={classes.commandsModeHint} aria-live="polite">
          {t('commandPalette.commandsModeHint')}
        </div>
      )}

      <Spotlight.ActionsList>
        {showEmpty ? (
          <Spotlight.Empty className={classes.emptyState}>
            {t('commandPalette.noResults', { query: effectiveQuery })}
          </Spotlight.Empty>
        ) : (
          <>
            {/* PAGES group */}
            {pages.length > 0 && (
              <Spotlight.ActionsGroup
                label={GROUP_LABELS['pages']}
                classNames={{ actionsGroup: classes.groupLabel }}
              >
                {pages.map((action) => (
                  <Spotlight.Action
                    key={action.id}
                    className={classes.result}
                    onClick={() =>
                      action.panelTypeId ? handlePageActivate(action.panelTypeId) : undefined
                    }
                    closeSpotlightOnTrigger={false}
                    data-testid={`cp-result-${action.id}`}
                  >
                    <div className={classes.resultInner}>
                      {action.iconName && (
                        <span className={classes.resultIcon} aria-hidden="true" />
                      )}
                      <span className={classes.resultLabel}>{action.label}</span>
                      {action.meta && (
                        <span className={classes.typeBadge}>{action.meta}</span>
                      )}
                    </div>
                  </Spotlight.Action>
                ))}
              </Spotlight.ActionsGroup>
            )}

            {/* RECENT RECORDS group — hidden in commands-only mode */}
            {!commandsOnly && recent.length > 0 && (
              <Spotlight.ActionsGroup
                label={GROUP_LABELS['recent']}
                classNames={{ actionsGroup: classes.groupLabel }}
              >
                {recent.map((action) => (
                  <Spotlight.Action
                    key={action.id}
                    className={classes.result}
                    onClick={action.onActivate}
                    closeSpotlightOnTrigger={false}
                    data-testid={`cp-result-${action.id}`}
                  >
                    <div className={classes.resultInner}>
                      <span className={classes.resultLabel}>{action.label}</span>
                      {action.meta && (
                        <span className={classes.typeBadge}>{action.meta}</span>
                      )}
                    </div>
                  </Spotlight.Action>
                ))}
              </Spotlight.ActionsGroup>
            )}

            {/* COMMANDS group */}
            {commands.length > 0 && (
              <Spotlight.ActionsGroup
                label={GROUP_LABELS['commands']}
                classNames={{ actionsGroup: classes.groupLabel }}
              >
                {commands.map((action) => (
                  <Spotlight.Action
                    key={action.id}
                    className={classes.result}
                    onClick={() => handleCommandActivate(action.onActivate)}
                    closeSpotlightOnTrigger={false}
                    data-testid={`cp-result-${action.id}`}
                  >
                    <div className={classes.resultInner}>
                      <span className={classes.resultCommandPrefix} aria-hidden="true">
                        {'>'}
                      </span>
                      <div className={classes.resultTextBlock}>
                        <span className={classes.resultLabel}>{action.label}</span>
                        {action.description && (
                          <span className={classes.resultDescription}>
                            {action.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </Spotlight.Action>
                ))}
              </Spotlight.ActionsGroup>
            )}
          </>
        )}
      </Spotlight.ActionsList>

      {/* Footer key-binding hints */}
      <Spotlight.Footer className={classes.footer}>
        <span className={classes.footerHint}>
          <kbd className={classes.footerKey}>&uarr;</kbd>
          <kbd className={classes.footerKey}>&darr;</kbd>
          {t('commandPalette.footer.navigate')}
        </span>
        <span className={classes.footerHint}>
          <kbd className={classes.footerKey}>&crarr;</kbd>
          {t('commandPalette.footer.open')}
        </span>
        <span className={classes.footerHint}>
          <kbd className={classes.footerKey}>Esc</kbd>
          {t('commandPalette.footer.close')}
        </span>
        <span className={classes.footerHint}>
          <kbd className={classes.footerKey}>{'>'}</kbd>
          {t('commandPalette.footer.commandsHint')}
        </span>
      </Spotlight.Footer>
    </Spotlight.Root>
  );
}

/**
 * Re-export the Spotlight open function so other components (e.g., TrayBar)
 * can trigger the command palette without importing @mantine/spotlight directly.
 */
export { openSpotlight as openCommandPalette };
