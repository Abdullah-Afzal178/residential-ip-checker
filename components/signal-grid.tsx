import { Check, Equal, Minus, X } from "lucide-react";

import type { Classification, Signal, Stance } from "@/lib/classify";
import { SECURITY_API_URL } from "@/lib/constants";
import { displayReading, guidance, SIGNAL_HELP, SIGNAL_TITLE, STANCE_LABEL } from "@/lib/copy";
import type { HostnameHint } from "@/lib/hints";
import type { NetworkRecord } from "@/lib/record";

const STANCE_STYLE: Record<Stance, string> = {
  backs: "bg-ink text-paper",
  fits: "bg-white text-ink",
  conflicts: "bg-[#ff3b30] text-white",
  silent: "bg-paper text-ink/70 hatch",
};

const STANCE_ICON = { backs: Check, fits: Equal, conflicts: X, silent: Minus } as const;

/** Bento grid of the evidence behind a single verdict. */
export function SignalGrid({ record, result }: { record: NetworkRecord; result: Classification }) {
  const byId = Object.fromEntries(result.signals.map((signal) => [signal.id, signal])) as Record<Signal["id"], Signal>;

  return (
    <section aria-labelledby="evidence-heading" className="space-y-5">
      <h2 id="evidence-heading" className="inline-block bg-ink px-3 py-1 text-sm font-bold uppercase tracking-widest text-paper">
        The evidence
      </h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
        <SignalTile signal={byId.asn} className="lg:col-span-2" detail={asnDetail(record)} />
        <SignalTile signal={byId.company} className="lg:col-span-2" detail={companyDetail(record)} />
        <SignalTile signal={byId.connection} className="lg:col-span-2" />
        <SignalTile signal={byId.flags} className="lg:col-span-2" emptyText="Neither" />
        <SignalTile
          signal={byId.hostname}
          className="sm:col-span-2 lg:col-span-4"
          mono
          emptyText="No name"
          hints={result.hints}
        />

        <NetworkTile record={record} />
        <GuidanceTile result={result} />
      </div>
    </section>
  );
}

function SignalTile({
  signal,
  className,
  detail,
  emptyText = "Not recorded",
  mono = false,
  hints,
}: {
  signal: Signal;
  className?: string;
  detail?: string;
  emptyText?: string;
  mono?: boolean;
  hints?: HostnameHint[];
}) {
  const Icon = STANCE_ICON[signal.stance];

  return (
    <article className={`flex flex-col border-[3px] border-ink bg-white p-5 shadow-hard-sm ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-widest">{SIGNAL_TITLE[signal.id]}</h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1 border-2 border-ink px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STANCE_STYLE[signal.stance]}`}
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {STANCE_LABEL[signal.stance]}
        </span>
      </div>

      <p
        className={`mt-4 ${mono ? "break-all font-mono text-lg" : "text-2xl"} font-bold ${signal.reading ? "" : "text-ink/45"}`}
      >
        {signal.reading ? (mono ? signal.reading : displayReading(signal.reading)) : emptyText}
      </p>
      {detail ? <p className="mt-1 text-sm font-medium">{detail}</p> : null}

      {hints && hints.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {hints.map((hint) => (
            <li key={`${hint.kind}-${hint.match}`} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{hintText(hint)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-auto pt-4 text-xs text-ink/60">{SIGNAL_HELP[signal.id]}</p>
    </article>
  );
}

function hintText(hint: HostnameHint): string {
  switch (hint.kind) {
    case "residential":
      return `“${hint.match}” is a word ISPs use for home lines.`;
    case "mobile":
      return `“${hint.match}” is a word carriers use for mobile lines.`;
    case "business":
      return `“${hint.match}” is a word ISPs use for business lines.`;
    case "hosting":
      return `“${hint.match}” is a word used for servers and hosting.`;
    case "anonymizer":
      return hint.match === "tor-exit"
        ? "“tor-exit” marks a Tor exit relay."
        : `“${hint.match}” suggests a VPN endpoint.`;
  }
}

function asnDetail(record: NetworkRecord): string | undefined {
  return [record.asnNumber, record.asnOrganization].filter(Boolean).join(", ") || undefined;
}

function companyDetail(record: NetworkRecord): string | undefined {
  return record.companyName || undefined;
}

function NetworkTile({ record }: { record: NetworkRecord }) {
  const rows: [string, string][] = [
    ["ASN", [record.asnNumber, record.asnOrganization].filter(Boolean).join(" ")],
    ["ASN domain", record.asnDomain],
    ["Block owner", record.companyName],
    ["Owner domain", record.companyDomain],
    ["Route", record.route],
    ["Location", [record.city, record.country].filter(Boolean).join(", ")],
  ];

  return (
    <article className="border-[3px] border-ink bg-paper p-5 shadow-hard-sm sm:col-span-2 lg:col-span-3">
      <h3 className="text-xs font-bold uppercase tracking-widest">The network</h3>
      <dl className="mt-4 divide-y-2 divide-ink/10 text-sm">
        {rows.map(([term, value]) => (
          <div key={term} className="grid grid-cols-[7.5rem_1fr] gap-3 py-2">
            <dt className="font-bold">{term}</dt>
            <dd className={`${term === "Route" ? "font-mono" : ""} break-words ${value ? "" : "text-ink/45"}`}>
              {value || "Not recorded"}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function GuidanceTile({ result }: { result: Classification }) {
  return (
    <article className="flex flex-col border-[3px] border-ink bg-ink p-5 text-paper shadow-hard-sm sm:col-span-2 lg:col-span-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-business">What it means for you</h3>
      <dl className="mt-4 space-y-4 text-sm">
        {guidance(result).map((item) => (
          <div key={item.title}>
            <dt className="font-bold uppercase tracking-wide">{item.title}</dt>
            <dd className="mt-1 leading-relaxed text-paper/85">{item.body}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto border-t-2 border-paper/20 pt-4 text-sm leading-relaxed text-paper/85">
        Network type alone can&apos;t tell you whether an address is a VPN, a residential proxy or a known attacker.{" "}
        <a
          href={SECURITY_API_URL}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-business underline decoration-2 underline-offset-4 hover:text-white"
        >
          ipgeolocation.io&apos;s IP Security API
        </a>{" "}
        flags those.
      </p>
    </article>
  );
}
