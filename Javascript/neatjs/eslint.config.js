import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 2020, // Thiết lập chuẩn ES2020
    },
    rules: {
      "no-var": "error",
    },
  },
  pluginJs.configs.recommended,
];