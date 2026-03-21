'use client';

/**
 * FilterBar — horizontal bar with filter pills, "+ Add filter", and "Advanced" toggle.
 *
 * States:
 * - No filters: shows "No filters applied" empty state
 * - Active: shows pills + "Filters active (N)" indicator
 * - Advanced: switches to CompositeFilterBuilder
 *
 * Implements US-114 (AC-4, AC-5, AC-6, AC-8, AC-10).
 */

import React from 'react';
import { Group, Button, Text, ScrollArea } from '@mantine/core';
import { t } from '../../lib/i18n';
import type { FilterCondition, FilterDimension, FilterGroup, FilterState } from './types';
import { countConditions, isFilterFlat, createCondition } from './types';
import { FilterPill } from './FilterPill';
import { DimensionPicker } from './DimensionPicker';
import { CompositeFilterBuilder } from './CompositeFilterBuilder';
import classes from './FilterBar.module.css';

/** Internal type for pill rendering — condition + its index in root.children. */
interface ConditionEntry {
  condition: FilterCondition;
  rootIndex: number;
}

export interface FilterBarProps {
  /** Current filter state. */
  filterState: FilterState;
  /** Available columns/dimensions. */
  dimensions: FilterDimension[];
  /** Called when filter state changes. */
  onChange: (state: FilterState) => void;
}

export function FilterBar({ filterState, dimensions, onChange }: FilterBarProps) {
  const { root, advanced } = filterState;
  const conditionCount = countConditions(root);

  // Collect top-level conditions (with their original index in root.children)
  const topLevelConditions: ConditionEntry[] = React.useMemo((): ConditionEntry[] => {
    if (!root) return [];
    const result: ConditionEntry[] = [];
    root.children.forEach((node, i) => {
      if (node.type === 'condition') {
        result.push({ condition: node, rootIndex: i });
      }
    });
    return result;
  }, [root]);

  const canConvertToSimple = advanced && isFilterFlat(root);

  function handleAddFilter(column: string) {
    const dim = dimensions.find((d) => d.column === column);
    if (!dim) return;

    const condition = createCondition(column, dim.dataType);
    const newRoot: FilterGroup = root
      ? { ...root, children: [...root.children, condition] }
      : { type: 'group', connector: 'AND', children: [condition] };

    onChange({ ...filterState, root: newRoot });
  }

  function handleRemoveCondition(index: number) {
    if (!root) return;
    const newChildren = root.children.filter((_, i) => i !== index);
    const newRoot: FilterGroup | null =
      newChildren.length > 0 ? { ...root, children: newChildren } : null;
    onChange({ ...filterState, root: newRoot });
  }

  function handleUpdateCondition(index: number, updated: FilterCondition) {
    if (!root) return;
    const newChildren = [...root.children];
    newChildren[index] = updated;
    onChange({ ...filterState, root: { ...root, children: newChildren } });
  }

  function handleToggleAdvanced() {
    onChange({ ...filterState, advanced: !advanced });
  }

  function handleConvertToSimple() {
    onChange({ ...filterState, advanced: false });
  }

  function handleBuilderChange(newRoot: FilterGroup | null) {
    onChange({ ...filterState, root: newRoot });
  }

  function handleClearAll() {
    onChange({ root: null, advanced: false });
  }

  if (advanced) {
    return (
      <div className={classes.bar} aria-label={t('filter.bar.ariaLabel')}>
        <Group justify="space-between" gap={8} className={classes.advancedHeader}>
          <Group gap={8}>
            <Text size="sm" fw={500} c="var(--v-text-primary)">
              {t('filter.builder.title')}
            </Text>
            {conditionCount > 0 && (
              <span className={classes.activeIndicator}>
                {t('filter.bar.active').replace('{count}', String(conditionCount))}
              </span>
            )}
          </Group>
          <Group gap={8}>
            {canConvertToSimple && (
              <Button
                variant="subtle"
                size="xs"
                onClick={handleConvertToSimple}
                className={classes.actionButton}
              >
                {t('filter.builder.convertToSimple')}
              </Button>
            )}
            <Button
              variant="subtle"
              size="xs"
              onClick={handleToggleAdvanced}
              className={classes.actionButton}
            >
              {t('filter.bar.simple')}
            </Button>
            {conditionCount > 0 && (
              <Button
                variant="subtle"
                size="xs"
                color="red"
                onClick={handleClearAll}
                className={classes.actionButton}
              >
                {t('filter.bar.clearAll')}
              </Button>
            )}
          </Group>
        </Group>
        <CompositeFilterBuilder
          root={root}
          dimensions={dimensions}
          onChange={handleBuilderChange}
        />
      </div>
    );
  }

  return (
    <div className={classes.bar} aria-label={t('filter.bar.ariaLabel')}>
      <Group gap={8} wrap="nowrap" className={classes.innerGroup}>
        {/* Scrollable pill area */}
        <ScrollArea
          type="scroll"
          scrollbarSize={4}
          className={classes.pillScroll}
        >
          <Group gap={6} wrap="nowrap" className={classes.pillRow}>
            {topLevelConditions.length === 0 ? (
              <Text size="sm" c="var(--v-text-tertiary)" className={classes.emptyLabel}>
                {t('filter.bar.empty')}
              </Text>
            ) : (
              topLevelConditions.map(({ condition, rootIndex }) => {
                const dim = dimensions.find((d) => d.column === condition.column);
                return (
                  <FilterPill
                    key={`${condition.column}-${rootIndex}`}
                    condition={condition}
                    dimension={dim}
                    onRemove={() => handleRemoveCondition(rootIndex)}
                    onChange={(updated) => handleUpdateCondition(rootIndex, updated)}
                  />
                );
              })
            )}
          </Group>
        </ScrollArea>

        {/* Right side controls */}
        <Group gap={8} wrap="nowrap" className={classes.controls}>
          {conditionCount > 0 && (
            <span className={classes.activeIndicator}>
              {t('filter.bar.active').replace('{count}', String(conditionCount))}
            </span>
          )}

          <DimensionPicker dimensions={dimensions} onSelect={handleAddFilter}>
            <Button
              variant="subtle"
              size="xs"
              className={classes.addButton}
            >
              {t('filter.bar.addFilter')}
            </Button>
          </DimensionPicker>

          <Button
            variant="subtle"
            size="xs"
            onClick={handleToggleAdvanced}
            className={classes.actionButton}
          >
            {t('filter.bar.advanced')}
          </Button>

          {conditionCount > 0 && (
            <Button
              variant="subtle"
              size="xs"
              color="red"
              onClick={handleClearAll}
              className={classes.actionButton}
            >
              {t('filter.bar.clearAll')}
            </Button>
          )}
        </Group>
      </Group>
    </div>
  );
}
