/**
 * KundliMotif — Decorative geometric element for the auth branding panel.
 *
 * Inspired by the traditional South Asian Kundli (astrological) chart:
 * a square rotated 45° (diamond) with diagonal lines creating triangular sections.
 * Colored node dots at intersection points using the Vastu accent palette.
 *
 * Purely decorative — aria-hidden="true".
 */

import type { CSSProperties } from 'react';

interface KundliMotifProps {
  className?: string;
  /** Inline styles forwarded to the root `<svg>` element. */
  style?: CSSProperties;
}

export function KundliMotif({ className, style }: KundliMotifProps) {
  /*
   * Geometry:
   *   viewBox: 0 0 300 300  → center at (150, 150)
   *
   *   Outer diamond vertices (rotated square):
   *     Top:    (150, 20)
   *     Right:  (280, 150)
   *     Bottom: (150, 280)
   *     Left:   (20, 150)
   *
   *   Mid-edge points (midpoints of outer diamond sides):
   *     Top-Right:    (215, 85)
   *     Bottom-Right: (215, 215)
   *     Bottom-Left:  (85, 215)
   *     Top-Left:     (85, 85)
   *
   *   Center: (150, 150)
   *
   * Lines drawn:
   *   - Outer diamond border
   *   - Two diagonals of outer diamond (top↔bottom, left↔right)
   *   - Inner square connecting mid-edge points
   *   - Lines from center to each mid-edge point (creates 8 triangular sections)
   *
   * Node dots at:
   *   - Four outer vertices (accent-primary)
   *   - Four mid-edge points (accent-secondary)
   *   - Center point (accent-tertiary)
   *   - Four cardinal intersections on inner square diagonals (accent-quaternary)
   */

  const lineProps = {
    stroke: 'var(--v-border-subtle)',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  // Outer diamond vertices
  const top = { x: 150, y: 20 };
  const right = { x: 280, y: 150 };
  const bottom = { x: 150, y: 280 };
  const left = { x: 20, y: 150 };

  // Mid-edge points of the outer diamond sides (midpoints)
  const topRight = { x: 215, y: 85 };
  const bottomRight = { x: 215, y: 215 };
  const bottomLeft = { x: 85, y: 215 };
  const topLeft = { x: 85, y: 85 };

  // Center
  const center = { x: 150, y: 150 };

  // Outer diamond path
  const outerDiamond = `M ${top.x},${top.y} L ${right.x},${right.y} L ${bottom.x},${bottom.y} L ${left.x},${left.y} Z`;

  // Inner square path (connecting mid-edge points)
  const innerSquare = `M ${topRight.x},${topRight.y} L ${bottomRight.x},${bottomRight.y} L ${bottomLeft.x},${bottomLeft.y} L ${topLeft.x},${topLeft.y} Z`;

  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      style={style}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer diamond */}
      <path d={outerDiamond} {...lineProps} />

      {/* Inner square (mid-edge points connected) */}
      <path d={innerSquare} {...lineProps} />

      {/* Diagonal: top to bottom (vertical axis) */}
      <line x1={top.x} y1={top.y} x2={bottom.x} y2={bottom.y} {...lineProps} />

      {/* Diagonal: left to right (horizontal axis) */}
      <line x1={left.x} y1={left.y} x2={right.x} y2={right.y} {...lineProps} />

      {/* Lines from center to mid-edge points (subdividing outer triangles) */}
      <line x1={center.x} y1={center.y} x2={topRight.x} y2={topRight.y} {...lineProps} />
      <line x1={center.x} y1={center.y} x2={bottomRight.x} y2={bottomRight.y} {...lineProps} />
      <line x1={center.x} y1={center.y} x2={bottomLeft.x} y2={bottomLeft.y} {...lineProps} />
      <line x1={center.x} y1={center.y} x2={topLeft.x} y2={topLeft.y} {...lineProps} />

      {/* Outer vertex nodes — accent-primary */}
      <circle cx={top.x} cy={top.y} r={6} fill="var(--v-accent-primary)" />
      <circle cx={right.x} cy={right.y} r={6} fill="var(--v-accent-primary)" />
      <circle cx={bottom.x} cy={bottom.y} r={6} fill="var(--v-accent-primary)" />
      <circle cx={left.x} cy={left.y} r={6} fill="var(--v-accent-primary)" />

      {/* Mid-edge nodes — accent-secondary */}
      <circle cx={topRight.x} cy={topRight.y} r={5} fill="var(--v-accent-secondary)" />
      <circle cx={bottomRight.x} cy={bottomRight.y} r={5} fill="var(--v-accent-secondary)" />
      <circle cx={bottomLeft.x} cy={bottomLeft.y} r={5} fill="var(--v-accent-secondary)" />
      <circle cx={topLeft.x} cy={topLeft.y} r={5} fill="var(--v-accent-secondary)" />

      {/* Center node — accent-tertiary */}
      <circle cx={center.x} cy={center.y} r={7} fill="var(--v-accent-tertiary)" />
    </svg>
  );
}
