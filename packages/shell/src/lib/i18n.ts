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
  'register.error.emailTaken': 'An account with this email address already exists.',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — Forgot password
  // ──────────────────────────────────────────────────────────────────────────
  'forgotPassword.title': 'Reset your password',
  'forgotPassword.subtitle': "Enter your email and we'll send you a reset link",
  'forgotPassword.email.label': 'Email',
  'forgotPassword.email.placeholder': 'you@company.com',
  'forgotPassword.submit': 'Send reset link',
  'forgotPassword.backToLogin': '← Back to sign in',
  'forgotPassword.successMessage':
    "If an account exists for that email, you'll receive a reset link shortly. Check your inbox.",

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — Reset password
  // ──────────────────────────────────────────────────────────────────────────
  'resetPassword.title': 'Set new password',
  'resetPassword.subtitle': 'Enter your new password below.',
  'resetPassword.password.label': 'New password',
  'resetPassword.password.placeholder': 'At least 8 characters',
  'resetPassword.confirmPassword.label': 'Confirm new password',
  'resetPassword.confirmPassword.placeholder': 'Repeat your new password',
  'resetPassword.submit': 'Reset password',
  'resetPassword.successMessage':
    'Your password has been reset. You can now sign in with your new password.',
  'resetPassword.error.invalidToken':
    'This reset link is invalid or has expired. Please request a new one.',
  'resetPassword.error.missingToken':
    'No reset token found. Please use the link from your email.',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — Verify email
  // ──────────────────────────────────────────────────────────────────────────
  'verifyEmail.title': 'Check your email',
  'verifyEmail.subtitle': "We've sent a verification link to",
  'verifyEmail.instructions':
    'Click the link in the email to verify your account. If you do not see it, check your spam folder.',
  'verifyEmail.resend': 'Resend email',
  'verifyEmail.resendDisabled': 'Resend limit reached',
  'verifyEmail.resendCooldown': 'Resend available in',
  'verifyEmail.backToLogin': '← Back to sign in',
  'verifyEmail.resendSuccess': 'Verification email sent. Check your inbox.',
  'verifyEmail.resendRateLimited': 'Too many resend requests. Please wait before trying again.',
  'verifyEmail.verified.title': 'Email verified',
  'verifyEmail.verified.message': 'Your email has been verified. You can now sign in.',
  'verifyEmail.expired.title': 'Link expired',
  'verifyEmail.expired.message':
    'This verification link has expired. Request a new one by signing in.',
  'verifyEmail.invalid.title': 'Invalid link',
  'verifyEmail.invalid.message': 'This verification link is invalid. Please request a new one.',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — MFA (challenge page)
  // ──────────────────────────────────────────────────────────────────────────
  'mfa.title': 'Two-factor authentication',
  'mfa.subtitle': 'Enter the 6-digit code from your authenticator app',
  'mfa.useRecovery': 'Use a recovery code',
  'mfa.backToLogin': '← Back to sign in',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — MFA Setup Wizard
  // ──────────────────────────────────────────────────────────────────────────
  'mfa.setup.title': 'Set up two-factor authentication',
  'mfa.setup.subtitle': 'Protect your account with an authenticator app',
  'mfa.setup.step1.label': 'Scan QR code',
  'mfa.setup.step1.desc': 'Add to your app',
  'mfa.setup.step1.instruction':
    'Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan the QR code below.',
  'mfa.setup.step1.manualEntry': 'Or enter this code manually:',
  'mfa.setup.step2.label': 'Verify code',
  'mfa.setup.step2.desc': 'Confirm setup',
  'mfa.setup.step2.instruction':
    'Enter the 6-digit code shown in your authenticator app to confirm the setup.',
  'mfa.setup.step3.label': 'Recovery codes',
  'mfa.setup.step3.desc': 'Save for emergencies',
  'mfa.setup.step3.instruction':
    'Save these recovery codes somewhere safe. Each code can only be used once if you lose access to your authenticator app.',
  'mfa.setup.qrAlt': 'QR code for authenticator app',
  'mfa.setup.fetchError': 'Failed to load MFA setup. Please try again.',
  'mfa.setup.success': 'Two-factor authentication enabled successfully',
  'mfa.setup.done': 'Done — I saved my codes',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — MFA Verify
  // ──────────────────────────────────────────────────────────────────────────
  'mfa.verify.codeLabel': 'Verification code',
  'mfa.verify.codeRequired': 'Please enter the 6-digit code',
  'mfa.verify.invalidCode': 'Invalid verification code. Please try again.',
  'mfa.verify.submit': 'Verify and enable',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — MFA Recovery Codes
  // ──────────────────────────────────────────────────────────────────────────
  'mfa.recovery.warning':
    'Store these codes safely. If you lose your authenticator, these are the only way to recover access to your account.',
  'mfa.recovery.copyAll': 'Copy all',
  'mfa.recovery.download': 'Download',
  'mfa.recovery.copied': 'Recovery codes copied to clipboard',
  'mfa.recovery.copyFailed': 'Failed to copy. Please copy the codes manually.',
  'mfa.recovery.codeLabel': 'Recovery code',
  'mfa.recovery.fileHeader': 'Vastu — MFA Recovery Codes',
  'mfa.recovery.fileFooter': 'Keep these codes secure. Each code can only be used once.',

  // ──────────────────────────────────────────────────────────────────────────
  // OTP Input
  // ──────────────────────────────────────────────────────────────────────────
  'otp.ariaLabel': '6-digit verification code',
  'otp.digitLabel': 'Digit',

  // ──────────────────────────────────────────────────────────────────────────
  // Auth — SSO
  // ──────────────────────────────────────────────────────────────────────────
  'sso.title': 'Single sign-on',
  'sso.subtitle': 'Enter your work email to find your SSO provider',
  'sso.email.label': 'Work email',
  'sso.email.placeholder': 'you@company.com',
  'sso.submit': 'Continue',
  'sso.backToLogin': '← Back to sign in',
  'sso.selectProvider': 'Select your identity provider',
  'sso.noProviders': 'No SSO provider found for this email domain.',
  'sso.noProviders.hint': 'Contact your administrator or sign in with email and password.',
  'sso.loadError': 'Failed to look up SSO providers. Please try again.',

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
  'common.continue': 'Continue',
  'common.back': '← Back',
  'common.copy': 'Copy',
  'common.copied': 'Copied!',

  // ──────────────────────────────────────────────────────────────────────────
  // Errors
  // ──────────────────────────────────────────────────────────────────────────
  'error.invalidCredentials': 'Invalid email or password',
  'error.generic': 'Something went wrong. Please try again.',
  'error.sessionExpired': 'Your session has expired. Please sign in again.',
  'error.notFound': 'Page not found',
  'error.notFound.message':
    'The page you are looking for does not exist or may have been moved.',
  'error.notFound.goToWorkspace': 'Go to workspace',
  'error.notFound.goBack': 'Go back',
  'error.serverError': 'Something went wrong',
  'error.serverError.message':
    'An unexpected error occurred. Try again or return to the workspace.',
  'error.serverError.tryAgain': 'Try again',
  'error.serverError.goToWorkspace': 'Go to workspace',
  'error.networkError': 'Network error. Please check your connection.',
  'error.wordmarkLabel': 'Vastu',
  'error.footerLink': 'vastu.dev',

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

  // ──────────────────────────────────────────────────────────────────────────
  // Workspace
  // ──────────────────────────────────────────────────────────────────────────
  'workspace.title': 'Workspace',
  'workspace.placeholder.message':
    'The workspace is being built in Phase 1. This is where Dockview, page templates, and the view engine will live.',
  'workspace.iconRail.label': 'Workspace navigation',
  'workspace.iconRail.logoLabel': 'Go to workspace',
  'workspace.iconRail.settingsLabel': 'Settings',
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
