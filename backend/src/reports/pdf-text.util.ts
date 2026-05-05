export function preparePdfText(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

export function prepareArabicForPdf(text: string): string {
  const normalized = preparePdfText(text);

  if (!containsArabic(normalized)) {
    return normalized;
  }

  return normalized
    .split('\n')
    .map((line) => {
      if (!line.trim()) return line;
      const tokens = line.split(/\s+/).filter(Boolean);
      return tokens.reverse().join('  ');
    })
    .join('\n');
}
