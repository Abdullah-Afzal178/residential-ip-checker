import assert from "node:assert/strict";

import { classify, lineKind, type Facts } from "@/lib/classify";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

function facts(overrides: Partial<Facts>): Facts {
  return {
    asnType: "",
    companyType: "",
    connectionType: "",
    isCdn: false,
    cdnProvider: "",
    isAnycast: false,
    hostname: null,
    ...overrides,
  };
}

function verdict(overrides: Partial<Facts>) {
  const result = classify(facts(overrides));

  return `${result.category}${result.variant ? `/${result.variant}` : ""} ${result.agreement}`;
}

function stances(overrides: Partial<Facts>) {
  return Object.fromEntries(classify(facts(overrides)).signals.map((signal) => [signal.id, signal.stance]));
}

// --- connection types ----------------------------------------------------
check(lineKind("Cable"), "home", "cable");
check(lineKind("DSL"), "home", "DSL");
check(lineKind("Fiber"), "home", "fiber");
check(lineKind("Fibre"), "home", "fibre");
check(lineKind("Fixed Broadband"), "home", "fixed broadband");
check(lineKind("Satellite"), "home", "satellite");
check(lineKind("Mobile"), "mobile", "mobile");
check(lineKind("Cellular"), "mobile", "cellular");
check(lineKind(""), "none", "not recorded");
check(lineKind("Wireless"), "other", "plain wireless is ambiguous, so it is left out");

// --- real records, captured from the API on 2026-10-13 ------------------
check(
  verdict({ asnType: "ISP", companyType: "ISP", connectionType: "Cable", hostname: "c-73-162-45-10.hsd1.ca.comcast.net" }),
  "residential clear",
  "73.162.45.10, Comcast home cable",
);
check(
  stances({ asnType: "ISP", companyType: "ISP", connectionType: "Cable", hostname: "c-73-162-45-10.hsd1.ca.comcast.net" }),
  { asn: "fits", company: "fits", connection: "backs", flags: "silent", hostname: "backs" },
  "every Comcast record lines up",
);
check(
  verdict({ asnType: "ISP", companyType: "", connectionType: "DSL", hostname: "adsl-99-104-20-5.dsl.hstntx.sbcglobal.net" }),
  "residential clear",
  "99.104.20.5, AT&T DSL",
);
check(verdict({ asnType: "ISP", companyType: "ISP", connectionType: "Mobile" }), "mobile clear", "172.58.100.20, T-Mobile, no reverse name");
check(
  verdict({ asnType: "ISP", companyType: "ISP", connectionType: "Mobile", hostname: "10.sub-174-192-10.myvzw.com" }),
  "mobile clear",
  "174.192.10.10, Verizon Wireless",
);
check(
  verdict({ asnType: "ISP", companyType: "ISP", connectionType: "Satellite", hostname: "customer.chcoilx1.isp.starlink.com" }),
  "residential/satellite clear",
  "98.97.10.10, Starlink",
);
check(verdict({ asnType: "HOSTING", companyType: "HOSTING" }), "datacenter clear", "3.5.140.2, AWS");
check(verdict({ asnType: "HOSTING", companyType: "BUSINESS" }), "datacenter clear", "52.94.236.248: Amazon's own block owner is typed BUSINESS");
check(
  verdict({ asnType: "HOSTING", companyType: "ISP", isAnycast: true, hostname: "one.one.one.one" }),
  "datacenter/anycast clear",
  "1.1.1.1: the APNIC block owner is typed ISP, which neither backs nor contradicts",
);
check(
  verdict({ asnType: "HOSTING", companyType: "HOSTING", isCdn: true, cdnProvider: "Cloudflare" }),
  "datacenter/cdn clear",
  "104.16.132.229, a Cloudflare edge",
);
check(verdict({ asnType: "HOSTING", companyType: "HOSTING", isAnycast: true, hostname: "dns.google" }), "datacenter/anycast clear", "8.8.8.8");
check(verdict({ asnType: "EDUCATION", companyType: "EDUCATION" }), "education clear", "18.7.22.83, MIT");
check(verdict({ asnType: "GOVERNMENT", companyType: "GOVERNMENT" }), "government clear", "156.33.241.5, US Senate");
check(verdict({ asnType: "BUSINESS", companyType: "BUSINESS" }), "business clear", "157.240.1.35, Meta");
check(
  verdict({ asnType: "BUSINESS", companyType: "BUSINESS", hostname: "lb-140-82-112-3-iad.github.com" }),
  "business clear",
  "140.82.112.3: a company's own server is still a business network",
);
check(verdict({ asnType: "ISP", companyType: "ISP" }), "isp unclear", "49.36.10.10, Jio, with no line type and no name");
check(
  verdict({ asnType: "ISP", companyType: "ISP", hostname: "modemcable001.0-48-24.mc.videotron.ca" }),
  "residential probable",
  "24.48.0.1: only the reverse name says home cable",
);
check(
  verdict({ asnType: "ISP", connectionType: "Fixed Broadband", hostname: "5x18x10x10.static-business.spb.ertelecom.ru" }),
  "business/business-line probable",
  "5.18.10.10: a business line, on the strength of its name",
);
check(verdict({ connectionType: "Cable" }), "residential probable", "5.62.1.1: a connection type and nothing else");
check(verdict({ companyType: "BUSINESS" }), "business probable", "200.10.10.10: one record only");
check(verdict({ hostname: "host1.190-5-1.steel.net.ar" }), "unknown unclear", "190.5.1.1: nothing on record");
check(verdict({}), "unknown unclear", "no data at all");

const tor = classify(facts({ asnType: "BUSINESS", companyType: "BUSINESS", hostname: "berlin01.tor-exit.artikel10.org" }));
check(`${tor.category} ${tor.agreement}`, "business clear", "185.220.101.1 is registered to an association");
check(tor.anonymizer, "tor-exit", "but its name says Tor exit, and that is surfaced");

// --- rule order and disagreements ----------------------------------------
check(
  verdict({ asnType: "ISP", companyType: "BUSINESS", connectionType: "Cable" }),
  "business/business-line clear",
  "a block assigned to a business on a cable line",
);
check(
  verdict({ asnType: "HOSTING", connectionType: "Mobile" }),
  "datacenter mixed",
  "hosting wins, but the mobile line type is shown as a disagreement",
);
check(
  stances({ asnType: "HOSTING", connectionType: "Mobile" }),
  { asn: "backs", company: "silent", connection: "conflicts", flags: "silent", hostname: "silent" },
  "the disagreement is on the connection record",
);
check(
  verdict({ asnType: "ISP", companyType: "ISP", connectionType: "Cable", hostname: "vps-1.example.net" }),
  "residential mixed",
  "a home line with a server-like name",
);
check(verdict({ asnType: "ISP", hostname: "1-2-3-4.mobile-dsl.example.net" }), "isp unclear", "a name that says two things settles nothing");
check(verdict({ asnType: "ISP", hostname: "dyn-1-2-3-4.lte.example.net" }), "isp unclear", "home and mobile words together");
check(verdict({ asnType: "ISP", hostname: "server-1.example.net" }), "datacenter probable", "an ISP address named like a server");
check(verdict({ asnType: "ISP", hostname: "x.myvzw.com" }), "mobile probable", "an ISP address named like a phone line");
check(verdict({ hostname: "pool-1-2-3-4.example.net" }), "residential probable", "no records, but a home-line name");
check(verdict({ asnType: "EDUCATION", connectionType: "Cable" }), "residential mixed", "a home line wins over the network type, and the clash shows");
check(verdict({ companyType: "EDUCATION", asnType: "BUSINESS" }), "education probable", "the block owner speaks before the ASN");
check(verdict({ isAnycast: true }), "datacenter/anycast probable", "anycast alone");
check(verdict({ isAnycast: true, connectionType: "Cable" }), "datacenter/anycast mixed", "anycast beats a line type, which then disagrees");
check(verdict({ asnType: "ISP", connectionType: "Wireless" }), "isp unclear", "an ambiguous line type adds nothing");

const nameOnly = classify(facts({ asnType: "", hostname: "pool-1-2-3-4.example.net" }));
check(nameOnly.signals.find((signal) => signal.id === "hostname")?.reading, "pool-1-2-3-4.example.net", "the name is shown as read");
check(classify(facts({ isCdn: true, cdnProvider: "Fastly" })).signals.find((signal) => signal.id === "flags")?.reading, "CDN (Fastly)", "CDN provider is named");
check(classify(facts({ isCdn: true })).signals.find((signal) => signal.id === "flags")?.reading, "CDN", "CDN without a provider");
check(classify(facts({ asnType: "isp", connectionType: "Cable" })).category, "residential", "types are compared case-insensitively");

console.log(`classify: ${checks} assertions passed`);
