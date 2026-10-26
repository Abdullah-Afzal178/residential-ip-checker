import assert from "node:assert/strict";

import { hostnameHints } from "@/lib/hints";

let checks = 0;
function check(actual: unknown, expected: unknown, message: string) {
  checks += 1;
  assert.deepEqual(actual, expected, message);
}

const kinds = (name: string | null) => hostnameHints(name).map((hint) => `${hint.kind}:${hint.match}`);

// Real reverse DNS names, captured from the API while building this tool.
check(kinds("c-73-162-45-10.hsd1.ca.comcast.net"), ["residential:hsd"], "Comcast home cable");
check(kinds("pool-108-28-100-1.washdc.fios.verizon.net"), ["residential:pool"], "Verizon Fios: the first home-line word is reported");
check(kinds("adsl-99-104-20-5.dsl.hstntx.sbcglobal.net"), ["residential:adsl"], "AT&T DSL");
check(kinds("modemcable001.0-48-24.mc.videotron.ca"), ["residential:modemcable"], "trailing digits are dropped");
check(kinds("cpc81874-swin19-2-0-cust256.3-1.cable.virginm.net"), ["residential:cpc"], "Virgin Media customer line");
check(kinds("customer.chcoilx1.isp.starlink.com"), ["residential:customer"], "Starlink");
check(kinds("10.sub-174-192-10.myvzw.com"), ["mobile:myvzw"], "Verizon Wireless");
check(kinds("vc-vb-41-10-10-10.umts.vodacom.co.za"), ["mobile:umts"], "Vodacom mobile");
check(kinds("5x18x10x10.static-business.spb.ertelecom.ru"), ["business:business"], "a business line on a consumer ISP");
check(kinds("static.10.10.216.95.clients.your-server.de"), ["hosting:server"], "Hetzner");
check(kinds("li1745-10.members.linode.com"), ["hosting:linode"], "Linode");
check(kinds("180.136.102.34.bc.googleusercontent.com"), ["hosting:googleusercontent"], "Google Cloud");
check(kinds("srv1902933.hstgr.cloud"), ["hosting:srv"], "Hostinger: the first hosting word is reported");
check(kinds("lb-140-82-112-3-iad.github.com"), ["hosting:lb"], "a load balancer");
check(kinds("berlin01.tor-exit.artikel10.org"), ["anonymizer:tor-exit"], "a Tor exit relay");
check(kinds("vpn.example.com"), ["anonymizer:vpn"], "a VPN gateway");
check(kinds("1-2-3-4.mobile-dsl.example.net"), ["mobile:mobile", "residential:dsl"], "a name can carry two hints");

// Things that must not match.
check(kinds("rate-limited-proxy-209-85-238-1.google.com"), [], "Google's crawler proxy is not an anonymiser");
check(kinds("core1.tor1.example.net"), [], "tor1 is Toronto, not Tor");
check(kinds("cablevision.example.net"), [], "whole tokens only");
check(kinds("one.one.one.one"), [], "no hint words");
check(kinds("dns.google"), [], "no hint words");
check(kinds("HOME.Example.NET."), ["residential:home"], "case and a trailing dot are ignored");
check(kinds("lte-5g.example.net"), ["mobile:lte"], "the first mobile word wins");
check(kinds("x.5g.example.net"), ["mobile:5g"], "5g keeps its digit");
check(kinds(null), [], "no name, no hints");
check(kinds(""), [], "an empty name, no hints");

console.log(`hints: ${checks} assertions passed`);
