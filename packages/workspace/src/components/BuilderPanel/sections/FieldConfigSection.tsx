'use client';

/**
 * FieldConfigSection — per-column settings for builder mode.
 *
 * Per field:
 *   - Visible toggle
 *   - Label override (text input)
 *   - Display type picker (text / badge / currency / date / avatar / monospace / boolean / link)
 *   - Sortable toggle
 *   - Filterable toggle
 *
 * When no fields are configured, shows an informational empty state.
 *
 * Implements US-136 AC-5.
 */

import React from 'react';
import { t } from '../../../lib/i18n';
import type { TemplateConfig, FieldConfig } from '../../../templates/types';
import { getAllFormatters } from '../../../formatters/registry';
import classes from '../BuilderPanel.module.css';

// ─── Display types (dynamic from FormatterRegistry) ─────────────────

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

// ─── Default fields derived from data source ─────────────────────────────────

/** Generates a default set of fields from metadata.table if no fields configured. */
function buildDefaultFields(config: TemplateConfig): FieldConfig[] {
  if (config.fields && config.fields.length > 0) return config.fields;

  // Try to derive from data source model name
  const model = config.dataSource?.model;
  if (!model) return [];

  // Provide sensible defaults for known models
  const defaults: Record<string, FieldConfig[]> = {
    users: [
      { key: 'id', label: 'ID', type: 'text', visible: true, sortable: false, filterable: false },
      { key: 'email', label: 'Email', type: 'text', visible: true, sortable: true, filterable: true },
      { key: 'name', label: 'Name', type: 'text', visible: true, sortable: true, filterable: true },
      { key: 'createdAt', label: 'Created At', type: 'date', visible: true, sortable: true, filterable: true },
    ],
    orders: [
      { key: 'id', label: 'ID', type: 'text', visible: true, sortable: false, filterable: false },
      { key: 'total', label: 'Total', type: 'number', visible: true, sortable: true, filterable: true },
      { key: 'status', label: 'Status', type: 'enum', visible: true, sortable: false, filterable: true },
      { key: 'createdAt', label: 'Created At', type: 'date', visible: true, sortable: true, filterable: true },
    ],
    products: [
      { key: 'id', label: 'ID', type: 'text', visible: true, sortable: false, filterable: false },
      { key: 'name', label: 'Name', type: 'text', visible: true, sortable: true, filterable: true },
      { key: 'sku', label: 'SKU', type: 'text', visible: true, sortable: true, filterable: true },
      { key: 'price', label: 'Price', type: 'number', visible: true, sortable: true, filterable: true },
    ],
  };

  return defaults[model] ?? [
    { key: 'id', label: 'ID', type: 'text', visible: true, sortable: false, filterable: false },
    { key: 'name', label: 'Name', type: 'text', visible: true, sortable: true, filterable: true },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface FieldConfigSectionProps {
  config: TemplateConfig;
  onChange: (partial: Partial<TemplateConfig>) => void;
}

export function FieldConfigSection({ config, onChange }: FieldConfigSectionProps) {
  const fields = buildDefaultFields(config);

  // Local display-type overrides stored in metadata
  const displayTypes =
    ((config.metadata?.fieldDisplayTypes ?? {}) as Record<string, string>);

  // Build display type options dynamically from the formatter registry.
  // getAllFormatters() returns all registered formatters sorted by ID,
  // so custom app formatters automatically appear in the picker.
  const registeredFormatters = getAllFormatters();
  const displayTypeOptions =
    registeredFormatters.length > 0
      ? registeredFormatters.map((f) => ({ value: f.id, label: f.meta.label }))
      : // Fallback when registry is empty (e.g. in isolated unit tests)
        [
          { value: 'text', label: 'Text' },
          { value: 'badge', label: 'Badge' },
          { value: 'currency', label: 'Currency' },
          { value: 'date', label: 'Date' },
          { value: 'avatar', label: 'Avatar' },
          { value: 'monospace', label: 'Monospace' },
          { value: 'boolean', label: 'Boolean' },
          { value: 'link', label: 'Link' },
        ];

  function updateField(index: number, patch: Partial<FieldConfig>) {
    const updated = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange({ fields: updated });
  }

  function updateDisplayType(key: string, displayType: string) {
    onChange({
      metadata: {
        ...config.metadata,
        fieldDisplayTypes: { ...displayTypes, [key]: displayType },
      },
    });
  }

  if (fields.length === 0) {
    return (
      <div data-testid="builder-fieldconfig-section">
        <h2 className={classes.sectionTitle}>{t('builder.fieldConfig.title')}</h2>
        <p className={classes.hint} style={{ fontSize: 13 }}>
          {t('builder.fieldConfig.noFields')}
        </p>
      </div>
    );
  }

  return (
    <div data-testid="builder-fieldconfig-section">
      <h2 className={classes.sectionTitle}>{t('builder.fieldConfig.title')}</h2>
      <table
        className={classes.configTable}
        aria-label={t('builder.fieldConfig.tableAriaLabel')}
      >
        <thead className={classes.configTableHead}>
          <tr>
            <th>{t('builder.fieldConfig.col.field')}</th>
            <th>{t('builder.fieldConfig.col.label')}</th>
            <th>{t('builder.fieldConfig.col.displayType')}</th>
            <th>{t('builder.fieldConfig.col.visible')}</th>
            <th>{t('builder.fieldConfig.col.sortable')}</th>
            <th>{t('builder.fieldConfig.col.filterable')}</th>
          </tr>
        </thead>
        <tbody className={classes.configTableBody}>
          {fields.map((field, idx) => (
            <tr key={field.key}>
              {/* Field key */}
              <td>
                <code style={{ fontSize: 11 }}>{field.key}</code>
              </td>

              {/* Label override */}
              <td>
                <input
                  type="text"
                  className={classes.fieldInput}
                  value={field.label}
                  onChange={(e) => updateField(idx, { label: e.target.value })}
                  aria-label={`${t('builder.fieldConfig.col.label')} for ${field.key}`}
                  style={{ minWidth: 100 }}
                />
              </td>

              {/* Display type */}
              <td>
                <select
                  className={classes.fieldSelect}
                  value={displayTypes[field.key] ?? field.type}
                  onChange={(e) => updateDisplayType(field.key, e.target.value)}
                  aria-label={`${t('builder.fieldConfig.col.displayType')} for ${field.key}`}
                >
                  {displayTypeOptions.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </td>

              {/* Visible */}
              <td style={{ textAlign: 'center' }}>
                <ToggleSwitch
                  id={`field-visible-${field.key}`}
                  checked={field.visible !== false}
                  onChange={(val) => updateField(idx, { visible: val })}
                />
              </td>

              {/* Sortable */}
              <td style={{ textAlign: 'center' }}>
                <ToggleSwitch
                  id={`field-sortable-${field.key}`}
                  checked={field.sortable === true}
                  onChange={(val) => updateField(idx, { sortable: val })}
                />
              </td>

              {/* Filterable */}
              <td style={{ textAlign: 'center' }}>
                <ToggleSwitch
                  id={`field-filterable-${field.key}`}
                  checked={field.filterable === true}
                  onChange={(val) => updateField(idx, { filterable: val })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
