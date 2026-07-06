---
name: types/react dual-path override
description: Why @types/react is pinned in pnpm.overrides and what breaks without it
---

## Rule
Keep `"@types/react": "19.2.17"` and `"@types/react-dom": "19.2.3"` in `package.json > pnpm.overrides`.

**Why:** expo packages (react-native, expo-router, etc.) resolve `@types/react@19.1.17` as a peer dep, while the pnpm workspace catalog specifies `^19.2.0` (resolves to `19.2.17`). Without the override, pnpm stores two physical copies of the same package at different paths. TypeScript sees them as unrelated named types and throws "Two different types with this name exist, but they are unrelated" in mockup-sandbox components (calendar.tsx, spinner.tsx via lucide-react/radix-ui).

**How to apply:** Whenever running `pnpm install`, confirm the override is still in place and `pnpm run typecheck` passes after install. If new expo packages pin a newer `@types/react`, bump the override version to match the highest required version.
