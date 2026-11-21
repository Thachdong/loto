import boundaries from "eslint-plugin-boundaries";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Ranh giới lớp — .claude/skills/implement-task/references/architecture.md §3.
 * Thứ tự element quan trọng: pattern cụ thể đứng trước.
 */
const elements = [
  { type: "app", pattern: "src/app" },
  { type: "feature-shared", pattern: "src/features/*/shared", capture: ["feature"] },
  { type: "feature-action", pattern: "src/features/*/server/actions", capture: ["feature"] },
  { type: "feature-query", pattern: "src/features/*/server/queries", capture: ["feature"] },
  { type: "feature-service", pattern: "src/features/*/server", capture: ["feature"] },
  { type: "feature-db", pattern: "src/features/*/db", capture: ["feature"] },
  { type: "feature-client", pattern: "src/features/*/client", capture: ["feature"] },
  { type: "core-shared", pattern: "src/core/shared" },
  { type: "core-server", pattern: "src/core/server" },
  { type: "core-db", pattern: "src/core/db" },
  { type: "core-client", pattern: "src/core/client" },
];

const SHARED = ["feature-shared", "core-shared"];
const sameFeature = (type) => ({
  element: { type, captured: { feature: "{{ from.element.captured.feature }}" } },
});
const allowTypes = (...types) => ({ to: { element: { types } } });

const layerPolicies = [
  // Mọi lớp được dùng shared.
  { allow: allowTypes(...SHARED) },
  {
    from: { element: { type: "app" } },
    allow: allowTypes("feature-action", "feature-query", "core-server", "feature-client", "core-client"),
  },
  {
    from: { element: { type: "feature-client" } },
    allow: [allowTypes("feature-action", "core-client"), { to: sameFeature("feature-client") }],
  },
  { from: { element: { type: "core-client" } }, allow: allowTypes("core-client") },
  {
    from: { element: { type: "feature-action" } },
    allow: [allowTypes("core-server"), { to: sameFeature("feature-service") }],
  },
  {
    from: { element: { type: "feature-service" } },
    allow: allowTypes("feature-service", "feature-db", "core-server", "core-db"),
  },
  { from: { element: { type: "feature-query" } }, allow: allowTypes("feature-db", "core-db", "core-server") },
  {
    from: { element: { type: "feature-db" } },
    allow: [allowTypes("core-db"), { to: sameFeature("feature-db") }],
  },
  { from: { element: { type: "core-db" } }, allow: allowTypes("core-db", "core-server") },
  { from: { element: { type: "core-server" } }, allow: allowTypes("core-server", "core-db") },
];

const adminImports = {
  patterns: [
    {
      group: ["firebase-admin", "firebase-admin/*"],
      message: "firebase-admin chỉ dùng trong server/, db/, scripts/ và tests/.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": elements,
      "boundaries/include": ["src/**/*"],
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      "boundaries/dependencies": [2, { default: "disallow", policies: layerPolicies }],
    },
  },
  {
    files: ["src/app/**", "src/**/client/**", "src/**/shared/**"],
    rules: { "no-restricted-imports": ["error", adminImports] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "functions/lib/**"]),
]);

export default eslintConfig;
