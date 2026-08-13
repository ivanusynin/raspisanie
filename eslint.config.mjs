import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "src/components/ui/**/*", // Ignore boilerplate UI components
      "node_modules/**/*",
      ".bun/**/*", // bun's package cache contains .d.ts files that crash ESLint
      ".next/**/*",
      "out/**/*",
      "dist/**/*",
      "build/**/*",
      "ts-morph-fixer.ts", // Ignore utility script
      "tailwind.config.ts", // Allow require() in config files
    ],
  },
  {
    rules: {
      "no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
