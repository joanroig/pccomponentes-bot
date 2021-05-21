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
  ignorePatterns: [".eslintrc.js", "commitlint.config.js"],
  rules: {
    "@typescript-eslint/prefer-readonly": ["error"],
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended", // sets prettier plugin, rules and extends
  ],
};
