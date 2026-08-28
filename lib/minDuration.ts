// Matches the loading-mark-fill keyframe's duration in globals.css — one full empty-to-full pass,
// so the LoadingMark always finishes its animation instead of flashing mid-fill on a fast response.
export const LOADING_ANIMATION_MS = 1300;

export async function withMinDuration<T>(promise: Promise<T>, minMs = LOADING_ANIMATION_MS): Promise<T> {
  const start = Date.now();
  const result = await promise;
  const elapsed = Date.now() - start;
  if (elapsed < minMs) {
    await new Promise((resolve) => setTimeout(resolve, minMs - elapsed));
  }
  return result;
}
