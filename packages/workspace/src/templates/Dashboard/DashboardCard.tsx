'use client';

/**
 * DashboardCard — wrapper component for a single dashboard card.
 *
 * Handles:
 * - Consistent card shell (border, padding, header, controls)
 * - Edit mode: drag handle, remove button, resize controls
 * - HTML5 drag API for reordering (no external library)
 *
 * Implements US-137 AC-6.
 */

import React from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconGripVertical, IconX } from '@tabler/icons-react';
import { TruncatedText } from '../../components/TruncatedText';
import { useConfirmDialog } from '../../components/ConfirmDialog/useConfirmDialog';
import { t } from '../../lib/i18n';
import type { CardSize } from '../../stores/dashboardStore';
import classes from './DashboardTemplate.module.css';

export interface DashboardCardProps {
  id: string;
  title: string;
  size: CardSize;
  /** Whether edit grid mode is active. */
  editMode?: boolean;
  /** Called when user clicks remove button. */
  onRemove?: (id: string) => void;
  /** Called when user selects a new size. */
  onResize?: (id: string, size: CardSize) => void;
  /** Called when drag starts on this card. */
  onDragStart?: (id: string) => void;
  /** Called when another card is dropped onto this card. */
  onDrop?: (draggedId: string, targetId: string) => void;
  children: React.ReactNode;
}

const SIZE_OPTION_VALUES: CardSize[] = ['1x1', '2x1', '1x2'];

function getSizeClass(size: CardSize): string {
  if (size === '2x1') return classes.cardSize2x1;
  if (size === '1x2') return classes.cardSize1x2;
  return '';
}

export function DashboardCard({
  id,
  title,
  size,
  editMode,
  onRemove,
  onResize,
  onDragStart,
  onDrop,
  children,
}: DashboardCardProps) {
  const confirm = useConfirmDialog();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const sizeClass = getSizeClass(size);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    onDragStart?.(id);
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== id) {
      onDrop?.(draggedId, id);
    }
  }

  async function handleRemoveClick() {
    const confirmed = await confirm({
      title: title,
      description: t('dashboard.card.removeConfirmDescription', { title }),
      variant: 'warning',
      confirmLabel: t('dashboard.card.removeAriaLabel'),
    });
    if (confirmed) {
      onRemove?.(id);
    }
  }

  const cardClasses = [
    classes.dashboardCard,
    isDragging ? classes.dashboardCardDragging : '',
    isDragOver ? classes.dashboardCardDragOver : '',
    sizeClass,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cardClasses}
      data-testid={`dashboard-card-${id}`}
      draggable={editMode}
      onDragStart={editMode ? handleDragStart : undefined}
      onDragEnd={editMode ? handleDragEnd : undefined}
      onDragOver={editMode ? handleDragOver : undefined}
      onDragLeave={editMode ? handleDragLeave : undefined}
      onDrop={editMode ? handleDrop : undefined}
      aria-label={title}
    >
      {/* Card header */}
      <div className={classes.dashboardCardHeader}>
        {editMode && (
          <div
            className={classes.dragHandle}
            aria-label={t('dashboard.card.dragAriaLabel')}
            role="button"
            tabIndex={0}
          >
            <IconGripVertical size={16} aria-hidden="true" />
          </div>
        )}

        <div className={classes.dashboardCardTitle}>
          <TruncatedText>{title}</TruncatedText>
        </div>

        {editMode && (
          <div className={classes.dashboardCardControls}>
            <Tooltip label={t('dashboard.card.removeAriaLabel')}>
              <ActionIcon
                size="xs"
                variant="subtle"
                style={{ color: 'var(--v-color-danger)' }}
                onClick={() => void handleRemoveClick()}
                aria-label={t('dashboard.card.removeAriaLabel')}
                data-testid={`remove-card-${id}`}
              >
                <IconX size={12} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className={classes.dashboardCardBody}>{children}</div>

      {/* Resize controls (edit mode) */}
      {editMode && onResize && (
        <div className={classes.resizeRow} aria-label={t('dashboard.card.resizeAriaLabel')}>
          {SIZE_OPTION_VALUES.map((sizeValue) => {
            const sizeLabel = t(`dashboard.card.size.${sizeValue}`);
            return (
              <button
                key={sizeValue}
                className={`${classes.resizeButton} ${size === sizeValue ? classes.resizeButtonActive : ''}`}
                onClick={() => onResize(id, sizeValue)}
                aria-label={t('dashboard.card.resizeTo', { size: sizeLabel })}
                aria-pressed={size === sizeValue}
              >
                {sizeLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
