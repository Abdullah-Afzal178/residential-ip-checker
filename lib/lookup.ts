import "server-only";

import { classify, type Classification } from "@/lib/classify";
import { canonicalIp, isNonPublicIp } from "@/lib/ip";
import { API_FIELDS, parseRecord, type NetworkRecord } from "@/lib/record";
import { getSessionCache, setSessionCache } from "@/lib/session-cache";

const SINGLE_ENDPOINT = "https://api.ipgeolocation.io/v3/ipgeo";
const BULK_ENDPOINT = "https://api.ipgeolocation.io/v3/ipgeo-bulk";
const TIMEOUT_MS = 10000;

export type Checked = {
  ip: string;
  record: NetworkRecord | null;
  classification: Classification | null;
  problem: { kind: "private" | "failed"; message: string } | null;
};

export async function checkOne(ip: string): Promise<Checked> {
  if (isNonPublicIp(ip)) {
    return privateAddress(ip);
  }

  const cached = getSessionCache<NetworkRecord>(`rec:${ip}`);

  if (cached) {
    return checked(cached);
  }

  const apiKey = process.env.IPGEOLOCATION_API_KEY;

  if (!apiKey) {
    return failed(ip, MISSING_KEY);
  }

  const params = new URLSearchParams({ apiKey, ip, include: "network,hostname", fields: API_FIELDS });

  try {
    const response = await fetch(`${SINGLE_ENDPOINT}?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 423) {
      return privateAddress(ip);
    }

    if (!response.ok) {
      return failed(ip, statusMessage(response.status));
    }

    const record = parseRecord(await response.json(), ip);

    if (!record) {
      return failed(ip, "ipgeolocation.io sent back something this tool could not read.");
    }

    setSessionCache(`rec:${ip}`, record);

    return checked(record);
  } catch {
    return failed(ip, UNREACHABLE);
  }
}

/**
 * One bulk call for the whole list. Private addresses never leave the
 * server, and cached ones are not asked for again. The bulk endpoint answers
 * in request order, with failures as {message} in place, so results are
 * joined back by position rather than by the address it echoes.
 */
export async function checkMany(ips: string[]): Promise<Checked[]> {
  const results = new Map<string, Checked>();
  const toFetch: string[] = [];

  for (const ip of ips) {
    const cached = getSessionCache<NetworkRecord>(`rec:${ip}`);

    if (isNonPublicIp(ip)) {
      results.set(ip, privateAddress(ip));
    } else if (cached) {
      results.set(ip, checked(cached));
    } else {
      toFetch.push(ip);
    }
  }

  if (toFetch.length > 0) {
    for (const [ip, result] of await fetchBulk(toFetch)) {
      results.set(ip, result);
    }
  }

  return ips.map((ip) => results.get(ip) ?? failed(ip, UNREACHABLE));
}

async function fetchBulk(ips: string[]): Promise<Map<string, Checked>> {
  const results = new Map<string, Checked>();
  const apiKey = process.env.IPGEOLOCATION_API_KEY;
  const failAll = (message: string) => {
    for (const ip of ips) {
      results.set(ip, failed(ip, message));
    }

    return results;
  };

  if (!apiKey) {
    return failAll(MISSING_KEY);
  }

  const params = new URLSearchParams({ apiKey, include: "network,hostname", fields: API_FIELDS });

  try {
    const response = await fetch(`${BULK_ENDPOINT}?${params.toString()}`, {
      method: "POST",
      cache: "no-store",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ ips }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return failAll(statusMessage(response.status));
    }

    const payload = (await response.json()) as unknown;

    if (!Array.isArray(payload)) {
      return failAll("ipgeolocation.io sent back something this tool could not read.");
    }

    ips.forEach((ip, index) => {
      const item = payload[index] as Record<string, unknown> | undefined;
      const message = typeof item?.message === "string" ? item.message : null;

      if (message) {
        results.set(ip, /bogon/i.test(message) ? privateAddress(ip) : failed(ip, message));
        return;
      }

      const record = parseRecord(item, ip);

      if (!record) {
        results.set(ip, failed(ip, "No answer came back for this address."));
        return;
      }

      setSessionCache(`rec:${ip}`, record);
      results.set(ip, checked({ ...record, ip }));
    });

    return results;
  } catch {
    return failAll(UNREACHABLE);
  }
}

function checked(record: NetworkRecord): Checked {
  return {
    ip: record.ip,
    record,
    classification: classify({
      asnType: record.asnType,
      companyType: record.companyType,
      connectionType: record.connectionType,
      isCdn: record.isCdn,
      cdnProvider: record.cdnProvider,
      isAnycast: record.isAnycast,
      hostname: record.hostname,
    }),
    problem: null,
  };
}

function privateAddress(ip: string): Checked {
  return {
    ip,
    record: null,
    classification: null,
    problem: {
      kind: "private",
      message: "This is a private or reserved address. It is only meaningful inside a local network, so no provider owns it and there is nothing to classify.",
    },
  };
}

function failed(ip: string, message: string): Checked {
  return { ip, record: null, classification: null, problem: { kind: "failed", message } };
}

const MISSING_KEY = "Set IPGEOLOCATION_API_KEY in your .env file to look addresses up.";
const UNREACHABLE = "ipgeolocation.io could not be reached in time. Try again in a moment.";

function statusMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "ipgeolocation.io refused the API key. Check IPGEOLOCATION_API_KEY in your .env file.";
  }

  if (status === 429) {
    return "The API's request limit was reached. Try again in a minute.";
  }

  return `The lookup failed with status ${status}.`;
}

/** The visitor's own address, from the proxy headers the host sets. */
export function visitorIp(headerStore: Headers): string | null {
  const candidates = [
    headerStore.get("cf-connecting-ip"),
    headerStore.get("x-real-ip"),
    headerStore.get("x-vercel-forwarded-for"),
    headerStore.get("x-forwarded-for"),
  ];

  for (const value of candidates) {
    const ip = value
      ?.split(",")
      .map((item) => canonicalIp(item))
      .find((item): item is string => item !== null && !isNonPublicIp(item));

    if (ip) {
      return ip;
    }
  }

  return null;
}
