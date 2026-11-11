"use client";

import Image from "next/image";
import { FileText, Mail, MapPin } from "lucide-react";
import { useContent, SidebarSkeleton } from "./SiteData";
import { CompanyMark } from "./CompanyMark";
import { ToolMark } from "./ToolMark";
import { SidebarFrame } from "./SidebarFrame";
import { SidebarArtwork } from "./SidebarArtwork";
import { CopyEmailButton } from "./CopyEmailButton";
import { SocialIcon } from "./SocialIcon";
import type { CompanyMarkId } from "@/data/experience";
import type { ToolId } from "./ToolMark";

/**
 * Shared sidebar — present on all three pages (client component).
 *
 * Every value (name, role, bio, avatar, tools, skills, experience pills,
 * socials, email, location, artwork) comes from the site content query
 * (GET /api/content — PHP/MySQL on the live host) and can be edited in
 * the /admin portal.
 *
 * The sidebar is a full-bleed white card (sharp corners — radius 0, thin
 * border) carrying Saad's corner-frame design: light-gray corner squares,
 * thin frame lines, the two purple pixel cascades and the gradient bar
 * that closes the bottom edge (see SidebarFrame — recreated 1:1 from the
 * supplied reference). The card runs edge-to-edge: it always touches the
 * ends of the screen (top, left and bottom at lg+; full width on mobile)
 * with no extra space on any side, and its right border meets the main
 * column directly.
 *
 * RULE #1 — the sidebar never scrolls with the page. At lg+ the page
 * itself cannot scroll (see the page wrappers): only the main column to
 * the right scrolls. The sidebar card is pinned to the viewport height;
 * its frame and gradient bar stay pinned to the card edges at all times.
 *
 * SPACING SYSTEM (premium rhythm) — one consistent scale everywhere:
 *   • horizontal padding: a generous 40px (px-10) on EVERY side of every
 *     breakpoint — the content keeps ~18-25px of clear daylight from the
 *     frame lines (which sit at 15px/22px from the card edges), so
 *     nothing ever reads as touching or escaping the card;
 *   • top padding 40px (pt-10) — the identity header (avatar + name +
 *     role, grouped as one block) sits well BELOW the top frame line
 *     and the corner decor, unmistakably inside the card;
 *   • bottom padding 48px (pb-12) — the last contact line stays above
 *     the bottom frame band (line at 33px, cascade up to 57px);
 *   • section rhythm: a single 28px gap between blocks at every width,
 *     gently compressed ONLY by viewport height (see globals.css) —
 *     never by width;
 *   • label → list: a constant 10px inside every section;
 *   • pills sit on one size (11px text, 10px/5px padding) at every
 *     breakpoint — no per-width padding swaps;
 *   • elements are proportionally scaled down (~10%) — 72px avatar,
 *     15.5px name, 12.5px bio, 11px uppercase micro-labels with wide
 *     tracking, 11px pills — which buys the breathing room between
 *     sections that makes the column feel calm and premium.
 *
 * The profile picture sits in a rounded frame (radius ≈ 22% of its size)
 * with Saad's gradient border stroke — diagonal, vibrant purple at the
 * top-left fading to pale lavender at the bottom-right (recreated 1:1
 * from the supplied reference: #A078F8 → #E0DDE5).
 */

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[11px] leading-none font-semibold tracking-[0.14em] text-soft uppercase">
      {children}
    </h2>
  );
}

/** Hostname for the pill tooltip — null when the stored URL is malformed. */
function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function Sidebar() {
  const { data } = useContent();
  if (!data) return <SidebarSkeleton />;
  const { site, tools, skills, experience, socials } = data;

  return (
    <aside className="relative w-full lg:h-dvh lg:w-[31%] lg:min-w-[397px] lg:shrink-0">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-none border border-line bg-white">
        {/* ——— Saad's corner-frame design (pinned to the card edges) ——— */}
        <SidebarFrame />

        {/* ——— identity + content ——— (natural height; only on very short
            screens can it scroll internally — never with the page) */}
        <div className="sidebar-body sidebar-scroll relative z-10 flex flex-col gap-7 px-10 pt-10 pb-12 lg:min-h-0 lg:overflow-y-auto">
          {/* header */}
          <div className="flex items-start gap-3.5">
            {/* avatar — gradient border stroke + rounded corners per the
                reference: diagonal #A078F8 → #E0DDE5, radius ≈ 22% */}
            <div className="relative h-[72px] w-[72px] shrink-0 rounded-[16px] bg-gradient-to-br from-[#a078f8] to-[#e0dde5] p-[2px]">
              <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-badge">
                <Image
                  src={site.avatarPath}
                  alt={`Portrait of ${site.name}`}
                  fill
                  sizes="72px"
                  className="object-cover"
                  // above-the-fold identity image
                  priority
                />
              </div>
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[15.5px] leading-snug font-semibold text-black">{site.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11.5px] leading-snug text-body">
                <span aria-hidden="true" className="inline-block h-[7px] w-[7px] shrink-0 rounded-[2px] bg-brand" />
                {site.role}
              </p>
            </div>
          </div>

          {/* bio */}
          <p className="text-[12.5px] leading-[1.65] text-body">
            <span className="font-semibold text-black">{site.bioLead}</span> {site.bio}
          </p>

          {/* tools */}
          <section aria-labelledby="sb-tools" className="flex flex-col gap-2.5">
            <SectionLabel id="sb-tools">Tools</SectionLabel>
            <ul className="flex flex-wrap gap-x-1.5 gap-y-2">
              {tools.map((tool) => (
                <li key={tool.label}>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-tile bg-white px-2.5 py-[5px] text-[11px] leading-none text-body">
                    <ToolMark id={tool.markId as ToolId} size={12} />
                    {tool.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* skills */}
          <section aria-labelledby="sb-skills" className="flex flex-col gap-2.5">
            <SectionLabel id="sb-skills">Skills</SectionLabel>
            <ul className="flex flex-wrap gap-x-1.5 gap-y-2">
              {skills.map((skill) => (
                <li key={skill}>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-badge px-2.5 py-[5px] text-[11px] leading-none text-body">
                    <span aria-hidden="true" className="inline-block h-[7px] w-[7px] rounded-[2px] bg-brand" />
                    {skill}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* experience */}
          <section aria-labelledby="sb-exp" className="flex flex-col gap-2.5">
            <SectionLabel id="sb-exp">Experience</SectionLabel>
            <ul className="flex flex-wrap gap-x-1.5 gap-y-2">
              {experience.map((item) => (
                <li key={item.company}>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${item.company} website (opens in a new tab)`}
                      title={safeHostname(item.url) ? `${item.company} — ${safeHostname(item.url)}` : `${item.company} website`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-badge px-2.5 py-[5px] text-[11px] leading-none text-body transition-colors hover:bg-brand/10 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <CompanyMark id={item.markId as CompanyMarkId} size={12} />
                      {item.company}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-badge px-2.5 py-[5px] text-[11px] leading-none text-body">
                      <CompanyMark id={item.markId as CompanyMarkId} size={12} />
                      {item.company}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* connect — contact lines + social icons (no heading, per
              Saad's request: icons carry their links, labels stay for
              screen readers via aria-label; the social icons share the
              location line, right-aligned) */}
          <section aria-label="Connect" className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5">
                <a
                  href={`mailto:${site.email}`}
                  className="group inline-flex items-center gap-2 text-[12.5px] text-body hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0 text-brand transition-colors group-hover:text-brand-deep" aria-hidden="true" />
                  {site.email}
                </a>
                {/* copy-to-clipboard right after the email */}
                <CopyEmailButton email={site.email} size="compact" />
              </div>
              {site.resumeUrl ? (
                <a
                  href={site.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-[12.5px] text-body hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-brand transition-colors group-hover:text-brand-deep" aria-hidden="true" />
                  Resume
                </a>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-2 text-[12.5px] text-body">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  {site.location}
                </p>
                <ul className="flex shrink-0 items-center gap-1">
                  {socials.map((s) => (
                    <li key={s.label}>
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${s.label} (opens in a new tab)`}
                          title={s.label}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-brand transition-colors hover:bg-badge hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <SocialIcon label={s.label} />
                        </a>
                      ) : (
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-soft"
                          title="Profile URL not configured yet"
                        >
                          <SocialIcon label={s.label} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* ——— bottom ——— absorbs the leftover height, always pinned to the
            card's bottom edge; the artwork shrinks fluidly and hides only
            on very short viewports (see .sidebar-art rules) while the frame
            band (gradient bar + corner squares + cascades) stays put */}
        <div className="relative z-10 flex flex-col lg:min-h-0 lg:flex-1">
          <SidebarArtwork src={site.artworkPath} />
        </div>
      </div>
    </aside>
  );
}
