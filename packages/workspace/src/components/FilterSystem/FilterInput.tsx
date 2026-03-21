'use client';

/**
 * FilterInput — dispatcher that renders the correct input component by dataType.
 *
 * Implements US-114 (AC-3).
 */

import React from 'react';
import type { FilterCondition, FilterDimension } from './types';
import { TextFilterInput } from './inputs/TextFilterInput';
import { NumberFilterInput } from './inputs/NumberFilterInput';
import { DateFilterInput } from './inputs/DateFilterInput';
import { EnumFilterInput } from './inputs/EnumFilterInput';
import { BooleanFilterInput } from './inputs/BooleanFilterInput';

export interface FilterInputProps {
  condition: FilterCondition;
  dimension: FilterDimension;
  onChange: (updated: FilterCondition) => void;
}

export function FilterInput({ condition, dimension, onChange }: FilterInputProps) {
  switch (condition.dataType) {
    case 'text':
      return <TextFilterInput condition={condition} onChange={onChange} />;

    case 'number':
      return (
        <NumberFilterInput
          condition={condition}
          onChange={onChange}
          dataMin={dimension.numberMin}
          dataMax={dimension.numberMax}
        />
      );

    case 'date':
      return <DateFilterInput condition={condition} onChange={onChange} />;

    case 'enum':
      return (
        <EnumFilterInput
          condition={condition}
          onChange={onChange}
          options={dimension.enumOptions ?? []}
        />
      );

    case 'boolean':
      return <BooleanFilterInput condition={condition} onChange={onChange} />;

    default:
      return null;
  }
}
