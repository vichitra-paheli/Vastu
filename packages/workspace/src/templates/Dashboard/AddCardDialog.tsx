'use client';

/**
 * AddCardDialog — modal dialog to pick a card type and add it to the dashboard.
 *
 * Shows a grid of card type options (KPI, Chart, Table, Pipeline, Quick Actions, Alert).
 * User selects a type, enters a title, and clicks "Add".
 *
 * Implements US-137 AC-5.
 */

import React from 'react';
import { Modal, TextInput, Button, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
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

const SIZE_OPTIONS: CardSize[] = ['1x1', '2x1', '1x2'];

interface AddCardFormValues {
  type: DashboardCardType;
  title: string;
  size: CardSize;
}

export function AddCardDialog({ opened, onClose, onAdd }: AddCardDialogProps) {
  const form = useForm<AddCardFormValues>({
    initialValues: {
      type: 'kpi',
      title: '',
      size: '1x1',
    },
    validate: {
      title: (value) =>
        value.trim().length === 0 ? t('dashboard.addCard.titleRequired') : null,
    },
  });

  function handleClose() {
    form.reset();
    onClose();
  }

  function handleSubmit(values: AddCardFormValues) {
    const card: Omit<DashboardCard, 'id' | 'order'> = {
      type: values.type,
      title: values.title.trim(),
      size: values.size,
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
      <form onSubmit={form.onSubmit(handleSubmit)}>
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
          {/* role="group" with role="radio" + aria-checked for proper radio semantics */}
          <div
            className={classes.cardTypeGrid}
            role="group"
            aria-label={t('dashboard.addCard.typeAriaLabel')}
          >
            {CARD_TYPE_OPTIONS.map((opt) => {
              const label = t(opt.labelKey);
              const description = t(opt.descriptionKey);
              const isSelected = form.values.type === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`${classes.cardTypeOption} ${isSelected ? classes.cardTypeOptionSelected : ''}`}
                  onClick={() => form.setFieldValue('type', opt.type)}
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
          {...form.getInputProps('title')}
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
            {SIZE_OPTIONS.map((s) => {
              const sizeLabel = t(`dashboard.card.size.${s}`);
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={form.values.size === s}
                  className={`${classes.sizePickerOption} ${form.values.size === s ? classes.sizePickerOptionSelected : ''}`}
                  onClick={() => form.setFieldValue('size', s)}
                  aria-label={t('dashboard.card.size', { size: s })}
                >
                  {sizeLabel}
                </button>
              );
            })}
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
