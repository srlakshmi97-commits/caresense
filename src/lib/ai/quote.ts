/** Normalise text for "is this quote really in the document?" checks. */
export function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteIsIn(quote: string | null | undefined, text: string) {
  if (!quote || quote.trim().length < 3) return false;
  return norm(text).includes(norm(quote));
}
