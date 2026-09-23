import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bakery: {
          50: "#FCF9F5",
          100: "#F7F0E8",
          200: "#EDE0D2",
          300: "#DFCBBA",
          400: "#C9AA92",
          500: "#B08968",
          600: "#9C7353",
          700: "#7F5539",
          800: "#5E3E28",
          900: "#3E2718",
          950: "#24160E",
        },
        caramel: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        berry: {
          500: "#E11D48",
          600: "#BE123C",
          700: "#9F1239",
        }
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        'bakery-soft': '0 4px 20px -2px rgba(127, 85, 57, 0.08)',
        'bakery-hover': '0 10px 30px -4px rgba(127, 85, 57, 0.16)',
        'bakery-glow': '0 0 25px rgba(217, 119, 6, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};

export default config;
