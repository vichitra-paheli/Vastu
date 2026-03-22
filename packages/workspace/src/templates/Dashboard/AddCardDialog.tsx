'use client';

/**
 * AddCardDialog — modal dialog to pick a card type and add it to the dashboard.
 *
 * Shows a grid of card type options (KPI, Chart, Table, Pipeline, Quick Actions, Alert).
 * User selects a type, enters a title, and clicks "Add".
 *
 * Implements US-137 AC-5.
 */

import React, { useState } from 'react';
import { Modal, TextInput, Button, Group } from '@mantine/core';
import {
  IconChartBar,
  IconTable,
  IconBell,
  IconBolt,
  IconTrendingUp,
  IconLayoutKanban,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import type { DashboardCardType, DashboardCard, CardSize } from '../../stores/dashboardStore';
import classes from './DashboardTemplate.module.css';

export interface AddCardDialogProps {
  opened: boolean;
  onClose: () => void;
  /**
   * Called when a card is confirmed and should be added.
   * The caller is responsible for assigning `id` and `order`.
   */
  onAdd: (card: Omit<DashboardCard, 'id' | 'order'>) => void;
}

interface CardTypeOption {
  type: DashboardCardType;
  labelKey: string;
  IconComponent: Icon;
  descriptionKey: string;
}

const CARD_TYPE_OPTIONS: CardTypeOption[] = [
  { type: 'kpi', labelKey: 'dashboard.cardType.kpi', IconComponent: IconTrendingUp, descriptionKey: 'dashboard.cardType.kpi.description' },
  { type: 'chart', labelKey: 'dashboard.cardType.chart', IconComponent: IconChartBar, descriptionKey: 'dashboard.cardType.chart.description' },
  { type: 'table', labelKey: 'dashboard.cardType.table', IconComponent: IconTable, descriptionKey: 'dashboard.cardType.table.description' },
  { type: 'pipeline', labelKey: 'dashboard.cardType.pipeline', IconComponent: IconLayoutKanban, descriptionKey: 'dashboard.cardType.pipeline.description' },
  { type: 'quick-actions', labelKey: 'dashboard.cardType.quickActions', IconComponent: IconBolt, descriptionKey: 'dashboard.cardType.quickActions.description' },
  { type: 'alert', labelKey: 'dashboard.cardType.alert', IconComponent: IconBell, descriptionKey: 'dashboard.cardType.alert.description' },
];

export function AddCardDialog({ opened, onClose, onAdd }: AddCardDialogProps) {
  const [selectedType, setSelectedType] = useState<DashboardCardType>('kpi');
  const [title, setTitle] = useState('');
  const [size, setSize] = useState<CardSize>('1x1');
  const [titleError, setTitleError] = useState('');

  function handleClose() {
    setTitle('');
    setSize('1x1');
    setSelectedType('kpi');
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

    // ID and order are assigned by DashboardTemplate.
    const card: Omit<DashboardCard, 'id' | 'order'> = {
      type: selectedType,
      title: trimmed,
      size,
    } as Omit<DashboardCard, 'id' | 'order'>;

    onAdd(card);
    handleClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('dashboard.addCard.dialogTitle')}
      size="lg"
      aria-label={t('dashboard.addCard.dialogAriaLabel')}
    >
      <form onSubmit={handleSubmit}>
        {/* Card type picker */}
        <div style={{ marginBottom: 'var(--v-space-md)' }}>
          <div
            style={{
              fontSize: 'var(--v-text-sm)',
              fontWeight: 500,
              color: 'var(--v-text-primary)',
              marginBottom: 'var(--v-space-sm)',
            }}
          >
            {t('dashboard.addCard.typeLabel')}
          </div>
          <div className={classes.cardTypeGrid} role="radiogroup" aria-label={t('dashboard.addCard.typeAriaLabel')}>
            {CARD_TYPE_OPTIONS.map((opt) => {
              const label = t(opt.labelKey);
              const description = t(opt.descriptionKey);
              return (
                <button
                  key={opt.type}
                  type="button"
                  className={`${classes.cardTypeOption} ${selectedType === opt.type ? classes.cardTypeOptionSelected : ''}`}
                  onClick={() => setSelectedType(opt.type)}
                  aria-pressed={selectedType === opt.type}
                  aria-label={label}
                  title={description}
                >
                  <span className={classes.cardTypeIcon}>
                    <opt.IconComponent size={28} aria-hidden="true" />
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <TextInput
          label={t('dashboard.addCard.titleLabel')}
          placeholder={t('dashboard.addCard.titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          error={titleError || undefined}
          mb="md"
          data-testid="add-card-title-input"
        />

        {/* Size picker */}
        <div style={{ marginBottom: 'var(--v-space-md)' }}>
          <div
            style={{
              fontSize: 'var(--v-text-sm)',
              fontWeight: 500,
              color: 'var(--v-text-primary)',
              marginBottom: 'var(--v-space-sm)',
            }}
          >
            {t('dashboard.addCard.sizeLabel')}
          </div>
          <div className={classes.sizePickerRow}>
            {(['1x1', '2x1', '1x2'] as CardSize[]).map((s) => (
              <button
                key={s}
                type="button"
                className={`${classes.sizePickerOption} ${size === s ? classes.sizePickerOptionSelected : ''}`}
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                aria-label={t('dashboard.card.size', { size: s })}
              >
                {t(`dashboard.card.size.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={handleClose} type="button">
            {t('dashboard.addCard.cancel')}
          </Button>
          <Button type="submit" data-testid="add-card-submit">
            {t('dashboard.addCard.submit')}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
