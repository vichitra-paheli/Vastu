// Generate slug from string
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Pluralize (simple English)
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

// Truncate string
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Mask string (e.g., for API keys, connection strings)
export function mask(
  text: string,
  visibleStart: number = 4,
  visibleEnd: number = 4,
): string {
  if (text.length <= visibleStart + visibleEnd) return text;
  const start = text.substring(0, visibleStart);
  const end = text.substring(text.length - visibleEnd);
  return `${start}${'•'.repeat(Math.min(text.length - visibleStart - visibleEnd, 8))}${end}`;
}
