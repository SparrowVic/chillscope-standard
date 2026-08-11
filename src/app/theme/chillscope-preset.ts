import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/* Keep these values aligned with the --cs-* tokens in styles.css. The dark primary needs dark
   contrast text because its fill is near-white. */
const SYGNAL_DARK_SURFACE = {
  0: '#ffffff',
  50: '#f4f5f7',
  100: '#dfe1e4',
  200: '#c6c9ce',
  300: '#b1b5bb',
  400: '#9ba0a7',
  500: '#5d636b',
  600: '#404349',
  700: '#2b2d31',
  800: '#202225',
  900: '#161719',
  950: '#0c0d0f',
};

const SYGNAL_LIGHT_SURFACE = {
  0: '#ffffff',
  50: '#f4f5f7',
  100: '#eceef1',
  200: '#e2e4e8',
  300: '#c9ccd2',
  400: '#9ba0a7',
  500: '#5d636b',
  600: '#404349',
  700: '#2c2e32',
  800: '#202225',
  900: '#161719',
  950: '#0c0d0f',
};

export const ChillscopePreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '4px',
      sm: '6px',
      md: '8px',
      lg: '10px',
      xl: '12px',
    },
  },
  semantic: {
    formField: {
      sm: {
        fontSize: 'var(--cs-font-control)',
        paddingX: '0.625rem',
        paddingY: 'calc((var(--cs-control-height) - 1.5em - 2px) / 2)',
      },
      lg: {
        fontSize: 'var(--cs-font-control)',
        paddingX: '0.75rem',
        paddingY: '0.5rem',
      },
    },
    // Each colour scheme selects its exact primary step below.
    primary: {
      50: '#f4f5f7',
      100: '#e9ebee',
      200: '#dfe1e4',
      300: '#c6c9ce',
      400: '#9ba0a7',
      500: '#5d636b',
      600: '#404349',
      700: '#2c2e32',
      800: '#202225',
      900: '#161719',
      950: '#0c0d0f',
    },
    colorScheme: {
      light: {
        surface: SYGNAL_LIGHT_SURFACE,
        primary: {
          color: '#1b1d20',
          hoverColor: '#2c2e32',
          activeColor: '#0c0d0f',
          contrastColor: '#ffffff',
        },
        text: {
          color: '#1b1d20',
          hoverColor: '#0c0d0f',
          mutedColor: '#5d636b',
          hoverMutedColor: '#404349',
        },
        formField: {
          background: '#f8f9fa',
          borderColor: 'transparent',
          hoverBorderColor: 'transparent',
          focusBorderColor: '{primary.color}',
          invalidBorderColor: '#cb3038',
          color: '{text.color}',
        },
        highlight: {
          background: 'color-mix(in srgb, #1b1d20 8%, transparent)',
          focusBackground: 'color-mix(in srgb, #1b1d20 12%, transparent)',
          color: '#1b1d20',
          focusColor: '#0c0d0f',
        },
        overlay: {
          select: { background: '#ffffff', borderColor: '{surface.200}', color: '{text.color}' },
          popover: { background: '#ffffff', borderColor: '{surface.200}', color: '{text.color}' },
          modal: { background: '#ffffff', borderColor: '{surface.200}', color: '{text.color}' },
        },
      },
      dark: {
        surface: SYGNAL_DARK_SURFACE,
        primary: {
          color: '#e9ebee',
          hoverColor: '#ffffff',
          activeColor: '#dfe1e4',
          contrastColor: '#151619',
        },
        text: {
          color: '#dfe1e4',
          hoverColor: '#f4f5f7',
          mutedColor: '#9ba0a7',
          hoverMutedColor: '#b1b5bb',
        },
        formField: {
          background: '#202225',
          borderColor: 'transparent',
          hoverBorderColor: 'transparent',
          focusBorderColor: '{primary.color}',
          invalidBorderColor: '#ff5f57',
          color: '{text.color}',
        },
        highlight: {
          background: 'color-mix(in srgb, #e9ebee 14%, transparent)',
          focusBackground: 'color-mix(in srgb, #e9ebee 20%, transparent)',
          color: '#f4f5f7',
          focusColor: '#ffffff',
        },
        overlay: {
          select: { background: '#2c2e32', borderColor: '{surface.600}', color: '{text.color}' },
          popover: { background: '#2c2e32', borderColor: '{surface.600}', color: '{text.color}' },
          modal: { background: '#2c2e32', borderColor: '{surface.600}', color: '{text.color}' },
        },
      },
    },
  },
  components: {
    // Aura otherwise uses content.background here instead of the configured overlay surface.
    datepicker: {
      panel: {
        background: '{overlay.popover.background}',
        borderColor: '{overlay.popover.border.color}',
        color: '{overlay.popover.color}',
      },
    },
    button: {
      root: {
        sm: { fontSize: 'var(--cs-font-control)', paddingX: '0.625rem', paddingY: '0.3rem' },
        lg: {
          fontSize: 'var(--cs-font-control)',
          paddingX: '0.875rem',
          paddingY: '0.55rem',
        },
      },
      colorScheme: {
        light: {
          root: {
            secondary: {
              background: '{surface.100}',
              hoverBackground: '{surface.200}',
              activeBackground: '{surface.300}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '{text.color}',
            },
          },
        },
        dark: {
          root: {
            secondary: {
              background: '{surface.800}',
              hoverBackground: '{surface.700}',
              activeBackground: '{surface.600}',
              borderColor: 'transparent',
              hoverBorderColor: 'transparent',
              activeBorderColor: 'transparent',
              color: '{text.color}',
            },
          },
        },
      },
    },
    // Keep the dark track on a surface token instead of the hairline colour.
    toggleswitch: {
      colorScheme: {
        dark: {
          root: {
            background: '{surface.800}',
            hoverBackground: '{surface.700}',
          },
        },
      },
    },
    tooltip: {
      colorScheme: {
        dark: {
          root: { background: '#2c2e32' },
        },
      },
    },
  },
});
