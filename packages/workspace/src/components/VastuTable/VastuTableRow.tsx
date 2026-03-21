'use client';

/**
 * VastuTableRow — virtualized row with cells and context menu support.
 *
 * Renders a single data row positioned absolutely by the virtual scroll engine.
 * Handles shift-click range selection and ctrl-click toggle selection.
 *
 * Implements US-112 (AC-9).
 */

import React from 'react';
import type { Row } from '@tanstack/react-table';
import { VastuTableCell } from './VastuTableCell';
import classes from './VastuTable.module.css';

export interface VastuTableRowProps<TData extends Record<string, unknown>> {
  row: Row<TData>;
  /** Absolute top position from virtual scroll. */
  top: number;
  /** Row height in pixels. */
  height: number;
  /** Called when user right-clicks a cell. */
  onCellContextMenu?: (params: {
    x: number;
    y: number;
    columnId: string;
    rowId: string;
    value: unknown;
  }) => void;
  /** Called when user clicks the row (for shift-click range select). */
  onRowClick?: (rowId: string, e: React.MouseEvent) => void;
}

function VastuTableRowInner<TData extends Record<string, unknown>>({
  row,
  top,
  height,
  onCellContextMenu,
  onRowClick,
}: VastuTableRowProps<TData>) {
  const isSelected = row.getIsSelected();

  const trClasses = [classes.tr, isSelected ? classes.trSelected : '']
    .filter(Boolean)
    .join(' ');

  function handleClick(e: React.MouseEvent) {
    onRowClick?.(row.id, e);
  }

  return (
    <div
      role="row"
      className={trClasses}
      style={{ top, height }}
      onClick={handleClick}
      aria-selected={isSelected}
      data-row-id={row.id}
    >
      {row.getVisibleCells().map((cell) => {
        // Render the selection checkbox cell separately
        if (cell.column.id === '__selection__') {
          return (
            <div
              key={cell.id}
              role="cell"
              className={classes.checkboxTd}
              style={{ height }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                className={classes.checkbox}
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
                aria-label={`Select row ${row.id}`}
              />
            </div>
          );
        }

        return (
          <VastuTableCell
            key={cell.id}
            cell={cell}
            width={cell.column.getSize()}
            height={height}
            onContextMenuOpen={onCellContextMenu}
          />
        );
      })}
    </div>
  );
}

export const VastuTableRow = React.memo(VastuTableRowInner) as typeof VastuTableRowInner;
