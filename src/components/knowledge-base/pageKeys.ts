/** Page keys an article is tagged with so it shows as "Help for this page". */

export const MAX_PAGE_KEYS = 10;
export const MAX_PAGE_KEY_LENGTH = 200;

// Mirrors the backend rule in KbArticle.SetPageKeys.
const PAGE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*(\.[a-z0-9_-]+)*$/;

export const PAGE_KEY_EXAMPLE_HINT =
  'Page keys look like helpdesk.knowledge-base or logistics.freight-consignment.';

export const normalisePageKey = (entry: string): string =>
  entry.trim().toLowerCase();

/** An error message for one (already normalised) key, or null when valid. */
export const validatePageKey = (key: string): string | null => {
  if (key.length === 0) return 'A page key cannot be empty';
  if (key.length > MAX_PAGE_KEY_LENGTH) {
    return `A page key can be at most ${MAX_PAGE_KEY_LENGTH} characters`;
  }
  if (!PAGE_KEY_PATTERN.test(key)) {
    return `"${key}" is not a valid page key. Use lower-case letters, digits, "-" and "_", with "." between parts.`;
  }
  return null;
};

/** Trim, lower-case, drop blanks and duplicates (first occurrence wins). */
export const normalisePageKeys = (entries: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of entries) {
    const key = normalisePageKey(entry);
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
};

/** An error message for a whole list of keys, or null when it can be saved. */
export const validatePageKeys = (entries: readonly string[]): string | null => {
  const keys = normalisePageKeys(entries);
  if (keys.length > MAX_PAGE_KEYS) {
    return `An article can have at most ${MAX_PAGE_KEYS} page keys`;
  }
  for (const key of keys) {
    const error = validatePageKey(key);
    if (error) return error;
  }
  return null;
};
