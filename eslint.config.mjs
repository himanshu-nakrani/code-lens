import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node scripts (CJS preflight) — not part of the Next app graph
    "scripts/**",
  ]),
  {
    rules: {
      // Workspace hydrate + analysis timer legitimately sync external/async state
      "react-hooks/set-state-in-effect": "off",
      // Stable callback refs updated after render for keyboard shortcuts
      "react-hooks/refs": "off",
    },
  },
]);

export default eslintConfig;
