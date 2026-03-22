'use client';

/**
 * PinToDashboardDialog — dialog for pinning a view to the dashboard.
 *
 * Shown from the view toolbar overflow menu → "Pin to dashboard".
 *
 * Options:
 * - Card type: KPI / Chart / Table
 * - Metric picker (for KPI)
 * - Size: 1×1 / 2×1
 * - Target dashboard (dropdown)
 *
 * Implements US-137 AC-7, AC-8.
 */

import React, { useState } from 'react';
import { Modal, Select, Button, Group, TextInput } from '@mantine/core';
import { t } from '../../lib/i18n';
import type { DashboardCardType, CardSize } from '../../stores/dashboardStore';
import classes from './DashboardTemplate.module.css';

export interface PinToDashboardDialogProps {
  opened: boolean;
  onClose: () => void;
  /** Source view name shown in the dialog. */
  viewName?: string;
  /** Available dashboards to pin to. */
  dashboards?: Array<{ id: string; name: string }>;
  /** Called when the user confirms pinning. */
  onPin: (config: PinConfig) => void;
}

export interface PinConfig {
  cardType: DashboardCardType;
  metric?: string;
  size: CardSize;
  targetDashboardId: string;
  title: string;
}

const CARD_TYPE_OPTIONS = [
  { value: 'kpi', label: t('dashboard.cardType.kpi') },
  { value: 'chart', label: t('dashboard.cardType.chart') },
  { value: 'table', label: t('dashboard.cardType.table') },
];

const SIZE_OPTIONS: Array<{ value: CardSize; label: string }> = [
  { value: '1x1', label: t('dashboard.card.size.1x1') },
  { value: '2x1', label: t('dashboard.card.size.2x1') },
];

const DEFAULT_DASHBOARD: Array<{ id: string; name: string }> = [
  { id: 'main', name: t('dashboard.pin.defaultDashboard') },
];

export function PinToDashboardDialog({
  opened,
  onClose,
  viewName = '',
  dashboards,
  onPin,
}: PinToDashboardDialogProps) {
  const availableDashboards = dashboards && dashboards.length > 0 ? dashboards : DEFAULT_DASHBOARD;

  const [title, setTitle] = useState(viewName);
  const [cardType, setCardType] = useState<DashboardCardType>('kpi');
  const [metric, setMetric] = useState('');
  const [size, setSize] = useState<CardSize>('1x1');
  const [targetDashboardId, setTargetDashboardId] = useState(availableDashboards[0]?.id ?? 'main');
  const [titleError, setTitleError] = useState('');

  function handleClose() {
    setTitle(viewName);
    setCardType('kpi');
    setMetric('');
    setSize('1x1');
    setTargetDashboardId(availableDashboards[0]?.id ?? 'main');
    setTitleError('');
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setTitleError(t('dashboard.addCard.titleRequired'));
      return;
    }
    setTitleError('');

    onPin({
      cardType,
      metric: metric.trim() || undefined,
      size,
      targetDashboardId,
      title: trimmed,
    });
    handleClose();
  }

  const dashboardOptions = availableDashboards.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('dashboard.pin.dialogTitle')}
      size="md"
      aria-label={t('dashboard.pin.dialogAriaLabel')}
    >
      <form onSubmit={handleSubmit}>
        {/* Card title */}
        <TextInput
          label={t('dashboard.addCard.titleLabel')}
          placeholder={t('dashboard.addCard.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          error={titleError || undefined}
          mb="md"
          data-testid="pin-title-input"
        />

        {/* Card type */}
        <Select
          label={t('dashboard.addCard.typeLabel')}
          data={CARD_TYPE_OPTIONS}
          value={cardType}
          onChange={(v) => { if (v) setCardType(v as DashboardCardType); }}
          mb="md"
          data-testid="pin-card-type-select"
        />

        {/* Metric picker (only for KPI) */}
        {cardType === 'kpi' && (
          <TextInput
            label={t('dashboard.pin.metricLabel')}
            placeholder={t('dashboard.pin.metricPlaceholder')}
            value={metric}
            onChange={(e) => setMetric(e.currentTarget.value)}
            mb="md"
            data-testid="pin-metric-input"
          />
        )}

        {/* Size picker */}
        <div className={classes.pinDialogSection} style={{ marginBottom: 'var(--v-space-md)' }}>
          <span className={classes.pinDialogLabel}>{t('dashboard.addCard.sizeLabel')}</span>
          <div className={classes.sizePickerRow}>
            {SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${classes.sizePickerOption} ${size === opt.value ? classes.sizePickerOptionSelected : ''}`}
                onClick={() => setSize(opt.value)}
                aria-pressed={size === opt.value}
                aria-label={opt.label}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target dashboard */}
        <Select
          label={t('dashboard.pin.targetDashboardLabel')}
          data={dashboardOptions}
          value={targetDashboardId}
          onChange={(v) => { if (v) setTargetDashboardId(v); }}
          mb="xl"
          data-testid="pin-target-dashboard-select"
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={handleClose} type="button">
            {t('dashboard.addCard.cancel')}
          </Button>
          <Button type="submit" data-testid="pin-submit">
            {t('dashboard.pin.submit')}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
