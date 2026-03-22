/**
 * Manual mock for recharts.
 *
 * Recharts pulls in d3 + SVG internals that exhaust the jsdom worker's
 * memory budget.  This file-level mock prevents the real module from
 * ever being loaded.
 */
import React from 'react';

export const ResponsiveContainer = ({ children }: { children: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'responsive-container' }, children);

export const LineChart = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'recharts-LineChart' }, children);

export const Line = ({ dataKey, stroke }: { dataKey: string; stroke: string }) =>
  React.createElement('div', { 'data-testid': 'recharts-Line', 'data-datakey': dataKey, 'data-stroke': stroke });

export const BarChart = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'recharts-BarChart' }, children);

export const Bar = ({ dataKey, fill }: { dataKey: string; fill: string }) =>
  React.createElement('div', { 'data-testid': 'recharts-Bar', 'data-datakey': dataKey, 'data-fill': fill });

export const AreaChart = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'recharts-AreaChart' }, children);

export const Area = ({ dataKey, stroke }: { dataKey: string; stroke: string }) =>
  React.createElement('div', { 'data-testid': 'recharts-Area', 'data-datakey': dataKey, 'data-stroke': stroke });

export const PieChart = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'recharts-PieChart' }, children);

export const Pie = ({ data }: { data: unknown[] }) =>
  React.createElement('div', { 'data-testid': 'recharts-Pie', 'data-count': String(data?.length ?? 0) });

export const Cell = ({ fill }: { fill: string }) =>
  React.createElement('div', { 'data-testid': 'recharts-Cell', 'data-fill': fill });

export const ScatterChart = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'recharts-ScatterChart' }, children);

export const Scatter = ({ name, fill }: { name: string; fill: string }) =>
  React.createElement('div', { 'data-testid': 'recharts-Scatter', 'data-name': name, 'data-fill': fill });

export const XAxis = () => React.createElement('div', { 'data-testid': 'recharts-XAxis' });
export const YAxis = () => React.createElement('div', { 'data-testid': 'recharts-YAxis' });
export const CartesianGrid = () => React.createElement('div', { 'data-testid': 'recharts-CartesianGrid' });
export const Tooltip = () => React.createElement('div', { 'data-testid': 'recharts-Tooltip' });
export const ReferenceLine = () => React.createElement('div', { 'data-testid': 'recharts-ReferenceLine' });
export const Legend = () => React.createElement('div', { 'data-testid': 'recharts-Legend' });
