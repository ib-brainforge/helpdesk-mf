export default {
  plugins: {
    // Replace infinity values before Tailwind processes the CSS
    "postcss-replace": {
      pattern: /infinity\s*\*\s*1px/gi,
      data: {
        replaceAll: "9999px", // Use a large but valid CSS value instead
      },
    },
    "@tailwindcss/postcss": {}
  },
};
