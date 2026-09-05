/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--brand-primary, #7C3AED)",
          secondary: "var(--brand-secondary, #6D28D9)",
          accent: "var(--brand-accent, #A855F7)",
          background: "var(--brand-background, #09090B)",
          sidebar: "var(--brand-sidebar, #0A0A0C)",
          card: "var(--brand-card, #18181B)",
          border: "var(--brand-border, #27272A)",
          text: "var(--brand-text, #FAFAFA)",
          muted: "var(--brand-muted, #A1A1AA)",
          success: "var(--brand-success, #22C55E)",
          warning: "var(--brand-warning, #EAB308)",
          danger: "var(--brand-danger, #EF4444)",
          info: "var(--brand-info, #3B82F6)",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Inter", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        code: ["var(--font-code)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        brand: "var(--brand-radius, 12px)",
      },
    },
  },
  plugins: [],
};
