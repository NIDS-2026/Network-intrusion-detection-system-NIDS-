/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "nids-bg": "#020617",
        "nids-card": "#020617",
        "nids-surface": "#020617",
        "nids-accent": "#22c55e",
        "nids-accent-soft": "#047857",
        "nids-danger": "#ef4444",
        "nids-warning": "#f97316",
      },
      boxShadow: {
        glow: "0 0 25px rgba(34, 197, 94, 0.25)",
      },
    },
  },
  plugins: [],
};
