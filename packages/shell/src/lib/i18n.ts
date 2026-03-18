/**
 * i18n stub — Phase 0
 *
 * All user-facing strings must pass through t('key') for future i18n support.
 * In Phase 0, this function returns a mapped English string from the translations
 * record below. When a key is not found, the key itself is returned so callers
 * never receive undefined.
 *
 * Keys are namespaced by feature using dot notation: 'login.title', 'common.save'.
 *
 * Phase N upgrade path: swap this implementation for a proper i18n library
 * (e.g., next-intl, i18next) without changing call sites.
 */

const translations: Record<string, string> = {
  // ──────────────────────────────────────────────────────────────────────────
  // Auth — Login
  // ──────────────────────────────────────────────────────────────────────────
  'login.title': 'Welcome back',
  'login.subtitle': 'Sign in to your workspace',
  'login.email.label': 'Email',
  'login.email.placeholder': 'you@company.com',
  'login.password.label': 'Password',
  'login.password.placeholder': 'Enter your password',
  'login.submit': 'Sign in',
  'login.sso': 'Sign in with SSO',
  'login.forgotPassword': 'Forgot password?',
  'login.createAccount': "Don't have an account? Create one",
  'login.alreadyHaveAccount': 'Already have an account? Sign in',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — Register
  // ──────────────────────────────────────────────────────────────────────────
  'register.title': 'Create your account',
  'register.subtitle': 'Start building with Vastu',
  'register.name.label': 'Full name',
  'register.orgName.label': 'Organization name',
  'register.email.label': 'Work email',
  'register.password.label': 'Password',
  'register.confirmPassword.label': 'Confirm password',
  'register.terms': 'I agree to the Terms of Service and Privacy Policy',
  'register.submit': 'Create account',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — Forgot password
  // ──────────────────────────────────────────────────────────────────────────
  'forgotPassword.title': 'Reset your password',
  'forgotPassword.subtitle': "Enter your email and we'll send you a reset link",
  'forgotPassword.submit': 'Send reset link',
  'forgotPassword.backToLogin': '← Back to sign in',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — Reset password
  // ──────────────────────────────────────────────────────────────────────────
  'resetPassword.title': 'Set new password',
  'resetPassword.submit': 'Reset password',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — Verify email
  // ──────────────────────────────────────────────────────────────────────────
  'verifyEmail.title': 'Check your email',
  'verifyEmail.subtitle': "We've sent a verification link to",
  'verifyEmail.resend': 'Resend email',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — MFA
  // ──────────────────────────────────────────────────────────────────────────
  'mfa.title': 'Two-factor authentication',
  'mfa.subtitle': 'Enter the 6-digit code from your authenticator app',
  'mfa.useRecovery': 'Use a recovery code',
  'mfa.backToLogin': '← Back to sign in',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — SSO
  // ──────────────────────────────────────────────────────────────────────────
  'sso.title': 'Single sign-on',
  'sso.subtitle': 'Enter your work email to find your SSO provider',
  'sso.submit': 'Continue',

  // ──────────────────────────────────────────────────────────────────────────
  // Common actions
  // ──────────────────────────────────────────────────────────────────────────
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.confirm': 'Confirm',
  'common.search': 'Search...',
  'common.loading': 'Loading...',
  'common.noResults': 'No results found',
  'common.backToWorkspace': '← Back to workspace',

  // ──────────────────────────────────────────────────────────────────────────
  // Errors
  // ──────────────────────────────────────────────────────────────────────────
  'error.invalidCredentials': 'Invalid email or password',
  'error.generic': 'Something went wrong. Please try again.',
  'error.sessionExpired': 'Your session has expired. Please sign in again.',
  'error.notFound': 'Page not found',
  'error.serverError': 'Something went wrong',
  'error.networkError': 'Network error. Please check your connection.',

  // ──────────────────────────────────────────────────────────────────────────
  // Navigation
  // ──────────────────────────────────────────────────────────────────────────
  'nav.settings': 'SETTINGS',
  'nav.admin': 'ADMIN',
  'nav.profile': 'Profile',
  'nav.organization': 'Organization',
  'nav.databases': 'DB Connections',
  'nav.apiKeys': 'API Keys',
  'nav.appearance': 'Appearance',
  'nav.sso': 'SSO',
  'nav.users': 'Users',
  'nav.roles': 'Roles',
  'nav.permissions': 'Permissions',
  'nav.tenants': 'Tenants',
  'nav.auditLog': 'Audit Log',

  // ──────────────────────────────────────────────────────────────────────────
  // Settings — Profile
  // ──────────────────────────────────────────────────────────────────────────
  'profile.title': 'Profile',
  'profile.avatar.change': 'Change avatar',
  'profile.name.label': 'Full name',
  'profile.email.label': 'Email',
  'profile.language.label': 'Language',
  'profile.timezone.label': 'Timezone',
  'profile.changePassword': 'Change password',
  'profile.setupMfa': 'Setup MFA',
  'profile.mfaEnabled': 'MFA enabled ✓',
  'profile.saved': 'Profile updated successfully',

  // ──────────────────────────────────────────────────────────────────────────
  // Settings — Organization
  // ──────────────────────────────────────────────────────────────────────────
  'org.title': 'Organization',
  'org.name.label': 'Organization name',
  'org.logo.change': 'Change logo',
  'org.workspaceUrl.label': 'Workspace URL',
  'org.timezone.label': 'Default timezone',
  'org.language.label': 'Default language',
  'org.delete': 'Delete organization',
  'org.delete.confirm':
    'This will delete all data for this organization. This cannot be undone.',
  'org.saved': 'Organization updated successfully',
};

/**
 * Translate a key to its English string.
 *
 * Returns the key itself when no translation is registered, which makes
 * missing translations easy to spot during development and avoids crashes.
 */
export function t(key: string): string {
  return translations[key] ?? key;
}
