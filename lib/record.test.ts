import assert from "node:assert/strict";

import { parseRecord, realHostname } from "@/lib/record";
import { tally } from "@/lib/tally";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

// A bulk response item, captured on 2026-10-13 (fields-filtered).
const comcast = {
  ip: "73.162.45.10",
  hostname: "c-73-162-45-10.hsd1.ca.comcast.net",
  location: { country_code2: "US", country_name: "United States", city: "Oakland" },
  network: { connection_type: "Cable", route: "73.0.0.0/8", is_anycast: false, is_cdn: false, cdn_provider_name: "" },
  asn: {
    as_number: "AS7922",
    organization: "Comcast Cable Communications, LLC",
    country: "US",
    type: "ISP",
    domain: "xfinity.com",
    date_allocated: "1997-02-14",
    rir: "ARIN",
  },
  company: { name: "Comcast IP Services, L.L.C.", type: "ISP", domain: "comcast.com" },
};

check(
  parseRecord(comcast, "73.162.45.10"),
  {
    ip: "73.162.45.10",
    hostname: "c-73-162-45-10.hsd1.ca.comcast.net",
    asnNumber: "AS7922",
    asnOrganization: "Comcast Cable Communications, LLC",
    asnDomain: "xfinity.com",
    asnType: "ISP",
    companyName: "Comcast IP Services, L.L.C.",
    companyType: "ISP",
    companyDomain: "comcast.com",
    connectionType: "Cable",
    route: "73.0.0.0/8",
    isAnycast: false,
    isCdn: false,
    cdnProvider: "",
    country: "United States",
    countryCode: "US",
    city: "Oakland",
  },
  "a full record",
);

// The bulk API spells IPv6 expanded and echoes the address when there is no name.
const t = parseRecord(
  {
    ip: "2601:646:8000:0:0:0:0:1",
    hostname: "2601:646:8000:0:0:0:0:1",
    network: { connection_type: "Cable", is_anycast: false, is_cdn: false },
    asn: { as_number: "AS7922", type: "isp" },
    company: { name: "None specified", type: "" },
  },
  "2601:646:8000::1",
);
check(t?.ip, "2601:646:8000::1", "the address is canonicalised");
check(t?.hostname, null, "an echoed address is not a name");
check(t?.asnType, "ISP", "types are upper-cased");
check(t?.companyName, "", "'None specified' means nothing recorded");
check(t?.country, "", "missing location fields are empty");

const partial = parseRecord({ hostname: "x.example.net", network: { is_anycast: "yes" } }, "8.8.4.4");
check(partial?.ip, "8.8.4.4", "falls back to the requested address");
check(partial?.isAnycast, false, "only a real true counts");
check(parseRecord(null, "8.8.8.8"), null, "no payload");
check(parseRecord([1, 2], "8.8.8.8"), null, "an array is not a record");
check(parseRecord({ asn: { organization: "??", type: "Unknown" } }, "8.8.8.8")?.asnOrganization, "", "placeholders are dropped");

check(realHostname("142.69.2.81.in-addr.arpa", "81.2.69.142"), null, "the unresolved PTR query name is not a name");
check(realHostname("x.ip6.arpa", "2001:db8::1"), null, "the IPv6 equivalent");
check(realHostname("one.one.one.one.", "1.1.1.1"), "one.one.one.one", "a trailing dot is dropped");
check(realHostname("  ", "1.1.1.1"), null, "blank");
check(realHostname("8.8.8.8", "8.8.8.8"), null, "an echoed IPv4");

// --- tally -------------------------------------------------------------------
const summary = tally([
  { category: "datacenter", problem: null },
  { category: "residential", problem: null },
  { category: "mobile", problem: null },
  { category: "residential", problem: null },
  { category: null, problem: "private" },
  { category: null, problem: "failed" },
  { category: "isp", problem: null },
]);
check(summary.total, 7, "every row is counted");
check(
  summary.buckets,
  [
    { category: "residential", count: 2 },
    { category: "mobile", count: 1 },
    { category: "datacenter", count: 1 },
    { category: "isp", count: 1 },
  ],
  "buckets come in display order, empty ones left out",
);
check(summary.private, 1, "private addresses are their own bucket");
check(summary.failed, 1, "failed lookups too");
check(summary.people, 3, "home plus mobile");
check(
  summary.buckets.reduce((sum, bucket) => sum + bucket.count, 0) + summary.private + summary.failed,
  summary.total,
  "the buckets add up",
);
check(tally([]).buckets, [], "an empty list");
check(tally([{ category: null, problem: null }]).failed, 1, "a row with no category and no problem counts as failed");

console.log(`record: ${checks} assertions passed`);
