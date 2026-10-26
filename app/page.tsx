import { headers } from "next/headers";
import type { ReactNode } from "react";

import { BulkTable, DistributionBlock, InputNotes } from "@/components/bulk-board";
import { CheckForm } from "@/components/check-form";
import { PoweredByBadge } from "@/components/powered-by-badge";
import { SignalGrid } from "@/components/signal-grid";
import { MessageBlock, VerdictBlock } from "@/components/verdict-block";
import { SECURITY_API_URL, SITE_NAME } from "@/lib/constants";
import { parseInput } from "@/lib/input";
import { checkMany, checkOne, visitorIp, type Checked } from "@/lib/lookup";
import { tally } from "@/lib/tally";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = typeof params.q === "string" ? params.q : "";
  const parsed = parseInput(raw);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b-[3px] border-ink bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-3 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-business">
            <span className="grid grid-cols-2 gap-0.5 border-2 border-paper p-0.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 bg-residential" />
              <span className="h-2.5 w-2.5 bg-mobile" />
              <span className="h-2.5 w-2.5 bg-business" />
              <span className="h-2.5 w-2.5 bg-datacenter" />
            </span>
            <span className="text-sm font-bold uppercase tracking-widest">{SITE_NAME}</span>
          </a>
          <PoweredByBadge />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-4 py-8 sm:px-6 sm:py-12">
        <Result parsed={parsed} raw={raw} />
        <Notes />
      </main>

      <footer className="border-t-[3px] border-ink bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm sm:px-6">
          <p>Network data from ipgeolocation.io. Open source under the MIT licence.</p>
          <PoweredByBadge />
        </div>
      </footer>
    </div>
  );
}

function Hero({ raw, right }: { raw: string; right: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
      <div className="border-[3px] border-ink bg-white p-6 shadow-hard sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-ink/60">Residential, mobile or datacenter</p>
        <h1 className="mt-3 text-3xl font-bold leading-[1.05] tracking-tight sm:text-[2.75rem]">
          Is this IP residential, mobile or datacenter?
        </h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-ink/80">
          Find out what kind of network an address is on, and see which records back the answer and which argue with
          it.
        </p>
        <div className="mt-7">
          <CheckForm value={raw} />
        </div>
      </div>
      {right}
    </section>
  );
}

async function Result({ parsed, raw }: { parsed: ReturnType<typeof parseInput>; raw: string }) {
  if (parsed.kind === "invalid") {
    return <Hero raw={raw} right={<MessageBlock tone="problem" title="Nothing to check" body={parsed.reason} />} />;
  }

  if (parsed.kind === "ips") {
    const rows = await checkMany(parsed.ips);
    const summary = tally(rows.map((row) => ({ category: row.classification?.category ?? null, problem: row.problem?.kind ?? null })));

    return (
      <>
        <Hero raw={raw} right={<DistributionBlock summary={summary} />} />
        <InputNotes rejected={parsed.rejected} duplicates={parsed.duplicates} ranges={parsed.ranges} overflow={parsed.overflow} />
        <BulkTable rows={rows} summary={summary} />
      </>
    );
  }

  let self = false;
  let ip: string | null;

  if (parsed.kind === "ip") {
    ip = parsed.ip;
  } else {
    self = true;
    ip = visitorIp(await headers());
  }

  if (!ip) {
    return (
      <Hero
        raw={raw}
        right={
          <MessageBlock
            tone="neutral"
            title="No public IP to check"
            body="This request came from a private network, which is what happens on localhost. Paste an address on the left, or pick one of the examples."
          />
        }
      />
    );
  }

  const result = await checkOne(ip);

  return <Single result={result} raw={raw} self={self} />;
}

function Single({ result, raw, self }: { result: Checked; raw: string; self: boolean }) {
  if (!result.record || !result.classification) {
    return (
      <Hero
        raw={raw}
        right={
          <MessageBlock
            tone={result.problem?.kind === "private" ? "neutral" : "problem"}
            title={result.problem?.kind === "private" ? "Private address" : "Lookup failed"}
            body={result.problem?.message ?? "Nothing came back for this address."}
            ip={result.ip}
          />
        }
      />
    );
  }

  return (
    <>
      <Hero raw={raw} right={<VerdictBlock record={result.record} result={result.classification} self={self} />} />
      <SignalGrid record={result.record} result={result.classification} />
    </>
  );
}

const NOTES: { question: string; answer: ReactNode }[] = [
  {
    question: "What is a residential IP?",
    answer:
      "An address an internet provider gives to a home connection: cable, DSL, fibre or satellite. Websites treat it as the normal case, because that is where most real visitors come from.",
  },
  {
    question: "What is a datacenter IP?",
    answer:
      "An address owned by a hosting or cloud provider such as AWS, Google Cloud or DigitalOcean. Servers, VPNs, proxies and bots use them; people browsing at home almost never do. That is why fraud and scraping defences look at it first.",
  },
  {
    question: "How does this checker decide?",
    answer:
      "It reads four records from ipgeolocation.io: the type of the network (ASN) that routes the address, the type of organisation the address block is assigned to, the connection type, and the reverse DNS name. Hosting and CDN records decide first, then a mobile or home connection type, then the organisation type. The reverse DNS name only decides where the records leave a gap, because it is a naming habit rather than a record.",
  },
  {
    question: "Why does my own IP show as datacenter?",
    answer:
      "Because a site sees the last network your traffic leaves from. On a VPN, iCloud Private Relay or a company proxy, that is the service's address, not your home line. Switch it off and check again.",
  },
  {
    question: "Can a residential IP still be a proxy?",
    answer: (
      <>
        Yes. Residential proxy services route traffic through ordinary home connections, often via software installed
        on people&apos;s devices, so the address looks like any household. Network type can&apos;t reveal that.{" "}
        <a
          href={SECURITY_API_URL}
          target="_blank"
          rel="noreferrer"
          className="font-bold underline decoration-2 underline-offset-4 hover:bg-business"
        >
          ipgeolocation.io&apos;s IP Security API
        </a>{" "}
        flags residential proxies, VPNs and Tor exits.
      </>
    ),
  },
  {
    question: "Why are mobile IPs risky to block?",
    answer:
      "Carriers put many phones behind one public address (carrier-grade NAT) and reassign addresses often. Blocking one can lock out a crowd of people who did nothing wrong.",
  },
];

function Notes() {
  return (
    <section aria-labelledby="notes-heading" className="space-y-5">
      <h2 id="notes-heading" className="inline-block bg-ink px-3 py-1 text-sm font-bold uppercase tracking-widest text-paper">
        Questions people ask
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {NOTES.map((note) => (
          <article key={note.question} className="border-[3px] border-ink bg-white p-5 shadow-hard-sm">
            <h3 className="text-lg font-bold leading-snug">{note.question}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">{note.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
