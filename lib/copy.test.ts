import assert from "node:assert/strict";

import { classify, type Facts } from "@/lib/classify";
import { agreementDetail, displayReading, explain, guidance, kicker } from "@/lib/copy";
import type { NetworkRecord } from "@/lib/record";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

const base: NetworkRecord = {
  ip: "198.51.100.7",
  hostname: null,
  asnNumber: "AS64500",
  asnOrganization: "Example Networks",
  asnDomain: "example.net",
  asnType: "",
  companyName: "Example Holdings",
  companyType: "",
  companyDomain: "example.com",
  connectionType: "",
  route: "198.51.100.0/24",
  isAnycast: false,
  isCdn: false,
  cdnProvider: "",
  country: "United States",
  countryCode: "US",
  city: "Springfield",
};

// Every category and variant the rules can reach.
const cases: Partial<Facts & NetworkRecord>[] = [
  { asnType: "ISP", connectionType: "Cable" },
  { asnType: "ISP", connectionType: "Satellite" },
  { asnType: "ISP", connectionType: "Mobile" },
  { asnType: "HOSTING" },
  { asnType: "HOSTING", isAnycast: true },
  { isCdn: true, cdnProvider: "Cloudflare" },
  { isCdn: true },
  { companyType: "BUSINESS" },
  { companyType: "BUSINESS", connectionType: "Fiber" },
  { asnType: "ISP", connectionType: "", hostname: "x.static-business.example.net" },
  { companyType: "EDUCATION" },
  { companyType: "GOVERNMENT" },
  { asnType: "ISP" },
  {},
  { asnType: "ISP", hostname: "pool-1.example.net" },
  { asnType: "HOSTING", connectionType: "Mobile" },
  { asnType: "ISP", connectionType: "Cable", asnOrganization: "", companyName: "" },
];

const seen = new Set<string>();

for (const overrides of cases) {
  const record = { ...base, ...overrides } as NetworkRecord;
  const result = classify({
    asnType: record.asnType,
    companyType: record.companyType,
    connectionType: record.connectionType,
    isCdn: record.isCdn,
    cdnProvider: record.cdnProvider,
    isAnycast: record.isAnycast,
    hostname: record.hostname,
  });
  seen.add(`${result.category}/${result.variant}`);

  const texts = [
    explain(record, result),
    kicker(result),
    agreementDetail(result),
    ...guidance(result).flatMap((item) => [item.title, item.body]),
  ];

  for (const text of texts) {
    const label = `${result.category}/${result.variant}: "${text.slice(0, 50)}"`;
    check(text.includes("—"), false, `${label} has no em dash`);
    check(/undefined|null|\s{2}|\s[,.]/.test(text), false, `${label} has no gaps or placeholders`);
    check(/[.!?:]$|^[A-Z][^.]*$/.test(text), true, `${label} ends cleanly`);
  }
}

check(seen.size, 12, "the cases reach all 12 category and variant pairs");
check(explain({ ...base, asnOrganization: "", companyName: "" } as NetworkRecord, classify({
  asnType: "ISP", companyType: "", connectionType: "Cable", isCdn: false, cdnProvider: "", isAnycast: false, hostname: null,
})).includes("an unnamed provider"), true, "a network with no name still reads as a sentence");

check(displayReading("HOSTING"), "Hosting", "shouty API types are softened");
check(displayReading("ISP"), "ISP", "acronyms stay");
check(displayReading("Fixed Broadband"), "Fixed Broadband", "mixed case is left alone");

console.log(`copy: ${checks} assertions passed`);
