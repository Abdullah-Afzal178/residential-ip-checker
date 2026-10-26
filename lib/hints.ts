/**
 * What an address's reverse DNS name says about the line behind it.
 *
 * ISPs name their address pools after the service: "adsl-99-104-20-5",
 * "pool-108-28-100-1.fios", "10.sub-174-192-10.myvzw.com". These are
 * conventions, not records, so they only ever count as a weak signal and are
 * shown with the word that matched.
 */

export type HintKind = "residential" | "mobile" | "business" | "hosting" | "anonymizer";

export type HostnameHint = {
  kind: HintKind;
  /** The part of the name that matched, so the reasoning can be shown. */
  match: string;
};

/**
 * Whole tokens only. A name is split on dots, dashes and underscores, and
 * trailing digits are dropped ("cpc81874" → "cpc", "hsd1" → "hsd"), so
 * "cable" matches "static.cable.virginmedia.com" but not "cablevision".
 */
const TOKENS: Record<HintKind, ReadonlySet<string>> = {
  residential: new Set([
    "dsl", "adsl", "vdsl", "xdsl", "cable", "modemcable", "cablemodem", "cpe", "cpc", "dhcp",
    "dyn", "dynamic", "dynip", "dip", "pool", "ppp", "pppoe", "ftth", "fttp", "fttb", "fttx",
    "fios", "hsd", "broadband", "bband", "resi", "residential", "home", "customer", "cust",
    "subscriber", "dial", "dialup", "hfc", "docsis", "catv", "gpon",
  ]),
  mobile: new Set([
    "mobile", "mobil", "mob", "umts", "lte", "gprs", "hspa", "3g", "4g", "5g", "cellular",
    "wwan", "myvzw", "tmodns",
  ]),
  business: new Set(["business", "biz", "corp", "corporate", "enterprise"]),
  hosting: new Set([
    "vps", "vds", "server", "servers", "srv", "dedi", "dedicated", "colo", "colocation", "cloud",
    "compute", "ec2", "hosting", "hosted", "datacenter", "lb", "amazonaws", "googleusercontent",
    "cloudapp", "linode", "vultr", "contabo", "hetzner", "ovh", "digitalocean", "hstgr",
    "kimsufi", "scaleway",
  ]),
  // Not "proxy": Google names crawler infrastructure "rate-limited-proxy-…".
  // Not a bare "tor" either, which is just as often Toronto.
  anonymizer: new Set(["torexit", "vpn"]),
};

const ORDER: HintKind[] = ["anonymizer", "mobile", "residential", "business", "hosting"];

export function hostnameHints(hostname: string | null): HostnameHint[] {
  if (!hostname) {
    return [];
  }

  const tokens = hostname
    .toLowerCase()
    .replace(/\.$/, "")
    .split(/[.\-_]+/)
    .map((token) => (/^[345]g$/.test(token) ? token : token.replace(/\d+$/, "")))
    .filter(Boolean);

  const hints: HostnameHint[] = [];

  for (const kind of ORDER) {
    const match =
      kind === "anonymizer" && tokens.includes("tor") && tokens.includes("exit")
        ? "tor-exit"
        : tokens.find((token) => TOKENS[kind].has(token));

    if (match) {
      hints.push({ kind, match });
    }
  }

  return hints;
}
