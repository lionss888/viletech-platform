import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Цвета на основе Figma переменных
      colors: {
        // Primary colors
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
        },
        // Secondary colors
        secondary: {
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
        },
        // Neutral colors
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          200: 'var(--color-neutral-200)',
          300: 'var(--color-neutral-300)',
          400: 'var(--color-neutral-400)',
          500: 'var(--color-neutral-500)',
          600: 'var(--color-neutral-600)',
          700: 'var(--color-neutral-700)',
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
          950: 'var(--color-neutral-950)',
        },
        // Semantic colors
        success: {
          50: 'var(--color-success-50)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
        },
        error: {
          50: 'var(--color-error-50)',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          700: 'var(--color-error-700)',
        },
        // Background colors
        background: {
          primary: 'var(--color-background-primary)',
          secondary: 'var(--color-background-secondary)',
          tertiary: 'var(--color-background-tertiary)',
        },
        // Surface colors
        surface: {
          primary: 'var(--color-surface-primary)',
          secondary: 'var(--color-surface-secondary)',
          elevated: 'var(--color-surface-elevated)',
        },
        // Text colors
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
        },
        // Border colors
        border: {
          primary: 'var(--color-border-primary)',
          secondary: 'var(--color-border-secondary)',
          focus: 'var(--color-border-focus)',
        }
      },
      
      // Типографика на основе Figma переменных
      fontSize: {
        'display-2xl': ['var(--font-size-display-2xl)', { lineHeight: 'var(--line-height-display-2xl)' }],
        'display-xl': ['var(--font-size-display-xl)', { lineHeight: 'var(--line-height-display-xl)' }],
        'display-lg': ['var(--font-size-display-lg)', { lineHeight: 'var(--line-height-display-lg)' }],
        'display-md': ['var(--font-size-display-md)', { lineHeight: 'var(--line-height-display-md)' }],
        'display-sm': ['var(--font-size-display-sm)', { lineHeight: 'var(--line-height-display-sm)' }],
        'display-xs': ['var(--font-size-display-xs)', { lineHeight: 'var(--line-height-display-xs)' }],
        
        'text-xl': ['var(--font-size-text-xl)', { lineHeight: 'var(--line-height-text-xl)' }],
        'text-lg': ['var(--font-size-text-lg)', { lineHeight: 'var(--line-height-text-lg)' }],
        'text-md': ['var(--font-size-text-md)', { lineHeight: 'var(--line-height-text-md)' }],
        'text-sm': ['var(--font-size-text-sm)', { lineHeight: 'var(--line-height-text-sm)' }],
        'text-xs': ['var(--font-size-text-xs)', { lineHeight: 'var(--line-height-text-xs)' }],
      },

      // Семейства шрифтов
      fontFamily: {
        display: 'var(--font-family-display)',
        body: 'var(--font-family-body)',
        mono: 'var(--font-family-mono)',
      },

      // Веса шрифтов
      fontWeight: {
        regular: 'var(--font-weight-regular)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },

      // Spacing на основе Figma переменных
      spacing: {
        '0': 'var(--spacing-0)',
        '1': 'var(--spacing-1)',
        '2': 'var(--spacing-2)',
        '3': 'var(--spacing-3)',
        '4': 'var(--spacing-4)',
        '5': 'var(--spacing-5)',
        '6': 'var(--spacing-6)',
        '8': 'var(--spacing-8)',
        '10': 'var(--spacing-10)',
        '12': 'var(--spacing-12)',
        '16': 'var(--spacing-16)',
        '20': 'var(--spacing-20)',
        '24': 'var(--spacing-24)',
        '32': 'var(--spacing-32)',
        '40': 'var(--spacing-40)',
        '48': 'var(--spacing-48)',
        '56': 'var(--spacing-56)',
        '64': 'var(--spacing-64)',
        '80': 'var(--spacing-80)',
        '96': 'var(--spacing-96)',
        '112': 'var(--spacing-112)',
        '128': 'var(--spacing-128)',
      },

      // Радиусы скругления
      borderRadius: {
        'none': 'var(--border-radius-none)',
        'sm': 'var(--border-radius-sm)',
        'md': 'var(--border-radius-md)',
        'lg': 'var(--border-radius-lg)',
        'xl': 'var(--border-radius-xl)',
        '2xl': 'var(--border-radius-2xl)',
        'full': 'var(--border-radius-full)',
      },

      // Тени
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
      },

      // Анимации и переходы
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'normal': 'var(--transition-normal)',
        'slow': 'var(--transition-slow)',
      },

      transitionTimingFunction: {
        'ease-in-out-cubic': 'var(--transition-ease-in-out-cubic)',
        'ease-out-cubic': 'var(--transition-ease-out-cubic)',
        'ease-in-cubic': 'var(--transition-ease-in-cubic)',
      },
    },
  },
  plugins: [],
}

export default config
