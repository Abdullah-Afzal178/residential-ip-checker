/**
 * Every sentence the verdict shows, in one place. Pure, so the wording can
 * be tested along with the logic behind it.
 */

import type { Agreement, Category, Classification, SignalId, Stance } from "@/lib/classify";
import type { NetworkRecord } from "@/lib/record";

export const CATEGORY_LABEL: Record<Category, string> = {
  residential: "Residential",
  mobile: "Mobile",
  datacenter: "Datacenter",
  business: "Business",
  education: "Education",
  government: "Government",
  isp: "ISP",
  unknown: "Unknown",
};

/** Tailwind classes for each kind's flat colour. Spelled out so Tailwind sees them. */
export const CATEGORY_BG: Record<Category, string> = {
  residential: "bg-residential",
  mobile: "bg-mobile",
  datacenter: "bg-datacenter",
  business: "bg-business",
  education: "bg-education",
  government: "bg-government",
  isp: "bg-isp",
  unknown: "bg-unknown hatch",
};

export function kicker(result: Classification): string {
  switch (result.variant) {
    case "cdn":
      return "Content delivery network";
    case "anycast":
      return "Anycast service";
    case "satellite":
      return "Home broadband, by satellite";
    case "business-line":
      return "Business line";
  }

  const kickers: Record<Category, string> = {
    residential: "Home broadband",
    mobile: "Mobile carrier",
    datacenter: "Hosting or cloud",
    business: "Company or organisation",
    education: "University or school",
    government: "Government network",
    isp: "Line type not recorded",
    unknown: "No network type on record",
  };

  return kickers[result.category];
}

/** The network's name as people know it: the block owner, then the ASN holder. */
export function ownerName(record: NetworkRecord): string {
  return record.companyName || record.asnOrganization || "an unnamed network";
}

function providerName(record: NetworkRecord): string {
  return record.asnOrganization || record.companyName || "an unnamed provider";
}

export function explain(record: NetworkRecord, result: Classification): string {
  const ip = record.ip;
  const line = record.connectionType ? record.connectionType.toLowerCase() : "";

  switch (result.variant) {
    case "cdn":
      return `${ip} is an edge server of ${record.cdnProvider || providerName(record)}'s content delivery network. It serves websites to visitors; it is not where visitors come from.`;
    case "anycast":
      return `${ip} is an anycast address: ${providerName(record)} announces it from many places at once, the way public DNS resolvers are run. It is infrastructure, not a person.`;
    case "satellite":
      return `${ip} is on ${providerName(record)}'s satellite internet service. Satellite lines like this are usually sold to homes, so traffic from it normally comes from a household.`;
    case "business-line":
      return line
        ? `${ip} is a business ${line} line on ${providerName(record)}'s network, typically an office or a shop with a fixed address.`
        : `${ip} is a business line on ${providerName(record)}'s network, typically an office or a shop with a fixed address.`;
  }

  switch (result.category) {
    case "residential":
      return line
        ? `${ip} is a home ${line} line from ${providerName(record)}. Traffic from it usually comes from a household.`
        : `${ip} looks like a home line from ${providerName(record)}. Traffic from it usually comes from a household.`;
    case "mobile":
      return `${ip} belongs to ${providerName(record)}'s mobile network. Carriers share each address between many phones at once, so one IP can stand for a lot of people.`;
    case "datacenter":
      return `${ip} belongs to ${providerName(record)}, a hosting or cloud network. People rarely browse from one directly, so traffic from it is usually a server, a bot, a VPN or a proxy.`;
    case "business":
      return `${ip} is registered to ${ownerName(record)}, an organisation rather than an internet provider. That covers offices and the organisation's own servers, so it is unlikely to be someone at home.`;
    case "education":
      return `${ip} belongs to ${ownerName(record)}, an education network. Campus networks carry students, staff and servers alike.`;
    case "government":
      return `${ip} belongs to ${ownerName(record)}, a government network.`;
    case "isp":
      return `${ip} belongs to ${providerName(record)}, an internet provider, but the records don't say whether it is a home, mobile or business line. On a consumer provider that usually means home or mobile, but nothing here confirms which.`;
    case "unknown":
      return `There is no network type on record for ${ip}, so it can't be placed with any confidence.`;
  }
}

export function agreementLabel(agreement: Agreement): string {
  return { clear: "Clear", probable: "Probable", mixed: "Mixed", unclear: "Unclear" }[agreement];
}

export function agreementDetail(result: Classification): string {
  const backing = result.signals.filter((signal) => signal.stance === "backs" || signal.stance === "fits").length;
  const against = result.signals.filter((signal) => signal.stance === "conflicts").length;
  const onlyName = result.signals.every((signal) => signal.id === "hostname" || signal.stance !== "backs");

  switch (result.agreement) {
    case "clear":
      return `${backing} signals agree and none disagree.`;
    case "probable":
      return onlyName
        ? "Based on the reverse DNS name, which is a naming habit rather than a record."
        : "Only one signal points this way, and nothing contradicts it.";
    case "mixed":
      return against === 1
        ? "One signal disagrees. It is marked below."
        : `${against} signals disagree. They are marked below.`;
    case "unclear":
      return result.category === "unknown"
        ? "Nothing on record says what kind of network this is."
        : "The records can't tell a home line from a mobile or business one here.";
  }
}

/** "HOSTING" → "Hosting"; "ISP" stays as it is. */
export function displayReading(reading: string): string {
  if (!/^[A-Z]{4,}$/.test(reading)) {
    return reading;
  }

  return reading.charAt(0) + reading.slice(1).toLowerCase();
}

export const SIGNAL_TITLE: Record<SignalId, string> = {
  asn: "Network (ASN) type",
  company: "Block owner type",
  connection: "Connection type",
  flags: "CDN or anycast",
  hostname: "Reverse DNS name",
};

export const SIGNAL_HELP: Record<SignalId, string> = {
  asn: "What kind of organisation routes this address.",
  company: "What kind of organisation the address block is assigned to.",
  connection: "The kind of line the address is used on.",
  flags: "Whether the address serves content or is announced from many places.",
  hostname: "The name the network gives the address. A convention, not a record.",
};

export const STANCE_LABEL: Record<Stance, string> = {
  backs: "Backs it",
  fits: "Fits",
  conflicts: "Disagrees",
  silent: "Says nothing",
};

export type Guidance = { title: string; body: string };

export function guidance(result: Classification): Guidance[] {
  if (result.variant === "cdn" || result.variant === "anycast") {
    return [
      {
        title: "In your logs",
        body: "If this shows up as a client address, your site is behind this network. The visitor's own address is usually in a forwarding header such as X-Forwarded-For.",
      },
      { title: "Blocking", body: "Don't. Blocking an edge or anycast address cuts off everyone it serves." },
      { title: "Real users", body: "None directly. This address carries other people's traffic." },
    ];
  }

  const byCategory: Record<Category, Guidance[]> = {
    residential: [
      { title: "Real users", body: "This is what most genuine visitors look like." },
      {
        title: "Not proof of a person",
        body: "Residential proxy services resell home connections, so automated traffic can arrive from addresses like this one.",
      },
      { title: "Blocking", body: "Home addresses get reassigned, so a block can land on the next household instead." },
    ],
    mobile: [
      { title: "Real users", body: "Phones on cellular data look like this." },
      {
        title: "Shared address",
        body: "Carrier-grade NAT puts many subscribers behind one IP, so a per-IP rate limit can lock out strangers.",
      },
      { title: "Location", body: "Mobile addresses often place a person at the carrier's gateway, which can be far from them." },
    ],
    datacenter: [
      { title: "Real users", body: "Rare. People reach the web from home and mobile lines; servers live here." },
      { title: "Usual sources", body: "Scrapers, bots, VPN and proxy exits, and other servers calling your site or API." },
      {
        title: "Blocking",
        body: "Reasonable for consumer sign-ups, but allow the services that also run here: payment webhooks, uptime monitors, search crawlers.",
      },
    ],
    business: [
      { title: "Real users", body: "Office staff, or the company's own servers. Many people can share one office address." },
      { title: "Who they work for", body: "The block owner's name can tell you which organisation a visitor is coming from." },
      { title: "Blocking", body: "Rarely needed. Treat it like any other customer network." },
    ],
    education: [
      { title: "Real users", body: "Students and staff, often many of them behind one campus address." },
      { title: "Also here", body: "Research crawlers and lab servers run on campus networks too." },
      { title: "Blocking", body: "One noisy user can share an address with thousands of others." },
    ],
    government: [
      { title: "Real users", body: "Staff on an agency network, usually behind a shared gateway." },
      { title: "Also here", body: "Agency servers and automated systems." },
      { title: "Blocking", body: "Rarely appropriate. Check what the traffic is doing first." },
    ],
    isp: [
      { title: "Treat it as", body: "A probable home or mobile line, until something says otherwise." },
      {
        title: "Proxies and VPNs",
        body: "Spotting anonymised traffic on consumer lines takes threat data, which network type alone can't give.",
      },
      { title: "Blocking", body: "Consumer addresses are shared and reassigned, so blocks tend to hit the wrong person." },
    ],
    unknown: [
      { title: "Treat it as", body: "Unknown. Look at what the traffic does rather than where it comes from." },
      { title: "Why", body: "Small or new networks sometimes have no type on record yet." },
      { title: "Blocking", body: "Not on this evidence alone." },
    ],
  };

  return byCategory[result.category];
}
