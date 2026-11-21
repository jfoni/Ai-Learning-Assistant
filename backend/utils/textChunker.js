export function chunkText(text = '', chunkSize = 11000, overlap = 700) {
  const clean = String(text || '').trim();
  if (!clean) return [];

  if (clean.length <= chunkSize) {
    return [{ index: 0, total: 1, content: clean }];
  }

  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);
    if (end < clean.length) {
      const lastNewline = clean.lastIndexOf('\n', end);
      if (lastNewline > start + chunkSize * 0.6) {
        end = lastNewline;
      }
    }

    const piece = clean.slice(start, end).trim();
    if (piece) {
      chunks.push({ index, content: piece });
      index += 1;
    }

    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks.map((c) => ({ ...c, total: chunks.length }));
}

export default chunkText;