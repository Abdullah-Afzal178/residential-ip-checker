/**
 * Decides what kind of network an address is on, and how far the records
 * agree. Pure, so it can be unit tested.
 *
 * Four independent records feed it: the type of the ASN that routes the
 * address, the type of the organisation the address block is assigned to,
 * the connection type, and the reverse DNS name. The category comes from
 * fixed rules (strongest evidence first). Agreement is worked out separately,
 * by asking each record whether it backs that category, fits it, or argues
 * against it, so a confident-looking label never hides a disagreement.
 */

import { hostnameHints, type HintKind, type HostnameHint } from "@/lib/hints";

export type Category =
  | "residential"
  | "mobile"
  | "datacenter"
  | "business"
  | "education"
  | "government"
  | "isp"
  | "unknown";

export type Variant = "cdn" | "anycast" | "satellite" | "business-line" | null;

export type Facts = {
  /** ISP, HOSTING, BUSINESS, EDUCATION or GOVERNMENT; empty when not recorded. */
  asnType: string;
  companyType: string;
  /** Cable, DSL, Fiber, Fixed Broadband, Mobile, Satellite…; empty when not recorded. */
  connectionType: string;
  isCdn: boolean;
  cdnProvider: string;
  isAnycast: boolean;
  /** Null when the address has no reverse DNS name. */
  hostname: string | null;
};

/** How one record relates to the chosen category. */
export type Stance = "backs" | "fits" | "conflicts" | "silent";

export type SignalId = "asn" | "company" | "connection" | "flags" | "hostname";

export type Signal = {
  id: SignalId;
  /** What the record says, as the API spells it. Empty when it says nothing. */
  reading: string;
  stance: Stance;
};

/**
 * clear: a hard record backs the category and at least one more agrees.
 * probable: one record, or only the reverse DNS name, points this way.
 * mixed: at least one record argues against it.
 * unclear: the records cannot separate home, mobile and business lines.
 */
export type Agreement = "clear" | "probable" | "mixed" | "unclear";

export type Classification = {
  category: Category;
  variant: Variant;
  agreement: Agreement;
  signals: Signal[];
  hints: HostnameHint[];
  /** Set when the reverse DNS name says Tor exit or VPN. */
  anonymizer: string | null;
};

type LineKind = "home" | "mobile" | "other" | "none";

export function lineKind(connectionType: string): LineKind {
  const text = connectionType.trim().toLowerCase();

  if (text === "") {
    return "none";
  }

  if (/mobile|cellular|\b[345]g\b|lte/.test(text)) {
    return "mobile";
  }

  if (/cable|dsl|fib(er|re)|ftth|broadband|satellite|fixed|dial/.test(text)) {
    return "home";
  }

  return "other";
}

export function classify(facts: Facts): Classification {
  const asnType = facts.asnType.trim().toUpperCase();
  const companyType = facts.companyType.trim().toUpperCase();
  const line = lineKind(facts.connectionType);
  const hints = hostnameHints(facts.hostname);
  const hinted = (kind: HintKind) => hints.some((hint) => hint.kind === kind);
  const anonymizer = hints.find((hint) => hint.kind === "anonymizer")?.match ?? null;

  // The block owner is the more specific record, so it speaks first.
  const primaryType = companyType || asnType;

  let category: Category;
  let variant: Variant = null;

  if (facts.isCdn) {
    category = "datacenter";
    variant = "cdn";
  } else if (asnType === "HOSTING" || companyType === "HOSTING") {
    category = "datacenter";
    variant = facts.isAnycast ? "anycast" : null;
  } else if (facts.isAnycast) {
    category = "datacenter";
    variant = "anycast";
  } else if (line === "mobile") {
    category = "mobile";
  } else if (line === "home") {
    if (companyType === "BUSINESS" || hinted("business")) {
      category = "business";
      variant = "business-line";
    } else {
      category = "residential";
      variant = /satellite/i.test(facts.connectionType) ? "satellite" : null;
    }
  } else if (primaryType === "EDUCATION") {
    category = "education";
  } else if (primaryType === "GOVERNMENT") {
    category = "government";
  } else if (primaryType === "BUSINESS") {
    category = "business";
  } else {
    category = fromHints(hints, primaryType === "ISP" || asnType === "ISP");
  }

  const signals: Signal[] = [
    { id: "asn", reading: facts.asnType.trim(), stance: typeStance(asnType, category) },
    { id: "company", reading: facts.companyType.trim(), stance: typeStance(companyType, category) },
    { id: "connection", reading: facts.connectionType.trim(), stance: lineStance(line, category) },
    { id: "flags", reading: flagReading(facts), stance: flagStance(facts, category) },
    {
      id: "hostname",
      reading: facts.hostname ?? "",
      stance: hostnameStance(hints, category),
    },
  ];

  return {
    category,
    variant,
    agreement: agreementOf(category, signals),
    signals,
    hints,
    anonymizer,
  };
}

/**
 * An ISP-typed network with no connection type, or no type at all. The
 * reverse DNS name is all that is left to separate home, mobile and
 * business lines; if it says nothing, or says two things, the honest answer
 * is "an ISP" (or "unknown" when there is no ISP record either).
 */
function fromHints(hints: HostnameHint[], onIsp: boolean): Category {
  const kinds = new Set(hints.map((hint) => hint.kind).filter((kind) => kind !== "anonymizer"));
  const fallback: Category = onIsp ? "isp" : "unknown";

  if (kinds.size !== 1) {
    return fallback;
  }

  const [kind] = [...kinds];

  return kind === "hosting" ? "datacenter" : (kind as Category);
}

function typeStance(type: string, category: Category): Stance {
  switch (type) {
    case "ISP":
      return category === "isp"
        ? "backs"
        : ["residential", "mobile", "business"].includes(category)
          ? "fits"
          : "silent";
    case "HOSTING":
      return category === "datacenter"
        ? "backs"
        : ["residential", "mobile", "isp"].includes(category)
          ? "conflicts"
          : "silent";
    case "BUSINESS":
      return category === "business"
        ? "backs"
        : category === "datacenter"
          ? "fits"
          : ["residential", "mobile", "isp"].includes(category)
            ? "conflicts"
            : "silent";
    case "EDUCATION":
    case "GOVERNMENT":
      return category === type.toLowerCase()
        ? "backs"
        : ["residential", "mobile", "isp"].includes(category)
          ? "conflicts"
          : "silent";
    default:
      return "silent";
  }
}

function lineStance(line: LineKind, category: Category): Stance {
  if (line === "home") {
    return category === "residential"
      ? "backs"
      : category === "business" || category === "isp"
        ? "fits"
        : category === "mobile" || category === "datacenter"
          ? "conflicts"
          : "silent";
  }

  if (line === "mobile") {
    return category === "mobile"
      ? "backs"
      : category === "isp"
        ? "fits"
        : ["residential", "datacenter", "business"].includes(category)
          ? "conflicts"
          : "silent";
  }

  return "silent";
}

function flagReading(facts: Facts): string {
  if (facts.isCdn) {
    return facts.cdnProvider ? `CDN (${facts.cdnProvider})` : "CDN";
  }

  return facts.isAnycast ? "Anycast" : "";
}

function flagStance(facts: Facts, category: Category): Stance {
  if (!facts.isCdn && !facts.isAnycast) {
    return "silent";
  }

  return category === "datacenter"
    ? "backs"
    : category === "business"
      ? "fits"
      : ["residential", "mobile", "isp"].includes(category)
        ? "conflicts"
        : "silent";
}

const HINT_STANCE: Record<Exclude<HintKind, "anonymizer">, Partial<Record<Category, Stance>>> = {
  residential: { residential: "backs", isp: "fits", mobile: "conflicts", datacenter: "conflicts", business: "conflicts" },
  mobile: { mobile: "backs", isp: "fits", residential: "conflicts", datacenter: "conflicts", business: "conflicts" },
  business: { business: "backs", isp: "fits", residential: "conflicts", mobile: "conflicts" },
  hosting: { datacenter: "backs", business: "fits", residential: "conflicts", mobile: "conflicts", isp: "conflicts" },
};

function hostnameStance(hints: HostnameHint[], category: Category): Stance {
  const stances = hints
    .filter((hint): hint is HostnameHint & { kind: Exclude<HintKind, "anonymizer"> } => hint.kind !== "anonymizer")
    .map((hint) => HINT_STANCE[hint.kind][category] ?? "silent");

  const backs = stances.includes("backs");
  const conflicts = stances.includes("conflicts");

  // A name that says two contradictory things says nothing useful.
  if (backs && conflicts) {
    return "silent";
  }

  if (backs) {
    return "backs";
  }

  if (conflicts) {
    return "conflicts";
  }

  return stances.includes("fits") ? "fits" : "silent";
}

function agreementOf(category: Category, signals: Signal[]): Agreement {
  if (category === "isp" || category === "unknown") {
    return "unclear";
  }

  if (signals.some((signal) => signal.stance === "conflicts")) {
    return "mixed";
  }

  // The reverse DNS name is a naming convention, not a record, so it can
  // support a category but never carry it alone.
  const hardBacking = signals.some((signal) => signal.id !== "hostname" && signal.stance === "backs");
  const agreeing = signals.filter((signal) => signal.stance === "backs" || signal.stance === "fits").length;

  return hardBacking && agreeing >= 2 ? "clear" : "probable";
}
