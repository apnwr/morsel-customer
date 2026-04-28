/**
 * Menu search matcher.
 *
 * Tier-2 search: token-prefix AND across multiple fields, diacritic-folded.
 *
 *  - "lat"        → matches "Cafe Latte" via per-token prefix on name
 *  - "veg curry"  → must hit BOTH tokens (AND); matches "Mixed Veg Curry"
 *  - "spicy"      → matches anything with "spicy" in description / tag
 *  - "café"/"cafe"→ both work (NFD diacritic strip)
 *
 * Indexed fields per item: name, description, tags, dietary, allergens, and
 * the resolved category name passed by the caller. We deliberately skip
 * preparationTime, spiceLevels, and price — those aren't search terms users type.
 */

import type { MenuItem } from '@/types/menu';

/**
 * Lowercase + strip diacritics ("Café" → "cafe"). Used for both query and
 * indexed tokens so the comparison is symmetric.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Split a normalized blob into tokens on whitespace and common punctuation.
 * Keeps tokens short (no joined "veg-curry"), which makes per-token prefix
 * matching predictable.
 */
function tokenize(s: string): string[] {
  return s.split(/[\s,/_\-()&|+.]+/).filter(Boolean);
}

/**
 * Build the searchable token set for an item. Caller supplies the resolved
 * category name when known (the MenuItem only carries categoryId).
 */
export function searchableTokens(item: MenuItem, categoryName?: string): string[] {
  const blob = [
    item.name,
    item.description ?? '',
    ...(item.tags ?? []),
    ...(item.dietary ?? []),
    ...(item.allergens ?? []),
    categoryName ?? '',
  ].join(' ');
  return tokenize(normalize(blob));
}

/**
 * Returns true iff every token in `query` prefix-matches at least one of the
 * item's searchable tokens. Empty / whitespace query matches everything.
 */
export function matchesQuery(
  item: MenuItem,
  query: string,
  categoryName?: string
): boolean {
  const queryTokens = tokenize(normalize(query));
  if (queryTokens.length === 0) return true;

  const itemTokens = searchableTokens(item, categoryName);
  return queryTokens.every((q) => itemTokens.some((t) => t.startsWith(q)));
}
