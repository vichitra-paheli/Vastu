'use client';

/**
 * DataSourceSection — builder section for configuring the page data source.
 *
 * Features:
 *   - DB connection picker with health indicator (healthy / warning / error)
 *   - Table picker with row count badge
 *   - Auto-detected relations (toggle active/inactive)
 *   - Custom query toggle
 *   - Live schema preview (column, type, nullable, key, mapped-to)
 *
 * All values are stored in config.dataSource and config.metadata.
 * No real DB connection is made in Phase 1B — values are illustrative.
 *
 * Implements US-136 AC-4.
 */

import React from 'react';
import { t } from '../../../lib/i18n';
import type { TemplateConfig } from '../../../templates/types';
import classes from '../BuilderPanel.module.css';

// ─── Mock data ────────────────────────────────────────────────────────────────

/** Simulated available DB connections. */
const MOCK_CONNECTIONS = [
  { id: 'conn-main', label: 'Main Postgres', health: 'ok' as const },
  { id: 'conn-replica', label: 'Read Replica', health: 'warn' as const },
  { id: 'conn-legacy', label: 'Legacy MySQL', health: 'error' as const },
];

/** Simulated available tables for the selected connection. */
const MOCK_TABLES: Record<string, { name: string; rowCount: number }[]> = {
  'conn-main': [
    { name: 'users', rowCount: 1420 },
    { name: 'orders', rowCount: 8730 },
    { name: 'products', rowCount: 342 },
    { name: 'invoices', rowCount: 5221 },
  ],
  'conn-replica': [
    { name: 'users', rowCount: 1420 },
    { name: 'orders', rowCount: 8730 },
  ],
  'conn-legacy': [{ name: 'legacy_records', rowCount: 99000 }],
};

/** Simulated schema columns for selected table. */
const MOCK_SCHEMA: Record<
  string,
  { column: string; type: string; nullable: boolean; key: string; mappedTo: string }[]
> = {
  users: [
    { column: 'id', type: 'uuid', nullable: false, key: 'PK', mappedTo: 'id' },
    { column: 'email', type: 'varchar(255)', nullable: false, key: '', mappedTo: 'email' },
    { column: 'name', type: 'varchar(100)', nullable: true, key: '', mappedTo: 'name' },
    { column: 'created_at', type: 'timestamp', nullable: false, key: '', mappedTo: 'createdAt' },
    { column: 'organization_id', type: 'uuid', nullable: false, key: 'FK', mappedTo: 'organizationId' },
  ],
  orders: [
    { column: 'id', type: 'uuid', nullable: false, key: 'PK', mappedTo: 'id' },
    { column: 'user_id', type: 'uuid', nullable: false, key: 'FK', mappedTo: 'userId' },
    { column: 'total', type: 'numeric(12,2)', nullable: false, key: '', mappedTo: 'total' },
    { column: 'status', type: 'varchar(32)', nullable: false, key: '', mappedTo: 'status' },
    { column: 'created_at', type: 'timestamp', nullable: false, key: '', mappedTo: 'createdAt' },
  ],
  products: [
    { column: 'id', type: 'uuid', nullable: false, key: 'PK', mappedTo: 'id' },
    { column: 'name', type: 'varchar(200)', nullable: false, key: '', mappedTo: 'name' },
    { column: 'sku', type: 'varchar(50)', nullable: false, key: 'UQ', mappedTo: 'sku' },
    { column: 'price', type: 'numeric(10,2)', nullable: false, key: '', mappedTo: 'price' },
  ],
};

/** Simulated relations. */
const MOCK_RELATIONS: Record<string, { name: string; targetTable: string; type: string }[]> = {
  users: [{ name: 'orders', targetTable: 'orders', type: 'hasMany' }],
  orders: [
    { name: 'user', targetTable: 'users', type: 'belongsTo' },
    { name: 'products', targetTable: 'products', type: 'manyToMany' },
  ],
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DataSourceMetadata {
  connection?: string;
  table?: string;
  customQueryEnabled?: boolean;
  customQuery?: string;
  activeRelations?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function HealthDot({ health }: { health: 'ok' | 'warn' | 'error' }) {
  const cls =
    health === 'ok'
      ? classes.healthOk
      : health === 'warn'
        ? classes.healthWarn
        : classes.healthError;
  const label =
    health === 'ok'
      ? t('builder.dataSource.healthOk')
      : health === 'warn'
        ? t('builder.dataSource.healthWarn')
        : t('builder.dataSource.healthError');
  return (
    <span
      className={`${classes.healthDot} ${cls}`}
      aria-label={label}
      role="img"
    />
  );
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export interface DataSourceSectionProps {
  config: TemplateConfig;
  onChange: (partial: Partial<TemplateConfig>) => void;
}

export function DataSourceSection({ config, onChange }: DataSourceSectionProps) {
  const meta = (config.metadata ?? {}) as DataSourceMetadata;
  const selectedConnection = meta.connection ?? '';
  const selectedTable = meta.table ?? '';
  const customQueryEnabled = meta.customQueryEnabled ?? false;
  const customQuery = meta.customQuery ?? '';
  const activeRelations = meta.activeRelations ?? [];

  function setMeta(patch: Partial<DataSourceMetadata>) {
    onChange({ metadata: { ...config.metadata, ...patch } });
  }

  const tables = selectedConnection ? (MOCK_TABLES[selectedConnection] ?? []) : [];
  const schema = selectedTable ? (MOCK_SCHEMA[selectedTable] ?? []) : [];
  const relations = selectedTable ? (MOCK_RELATIONS[selectedTable] ?? []) : [];

  function handleConnectionChange(connId: string) {
    setMeta({ connection: connId, table: '', activeRelations: [] });
    // Reset data source endpoint when connection changes
    onChange({
      metadata: { ...config.metadata, connection: connId, table: '', activeRelations: [] },
      dataSource: connId
        ? { type: 'prisma', model: '' }
        : undefined,
    });
  }

  function handleTableChange(tableName: string) {
    setMeta({ table: tableName, activeRelations: [] });
    onChange({
      metadata: { ...config.metadata, table: tableName, activeRelations: [] },
      dataSource: { type: 'prisma', model: tableName },
    });
  }

  function toggleRelation(relName: string, active: boolean) {
    const next = active
      ? [...activeRelations, relName]
      : activeRelations.filter((r) => r !== relName);
    setMeta({ activeRelations: next });
  }

  return (
    <div data-testid="builder-datasource-section">
      <h2 className={classes.sectionTitle}>{t('builder.dataSource.title')}</h2>

      {/* DB Connection picker */}
      <div className={classes.fieldRow}>
        <label className={classes.fieldLabel} htmlFor="builder-connection">
          {t('builder.dataSource.connection')}
        </label>
        <select
          id="builder-connection"
          className={classes.fieldSelect}
          value={selectedConnection}
          onChange={(e) => handleConnectionChange(e.target.value)}
          aria-label={t('builder.dataSource.connection')}
        >
          <option value="">{t('builder.dataSource.connectionPlaceholder')}</option>
          {MOCK_CONNECTIONS.map((conn) => (
            <option key={conn.id} value={conn.id}>
              {conn.label}
            </option>
          ))}
        </select>
        {selectedConnection && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 6, fontSize: 12 }}>
            {MOCK_CONNECTIONS.find((c) => c.id === selectedConnection) && (
              <>
                <HealthDot
                  health={
                    MOCK_CONNECTIONS.find((c) => c.id === selectedConnection)?.health ?? 'ok'
                  }
                />
                <span className={classes.hint} style={{ marginTop: 0 }}>
                  {MOCK_CONNECTIONS.find((c) => c.id === selectedConnection)?.health === 'ok'
                    ? t('builder.dataSource.healthOk')
                    : MOCK_CONNECTIONS.find((c) => c.id === selectedConnection)?.health === 'warn'
                      ? t('builder.dataSource.healthWarn')
                      : t('builder.dataSource.healthError')}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Table picker */}
      {selectedConnection && (
        <div className={classes.fieldRow}>
          <label className={classes.fieldLabel} htmlFor="builder-table">
            {t('builder.dataSource.table')}
          </label>
          <select
            id="builder-table"
            className={classes.fieldSelect}
            value={selectedTable}
            onChange={(e) => handleTableChange(e.target.value)}
            aria-label={t('builder.dataSource.table')}
          >
            <option value="">{t('builder.dataSource.tablePlaceholder')}</option>
            {tables.map((tbl) => (
              <option key={tbl.name} value={tbl.name}>
                {tbl.name} ({tbl.rowCount.toLocaleString()} {t('builder.dataSource.rows')})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Auto-detected relations */}
      {selectedTable && relations.length > 0 && (
        <div className={classes.fieldRow}>
          <div className={classes.fieldLabel}>{t('builder.dataSource.relations')}</div>
          {relations.map((rel) => {
            const isActive = activeRelations.includes(rel.name);
            return (
              <div key={rel.name} className={classes.toggle}>
                <div>
                  <div className={classes.toggleLabel}>
                    {rel.name}
                    <span className={`${classes.badge} ${classes.badgePrimary}`} style={{ marginLeft: 8 }}>
                      {rel.type}
                    </span>
                    <span className={classes.hint} style={{ marginTop: 0, marginLeft: 8 }}>
                      → {rel.targetTable}
                    </span>
                  </div>
                </div>
                <ToggleSwitch
                  id={`relation-${rel.name}`}
                  checked={isActive}
                  onChange={(val) => toggleRelation(rel.name, val)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Custom query toggle */}
      {selectedTable && (
        <div className={classes.fieldRow}>
          <div className={classes.toggle}>
            <div>
              <div className={classes.toggleLabel}>{t('builder.dataSource.customQuery')}</div>
              <div className={classes.toggleDescription}>
                {t('builder.dataSource.customQueryHint')}
              </div>
            </div>
            <ToggleSwitch
              id="builder-custom-query"
              checked={customQueryEnabled}
              onChange={(val) => setMeta({ customQueryEnabled: val })}
            />
          </div>

          {customQueryEnabled && (
            <div style={{ marginTop: 8 }}>
              <textarea
                className={classes.fieldTextarea}
                value={customQuery}
                onChange={(e) => setMeta({ customQuery: e.target.value })}
                placeholder={t('builder.dataSource.customQueryPlaceholder')}
                aria-label={t('builder.dataSource.customQuery')}
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
              />
            </div>
          )}
        </div>
      )}

      {/* Live schema preview */}
      {schema.length > 0 && (
        <div className={classes.schemaPreview}>
          <div className={classes.schemaPreviewTitle}>
            {t('builder.dataSource.schemaPreview')}
          </div>
          <table className={classes.configTable} aria-label={t('builder.dataSource.schemaAriaLabel')}>
            <thead className={classes.configTableHead}>
              <tr>
                <th>{t('builder.dataSource.schema.column')}</th>
                <th>{t('builder.dataSource.schema.type')}</th>
                <th>{t('builder.dataSource.schema.nullable')}</th>
                <th>{t('builder.dataSource.schema.key')}</th>
                <th>{t('builder.dataSource.schema.mappedTo')}</th>
              </tr>
            </thead>
            <tbody className={classes.configTableBody}>
              {schema.map((col) => (
                <tr key={col.column}>
                  <td>
                    <code style={{ fontSize: 11 }}>{col.column}</code>
                  </td>
                  <td>
                    <span className={classes.badge}>{col.type}</span>
                  </td>
                  <td>{col.nullable ? '✓' : '—'}</td>
                  <td>
                    {col.key ? (
                      <span className={`${classes.badge} ${classes.badgeKey}`}>{col.key}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <code style={{ fontSize: 11 }}>{col.mappedTo}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
