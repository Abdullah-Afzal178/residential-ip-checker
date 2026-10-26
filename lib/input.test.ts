import assert from "node:assert/strict";

import { extractIp, MAX_BULK, MAX_INPUT, parseInput } from "@/lib/input";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

// --- single addresses --------------------------------------------------
check(parseInput(""), { kind: "empty" }, "empty input");
check(parseInput("   \n "), { kind: "empty" }, "whitespace only");
check(parseInput("8.8.8.8"), { kind: "ip", ip: "8.8.8.8" }, "plain IPv4");
check(parseInput("  8.8.8.8\n"), { kind: "ip", ip: "8.8.8.8" }, "surrounding whitespace");
check(parseInput("2606:4700:4700:0:0:0:0:1111"), { kind: "ip", ip: "2606:4700:4700::1111" }, "IPv6 is canonicalised");
check(parseInput("::ffff:73.162.45.10"), { kind: "ip", ip: "73.162.45.10" }, "IPv4-mapped collapses");
check(parseInput("10.0.0.1"), { kind: "ip", ip: "10.0.0.1" }, "private addresses still parse; the lookup explains them");

// --- addresses inside other text ------------------------------------------
check(extractIp("1.2.3.4:443"), "1.2.3.4", "IPv4 with a port");
check(extractIp("[2001:4860::8888]:443"), "2001:4860::8888", "bracketed IPv6 with a port");
check(extractIp("[2001:4860::8888]"), "2001:4860::8888", "bracketed IPv6");
check(extractIp("https://1.2.3.4/login?x=1"), "1.2.3.4", "URL with a path");
check(extractIp("http://user:pw@1.2.3.4:8080/"), "1.2.3.4", "URL with credentials and a port");
check(extractIp("http://[2606:4700::1111]/"), "2606:4700::1111", "URL with an IPv6 host");
check(extractIp("2001:db8::1"), "2001:db8::1", "bare IPv6 keeps its colons");
check(extractIp("example.com"), null, "a hostname is not an address");
check(extractIp("1.2.3"), null, "three octets");
check(parseInput('"8.8.8.8"'), { kind: "ip", ip: "8.8.8.8" }, "quotes are stripped");
check(parseInput("(8.8.8.8)"), { kind: "ip", ip: "8.8.8.8" }, "brackets around a token are stripped");

// --- lists ---------------------------------------------------------------
check(
  parseInput("8.8.8.8, 1.1.1.1; 9.9.9.9\n73.162.45.10 | 2606:4700::1111"),
  { kind: "ips", ips: ["8.8.8.8", "1.1.1.1", "9.9.9.9", "73.162.45.10", "2606:4700::1111"], rejected: [], duplicates: 0, ranges: [], overflow: 0 },
  "commas, semicolons, newlines and pipes all separate",
);
check(
  parseInput("8.8.8.8 8.8.8.8 2606:4700:4700::1111 2606:4700:4700:0:0:0:0:1111"),
  { kind: "ips", ips: ["8.8.8.8", "2606:4700:4700::1111"], rejected: [], duplicates: 2, ranges: [], overflow: 0 },
  "repeats collapse, including IPv6 spelled two ways",
);
check(
  parseInput("8.8.8.8 hello 1.1.1.1"),
  { kind: "ips", ips: ["8.8.8.8", "1.1.1.1"], rejected: ["hello"], duplicates: 0, ranges: [], overflow: 0 },
  "junk is reported, not dropped",
);
check(
  parseInput("8.8.8.8 junk"),
  { kind: "ips", ips: ["8.8.8.8"], rejected: ["junk"], duplicates: 0, ranges: [], overflow: 0 },
  "one address plus junk stays a list, so the junk is shown",
);
check(
  parseInput("8.8.8.8 8.8.8.0/24"),
  { kind: "ips", ips: ["8.8.8.8"], rejected: [], duplicates: 0, ranges: ["8.8.8.0/24"], overflow: 0 },
  "ranges are reported separately",
);

const many = Array.from({ length: MAX_BULK + 7 }, (_, index) => `11.0.${Math.floor(index / 250)}.${(index % 250) + 1}`).join("\n");
const parsedMany = parseInput(many);
check(parsedMany.kind, "ips", "a long list is still a list");
if (parsedMany.kind === "ips") {
  check(parsedMany.ips.length, MAX_BULK, "capped at the bulk limit");
  check(parsedMany.overflow, 7, "the excess is counted");
  check(parsedMany.ips[MAX_BULK - 1], `11.0.0.${MAX_BULK}`, "the first addresses are the ones kept");
}

// --- nothing to check ------------------------------------------------------
const hostname = parseInput("example.com");
check(hostname.kind, "invalid", "a hostname is refused");
check(hostname.kind === "invalid" && /hostname/.test(hostname.reason), true, "and the reason says it is a hostname");
const url = parseInput("https://example.com/path");
check(url.kind === "invalid" && /hostname/.test(url.reason), true, "a URL with a name host is called a hostname too");
const range = parseInput("10.0.0.0/8");
check(range.kind === "invalid" && /range/.test(range.reason), true, "a lone range is explained");
const v6range = parseInput("2001:db8::/32");
check(v6range.kind === "invalid" && /range/.test(v6range.reason), true, "an IPv6 range too");
const junk = parseInput("hello world");
check(junk.kind === "invalid" && /None of those/.test(junk.reason), true, "several junk tokens");
const word = parseInput("hello");
check(word.kind === "invalid" && /not an IP address/.test(word.reason), true, "one junk token");
const huge = parseInput("8.8.8.8 ".repeat(Math.ceil(MAX_INPUT / 8) + 10));
check(huge.kind, "invalid", "oversized input is refused whole, never sliced");

console.log(`input: ${checks} assertions passed`);
