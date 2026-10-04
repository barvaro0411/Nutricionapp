const ts = require("typescript-eslint");
const hooks = require("eslint-plugin-react-hooks");
module.exports = [
  { ignores: ["node_modules/**", "dist/**", "audit-dist/**", ".expo/**", "supabase/.private/**", "**/*.sql"] },
  ...ts.configs.recommended,
  { files: ["**/*.{ts,tsx}"], plugins: { "react-hooks": hooks }, rules: {
    ...hooks.configs.recommended.rules,
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "react-hooks/exhaustive-deps": "warn",
  } },
  { files: ["**/*.{js,cjs}"], rules: { "@typescript-eslint/no-require-imports": "off", "@typescript-eslint/no-unused-vars": "off" } },
];
