export type FluxEnv = "production" | "testing" | "development";

export function getFluxEnv(): FluxEnv {
  const explicit = process.env.FLUX_ENV?.trim().toLowerCase();
  if (explicit === "testing" || explicit === "production" || explicit === "development") {
    return explicit;
  }
  if (process.env.NODE_ENV === "production") return "production";
  return "development";
}

export function isTestingEnv(): boolean {
  return getFluxEnv() === "testing";
}
