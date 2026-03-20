'use client';

/**
 * TruncatedText — System-wide text truncation component.
 * Patterns Library §7 — Text truncation system.
 *
 * Renders text with CSS ellipsis and shows a Mantine Tooltip on hover
 * when the text is actually truncated (scrollWidth > clientWidth).
 */

import { Text, Tooltip } from '@mantine/core';
import type { TextProps } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import classes from './TruncatedText.module.css';

export interface TruncatedTextProps extends Omit<TextProps, 'children'> {
  /** The text content to potentially truncate. */
  children: string;
  /** Maximum width constraint. Passed as a CSS value (e.g. 200, '200px', '100%'). */
  maxWidth?: string | number;
  /** Number of lines before truncation (multi-line mode). Default: 1 (single line). */
  lines?: number;
}

export function TruncatedText({
  children,
  maxWidth,
  lines = 1,
  style,
  ...textProps
}: TruncatedTextProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const checkTruncation = () => {
      if (lines > 1) {
        // Multi-line: truncated when scrollHeight exceeds clientHeight
        setIsTruncated(el.scrollHeight > el.clientHeight);
      } else {
        // Single-line: truncated when scrollWidth exceeds clientWidth
        setIsTruncated(el.scrollWidth > el.clientWidth);
      }
    };

    checkTruncation();

    // Re-check on resize
    const observer = new ResizeObserver(checkTruncation);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, lines, maxWidth]);

  const maxWidthValue =
    maxWidth !== undefined
      ? typeof maxWidth === 'number'
        ? `${maxWidth}px`
        : maxWidth
      : undefined;

  const truncationStyle = (
    lines > 1
      ? {
          WebkitLineClamp: lines,
          ...(style as CSSProperties),
          ...(maxWidthValue ? { maxWidth: maxWidthValue } : {}),
        }
      : {
          ...(style as CSSProperties),
          ...(maxWidthValue ? { maxWidth: maxWidthValue } : {}),
        }
  ) as CSSProperties;

  const className =
    lines > 1
      ? `${classes.multiLine}${textProps.className ? ` ${textProps.className}` : ''}`
      : `${classes.singleLine}${textProps.className ? ` ${textProps.className}` : ''}`;

  const textElement = (
    <Text
      {...textProps}
      ref={textRef}
      className={className}
      style={truncationStyle}
    >
      {children}
    </Text>
  );

  if (!isTruncated) {
    return textElement;
  }

  return (
    <Tooltip
      label={children}
      openDelay={300}
      maw={400}
      multiline
      position="top"
      styles={{
        tooltip: {
          background: 'var(--v-bg-elevated)',
          boxShadow: 'var(--v-shadow-sm)',
          fontSize: 'var(--v-text-sm)',
          color: 'var(--v-text-primary)',
        },
      }}
    >
      {textElement}
    </Tooltip>
  );
}
