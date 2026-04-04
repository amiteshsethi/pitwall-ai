/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        pitwall: {
          red: "#ef4444",
          dark: "#000000",
          card: "#09090b",
        },
      },
    },
  },
  plugins: [],
}