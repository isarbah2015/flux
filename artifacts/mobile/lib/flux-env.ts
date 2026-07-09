export type FluxBuildEnv = "production" | "testing" | "development";

const raw = process.env.EXPO_PUBLIC_FLUX_ENV?.trim().toLowerCase();

export const FLUX_BUILD_ENV: FluxBuildEnv =
  raw === "testing" || raw === "production" || raw === "development"
    ? raw
    : __DEV__
      ? "development"
      : "production";

export const isTestingBuild = FLUX_BUILD_ENV === "testing";
