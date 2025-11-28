import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-manrope)", "Manrope", "sans-serif"],
      },
      colors: {
        "background-light": "hsl(var(--color-background-light) / <alpha-value>)",
        "background-dark": "hsl(var(--color-background-dark) / <alpha-value>)",
        "papir": {
          "teal": "hsl(180 100% 40%)",
          "red": "hsl(350 90% 55%)",
          "purple": "hsl(270 70% 60%)",
        },
      },
    },
  },
};

export default config;

