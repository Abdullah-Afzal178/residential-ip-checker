import { ArrowRight } from "lucide-react";

import { EXAMPLES } from "@/lib/constants";
import { MAX_BULK } from "@/lib/input";

/**
 * A plain GET form, so a check is a shareable URL and works without
 * JavaScript. The inline script only adds Enter-to-submit (Shift+Enter
 * still starts a new line for lists).
 */
export function CheckForm({ value }: { value: string }) {
  return (
    <div>
      <form id="check-form" action="/" method="get" role="search" aria-label="Check IP addresses">
        <label htmlFor="q" className="text-xs font-bold uppercase tracking-widest">
          IP address, or a list of up to {MAX_BULK}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <textarea
            id="q"
            name="q"
            rows={2}
            defaultValue={value}
            placeholder="73.162.45.10"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="min-h-[3.25rem] flex-1 resize-y border-[3px] border-ink bg-white px-3 py-2.5 font-mono text-base leading-6 shadow-hard-sm outline-hidden placeholder:text-ink/35 focus-visible:bg-business/25"
          />
          <button
            type="submit"
            className="press inline-flex items-center justify-center gap-2 border-[3px] border-ink bg-ink px-6 py-3 text-base font-bold uppercase tracking-wide text-paper shadow-hard-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink sm:self-start"
          >
            Check
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-xs text-ink/60">Enter to check. Shift+Enter for a new line. Leave it empty to check your own IP.</p>
      </form>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var f=document.getElementById("check-form");if(!f)return;var t=f.querySelector("textarea");t&&t.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();f.requestSubmit?f.requestSubmit():f.submit();}});})();`,
        }}
      />

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-widest">Try one</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <li key={example.label}>
              <a
                href={`/?q=${encodeURIComponent(example.query)}`}
                className="press inline-block border-2 border-ink bg-paper px-2.5 py-1 text-sm font-semibold shadow-hard-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {example.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
