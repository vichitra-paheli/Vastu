'use client';

/**
 * DetailsTab — field-value grid for the record detail drawer.
 *
 * Shows a two-column label-value layout. Fields are editable on click.
 * Read-only fields are rendered with grayed-out styling.
 *
 * Implements US-128c (Details tab).
 */

import React, { useCallback, useState } from 'react';
import { TextInput } from '@mantine/core';
import { t } from '../../../lib/i18n';
import type { RecordDetail } from '../RecordDrawer';
import classes from './DetailsTab.module.css';

interface DetailsTabProps {
  record: RecordDetail | null;
  /** Called whenever the user edits a field value (marks form dirty). */
  onDirtyChange?: (dirty: boolean) => void;
}

/** Fields that cannot be edited by the user. */
const READ_ONLY_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'updatedBy']);

/** Format a value for display. Returns a string or dash for empty/null. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'boolean') return value ? t('drawer.field.boolean.true') : t('drawer.field.boolean.false');
  return String(value);
}

/** Format a field key as a human-readable label. */
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function DetailsTab({ record, onDirtyChange }: DetailsTabProps) {
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const handleFieldClick = useCallback(
    (key: string) => {
      if (READ_ONLY_FIELDS.has(key)) return;
      setEditingKey(key);
    },
    [],
  );

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      setEditedFields((prev) => ({ ...prev, [key]: value }));
      onDirtyChange?.(true);
    },
    [onDirtyChange],
  );

  const handleFieldBlur = useCallback(() => {
    setEditingKey(null);
  }, []);

  const handleFieldKeyDown = useCallback(
    (e: React.KeyboardEvent, key: string) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        setEditingKey(null);
        if (e.key === 'Escape') {
          // Revert to original value
          setEditedFields((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
      }
    },
    [],
  );

  if (!record) {
    return (
      <p className={classes.empty}>{t('drawer.details.empty')}</p>
    );
  }

  // Build field list: intrinsic fields first, then record.fields
  const intrinsicFields: Array<[string, unknown]> = [
    ['id', record.id],
    ['type', record.type],
    ['createdAt', record.createdAt],
    ['updatedAt', record.updatedAt],
    ...(record.updatedBy ? [['updatedBy', record.updatedBy] as [string, unknown]] : []),
  ];

  const customFields: Array<[string, unknown]> = Object.entries(record.fields);

  const allFields = [...customFields, ...intrinsicFields];

  return (
    <dl className={classes.grid} aria-label={t('drawer.details.ariaLabel')}>
      {allFields.map(([key, rawValue]) => {
        const readOnly = READ_ONLY_FIELDS.has(key);
        const currentValue = editedFields[key] ?? formatValue(rawValue);
        const isEditing = editingKey === key;

        return (
          <div key={key} className={classes.row}>
            <dt className={classes.label} title={formatLabel(key)}>
              {formatLabel(key)}
            </dt>
            <dd
              className={`${classes.value}${readOnly ? ` ${classes.readOnly}` : ''}`}
            >
              {isEditing && !readOnly ? (
                <TextInput
                  size="xs"
                  value={currentValue === '—' ? '' : currentValue}
                  onChange={(e) => handleFieldChange(key, e.currentTarget.value)}
                  onBlur={handleFieldBlur}
                  onKeyDown={(e) => handleFieldKeyDown(e, key)}
                  aria-label={formatLabel(key)}
                  autoFocus
                  styles={{
                    input: {
                      fontFamily: 'var(--v-font-sans)',
                      fontSize: 'var(--v-text-sm)',
                      color: 'var(--v-text-primary)',
                    },
                  }}
                />
              ) : (
                <span
                  className={`${classes.valueText}${!readOnly ? ` ${classes.editable}` : ''}`}
                  onClick={() => handleFieldClick(key)}
                  title={currentValue}
                  role={readOnly ? undefined : 'button'}
                  tabIndex={readOnly ? undefined : 0}
                  onKeyDown={(e) => {
                    if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                      handleFieldClick(key);
                    }
                  }}
                >
                  {currentValue}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
