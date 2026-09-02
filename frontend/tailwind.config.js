/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic design-system tokens
        background: "var(--background)",
        foreground: "var(--foreground)",
        "muted-foreground": "var(--muted-foreground)",
        faint: "var(--faint)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        accent: "var(--accent)",
        mark: "var(--mark)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        card: "var(--card)",
        border: "var(--border)",
        hairline: "var(--hairline)",
        negative: "var(--negative)",
        positive: "var(--positive)",

        // Legacy aliases kept for app pages (dashboard/borrow/lend/etc.)
        surfaceHover: "#141416",
        cardBorder: "#232326",
        creditcoin: {
          light: "#C4B5FD",
          DEFAULT: "#A78BFA",
          dark: "#7C68B8",
          glow: "#D6CBFF",
        },
        attest: {
          cyan: "#8FB8B0",
          emerald: "#69A87F",
          amber: "#C4B5FD",
          rose: "#C96A5E",
          purple: "#9C8BD0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(167, 139, 250, 0.16)" },
          "100%": { boxShadow: "0 0 30px rgba(196, 181, 253, 0.32)" },
        },
      },
    },
  },
  plugins: [],
};
