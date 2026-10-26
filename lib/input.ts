/**
 * Turns whatever was pasted into a list of IP addresses. Pure, so it can be
 * unit tested.
 */

import { canonicalIp } from "@/lib/ip";

/** One bulk API call. */
export const MAX_BULK = 50;

/**
 * A sanity bound, not a cut. Text is never sliced mid-token: slicing
 * "9.9.9.10" at the wrong character silently checks 9.9.9.1 instead.
 */
export const MAX_INPUT = 16000;

export type ParsedInput =
  | { kind: "empty" }
  | { kind: "ip"; ip: string }
  | {
      kind: "ips";
      ips: string[];
      /** Tokens that were not IP addresses, reported rather than dropped silently. */
      rejected: string[];
      /** Repeats collapsed, counted so the total still adds up. */
      duplicates: number;
      /** CIDR ranges: a range has no single answer, so they are reported, not narrowed. */
      ranges: string[];
      /** Addresses past MAX_BULK, counted rather than silently ignored. */
      overflow: number;
    }
  | { kind: "invalid"; reason: string };

const SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const RANGE = /^[0-9a-f:.[\]]+\/\d{1,3}$/i;

export function parseInput(raw: string): ParsedInput {
  const text = raw.trim();

  if (text === "") {
    return { kind: "empty" };
  }

  if (text.length > MAX_INPUT) {
    return {
      kind: "invalid",
      reason: `That is too long to check in one go. Paste up to ${MAX_BULK} addresses at a time.`,
    };
  }

  const tokens = text.split(/[\s,;|]+/).filter(Boolean);
  const ips: string[] = [];
  const seen = new Set<string>();
  const rejected: string[] = [];
  const ranges: string[] = [];
  let duplicates = 0;

  for (const token of tokens) {
    const cleaned = token.replace(/^["'(<]+|[>)"']+$/g, "");

    if (RANGE.test(cleaned) && canonicalIp(cleaned.split("/")[0]) !== null) {
      ranges.push(cleaned);
      continue;
    }

    const ip = extractIp(cleaned);

    if (!ip) {
      rejected.push(token);
      continue;
    }

    if (seen.has(ip)) {
      duplicates += 1;
      continue;
    }

    seen.add(ip);
    ips.push(ip);
  }

  if (ips.length === 0) {
    return { kind: "invalid", reason: noAddressReason(tokens, ranges) };
  }

  if (ips.length === 1 && rejected.length === 0 && ranges.length === 0) {
    return { kind: "ip", ip: ips[0] };
  }

  return {
    kind: "ips",
    ips: ips.slice(0, MAX_BULK),
    rejected,
    duplicates,
    ranges,
    overflow: Math.max(0, ips.length - MAX_BULK),
  };
}

/**
 * The address inside a token, in canonical form: a bare IP, a bracketed IPv6,
 * either with a port, or the host of a URL. Null when there is no IP in it.
 */
export function extractIp(token: string): string | null {
  let host = token.replace(SCHEME, "");

  // Path, query or fragment of a URL.
  host = host.split(/[/?#]/, 1)[0];

  // user:password@host
  const at = host.lastIndexOf("@");

  if (at !== -1) {
    host = host.slice(at + 1);
  }

  // [2001:db8::1]:443
  const bracketed = /^\[([^\]]+)\](?::\d{1,5})?$/.exec(host);

  if (bracketed) {
    return canonicalIp(bracketed[1]);
  }

  // 1.2.3.4:443. A bare IPv6 address has several colons, so it is left alone.
  const withPort = /^([\d.]+):\d{1,5}$/.exec(host);

  if (withPort) {
    return canonicalIp(withPort[1]);
  }

  return canonicalIp(host);
}

function noAddressReason(tokens: string[], ranges: string[]): string {
  if (ranges.length > 0) {
    return "That is a range. Every address in it can belong to a different kind of network, so paste the individual addresses you want checked.";
  }

  if (tokens.length === 1 && /^[a-z0-9-]+(\.[a-z0-9-]+)+\.?$/i.test(tokens[0].replace(SCHEME, "").split(/[/?#:]/, 1)[0])) {
    return "That is a hostname, not an IP address. Paste the address it points to instead.";
  }

  return tokens.length === 1
    ? "That is not an IP address. Paste an IPv4 or IPv6 address, or a list of them."
    : "None of those are IP addresses. Paste IPv4 or IPv6 addresses, one per line or separated by commas.";
}
