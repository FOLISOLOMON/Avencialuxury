import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        gold: {
          50: "#FAF6E8",
          100: "#F5ECD1",
          200: "#EBD9A4",
          300: "#E0C677",
          400: "#D4B44A",
          500: "#C9A227", // Primary Avencia Gold
          600: "#A8861F", // Dark Gold
          700: "#846817",
          800: "#5E4A10",
          900: "#392C0A",
          950: "#211A05",
        },
        avencia: {
          lightBg: "#F8F7F3",
          lightSurface: "#FFFFFF",
          lightElevated: "#FFFFFF",
          lightBorder: "#E5E2D8",
          lightText: "#171717",
          lightMuted: "#737373",
          darkBg: "#0D0D0D",
          darkSurface: "#151515",
          darkElevated: "#1C1C1C",
          darkBorder: "#2A2A2A",
          darkText: "#F5F5F5",
          darkMuted: "#A3A3A3",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
