import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Skip pre-existing test files that reference jest/testing-library
    // packages we never installed. They shouldn't block real lint runs.
    "**/__tests__/**",
    "**/*.test.ts",
    "**/*.test.tsx",
  ]),
  // Explicit rules block.
  //
  // 2026-05-06: A hooks-after-early-return bug took out every /killerapp/*
  // route in production. The Next.js shared config sets
  // `react-hooks/rules-of-hooks` to error, but `next build` no longer
  // runs ESLint as of Next 15 — so the build was green and the bug
  // shipped. Push script now runs `npm run lint` before build (see
  // push-fix-2026-05-06d.sh and successors). This explicit block makes
  // the gate visible in this file rather than buried in a transitive
  // config.
  {
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
