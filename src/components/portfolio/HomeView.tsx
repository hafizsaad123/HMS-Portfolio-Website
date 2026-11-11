"use client";

/**
 * Home — the centered profile canvas from the approved design.
 *
 * A single 658px column inside the framed canvas: profile block (avatar,
 * name, role) → bio → Tools → Skills → Experience → Connect With Me → the
 * two feature cards (My Resume / My Projects). Every block glides in with
 * a staggered spring reveal; chips lift on hover; links use the signature
 * dotted-underline style.
 *
 * All content is admin-managed (Supabase): the server page bakes the
 * current content in as initialData (SEO + instant paint), then this view
 * refreshes it from GET /api/content so admin edits appear live.
 */

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { PageCanvas } from "./PageCanvas";
import { FloatingNav } from "./FloatingNav";
import { FeatureCards } from "./FeatureCards";
import { Reveal, SPRING } from "./Reveal";
import { CopyEmailButton } from "./CopyEmailButton";
import { ToolMark } from "./ToolMark";
import { CompanyMark } from "./CompanyMark";
import { useContent, PageLoading } from "./SiteData";
import type { ContentPayload } from "@/data/types";

/** Render `**bold**` segments inside the bio body as near-black semibold. */
function renderBoldSegments(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((chunk, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="dash-underline font-semibold text-ink">
        {chunk}
      </strong>
    ) : (
      <span key={i}>{chunk}</span>
    )
  );
}

/**
 * The studio wall clock — a small living detail. Karachi local time
 * ticking beside the location line (mount-only so SSR stays pristine).
 */
function LocalTime() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Karachi",
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  if (!time) return null;
  return (
    <span className="tnum ml-1 text-body/70" aria-hidden="true">
      · {time} PKT
    </span>
  );
}

/**
 * Bio paragraph — the lead phrase is bold with the signature dashed
 * violet underline; `**bold**` segments in the body render near-black
 * with the same underline. The full bio always shows — no fold, no
 * "Read more" toggle (retired: it added a click between the visitor
 * and the story).
 */
function BioParagraph({ lead, body }: { lead?: string; body?: string }) {
  return (
    <p className="text-pretty text-[15.5px] leading-[25px] text-body">
      {lead ? (
        <span className="dash-underline font-semibold text-ink">
          {lead}{" "}
        </span>
      ) : null}
      {renderBoldSegments(body ?? "")}
    </p>
  );
}

/** One labeled chip section — heading + wrapped chip rows. */
function ChipSection({
  label,
  children,
  sectionDelay = 0,
}: {
  label: string;
  children: React.ReactNode;
  sectionDelay?: number;
}) {
  return (
    <section aria-label={label}>
      <Reveal delay={sectionDelay}>
        <h2 className="text-[16px] font-normal tracking-tight text-ink">{label}</h2>
      </Reveal>
      <ul className="mt-5 flex flex-wrap gap-x-2.5 gap-y-3">{children}</ul>
    </section>
  );
}

const CHIP =
  "inline-flex h-[36px] items-center gap-2 rounded-full border border-[#e3e3e7] bg-white px-[14px] text-[13.5px] font-medium text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_8px_18px_-8px_rgba(17,24,39,0.22)]";

export function HomeView({ initial }: { initial?: ContentPayload }) {
  const { data } = useContent(initial);

  if (!data) {
    return (
      <PageCanvas>
        <PageLoading label="Loading the studio…" />
      </PageCanvas>
    );
  }

  const { site, texts, tools, skills, experience, socials } = data;
  const mapsUrl = site.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.location)}`
    : null;

  return (
    <>
      <PageCanvas>
        <div className="mx-auto flex w-full max-w-[658px] flex-col gap-12 px-5 pb-[150px] pt-16 sm:px-6 md:px-0 md:pt-[134px]">
          <h1 className="sr-only">
            {site.name} — {site.role}
          </h1>

          {/* ——— profile ——— */}
          <section aria-label="Profile" className="flex flex-col gap-[37px]">
            <Reveal delay={0.05}>
              <div className="flex items-center gap-5">
                <motion.span
                  className="relative block h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[16px] border border-brand-soft bg-badge"
                  whileHover={{ rotate: -3, scale: 1.05 }}
                  transition={SPRING}
                >
                  <Image
                    src={site.avatarPath}
                    alt={`${site.name} — portrait`}
                    fill
                    sizes="72px"
                    className="object-cover"
                    priority
                  />
                </motion.span>
                <div className="min-w-0">
                  <p className="text-[22px] font-bold leading-snug tracking-tight text-ink sm:text-[24px]">
                    {site.name}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-body">
                    <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rounded-[2px] bg-brand" />
                    <span>{site.role}</span>
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.16}>
              <BioParagraph lead={site.bioLead} body={site.bio} />
            </Reveal>
          </section>

          {/* ——— tools ——— */}
          {tools.length > 0 ? (
            <ChipSection label={texts["home.tools"] ?? "Tools"} sectionDelay={0.08}>
              {tools.map((tool, i) => (
                <Reveal as="li" key={`${tool.markId}-${tool.label}`} delay={0.1 + i * 0.05} y={12} duration={0.45}>
                  <span className={CHIP}>
                    <ToolMark id={tool.markId} size={17} />
                    {tool.label}
                  </span>
                </Reveal>
              ))}
            </ChipSection>
          ) : null}

          {/* ——— skills ——— */}
          {skills.length > 0 ? (
            <ChipSection label={texts["home.skills"] ?? "Skills"} sectionDelay={0.08}>
              {skills.map((skill, i) => (
                <Reveal as="li" key={skill} delay={0.1 + i * 0.05} y={12} duration={0.45}>
                  <span className={CHIP}>
                    <span aria-hidden="true" className="h-[7px] w-[7px] shrink-0 rounded-[2px] bg-brand" />
                    {skill}
                  </span>
                </Reveal>
              ))}
            </ChipSection>
          ) : null}

          {/* ——— experience ——— */}
          {experience.length > 0 ? (
            <ChipSection label={texts["home.experience"] ?? "Experience"} sectionDelay={0.08}>
              {experience.map((exp, i) => {
                const chip = (
                  <span className={CHIP}>
                    <CompanyMark id={exp.markId} size={18} />
                    {exp.company}
                  </span>
                );
                return (
                  <Reveal as="li" key={`${exp.company}-${i}`} delay={0.1 + i * 0.05} y={12} duration={0.45}>
                    {exp.url ? (
                      <a
                        href={exp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[9px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        aria-label={`${exp.company} — opens in a new tab`}
                      >
                        {chip}
                      </a>
                    ) : (
                      chip
                    )}
                  </Reveal>
                );
              })}
            </ChipSection>
          ) : null}

          {/* ——— connect ——— */}
          <section aria-label="Connect with me">
            <Reveal delay={0.08}>
              <h2 className="text-[16px] font-normal tracking-tight text-ink">
                {texts["home.connect"] ?? "Connect With Me"}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px]">
                {socials.map((social) => (
                  <a
                    key={`${social.label}-${social.url}`}
                    href={social.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dotted-link"
                  >
                    {social.label}
                  </a>
                ))}
                {site.email ? (
                  <span className="inline-flex items-center gap-1">
                    <a
                      href={`mailto:${site.email}`}
                      className="text-body transition-colors duration-200 hover:text-brand"
                    >
                      {site.email}
                    </a>
                    <CopyEmailButton email={site.email} size="compact" />
                  </span>
                ) : null}
              </div>
              {site.location && mapsUrl ? (
                <p className="mt-6 flex flex-wrap items-center gap-2 text-[14px]">
                  <MapPin className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="dotted-link">
                    {site.location}
                  </a>
                  <LocalTime />
                </p>
              ) : null}
            </Reveal>
          </section>

          {/* ——— feature cards ——— */}
          <Reveal delay={0.1} className="mt-14">
            <FeatureCards
              resumeUrl={site.resumeUrl}
              email={site.email}
              resumeLabel={texts["home.resumeCard"] ?? "My Resume"}
              projectsLabel={texts["home.projectsCard"] ?? "My Projects"}
            />
          </Reveal>
        </div>
      </PageCanvas>

      <FloatingNav resumeUrl={site.resumeUrl} email={site.email} />
    </>
  );
}
