/**
 * One-time (and safety-net) seeding — populates the SQLite database with
 * the original approved site content. Idempotent: only fills empty tables.
 *
 *   bun run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

async function main() {
  const site = (await import("../src/data/site")).site;
  const projects = (await import("../src/data/projects")).projects;
  const experience = (await import("../src/data/experience")).experience;

  if ((await db.adminUser.count()) === 0) {
    await db.adminUser.create({
      data: { id: 1, username: "saad", passwordHash: hashPassword("saad2026") },
    });
    console.log("✓ admin account: saad / saad2026 (change it in Settings)");
  }

  if ((await db.siteConfig.count()) === 0) {
    await db.siteConfig.create({
      data: {
        id: 1,
        name: site.name,
        role: site.role,
        bioLead: site.bioLead,
        bio: site.bio,
        email: site.email,
        location: site.location,
        resumeUrl: site.resumeUrl,
        openToWork: true,
        avatarPath: "/images/profile.png",
        portraitPath: "/images/portrait.png",
        signaturePath: "/images/signature.png",
        artworkPath: "/images/mazar.png",
      },
    });
    console.log("✓ site config");
  }

  const existingTexts = new Set((await db.textBlock.findMany()).map((t) => t.key));
  const DEFAULT_TEXTS: Record<string, string> = {
    "about.badge": "Open to Work",
    "about.hero.bold": "Multidisciplinary",
    "about.hero.rest":
      "designer crafting distinctive digital experiences and brand identities that challenge conventions and stand out.",
    "about.p1":
      "I’m a multidisciplinary designer passionate about creating digital products and visual identities that bring ideas to life. My work spans UI/UX design, web experiences, and brand identity, combining thoughtful strategy with purposeful visuals.",
    "about.p2":
      "I believe great design goes beyond aesthetics. It’s about making intentional decisions, challenging the expected, and creating meaningful experiences that people remember.",
    "about.experienceHeading": "Work Experience",
    "about.connectLine": "I Love Connecting With People Around the World.",
    "about.metaDescription":
      "Multidisciplinary designer crafting distinctive digital experiences and brand identities — about Hafiz Muhammad Saad, UI/UX designer & brand designer based in Karachi, Pakistan.",
    "work.heading": "My Work",
    "work.subheading": "See my top insane high quality versatile projects",
    "work.metaDescription":
      "Selected projects and design engagements — brand identity, web experiences, UI/UX and visual design work by Hafiz Muhammad Saad.",
    "footer.copyright": "2026 Hafiz Muhammad Saad | All Rights Reserved",
  };
  const missing = Object.entries(DEFAULT_TEXTS).filter(([k]) => !existingTexts.has(k));
  if (missing.length) {
    await db.textBlock.createMany({ data: missing.map(([key, value]) => ({ key, value })) });
    console.log(`✓ text blocks (${missing.length} added)`);
  }

  if ((await db.project.count()) === 0) {
    for (const [i, p] of projects.entries()) {
      await db.project.create({
        data: {
          slug: p.slug,
          title: p.title,
          shortDescription: p.shortDescription,
          role: p.role,
          category: p.category,
          cover: p.cover,
          period: p.period,
          start: p.start,
          end: p.end,
          servicesJson: JSON.stringify(p.services),
          url: p.url,
          featured: p.featured,
          order: p.order ?? i + 1,
          homeTile: p.homeTile,
        },
      });
    }
    console.log(`✓ projects (${projects.length})`);
  }

  if ((await db.experience.count()) === 0) {
    for (const [i, e] of experience.entries()) {
      await db.experience.create({
        data: { company: e.company, role: e.role, period: e.period, markId: e.markId, order: i + 1 },
      });
    }
    console.log(`✓ experience (${experience.length})`);
  }

  if ((await db.socialLink.count()) === 0) {
    for (const [i, s] of site.social.entries()) {
      await db.socialLink.create({ data: { label: s.label, url: s.url, order: i + 1 } });
    }
    console.log(`✓ socials (${site.social.length})`);
  }

  if ((await db.toolItem.count()) === 0) {
    const tools = [
      { label: "Figma", markId: "figma" },
      { label: "Claude", markId: "claude" },
      { label: "ChatGPT", markId: "chatgpt" },
      { label: "Adobe Creative Suite", markId: "adobe" },
    ];
    for (const [i, t] of tools.entries()) {
      await db.toolItem.create({ data: { ...t, order: i + 1 } });
    }
    console.log(`✓ tools (${tools.length})`);
  }

  if ((await db.skillItem.count()) === 0) {
    for (const [i, label] of site.skills.entries()) {
      await db.skillItem.create({ data: { label, order: i + 1 } });
    }
    console.log(`✓ skills (${site.skills.length})`);
  }

  if ((await db.serviceNode.count()) === 0) {
    const services = [
      "UI/UX Design", "Brand Identity Design", "", "",
      "Conversion Focused Landing Pages", "Social Media Posts", "",
      "Web Design", "AI Assisted Frontend Dev", "Brand Strategy", "Branding Expert", "Ad Creatives",
    ];
    for (const [i, label] of services.entries()) {
      await db.serviceNode.create({ data: { label, order: i + 1 } });
    }
    console.log(`✓ services diagram (${services.length} nodes)`);
  }

  console.log("\nDatabase is ready. (The initial revision snapshot is created on the first site/admin request.)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
