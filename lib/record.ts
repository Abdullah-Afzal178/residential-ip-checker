/**
 * Reads one ipgeolocation.io response into the facts this tool uses. Pure, so
 * it can be unit tested against captured payloads.
 */

import { canonicalIp, sameIp } from "@/lib/ip";

export type NetworkRecord = {
  ip: string;
  /** Null when the address has no reverse DNS name. */
  hostname: string | null;
  asnNumber: string;
  asnOrganization: string;
  asnDomain: string;
  asnType: string;
  companyName: string;
  companyType: string;
  companyDomain: string;
  connectionType: string;
  route: string;
  isAnycast: boolean;
  isCdn: boolean;
  cdnProvider: string;
  country: string;
  countryCode: string;
  city: string;
};

/** The fields requested from the API, so responses stay small. */
export const API_FIELDS = [
  "hostname",
  "network",
  "asn",
  "company",
  "location.country_name",
  "location.country_code2",
  "location.city",
].join(",");

export function parseRecord(payload: unknown, requestedIp: string): NetworkRecord | null {
  const root = asObject(payload);

  if (!root) {
    return null;
  }

  const network = asObject(root.network);
  const asn = asObject(root.asn);
  const company = asObject(root.company);
  const location = asObject(root.location);
  const ip = canonicalIp(clean(root.ip)) ?? requestedIp;

  return {
    ip,
    hostname: realHostname(clean(root.hostname), ip),
    asnNumber: clean(asn?.as_number),
    asnOrganization: clean(asn?.organization),
    asnDomain: clean(asn?.domain),
    asnType: clean(asn?.type).toUpperCase(),
    companyName: clean(company?.name),
    companyType: clean(company?.type).toUpperCase(),
    companyDomain: clean(company?.domain),
    connectionType: clean(network?.connection_type),
    route: clean(network?.route),
    isAnycast: network?.is_anycast === true,
    isCdn: network?.is_cdn === true,
    cdnProvider: clean(network?.cdn_provider_name),
    country: clean(location?.country_name),
    countryCode: clean(location?.country_code2),
    city: clean(location?.city),
  };
}

/**
 * The API reports "no reverse DNS name" by echoing the address back, and
 * sometimes by returning the unresolved PTR query name itself
 * ("142.69.2.81.in-addr.arpa"). Neither is a name.
 */
export function realHostname(hostname: string, ip: string): string | null {
  const name = hostname.trim().replace(/\.$/, "");

  if (name === "" || sameIp(name, ip) || /\.(in-addr|ip6)\.arpa$/i.test(name)) {
    return null;
  }

  return name;
}

/** The API's way of saying it has no value. */
const PLACEHOLDERS = new Set(["", "??", "-", "unknown", "none specified", "n/a"]);

function clean(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";

  return PLACEHOLDERS.has(text.toLowerCase()) ? "" : text;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
