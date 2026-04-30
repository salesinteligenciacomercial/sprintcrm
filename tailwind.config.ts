import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Brand override: remap Tailwind "blue" palette to Waze brand green
        // so legacy `bg-blue-*`, `text-blue-*`, `border-blue-*` classes render
        // in the brand color without touching every component.
        blue: {
          50: "hsl(142 70% 96%)",
          100: "hsl(142 70% 90%)",
          200: "hsl(142 65% 80%)",
          300: "hsl(142 65% 65%)",
          400: "hsl(142 68% 55%)",
          500: "hsl(142 71% 45%)",
          600: "hsl(142 72% 38%)",
          700: "hsl(142 74% 30%)",
          800: "hsl(142 75% 22%)",
          900: "hsl(150 70% 14%)",
          950: "hsl(155 70% 8%)",
        },
        // Same for `sky` & `indigo` which are sometimes used as accents
        sky: {
          50: "hsl(150 60% 96%)",
          100: "hsl(150 60% 90%)",
          200: "hsl(150 55% 80%)",
          300: "hsl(150 55% 65%)",
          400: "hsl(148 60% 55%)",
          500: "hsl(146 65% 48%)",
          600: "hsl(144 70% 40%)",
          700: "hsl(144 72% 32%)",
          800: "hsl(146 74% 24%)",
          900: "hsl(150 70% 14%)",
          950: "hsl(155 70% 8%)",
        },
        indigo: {
          50: "hsl(160 50% 96%)",
          100: "hsl(160 50% 90%)",
          200: "hsl(155 50% 80%)",
          300: "hsl(150 55% 65%)",
          400: "hsl(146 60% 52%)",
          500: "hsl(142 71% 45%)",
          600: "hsl(142 74% 36%)",
          700: "hsl(144 76% 28%)",
          800: "hsl(148 76% 20%)",
          900: "hsl(155 72% 12%)",
          950: "hsl(160 70% 6%)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          light: "hsl(var(--success-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          light: "hsl(var(--warning-light))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          light: "hsl(var(--info-light))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          light: "hsl(var(--accent-light))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          hover: "hsl(var(--card-hover))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-secondary": "var(--gradient-secondary)",
        "gradient-subtle": "var(--gradient-subtle)",
        "gradient-card": "var(--gradient-card)",
        "gradient-success": "var(--gradient-success)",
        "gradient-warning": "var(--gradient-warning)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
        card: "var(--shadow-card)",
      },
      transitionProperty: {
        smooth: "var(--transition-smooth)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
