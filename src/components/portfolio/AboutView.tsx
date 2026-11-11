"use client";

/**
 * About page (client view) — availability badge, hero headline,
 * introduction, skills spider web, work experience grid, the personal
 * sign-off block with portrait and signature, and the footer. Every
 * string and image comes from the content query (admin-managed); the
 * server page bakes the current content in and this view refreshes it
 * live from the API.
 */

import Image from "next/image";
import { MapPin } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { FloatingNav } from "./FloatingNav";
import { AboutHeroReveal } from "./AboutHeroReveal";
import { SkillsWeb } from "./SkillsWeb";
import { ExperienceCard } from "./ExperienceCard";
import { CopyEmailButton } from "./CopyEmailButton";
import { useContent } from "./SiteData";
import type { ContentPayload } from "@/data/types";

export function AboutView({ initial }: { initial?: ContentPayload }) {
  const { data } = useContent(initial);

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status">
        <span
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-brand"
          aria-hidden="true"
        />
      </div>
    );
  }

  const { site, texts, experience, socials, services } = data;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:flex-row lg:overflow-hidden">
      <Sidebar />

      <main className="nice-scroll min-w-0 flex-1 lg:h-dvh lg:overflow-y-auto">
        <div className="flex min-h-full flex-col gap-14 px-5 pt-10 pb-10 sm:gap-16 sm:px-8 lg:gap-20 lg:px-16 lg:pt-14">
          {/* ——— hero ——— */}
          <section aria-labelledby="about-heading" className="flex flex-col gap-7">
            {site.openToWork ? (
              <span className="inline-flex w-max items-center gap-2.5 rounded-full bg-badge px-4 py-2 text-[13px] font-medium text-body">
                <span aria-hidden="true" className="h-2 w-2 rounded-[2px] bg-brand" />
                {texts["about.badge"]}
              </span>
            ) : null}

            {/* Scroll-locked reveal: first word black, the rest ink in as the
                visitor scrolls; the page itself only scrolls once it finishes. */}
            <AboutHeroReveal
              bold={texts["about.hero.bold"] ?? ""}
              rest={texts["about.hero.rest"] ?? ""}
            />

            <div className="max-w-2xl space-y-4 text-[15px] leading-relaxed text-body">
              <p>{texts["about.p1"]}</p>
              <p>{texts["about.p2"]}</p>
            </div>
          </section>

          {/* ——— skills spider web ——— */}
          <section aria-label="Skills and services web" className="w-full">
            <SkillsWeb labels={services.map((s) => s.label)} />
          </section>

          {/* ——— work experience ——— */}
          <section aria-labelledby="experience-heading">
            <h2 id="experience-heading" className="text-lg font-bold text-ink">
              {texts["about.experienceHeading"]}
            </h2>
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {experience.map((item) => (
                <li key={item.company}>
                  <ExperienceCard item={item} />
                </li>
              ))}
            </ul>
          </section>

          {/* ——— personal sign-off ——— */}
          <section aria-label="Signature" className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <p className="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.9rem] lg:leading-[1.15]">
                {site.name}
              </p>
              <p className="mt-3 flex items-center gap-2.5 text-sm text-body sm:text-[15px]">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px] bg-brand" />
                {site.role}
              </p>
              {/* Saad's real handwritten signature */}
              <Image
                src={site.signaturePath}
                alt={`Handwritten signature of ${site.name}`}
                width={199}
                height={102}
                className="mt-6 h-14 w-auto object-contain object-left sm:h-16"
                priority={false}
              />
            </div>

            <div className="relative w-52 shrink-0 sm:w-60 lg:w-64">
              <span
                aria-hidden="true"
                className="absolute inset-0 translate-x-3 translate-y-3 rotate-[4deg] rounded-2xl bg-line/70"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 translate-x-1.5 translate-y-1.5 -rotate-[3deg] rounded-2xl bg-line/40"
              />
              <div className="relative aspect-[4/5] -rotate-[2deg] overflow-hidden rounded-2xl bg-badge shadow-[0_18px_45px_-20px_rgba(17,24,39,0.4)]">
                <Image
                  src={site.portraitPath}
                  alt={`Portrait of ${site.name}`}
                  fill
                  sizes="(min-width: 1024px) 256px, 224px"
                  className="object-cover"
                />
              </div>
            </div>
          </section>

          {/* ——— footer ——— */}
          <footer className="mt-auto flex flex-col gap-7 border-t border-line pt-8">
            <div className="flex flex-col gap-6">
              <p className="text-[15px] text-body">{texts["about.connectLine"]}</p>

              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {socials.map((s) => (
                  <li key={s.label} className="text-sm">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-body underline-offset-4 hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
                      >
                        {s.label}
                      </a>
                    ) : (
                      <span className="text-soft" title="Profile URL not configured yet">
                        {s.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
                <div className="flex items-center gap-3">
                  <a
                    href={`mailto:${site.email}`}
                    className="text-sm text-body underline-offset-4 hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm"
                  >
                    {site.email}
                  </a>
                  <CopyEmailButton email={site.email} />
                </div>
                <p className="flex items-center gap-2 text-sm text-body">
                  <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-badge text-brand">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {site.location}
                </p>
              </div>
            </div>

            <p className="pb-24 text-center text-[12px] text-soft sm:pb-28">
              {texts["footer.copyright"]}
            </p>
          </footer>
        </div>
      </main>

      <FloatingNav resumeUrl={site.resumeUrl} email={site.email} />
    </div>
  );
}
