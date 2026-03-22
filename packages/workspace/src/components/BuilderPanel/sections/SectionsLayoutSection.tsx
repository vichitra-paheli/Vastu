'use client';

/**
 * SectionsLayoutSection — toggle and reorder page sections.
 *
 * Available sections:
 *   - Summary strip
 *   - Advanced search
 *   - Bulk actions
 *   - Detail drawer
 *
 * Each section has a toggle and a drag handle for reordering.
 * (Drag-to-reorder in Phase 1B uses button-based move-up / move-down since
 * HTML5 drag-and-drop requires more complex state management and is tracked
 * separately. The UI visually uses a drag handle icon to indicate intent.)
 *
 * Section order and enabled state are stored in config.sections.
 *
 * Implements US-136 AC-6.
 */

import React from 'react';
import { IconGripVertical } from '@tabler/icons-react';
import { t } from '../../../lib/i18n';
import type { TemplateConfig, SectionConfig } from '../../../templates/types';
import classes from '../BuilderPanel.module.css';

// ─── Default sections ─────────────────────────────────────────────────────────

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'summaryStrip', label: t('builder.sectionsLayout.summaryStrip'), type: 'summaryStrip', visible: true, order: 0 },
  { id: 'advancedSearch', label: t('builder.sectionsLayout.advancedSearch'), type: 'advancedSearch', visible: true, order: 1 },
  { id: 'bulkActions', label: t('builder.sectionsLayout.bulkActions'), type: 'bulkActions', visible: true, order: 2 },
  { id: 'detailDrawer', label: t('builder.sectionsLayout.detailDrawer'), type: 'detailDrawer', visible: true, order: 3 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  id: string;
}) {
  return (
    <label className={classes.toggleSwitch} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={classes.toggleSwitchInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={classes.toggleSwitchTrack} />
      <span className={classes.toggleSwitchThumb} />
    </label>
  );
}

function resolvedSections(config: TemplateConfig): SectionConfig[] {
  if (config.sections && config.sections.length > 0) {
    // Merge with defaults so any missing sections are included
    const existingIds = new Set(config.sections.map((s) => s.id));
    const missing = DEFAULT_SECTIONS.filter((ds) => !existingIds.has(ds.id)).map((ds, i) => ({
      ...ds,
      order: config.sections!.length + i,
    }));
    return [...config.sections, ...missing].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return DEFAULT_SECTIONS;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface SectionsLayoutSectionProps {
  config: TemplateConfig;
  onChange: (partial: Partial<TemplateConfig>) => void;
}

export function SectionsLayoutSection({ config, onChange }: SectionsLayoutSectionProps) {
  const sections = resolvedSections(config);

  function updateSection(id: string, patch: Partial<SectionConfig>) {
    const updated = sections.map((s) => (s.id === id ? { ...s, ...patch } : s));
    onChange({ sections: updated });
  }

  function moveSection(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const updated = [...sections];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = { ...updated[swapIdx]!, order: index };
    updated[swapIdx] = { ...temp!, order: swapIdx };
    onChange({ sections: updated });
  }

  return (
    <div data-testid="builder-sections-layout-section">
      <h2 className={classes.sectionTitle}>{t('builder.sectionsLayout.title')}</h2>
      <p className={classes.hint} style={{ marginBottom: 12 }}>
        {t('builder.sectionsLayout.hint')}
      </p>

      <div>
        {sections.map((section, idx) => (
          <div key={section.id} className={classes.dragRow}>
            {/* Drag handle (visual indicator) */}
            <span
              className={classes.dragHandle}
              aria-hidden="true"
              title={t('builder.sectionsLayout.dragHint')}
            >
              <IconGripVertical size={14} />
            </span>

            {/* Section label */}
            <span className={classes.dragLabel}>{section.label}</span>

            {/* Move up/down buttons (keyboard-accessible reorder) */}
            <button
              type="button"
              onClick={() => moveSection(idx, 'up')}
              disabled={idx === 0}
              aria-label={t('builder.sectionsLayout.moveUp')}
              style={{
                padding: '2px 6px',
                fontSize: 11,
                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                opacity: idx === 0 ? 0.4 : 1,
                border: '1px solid var(--v-border-default)',
                borderRadius: 3,
                background: 'var(--v-surface-2)',
                color: 'var(--v-text-secondary)',
              }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moveSection(idx, 'down')}
              disabled={idx === sections.length - 1}
              aria-label={t('builder.sectionsLayout.moveDown')}
              style={{
                padding: '2px 6px',
                fontSize: 11,
                cursor: idx === sections.length - 1 ? 'not-allowed' : 'pointer',
                opacity: idx === sections.length - 1 ? 0.4 : 1,
                border: '1px solid var(--v-border-default)',
                borderRadius: 3,
                background: 'var(--v-surface-2)',
                color: 'var(--v-text-secondary)',
              }}
            >
              ↓
            </button>

            {/* Visible toggle */}
            <ToggleSwitch
              id={`section-visible-${section.id}`}
              checked={section.visible !== false}
              onChange={(val) => updateSection(section.id, { visible: val })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
