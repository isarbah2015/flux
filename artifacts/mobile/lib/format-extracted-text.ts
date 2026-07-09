/**
 * Turn raw OCR output into readable paragraphs (merge wrapped lines, split on blank lines).
 */
export function formatExtractedText(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const lines = normalized.split('\n');
  const paragraphs: string[] = [];
  let current = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) {
        paragraphs.push(current.trim());
        current = '';
      }
      continue;
    }

    const looksLikeContinuation =
      current.length > 0 &&
      !/[.!?:;]$/.test(current) &&
      trimmed.length < 72 &&
      !/^[•\-*▪►]/.test(trimmed) &&
      !/^\d+[\).]/.test(trimmed);

    if (looksLikeContinuation) {
      current = `${current} ${trimmed}`;
    } else if (current) {
      paragraphs.push(current.trim());
      current = trimmed;
    } else {
      current = trimmed;
    }
  }

  if (current) paragraphs.push(current.trim());
  return paragraphs.length > 0 ? paragraphs : [normalized];
}

export function formattedTextForCopy(paragraphs: string[]): string {
  return paragraphs.join('\n\n');
}
