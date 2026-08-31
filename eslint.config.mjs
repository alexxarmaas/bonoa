import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/business/**/growth/page.tsx"],
    rules: {
      // The shared load() function is intentionally reused by initial hydration and
      // user-triggered mutations. Its initial setLoading/setError calls are safe
      // here because the first render already starts in that state.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
