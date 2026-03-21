'use client';

/**
 * CompositeFilterBuilder — advanced AND/OR nested filter builder.
 *
 * Structure:
 * - WHERE
 * - Group (AND/OR toggle) containing conditions + nested groups
 * - Nestable to 3 levels (warning at level 3+)
 * - "+ Add condition" / "+ Add group" buttons
 * - Individual remove buttons for conditions and groups
 *
 * Implements US-114 (AC-6, AC-7, AC-8).
 */

import React from 'react';
import { Group, Button, Select, Text, ActionIcon, Alert } from '@mantine/core';
import { IconX, IconAlertTriangle } from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import type {
  FilterNode,
  FilterGroup,
  FilterCondition,
  FilterDimension,
} from './types';
import { createCondition } from './types';
import { FilterInput } from './FilterInput';
import { FilterModeSelector } from './FilterModeSelector';
import classes from './CompositeFilterBuilder.module.css';

const MAX_NESTING_WARN_LEVEL = 3;

export interface CompositeFilterBuilderProps {
  root: FilterGroup | null;
  dimensions: FilterDimension[];
  onChange: (root: FilterGroup | null) => void;
}

export function CompositeFilterBuilder({
  root,
  dimensions,
  onChange,
}: CompositeFilterBuilderProps) {
  const effectiveRoot: FilterGroup = root ?? {
    type: 'group',
    connector: 'AND',
    children: [],
  };

  function handleRootChange(updated: FilterGroup) {
    onChange(updated.children.length > 0 ? updated : null);
  }

  return (
    <div className={classes.builder} aria-label={t('filter.builder.title')}>
      <Text size="xs" fw={500} c="var(--v-text-tertiary)" className={classes.whereLabel}>
        {t('filter.builder.whereLabel')}
      </Text>
      <FilterGroupEditor
        group={effectiveRoot}
        dimensions={dimensions}
        depth={0}
        onChange={handleRootChange}
        onRemove={undefined} // root can't be removed
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// FilterGroupEditor — renders a single group with its connector toggle,
// children, and add/remove controls.
// ─────────────────────────────────────────────

interface FilterGroupEditorProps {
  group: FilterGroup;
  dimensions: FilterDimension[];
  depth: number;
  onChange: (updated: FilterGroup) => void;
  onRemove: (() => void) | undefined;
}

function FilterGroupEditor({
  group,
  dimensions,
  depth,
  onChange,
  onRemove,
}: FilterGroupEditorProps) {
  const isDeep = depth >= MAX_NESTING_WARN_LEVEL - 1;

  function updateChild(index: number, updated: FilterNode) {
    const newChildren = [...group.children];
    newChildren[index] = updated;
    onChange({ ...group, children: newChildren });
  }

  function removeChild(index: number) {
    const newChildren = group.children.filter((_, i) => i !== index);
    onChange({ ...group, children: newChildren });
  }

  function addCondition() {
    if (dimensions.length === 0) return;
    const first = dimensions[0];
    const condition = createCondition(first.column, first.dataType);
    onChange({ ...group, children: [...group.children, condition] });
  }

  function addGroup() {
    const newGroup: FilterGroup = { type: 'group', connector: 'AND', children: [] };
    onChange({ ...group, children: [...group.children, newGroup] });
  }

  function toggleConnector() {
    onChange({ ...group, connector: group.connector === 'AND' ? 'OR' : 'AND' });
  }

  const indentStyle = depth > 0 ? { marginLeft: depth * 16 } : undefined;

  return (
    <div className={classes.groupContainer} style={indentStyle}>
      {/* Group header: connector toggle + remove */}
      <Group gap={8} className={classes.groupHeader}>
        <button
          type="button"
          className={`${classes.connectorToggle} ${group.connector === 'AND' ? classes.connectorAnd : classes.connectorOr}`}
          onClick={toggleConnector}
          aria-label={`Toggle connector (currently ${group.connector})`}
        >
          {group.connector === 'AND'
            ? t('filter.builder.connector.and')
            : t('filter.builder.connector.or')}
        </button>

        {onRemove && (
          <ActionIcon
            size="xs"
            variant="subtle"
            color="red"
            onClick={onRemove}
            aria-label={t('filter.builder.removeGroup')}
          >
            <IconX size={10} />
          </ActionIcon>
        )}
      </Group>

      {/* Depth warning */}
      {isDeep && depth >= MAX_NESTING_WARN_LEVEL && (
        <Alert
          icon={<IconAlertTriangle size={14} />}
          color="yellow"
          variant="light"
          p={6}
          className={classes.nestingWarning}
        >
          <Text size="xs">{t('filter.builder.nestingWarning')}</Text>
        </Alert>
      )}

      {/* Children */}
      <div className={classes.childrenContainer}>
        {group.children.map((child, index) => {
          // Stable key: use column name for conditions, operator+index for groups.
          // This avoids key={index} reconciliation bugs when items are removed.
          const childKey = child.type === 'condition'
            ? `cond-${child.column || 'empty'}-${index}`
            : `group-${(child as FilterGroup).connector || 'and'}-${index}`;

          if (child.type === 'condition') {
            return (
              <FilterConditionEditor
                key={childKey}
                condition={child}
                dimensions={dimensions}
                onChange={(updated) => updateChild(index, updated)}
                onRemove={() => removeChild(index)}
              />
            );
          }

          // child is a group
          return (
            <FilterGroupEditor
              key={childKey}
              group={child}
              dimensions={dimensions}
              depth={depth + 1}
              onChange={(updated) => updateChild(index, updated)}
              onRemove={() => removeChild(index)}
            />
          );
        })}
      </div>

      {/* Add controls */}
      <Group gap={8} className={classes.addControls}>
        <Button
          variant="subtle"
          size="xs"
          className={classes.addButton}
          onClick={addCondition}
          disabled={dimensions.length === 0}
        >
          {t('filter.builder.addCondition')}
        </Button>
        {depth < MAX_NESTING_WARN_LEVEL && (
          <Button
            variant="subtle"
            size="xs"
            className={classes.addButton}
            onClick={addGroup}
          >
            {t('filter.builder.addGroup')}
          </Button>
        )}
      </Group>
    </div>
  );
}

// ─────────────────────────────────────────────
// FilterConditionEditor — renders a single condition row
// ─────────────────────────────────────────────

interface FilterConditionEditorProps {
  condition: FilterCondition;
  dimensions: FilterDimension[];
  onChange: (updated: FilterCondition) => void;
  onRemove: () => void;
}

function FilterConditionEditor({
  condition,
  dimensions,
  onChange,
  onRemove,
}: FilterConditionEditorProps) {
  const dimension = dimensions.find((d) => d.column === condition.column);

  const dimensionOptions = dimensions.map((d) => ({
    value: d.column,
    label: d.label,
  }));

  function handleColumnChange(column: string | null) {
    if (!column) return;
    const dim = dimensions.find((d) => d.column === column);
    if (!dim) return;
    // Reset value + mode when changing column to avoid type mismatches
    const newCondition = createCondition(column, dim.dataType, condition.mode);
    onChange(newCondition);
  }

  function handleModeChange(mode: FilterCondition['mode']) {
    onChange({ ...condition, mode });
  }

  function handleValueChange(updated: FilterCondition) {
    onChange(updated);
  }

  return (
    <div className={classes.conditionRow}>
      {/* Column selector */}
      <Select
        value={condition.column}
        onChange={handleColumnChange}
        data={dimensionOptions}
        size="xs"
        placeholder={t('filter.builder.columnPlaceholder')}
        searchable
        className={classes.columnSelect}
        aria-label={t('filter.builder.column')}
      />

      {/* Mode + value input */}
      {dimension ? (
        <div className={classes.conditionInput}>
          <FilterInput
            condition={condition}
            dimension={dimension}
            onChange={handleValueChange}
          />
        </div>
      ) : (
        <FilterModeSelector
          value={condition.mode}
          onChange={handleModeChange}
          disabled
        />
      )}

      {/* Remove button */}
      <ActionIcon
        size="xs"
        variant="subtle"
        color="red"
        onClick={onRemove}
        aria-label={t('filter.builder.removeCondition')}
        className={classes.removeButton}
      >
        <IconX size={10} />
      </ActionIcon>
    </div>
  );
}
