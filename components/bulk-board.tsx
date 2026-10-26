import type { Category } from "@/lib/classify";
import { agreementLabel, CATEGORY_BG, CATEGORY_LABEL, kicker } from "@/lib/copy";
import type { Checked } from "@/lib/lookup";
import type { Tally } from "@/lib/tally";

import { CopyButton } from "@/components/copy-button";

/** Right-hand hero block for a list: how the addresses split up. */
export function DistributionBlock({ summary }: { summary: Tally }) {
  const classified = summary.total - summary.private - summary.failed;
  const isp = summary.buckets.find((bucket) => bucket.category === "isp")?.count ?? 0;

  return (
    <section aria-labelledby="verdict-heading" className="flex flex-col border-[3px] border-ink bg-white p-6 shadow-hard sm:p-8">
      <p className="text-sm font-bold uppercase tracking-widest">
        {summary.total} {summary.total === 1 ? "address" : "addresses"} checked
      </p>
      <h2 id="verdict-heading" className="mt-5 text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
        {classified === 0
          ? "Nothing to classify"
          : `${summary.people} of ${classified} are home or mobile lines`}
      </h2>
      <p className="mt-3 text-base font-medium">
        That is where real visitors come from. The rest belong to organisations or servers, or could not be placed.
        {isp === 1
          ? " The one marked ISP is probably a home or mobile line too, but its records don't say which."
          : isp > 1
            ? ` The ${isp} marked ISP are probably home or mobile lines too, but their records don't say which.`
            : ""}
      </p>

      {summary.total > 0 ? (
        <div className="mt-6 flex h-12 w-full border-[3px] border-ink" role="img" aria-label={barLabel(summary)}>
          {summary.buckets.map((bucket) => (
            <div
              key={bucket.category}
              className={`${CATEGORY_BG[bucket.category]} h-full border-r-[3px] border-ink last:border-r-0`}
              style={{ width: `${(bucket.count / summary.total) * 100}%` }}
            />
          ))}
          {summary.private + summary.failed > 0 ? (
            <div className="h-full bg-ink/80" style={{ width: `${((summary.private + summary.failed) / summary.total) * 100}%` }} />
          ) : null}
        </div>
      ) : null}

      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {summary.buckets.map((bucket) => (
          <li key={bucket.category} className="flex items-center gap-2">
            <span className={`${CATEGORY_BG[bucket.category]} inline-block h-4 w-4 shrink-0 border-2 border-ink`} aria-hidden="true" />
            <span className="font-semibold">{CATEGORY_LABEL[bucket.category]}</span>
            <span className="ml-auto font-mono">{bucket.count}</span>
          </li>
        ))}
        {summary.private > 0 ? (
          <li className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 shrink-0 border-2 border-ink bg-ink/80" aria-hidden="true" />
            <span className="font-semibold">Private or reserved</span>
            <span className="ml-auto font-mono">{summary.private}</span>
          </li>
        ) : null}
        {summary.failed > 0 ? (
          <li className="flex items-center gap-2">
            <span className="inline-block h-4 w-4 shrink-0 border-2 border-ink bg-ink/80" aria-hidden="true" />
            <span className="font-semibold">Lookup failed</span>
            <span className="ml-auto font-mono">{summary.failed}</span>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function barLabel(summary: Tally): string {
  const parts = summary.buckets.map((bucket) => `${bucket.count} ${CATEGORY_LABEL[bucket.category].toLowerCase()}`);

  if (summary.private > 0) {
    parts.push(`${summary.private} private`);
  }

  if (summary.failed > 0) {
    parts.push(`${summary.failed} failed`);
  }

  return parts.join(", ");
}

/** Every address in a table, then copyable lists per kind. */
export function BulkTable({ rows, summary }: { rows: Checked[]; summary: Tally }) {
  const groups = summary.buckets.map((bucket) => ({
    category: bucket.category,
    ips: rows.filter((row) => row.classification?.category === bucket.category).map((row) => row.ip),
  }));

  return (
    <section aria-labelledby="list-heading" className="space-y-6">
      <h2 id="list-heading" className="inline-block bg-ink px-3 py-1 text-sm font-bold uppercase tracking-widest text-paper">
        Every address
      </h2>

      <div className="overflow-x-auto border-[3px] border-ink bg-white shadow-hard">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-[3px] border-ink bg-paper text-xs uppercase tracking-widest">
              <th scope="col" className="px-4 py-3 font-bold">IP address</th>
              <th scope="col" className="px-4 py-3 font-bold">Kind</th>
              <th scope="col" className="px-4 py-3 font-bold">Agreement</th>
              <th scope="col" className="px-4 py-3 font-bold">Network</th>
              <th scope="col" className="px-4 py-3 font-bold">Connection</th>
              <th scope="col" className="px-4 py-3 font-bold">Reverse DNS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.ip} className="border-b-2 border-ink/15 align-top last:border-b-0">
                <td className="px-4 py-3">
                  <a
                    href={`/?q=${encodeURIComponent(row.ip)}`}
                    className={`${row.ip.includes(":") ? "break-all" : "whitespace-nowrap"} font-mono font-semibold underline decoration-ink/30 decoration-2 underline-offset-4 hover:decoration-ink`}
                  >
                    {row.ip}
                  </a>
                </td>
                {row.classification && row.record ? (
                  <>
                    <td className="px-4 py-3">
                      <span
                        className={`${CATEGORY_BG[row.classification.category]} inline-block border-2 border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide`}
                      >
                        {CATEGORY_LABEL[row.classification.category]}
                      </span>
                      <span className="mt-1 block text-xs text-ink/70">{kicker(row.classification)}</span>
                      {row.classification.anonymizer ? (
                        <span className="mt-1 block text-xs font-bold">
                          {row.classification.anonymizer === "tor-exit" ? "Named as a Tor exit" : "Named like a VPN"}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold">{agreementLabel(row.classification.agreement)}</td>
                    <td className="px-4 py-3">
                      <span className="block">{row.record.asnOrganization || row.record.companyName || "Not recorded"}</span>
                      <span className="block font-mono text-xs text-ink/60">{row.record.asnNumber}</span>
                    </td>
                    <td className="px-4 py-3">{row.record.connectionType || <span className="text-ink/45">Not recorded</span>}</td>
                    <td className="max-w-[16rem] px-4 py-3 font-mono text-xs">
                      {row.record.hostname ? (
                        <Breakable text={row.record.hostname} />
                      ) : (
                        <span className="font-sans text-sm text-ink/45">No name</span>
                      )}
                    </td>
                  </>
                ) : (
                  <td colSpan={5} className="px-4 py-3">
                    <span className="mr-2 inline-block border-2 border-ink bg-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-paper">
                      {row.problem?.kind === "private" ? "Private" : "Failed"}
                    </span>
                    {row.problem?.message}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <CopyList key={group.category} category={group.category} ips={group.ips} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** A hostname that wraps after its dots instead of mid-label. */
function Breakable({ text }: { text: string }) {
  const parts = text.split(".");

  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 ? (
            <>
              .<wbr />
            </>
          ) : null}
        </span>
      ))}
    </>
  );
}

function CopyList({ category, ips }: { category: Category; ips: string[] }) {
  const id = `list-${category}`;

  return (
    <div className="border-[3px] border-ink bg-white shadow-hard-sm">
      <div className={`${CATEGORY_BG[category]} flex items-center justify-between gap-3 border-b-[3px] border-ink px-4 py-2`}>
        <label htmlFor={id} className="text-sm font-bold uppercase tracking-wide">
          {CATEGORY_LABEL[category]} ({ips.length})
        </label>
        <CopyButton text={ips.join("\n")} label="Copy" />
      </div>
      <textarea
        id={id}
        readOnly
        rows={Math.min(6, Math.max(2, ips.length))}
        value={ips.join("\n")}
        className="block w-full resize-y bg-white px-4 py-3 font-mono text-sm outline-hidden focus-visible:bg-business/20"
      />
    </div>
  );
}

/** What happened to the parts of the input that were not checked. */
export function InputNotes({
  rejected,
  duplicates,
  ranges,
  overflow,
}: {
  rejected: string[];
  duplicates: number;
  ranges: string[];
  overflow: number;
}) {
  const notes: string[] = [];

  if (overflow > 0) {
    notes.push(`${overflow} more ${overflow === 1 ? "address was" : "addresses were"} left out. Check up to 50 at a time.`);
  }

  if (duplicates > 0) {
    notes.push(`${duplicates} repeated ${duplicates === 1 ? "address was" : "addresses were"} checked once.`);
  }

  if (ranges.length > 0) {
    notes.push(
      `Skipped ${ranges.length === 1 ? "a range" : `${ranges.length} ranges`} (${preview(ranges)}). Every address in a range can be a different kind, so paste the addresses themselves.`,
    );
  }

  if (rejected.length > 0) {
    notes.push(
      `Skipped ${rejected.length} ${rejected.length === 1 ? "entry" : "entries"} that ${rejected.length === 1 ? "is" : "are"} not an IP address (${preview(rejected)}).`,
    );
  }

  if (notes.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-1 border-l-[6px] border-business bg-white px-4 py-3 text-sm">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

function preview(items: string[]): string {
  const shown = items.slice(0, 3).map((item) => (item.length > 40 ? `${item.slice(0, 40)}…` : item));

  return items.length > 3 ? `${shown.join(", ")} and ${items.length - 3} more` : shown.join(", ");
}
