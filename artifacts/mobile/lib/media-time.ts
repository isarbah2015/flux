/** expo-media-library Asset.creationTime is seconds since epoch (not ms). */
export function mediaCreationTimeMs(creationTime: number): number {
  if (!Number.isFinite(creationTime) || creationTime <= 0) return 0;
  return creationTime > 1e12 ? creationTime : creationTime * 1000;
}

export function isoFromMediaCreationTime(creationTime: number): string {
  return new Date(mediaCreationTimeMs(creationTime)).toISOString();
}
