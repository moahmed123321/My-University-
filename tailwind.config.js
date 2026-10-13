/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14213d",
        paper: "#f6f5f1",
        accent: "#0f766e",
      },
    },
  },
  plugins: [],
};
