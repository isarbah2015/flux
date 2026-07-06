---
name: post-install mobile expo restart
description: Metro crashes after pnpm install due to stale reanimated tmp dir
---

## Rule
After any `pnpm install` that changes `react-native-reanimated` or the overall node_modules layout, restart the `artifacts/mobile: expo` workflow before checking logs.

**Why:** react-native-reanimated creates a tmp watch directory (e.g. `react-native-reanimated_tmp_NNNN`) inside its own node_modules folder during bundling. When pnpm reinstalls and changes the physical path of the package, the old tmp path no longer exists but Metro's file watcher is still pointed at it, causing an `ENOENT` crash.

**How to apply:** `WorkflowsRestart({ name: "artifacts/mobile: expo" })` immediately after `pnpm install` completes. The crash is not a code error — it resolves on the fresh start.
