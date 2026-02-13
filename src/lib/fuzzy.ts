const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

const fuzzyMatch = (text: string, query: string) => {
  if (!query) return true;
  if (text.includes(query)) return true;
  const distance = levenshtein(text, query);
  const similarity = 1 - distance / Math.max(text.length, query.length, 1);
  return similarity >= 0.72;
};

export const matchesFuzzy = (text: string, query: string) => {
  const rawQuery = query.toLowerCase().trim();
  if (!rawQuery) return true;
  const normalizedQuery = rawQuery.replace(/\s+/g, "");
  const tokens = rawQuery.split(/\s+/).filter(Boolean);
  const rawText = text.toLowerCase();
  const normalizedText = rawText.replace(/\s+/g, "");

  if (normalizedText.includes(normalizedQuery)) return true;
  if (tokens.every((token) => rawText.includes(token))) return true;
  return fuzzyMatch(normalizedText, normalizedQuery);
};
