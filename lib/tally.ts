/**
 * Counts for a checked list. Every address lands in exactly one bucket, so
 * the buckets always add up to the number of addresses checked.
 */

import type { Category } from "@/lib/classify";

/** Display order: people first, then organisations, then servers, then the unsure. */
export const CATEGORY_ORDER: Category[] = [
  "residential",
  "mobile",
  "business",
  "education",
  "government",
  "datacenter",
  "isp",
  "unknown",
];

export type TallyInput = {
  category: Category | null;
  problem: "private" | "failed" | null;
};

export type Tally = {
  total: number;
  buckets: { category: Category; count: number }[];
  /** Private or reserved addresses: no public network to classify. */
  private: number;
  /** Lookups that failed, so nothing is known about the address. */
  failed: number;
  /** Home and mobile lines together: the addresses a person is most likely behind. */
  people: number;
};

export function tally(rows: TallyInput[]): Tally {
  const counts = new Map<Category, number>();
  let privateCount = 0;
  let failed = 0;

  for (const row of rows) {
    if (row.problem === "private") {
      privateCount += 1;
    } else if (row.problem === "failed" || row.category === null) {
      failed += 1;
    } else {
      counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    }
  }

  return {
    total: rows.length,
    buckets: CATEGORY_ORDER.filter((category) => counts.has(category)).map((category) => ({
      category,
      count: counts.get(category) ?? 0,
    })),
    private: privateCount,
    failed,
    people: (counts.get("residential") ?? 0) + (counts.get("mobile") ?? 0),
  };
}
