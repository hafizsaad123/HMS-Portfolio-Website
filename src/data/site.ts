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
  /** Home bio — bold dotted-underlined lead + body, exactly as in the design. */
  bioLead: "Brand and UI/UX Designer",
  bio: "who runs the entire design and marketing function of a multi-company group as a solo designer. Over the past year I have delivered brand identities, SaaS landing pages, product UI/UX, ad creatives, video, and social campaigns across **6+ company brands**, working strategy first with a documented brand discovery and positioning process. I design work that looks premium, explains clearly, and converts.",
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
  tools: [
    "Figma",
    "Adobe Photoshop",
    "Adobe Illustrator",
    "Adobe Premier Pro",
    "ChatGPT",
    "Claude",
    "Gemini",
  ],
  skills: [
    "UI/UX Design",
    "Creative Graphic Design",
    "Brand Strategy",
    "AI Assisted Frontend Dev",
    "Video Editing",
    "Web Design",
    "Brand Identity",
    "Logo Design",
  ],
  /** Experience pills — exact order from the approved design. */
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
