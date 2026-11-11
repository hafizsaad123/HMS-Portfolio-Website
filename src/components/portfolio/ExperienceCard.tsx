import { ExternalLink } from "lucide-react";
import type { Experience } from "@/data/experience";
import { CompanyMark } from "./CompanyMark";

/**
 * Work experience card from the About export:
 * mark + company (bold, links to the company website when set),
 * role (gray), period in a subtle rounded badge.
 */
export function ExperienceCard({ item }: { item: Experience }) {
  return (
    <article className="flex flex-col gap-2.5 rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-2.5">
        <CompanyMark id={item.markId} size={22} />
        <h3 className="min-w-0 text-[14px] leading-tight font-semibold text-ink">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${item.company} website (opens in a new tab)`}
              className="group inline-flex items-center gap-1 rounded-sm text-ink transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {item.company}
              <ExternalLink
                className="h-3 w-3 shrink-0 text-soft transition-colors group-hover:text-brand"
                aria-hidden="true"
              />
            </a>
          ) : (
            item.company
          )}
        </h3>
      </div>
      <p className="text-[12.5px] text-body">{item.role}</p>
      <p className="mt-auto">
        <span className="inline-block rounded-full bg-badge px-3 py-1 text-[11.5px] font-medium text-soft">
          {item.period}
        </span>
      </p>
    </article>
  );
}
