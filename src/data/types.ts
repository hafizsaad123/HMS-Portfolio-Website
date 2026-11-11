/**
 * Public content types — client-safe (no server imports).
 *
 * Shared by the server content layer (src/lib/content.ts), the public
 * client views (which fetch /api/content from the PHP backend in
 * production, or the Next.js route in development) and the admin portal.
 */

import type { Project } from "@/data/projects";

export interface SiteConfigData {
  name: string;
  role: string;
  bioLead: string;
  bio: string;
  email: string;
  location: string;
  resumeUrl: string | null;
  openToWork: boolean;
  avatarPath: string;
  portraitPath: string;
  signaturePath: string;
  artworkPath: string;
  updatedAt?: string;
}

export interface ExperienceData {
  company: string;
  role: string;
  period: string;
  markId: string;
  url: string | null;
}

export interface SocialData {
  label: string;
  url: string | null;
}

export interface ToolData {
  label: string;
  markId: string;
}

export interface ServiceNodeData {
  label: string;
}

/**
 * Everything the public site renders, in one response — served by
 *   GET /api/content
 * (Next.js route in development, the PHP API on the live host).
 */
export interface ContentPayload {
  site: SiteConfigData;
  texts: Record<string, string>;
  projects: Project[];
  experience: ExperienceData[];
  socials: SocialData[];
  tools: ToolData[];
  skills: string[];
  services: ServiceNodeData[];
}
