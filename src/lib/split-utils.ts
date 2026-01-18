/**
 * Helpers for split-for-total matching. Ensures we only apply split.shares
 * when they were calculated for the same total (avoids using cart/order split on my-tab and vice versa).
 */

export const SPLIT_TOTAL_TOLERANCE = 0.01;

export function isSplitApplicableForTotal(
  splitForTotal: number | null | undefined,
  total: number
): boolean {
  return splitForTotal != null && Math.abs(splitForTotal - total) < SPLIT_TOTAL_TOLERANCE;
}
