import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Architectural boundary enforcement.
 *
 * The whole project rests on one rule: content -> core -> adapters, one direction only.
 * That rule is worth nothing if it depends on us remembering it, so it is a lint error.
 *
 *   src/core/**   is the domain. Pure. It may not know that the web exists: no React,
 *                 no next/*, no Request/Response-shaped concerns, no reaching into src/app.
 *                 This is what lets the same resolver feed HTML, JSON, and MCP without forks.
 *
 *   src/app/**    are adapters. They may import core freely, but must never import each
 *                 other -- the REST route reaching into the MCP route (or vice versa) is
 *                 exactly the drift this architecture exists to prevent.
 */
const boundaries = [
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "react", "react-dom", "react/*", "server-only"],
              message:
                "src/core is framework-free domain code. Keep Next/React in src/app adapters.",
            },
            {
              group: ["@/app", "@/app/*"],
              message:
                "Dependency inversion: adapters import core, never the reverse.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/api/*", "@/app/(site)/*"],
              message:
                "Adapters must not import each other. Share logic by moving it into src/core.",
            },
          ],
        },
      ],
    },
  },
];

/**
 * Destructuring a field out to drop it -- `const { body, ...summary } = project` -- is the
 * idiom the resolvers use to build list views. ignoreRestSiblings makes that first-class
 * rather than something we silence with an underscore at each call site.
 */
const unusedVars = [
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaries,
  ...unusedVars,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
