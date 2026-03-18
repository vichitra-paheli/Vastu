import { createTheme, type MantineColorsTuple } from '@mantine/core';

/**
 * Vastu custom color scale for Mantine — 10 shades of the primary steel blue.
 * Mantine requires exactly 10 shades (index 0–9).
 * Index 6 is the primary shade used for components.
 */
const vastuBlue: MantineColorsTuple = [
  '#e6f1fb', // 0 — lightest tint (sequential scale stop 1)
  '#cde3f7', // 1
  '#b5d4f4', // 2 — sequential scale stop 2
  '#9dc6f0', // 3
  '#85b7eb', // 4 — sequential scale stop 3
  '#4d96dc', // 5
  '#2378cb', // 6 — --v-accent-primary (PRIMARY SHADE)
  '#1e69b5', // 7 — --v-accent-primary-hover
  '#1a5a9e', // 8
  '#0c447c', // 9 — darkest (sequential scale stop 5)
];

/**
 * Vastu Mantine theme configuration.
 *
 * Principles applied:
 * - Two font weights only: 400 (regular) and 500 (medium). Never 600 or 700.
 * - All colors reference --v-* CSS custom properties via Mantine theme tokens.
 * - Default radius is 'md' (4px) — buttons, inputs, dropdowns.
 * - Spacing scale matches --v-space-* tokens (4px base unit).
 */
export const vastuTheme = createTheme({
  /* ============================================================
   * COLORS
   * ============================================================ */
  colors: {
    vastu: vastuBlue,
  },

  primaryColor: 'vastu',
  primaryShade: { light: 6, dark: 6 },

  /* ============================================================
   * TYPOGRAPHY
   * ============================================================ */
  fontFamily: 'var(--v-font-sans)',
  fontFamilyMonospace: 'var(--v-font-mono)',
  fontSizes: {
    xs: '11px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '20px',
  },
  lineHeights: {
    xs: '1.45',
    sm: '1.5',
    md: '1.55',
    lg: '1.5',
    xl: '1.4',
  },

  headings: {
    fontFamily: 'var(--v-font-sans)',
    fontWeight: '500',
    sizes: {
      h1: { fontSize: '24px', lineHeight: '1.3', fontWeight: '500' },
      h2: { fontSize: '20px', lineHeight: '1.4', fontWeight: '500' },
      h3: { fontSize: '16px', lineHeight: '1.5', fontWeight: '500' },
      h4: { fontSize: '14px', lineHeight: '1.55', fontWeight: '500' },
      h5: { fontSize: '12px', lineHeight: '1.5', fontWeight: '500' },
      h6: { fontSize: '11px', lineHeight: '1.45', fontWeight: '500' },
    },
  },

  /* ============================================================
   * SPACING — 4px base unit, matches --v-space-* tokens
   * ============================================================ */
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },

  /* ============================================================
   * BORDER RADII — matches --v-radius-* tokens
   * ============================================================ */
  radius: {
    xs: '2px',
    sm: '2px',
    md: '4px',
    lg: '8px',
    xl: '12px',
  },
  defaultRadius: 'md',

  /* ============================================================
   * SHADOWS — matches --v-shadow-* tokens
   * ============================================================ */
  shadows: {
    xs: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.06)',
    md: '0 4px 12px rgba(0,0,0,0.08)',
    lg: '0 8px 24px rgba(0,0,0,0.12)',
    xl: '0 16px 48px rgba(0,0,0,0.16)',
  },

  /* ============================================================
   * COMPONENT DEFAULTS
   * ============================================================ */
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: '500',
        },
      },
    },

    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },

    PasswordInput: {
      defaultProps: {
        radius: 'md',
      },
    },

    Select: {
      defaultProps: {
        radius: 'md',
      },
    },

    MultiSelect: {
      defaultProps: {
        radius: 'md',
      },
    },

    Textarea: {
      defaultProps: {
        radius: 'md',
        autosize: true,
      },
    },

    NumberInput: {
      defaultProps: {
        radius: 'md',
      },
    },

    Badge: {
      defaultProps: {
        radius: 'xl',
      },
      styles: {
        root: {
          fontWeight: '500',
          textTransform: 'none' as const,
        },
      },
    },

    Modal: {
      defaultProps: {
        radius: 'lg',
        padding: 'lg',
        overlayProps: {
          blur: 2,
        },
      },
    },

    Drawer: {
      defaultProps: {
        padding: 'lg',
      },
    },

    Card: {
      defaultProps: {
        radius: 'lg',
        padding: 'md',
      },
    },

    Paper: {
      defaultProps: {
        radius: 'lg',
      },
    },

    Tooltip: {
      defaultProps: {
        radius: 'md',
        withArrow: true,
      },
      styles: {
        tooltip: {
          fontSize: '12px',
          fontWeight: '400',
        },
      },
    },

    Tabs: {
      styles: {
        tab: {
          fontWeight: '500',
        },
      },
    },

    Menu: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        item: {
          fontWeight: '400',
        },
      },
    },

    Notification: {
      defaultProps: {
        radius: 'lg',
      },
    },

    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
    },

    Loader: {
      defaultProps: {
        type: 'dots',
      },
    },
  },
});
