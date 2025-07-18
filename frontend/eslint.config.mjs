// @ts-nocheck
import withNuxt from "./.nuxt/eslint.config.mjs";
import pluginTailwindCss from "eslint-plugin-tailwindcss";

export default withNuxt(
  {
    files: ["**/*.vue", "**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@stylistic/no-mixed-spaces-and-tabs": "off",
    },
  },
  {
    files: ["**/*.vue"],
    rules: {},
  },
).append(pluginTailwindCss.configs["flat/recommended"]);
