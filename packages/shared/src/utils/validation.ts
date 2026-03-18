// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password strength calculation
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

export function calculatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  let strength: PasswordStrength;
  if (score <= 1) strength = 'weak';
  else if (score <= 2) strength = 'fair';
  else if (score <= 3) strength = 'good';
  else strength = 'strong';

  return { strength, score };
}

// URL validation (for workspace URLs, redirect URLs, etc.)
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Relative URL check (prevent open redirects)
export function isRelativeUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

// Subdomain validation
export function isValidSubdomain(subdomain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain);
}
