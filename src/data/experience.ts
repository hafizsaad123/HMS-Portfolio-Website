/**
 * Work experience entries — exactly as supplied on the About page exports
 * (company, role, dates). Used by the About page cards.
 */

export type CompanyMarkId =
  | "ai-matterz"
  | "uplynk-pk"
  | "surplus-pakistan"
  | "novelops"
  | "count3"
  | "simulationsx";

export interface Experience {
  company: string;
  role: string;
  period: string;
  /** Company website (null → plain text, no link). */
  url?: string | null;
  /** Stable id for the geometric mark (see CompanyMark.tsx). */
  markId: CompanyMarkId;
}

export const experience: Experience[] = [
  { company: "AI Matterz", role: "Founding Designer", period: "Dec 2025 - Present", markId: "ai-matterz", url: "https://aimatterz.io/" },
  { company: "Uplynk.pk", role: "Founding Designer", period: "Oct 2025 - May 2026", markId: "uplynk-pk", url: "https://uplynk.pk/" },
  { company: "Surplus Pakistan", role: "Visual Graphic Designer", period: "Oct 2025 - Present", markId: "surplus-pakistan", url: "https://surplus.com.pk/" },
  { company: "NovelOPS PVT LTD", role: "UI/UX Designer", period: "Dec 2025 - Present", markId: "novelops", url: "https://novelops.com.pk/" },
  { company: "Count3", role: "Founding Designer", period: "Oct 2025 - May 2026", markId: "count3", url: "https://count3.pk/" },
  { company: "SimulationsX", role: "Creative Graphic Designer", period: "Oct 2025 - May 2026", markId: "simulationsx", url: "https://simulationsx.com/" },
];
