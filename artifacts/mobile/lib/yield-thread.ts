/** Yield the JS thread so native OCR / I/O can complete without starving the UI. */
export function yieldToMainThread(ms = 80): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
