/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        saffron: {
          DEFAULT: "#D9690F",
          dark: "#C25E08",
          light: "#F6A94B",
          accent: "#F6A94B",
        },
        ink: "#12141C",
        cream: "#FFF7EC",
        theme: {
          bg: "var(--bg)",
          surface: "var(--surface)",
          border: "var(--border)",
          text: "var(--text)",
          muted: "var(--text-muted)",
          primary: "var(--primary)",
          "primary-text": "var(--primary-text)",
          profit: "var(--profit)",
          loss: "var(--loss)",
          info: "var(--info)",
        },
      },
    },
  },
  plugins: [],
};
