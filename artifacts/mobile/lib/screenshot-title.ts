/** Human-readable card title when OCR text is missing or sparse. */
export function buildScreenshotTitle(
  extractedText: string,
  options?: { filename?: string | null; capturedAt?: string },
): string {
  const text = extractedText.trim();
  if (text) {
    const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean);
    if (firstLine && firstLine.length > 2) {
      return truncate(firstLine, 72);
    }
  }

  const filename = options?.filename?.trim();
  if (filename) {
    const stem = filename
      .replace(/\.(png|jpe?g|webp|heic)$/i, '')
      .replace(/^screenshot[_-]?/i, '')
      .replace(/^screen[_-]?/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (stem.length > 2 && !/^img[\s_-]*\d+$/i.test(stem)) {
      return truncate(stem, 72);
    }
  }

  if (options?.capturedAt) {
    const when = new Date(options.capturedAt);
    if (!Number.isNaN(when.getTime())) {
      return `Screenshot · ${when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  }

  return 'Screenshot';
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
