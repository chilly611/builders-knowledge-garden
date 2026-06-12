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
  // Garden-engine extraction guardrail (CODE-2, Phase 0).
  //
  // The generic engine layers — design-system and the app-shell — must NOT
  // import builders-specific modules directly. They should receive the
  // lifecycle, specialists, code-sources, etc. via the L2 config contracts in
  // src/garden/contracts (e.g. useLifecycle()). See
  // docs/garden-engine/01-DEPENDENCY-GRAPH.md §4 for the full edge list.
  //
  // Phase 0 shipped this as "warn" to surface the Phase-2 worklist. Phase 2
  // cut the edges (lifecycle, stage-from-pathname, stage-welcome-copy,
  // specialists via SpecialistRunner) — now "error" so the boundary can never
  // regress.
  {
    files: [
      "src/design-system/**/*.{ts,tsx}",
      "src/components/app-shell/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/lifecycle-stages",
                "**/lib/lifecycle-stages",
                "@/lib/specialists",
                "@/lib/specialists.client",
                "**/lib/specialists",
                "**/lib/specialists.client",
                "@/lib/code-sources",
                "@/lib/code-sources/*",
                "**/lib/code-sources",
                "**/lib/code-sources/*",
                "@/lib/knowledge-data",
                "**/lib/knowledge-data",
                "@/lib/stage-welcome-copy",
                "**/lib/stage-welcome-copy",
                "@/lib/stage-from-pathname",
                "**/lib/stage-from-pathname",
              ],
              message:
                "Garden-engine layers (design-system, app-shell) must not import builders-specific modules directly. Inject via the L2 config contracts in src/garden/contracts (useLifecycle(), a SpecialistRunner, GardenConfig). See docs/garden-engine/01-DEPENDENCY-GRAPH.md §4.",
            },
          ],
        },
      ],
    },
  },
  // Garden-engine guardrail — components/ (Phase 2 remainder).
  //
  // The shared chrome under src/components/ is also converted off the
  // lifecycle trio (lifecycle-stages, stage-from-pathname,
  // stage-welcome-copy) — everything reads useLifecycle()/useStageResolver()
  // now, so those three patterns are ratcheted at "error" here too.
  //
  // Scoped narrower than the engine block ON PURPOSE: components/ still has
  // Phase-3 edges we have NOT cut — JurisdictionPicker → knowledge-data,
  // stage-kit (CodeLookup, VoiceFieldReport) → specialists/* — so those
  // patterns are not listed yet. Add them as each subsystem is inverted.
  // `_archive/` snapshots are frozen dead code and exempt.
  {
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: ["src/components/_archive/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/lifecycle-stages",
                "**/lib/lifecycle-stages",
                "@/lib/stage-welcome-copy",
                "**/lib/stage-welcome-copy",
                "@/lib/stage-from-pathname",
                "**/lib/stage-from-pathname",
              ],
              message:
                "Shared chrome (src/components/) must not import the builders lifecycle modules directly. Read stages via useLifecycle()/useStageResolver() from src/garden/runtime/LifecycleProvider. See docs/garden-engine/01-DEPENDENCY-GRAPH.md §4.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
