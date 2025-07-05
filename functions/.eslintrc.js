module.exports = {
  env: {
    es6: true,
    node: true,
    commonjs: true,
  },
  extends: [
    "eslint:recommended",
  ],
  globals: {
    "module": "readonly",
    "require": "readonly",
    "exports": "readonly",
    "__dirname": "readonly",
    "__filename": "readonly",
    "process": "readonly",
    "console": "readonly",
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "script",
  },
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "single", {"allowTemplateLiterals": true}],
    "max-len": ["off"], // Disable line length for now
  },
};