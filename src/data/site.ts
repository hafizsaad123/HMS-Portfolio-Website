/**
 * Site-wide configuration and personal information.
 *
 * All values below come from the supplied Figma exports and the links
 * Saad provided. Nothing is invented.
 */

export interface SocialLink {
  label: string;
  /** Real profile URL, as supplied. */
  url: string | null;
}

export const site = {
  name: "Hafiz Muhammad Saad",
  role: "UI/UX Designer & Brand Designer",
  /** Sidebar bio — bold lead word + body, exactly as supplied. */
  bioLead: "Multi-disciplinary",
  bio: "product and visual designer helping ambitious founders and high-growth companies build exceptional digital products — from intuitive SaaS dashboards and mobile apps to distinctive brand system.",
  email: "saad.designs4@gmail.com",
  location: "Karachi, Pakistan",
  /** Social profiles — real URLs supplied by Saad. */
  social: [
    { label: "LinkedIn", url: "https://www.linkedin.com/in/hafizsaad-design" },
    { label: "Instagram", url: "https://www.instagram.com/saad.brandarch/" },
    { label: "Behance", url: "https://www.behance.net/saadnagorigraphics" },
  ] satisfies SocialLink[],
  /**
   * Point this at a hosted resume (e.g. "/resume.pdf" or an external URL)
   * to enable the "View Resume" button. While null, the button opens an
   * honest notice instead of pretending to work.
   */
  resumeUrl: null as string | null,
  tools: ["Figma", "Claude", "ChatGPT", "Adobe Creative Suite"],
  skills: [
    "UI/UX Design",
    "Creative Graphic Design",
    "Branding Expert",
    "AI Assisted Frontend Dev",
    "Social Media Marketer",
    "Web Design",
  ],
  /** Sidebar experience pills — order as supplied in the exports. */
  experience: [
    "NovelOPS",
    "Uplynk.pk",
    "Count3",
    "SimulationsX",
    "Surplus Pakistan",
    "AI Matterz",
  ],
};

export type SiteConfig = typeof site;
