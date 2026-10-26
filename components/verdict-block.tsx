import { TriangleAlert } from "lucide-react";

import type { Classification } from "@/lib/classify";
import { agreementDetail, agreementLabel, CATEGORY_BG, CATEGORY_LABEL, explain, kicker } from "@/lib/copy";
import type { NetworkRecord } from "@/lib/record";

export function VerdictBlock({
  record,
  result,
  self,
}: {
  record: NetworkRecord;
  result: Classification;
  self: boolean;
}) {
  return (
    <section
      aria-labelledby="verdict-heading"
      className={`${CATEGORY_BG[result.category]} flex flex-col border-[3px] border-ink p-6 shadow-hard sm:p-8`}
    >
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold uppercase tracking-widest">
        {self ? "Your IP" : "IP address"}
        <span className="break-all font-mono text-base normal-case tracking-normal">{record.ip}</span>
      </p>

      <h2 id="verdict-heading" className="mt-5 text-5xl font-bold uppercase leading-[0.9] tracking-tight sm:text-7xl">
        {CATEGORY_LABEL[result.category]}
      </h2>
      <p className="mt-3 text-lg font-semibold">{kicker(result)}</p>

      <p className="mt-6 mb-7 max-w-prose text-base leading-relaxed">{explain(record, result)}</p>

      {result.anonymizer ? (
        <p className="mb-7 flex gap-2.5 border-2 border-ink bg-ink px-3 py-2.5 text-sm font-medium text-paper">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-business" aria-hidden="true" />
          {result.anonymizer === "tor-exit"
            ? "Its reverse DNS name marks it as a Tor exit relay. Traffic from it is anonymised and could come from anyone."
            : "Its reverse DNS name contains “vpn”, which suggests a VPN endpoint rather than a single user."}
        </p>
      ) : null}

      <dl className="mt-auto grid grid-cols-1 border-[3px] border-ink bg-white/60 text-sm sm:grid-cols-3">
        {facts(record).map(([term, value]) => (
          <div key={term} className="border-b-[3px] border-ink px-3 py-2.5 last:border-b-0 sm:border-r-[3px] sm:border-b-0 sm:last:border-r-0">
            <dt className="text-[11px] font-bold uppercase tracking-widest">{term}</dt>
            <dd className={`mt-0.5 font-semibold ${value ? "" : "text-ink/45"}`}>{value || "Not recorded"}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-6">
        <span className="-rotate-2 border-[3px] border-ink bg-white px-3 py-1 text-sm font-bold uppercase tracking-wider shadow-hard-sm">
          {agreementLabel(result.agreement)}
        </span>
        <span className="text-sm font-medium">{agreementDetail(result)}</span>
      </div>
    </section>
  );
}

function facts(record: NetworkRecord): [string, string][] {
  return [
    ["ASN", record.asnNumber],
    ["Line", record.connectionType],
    ["Location", [record.city, record.countryCode || record.country].filter(Boolean).join(", ")],
  ];
}

/** The right-hand block when there is no verdict to show. */
export function MessageBlock({
  title,
  body,
  tone,
  ip,
}: {
  title: string;
  body: string;
  tone: "neutral" | "problem";
  ip?: string;
}) {
  return (
    <section
      aria-labelledby="verdict-heading"
      className={`${tone === "problem" ? "bg-white" : "bg-unknown hatch"} flex flex-col border-[3px] border-ink p-6 shadow-hard sm:p-8`}
    >
      {ip ? (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold uppercase tracking-widest">
          IP address <span className="break-all font-mono text-base normal-case tracking-normal">{ip}</span>
        </p>
      ) : null}
      <h2 id="verdict-heading" className="mt-5 text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
        {title}
      </h2>
      {tone === "problem" ? <div className="mt-4 h-2 w-24 bg-datacenter" aria-hidden="true" /> : null}
      <p className="mt-6 max-w-prose text-base leading-relaxed">{body}</p>
    </section>
  );
}
