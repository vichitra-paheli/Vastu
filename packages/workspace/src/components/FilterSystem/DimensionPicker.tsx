'use client';

/**
 * DimensionPicker — popover listing available columns/dimensions to add as filters.
 *
 * Features:
 * - Grouped by data type with icons
 * - Search input to filter dimensions
 * - Click to add a new filter condition
 *
 * Implements US-114 (AC-5).
 */

import React from 'react';
import { Popover, TextInput, ScrollArea, UnstyledButton, Text, Stack } from '@mantine/core';
import {
  IconSearch,
  IconLetterT,
  IconHash,
  IconCalendar,
  IconList,
  IconToggleLeft,
} from '@tabler/icons-react';
import { t } from '../../lib/i18n';
import type { FilterDimension, DataType } from './types';
import classes from './DimensionPicker.module.css';

const DATA_TYPE_ICONS: Record<DataType, React.ReactNode> = {
  text: <IconLetterT size={12} />,
  number: <IconHash size={12} />,
  date: <IconCalendar size={12} />,
  enum: <IconList size={12} />,
  boolean: <IconToggleLeft size={12} />,
};

const DATA_TYPE_LABELS: Record<DataType, string> = {
  text: 'filter.dimension.group.text',
  number: 'filter.dimension.group.number',
  date: 'filter.dimension.group.date',
  enum: 'filter.dimension.group.enum',
  boolean: 'filter.dimension.group.boolean',
};

const DATA_TYPE_ORDER: DataType[] = ['text', 'enum', 'number', 'date', 'boolean'];

export interface DimensionPickerProps {
  dimensions: FilterDimension[];
  onSelect: (column: string) => void;
  children: React.ReactNode;
}

export function DimensionPicker({ dimensions, onSelect, children }: DimensionPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const filteredDimensions = React.useMemo(() => {
    if (!search) return dimensions;
    const lower = search.toLowerCase();
    return dimensions.filter(
      (d) =>
        d.label.toLowerCase().includes(lower) ||
        d.column.toLowerCase().includes(lower),
    );
  }, [dimensions, search]);

  // Group filtered dimensions by data type
  const grouped = React.useMemo(() => {
    const groups = new Map<DataType, FilterDimension[]>();
    for (const type of DATA_TYPE_ORDER) {
      const members = filteredDimensions.filter((d) => d.dataType === type);
      if (members.length > 0) {
        groups.set(type, members);
      }
    }
    return groups;
  }, [filteredDimensions]);

  function handleSelect(column: string) {
    onSelect(column);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover
      opened={open}
      onClose={() => {
        setOpen(false);
        setSearch('');
      }}
      position="bottom-start"
      withinPortal
    >
      <Popover.Target>
        <span onClick={() => setOpen((o) => !o)}>{children}</span>
      </Popover.Target>

      <Popover.Dropdown className={classes.dropdown}>
        <Text size="xs" fw={500} c="var(--v-text-secondary)" mb={8}>
          {t('filter.dimension.title')}
        </Text>

        <TextInput
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder={t('filter.dimension.searchPlaceholder')}
          size="xs"
          leftSection={<IconSearch size={12} />}
          mb={8}
          data-autofocus
          className={classes.searchInput}
        />

        <ScrollArea h={Math.min((filteredDimensions.length + grouped.size) * 26 + 16, 280)} type="scroll">
          {grouped.size === 0 ? (
            <Text size="xs" c="var(--v-text-tertiary)" ta="center" py={8}>
              No columns match
            </Text>
          ) : (
            <Stack gap={0}>
              {DATA_TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => (
                <div key={type}>
                  <div className={classes.groupHeader}>
                    <span className={classes.groupIcon}>{DATA_TYPE_ICONS[type]}</span>
                    <Text size="xs" fw={500} c="var(--v-text-tertiary)">
                      {t(DATA_TYPE_LABELS[type])}
                    </Text>
                  </div>
                  {(grouped.get(type) ?? []).map((dim) => (
                    <UnstyledButton
                      key={dim.column}
                      className={classes.dimensionItem}
                      onClick={() => handleSelect(dim.column)}
                    >
                      <Text size="xs">{dim.label}</Text>
                    </UnstyledButton>
                  ))}
                </div>
              ))}
            </Stack>
          )}
        </ScrollArea>
      </Popover.Dropdown>
    </Popover>
  );
}
