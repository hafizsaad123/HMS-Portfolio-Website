import { permanentRedirect } from "next/navigation";

// The portfolio is now two pages (Home + Work) — the About page's content
// lives on the home canvas. Old links (search engines, shared URLs) are
// permanently redirected so no visitor ever hits a dead end.
export default function AboutPage() {
  permanentRedirect("/");
}
