import { POWERED_BY_URL } from "@/lib/constants";

export function PoweredByBadge({ className }: { className?: string }) {
  return (
    <a
      href={POWERED_BY_URL}
      target="_blank"
      rel="noreferrer"
      className={[
        "press inline-flex items-center gap-2 border-2 border-ink bg-business px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink shadow-hard-sm",
        className ?? "",
      ].join(" ")}
    >
      Powered by ipgeolocation.io
    </a>
  );
}
