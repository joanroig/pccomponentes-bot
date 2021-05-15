module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
    project: "tsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  ignorePatterns: [".eslintrc.js"],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/prefer-readonly": ["error"],
  },
  extends: [
    // "standard",
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    // "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended", // sets prettier plugin and extends
  ],
};
