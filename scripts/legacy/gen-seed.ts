/**
 * Generates php-backend/api/seed.json — the full content snapshot used by
 * the PHP installer to seed the MySQL database (same format the admin
 * export/import endpoint uses, so it round-trips perfectly).
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const db = new PrismaClient()

function strip<T extends Record<string, any>>(row: T): Record<string, unknown> {
  const { updatedAt: _u, createdAt: _c, ...rest } = row
  return rest as Record<string, unknown>
}

async function main() {
  const [site, texts, projects, experience, socials, tools, skills, services, media] = await Promise.all([
    db.siteConfig.findUnique({ where: { id: 1 } }),
    db.textBlock.findMany(),
    db.project.findMany({ orderBy: { order: 'asc' } }),
    db.experience.findMany({ orderBy: { order: 'asc' } }),
    db.socialLink.findMany({ orderBy: { order: 'asc' } }),
    db.toolItem.findMany({ orderBy: { order: 'asc' } }),
    db.skillItem.findMany({ orderBy: { order: 'asc' } }),
    db.serviceNode.findMany({ orderBy: { order: 'asc' } }),
    db.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } }),
  ])

  const textMap: Record<string, string> = {}
  for (const t of texts) textMap[t.key] = t.value

  const snapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    site: site
      ? {
          name: site.name, role: site.role, bioLead: site.bioLead, bio: site.bio,
          email: site.email, location: site.location, resumeUrl: site.resumeUrl,
          openToWork: site.openToWork, avatarPath: site.avatarPath, portraitPath: site.portraitPath,
          signaturePath: site.signaturePath, artworkPath: site.artworkPath,
        }
      : null,
    texts: textMap,
    projects: projects.map(strip),
    experience: experience.map(strip),
    socials: socials.map(strip),
    tools: tools.map(strip),
    skills: skills.map(strip),
    services: services.map(strip),
    media: media.map(strip),
  }

  writeFileSync('php-backend/api/seed.json', JSON.stringify(snapshot, null, 2))
  console.log('seed.json written:',
    projects.length, 'projects,', experience.length, 'experience,', media.length, 'media,',
    Object.keys(textMap).length, 'texts')
  console.log('resumeUrl:', site?.resumeUrl)
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
