"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Link2,
  Wrench,
  Sparkles,
  Users,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { api } from "@/lib/admin/client";
import { friendlyUploadError, uploadMedia } from "@/lib/admin/upload";

/**
 * Page Content — every editable string and image on the site:
 *  General: identity + contact + the four images + copyright line
 *  About:   hero copy, paragraphs, badge, footer line, services diagram
 *  Work:    heading + subheading
 *  Lists:   tools, skills, social links (instant save per action)
 */

interface SiteForm {
  name: string;
  role: string;
  bioLead: string;
  bio: string;
  email: string;
  location: string;
  resumeUrl: string;
  openToWork: boolean;
  avatarPath: string;
  portraitPath: string;
  signaturePath: string;
  artworkPath: string;
}

interface ToolRow {
  id: string;
  label: string;
  markId: string;
}
interface SkillRow {
  id: string;
  label: string;
}
interface SocialRow {
  id: string;
  label: string;
  url: string | null;
}

const IMAGE_FIELDS = [
  { key: "avatarPath" as const, title: "Profile picture", desc: "Sidebar avatar (small square)" },
  { key: "portraitPath" as const, title: "Portrait", desc: "About page sign-off photo" },
  { key: "signaturePath" as const, title: "Signature", desc: "Handwritten sign-off image" },
  { key: "artworkPath" as const, title: "Sidebar artwork", desc: "Bottom-left line-art illustration" },
];

const TOOL_MARKS = ["figma", "claude", "chatgpt", "adobe"] as const;

export default function AdminContentPage() {
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<SiteForm | null>(null);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [serviceLabels, setServiceLabels] = useState<string[]>(Array(12).fill(""));
  const [savingSite, setSavingSite] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [savingWork, setSavingWork] = useState(false);

  const [tools, setTools] = useState<ToolRow[]>([]);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [socials, setSocials] = useState<SocialRow[]>([]);
  const [newTool, setNewTool] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [newSocial, setNewSocial] = useState({ label: "", url: "" });
  const [uploadingResume, setUploadingResume] = useState(false);
  const resumeRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [siteRes, textsRes, toolsRes, skillsRes, socialsRes, servicesRes] = await Promise.all([
        api<{ site: SiteForm }>("/api/admin/site"),
        api<{ texts: Record<string, string> }>("/api/admin/texts"),
        api<{ items: ToolRow[] }>("/api/admin/tools"),
        api<{ items: SkillRow[] }>("/api/admin/skills"),
        api<{ items: SocialRow[] }>("/api/admin/socials"),
        api<{ items: { id: string; label: string }[] }>("/api/admin/services"),
      ]);
      setSite(siteRes.site);
      setTexts(textsRes.texts);
      setServiceLabels(
        Array.from({ length: 12 }, (_, i) => servicesRes.items[i]?.label ?? ""),
      );
      setTools(toolsRes.items);
      setSkills(skillsRes.items);
      setSocials(socialsRes.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setText(key: string, value: string) {
    setTexts((prev) => ({ ...prev, [key]: value }));
  }

  // ————————————————————————————————————————
  // Savers
  // ————————————————————————————————————————

  async function saveSite() {
    if (!site) return;
    if (!site.name.trim() || !site.role.trim() || !site.email.trim()) {
      toast.error("Name, role and email are required.");
      return;
    }
    setSavingSite(true);
    try {
      const payload = { ...site, resumeUrl: site.resumeUrl?.trim() || null };
      const res = await api<{ site: SiteForm }>("/api/admin/site", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSite(res.site);
      toast.success("Personal details saved — live on the site now.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingSite(false);
    }
  }

  async function saveTexts(keys: string[], label: string, setBusy: (v: boolean) => void) {
    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      for (const key of keys) payload[key] = texts[key] ?? "";
      await api("/api/admin/texts", { method: "PUT", body: JSON.stringify(payload) });
      toast.success(label);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveServices() {
    setSavingAbout(true);
    try {
      await api("/api/admin/services", {
        method: "PATCH",
        body: JSON.stringify({ labels: serviceLabels }),
      });
      toast.success("Services diagram saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingAbout(false);
    }
  }

  // ————————————————————————————————————————
  // List helpers (instant save)
  // ————————————————————————————————————————

  async function addTool() {
    const label = newTool.trim();
    if (!label) return;
    try {
      await api("/api/admin/tools", {
        method: "POST",
        body: JSON.stringify({ label, markId: "figma" }),
      });
      setNewTool("");
      await load();
      toast.success(`Tool “${label}” added.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add.");
    }
  }

  async function updateTool(row: ToolRow, patch: Partial<ToolRow>) {
    try {
      await api(`/api/admin/tools/${row.id}`, { method: "PUT", body: JSON.stringify(patch) });
      setTools((prev) => prev.map((t) => (t.id === row.id ? { ...t, ...patch } : t)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    }
  }

  async function moveList(
    resource: "tools" | "skills" | "socials",
    list: Array<{ id: string }>,
    setList: (rows: Array<{ id: string }>) => void,
    index: number,
    direction: -1 | 1,
  ) {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setList(next);
    try {
      await api(`/api/admin/${resource}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ ids: next.map((r) => r.id) }),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed.");
      await load();
    }
  }

  async function deleteRow(resource: string, id: string, label: string) {
    try {
      await api(`/api/admin/${resource}/${id}`, { method: "DELETE" });
      toast.success(`${label} removed. (Restorable from Settings → History.)`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  async function addSkill() {
    const label = newSkill.trim();
    if (!label) return;
    try {
      await api("/api/admin/skills", { method: "POST", body: JSON.stringify({ label }) });
      setNewSkill("");
      await load();
      toast.success(`Skill “${label}” added.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add.");
    }
  }

  async function addSocial() {
    const label = newSocial.label.trim();
    if (!label) return;
    try {
      await api("/api/admin/socials", {
        method: "POST",
        body: JSON.stringify({ label, url: newSocial.url.trim() || null }),
      });
      setNewSocial({ label: "", url: "" });
      await load();
      toast.success(`Social link “${label}” added.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add.");
    }
  }

  async function updateSocial(row: SocialRow, patch: Partial<SocialRow>) {
    try {
      await api(`/api/admin/socials/${row.id}`, { method: "PUT", body: JSON.stringify(patch) });
      setSocials((prev) => prev.map((s) => (s.id === row.id ? { ...s, ...patch } : s)));
      toast.success("Social link updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    }
  }

  async function uploadResume(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Resume must be a PDF (or an image).");
      return;
    }
    setUploadingResume(true);
    try {
      // uploads straight to Supabase Storage (images compressed in-browser)
      const res = await uploadMedia(file);
      setSite((prev) => (prev ? { ...prev, resumeUrl: res.url } : prev));
      toast.success("Resume uploaded — click Save General Details to apply it.");
    } catch (e) {
      toast.error(friendlyUploadError(e, "Resume upload"));
    } finally {
      setUploadingResume(false);
      if (resumeRef.current) resumeRef.current.value = "";
    }
  }

  if (loading || !site) {
    return (
      <div className="flex h-64 items-center justify-center text-soft" role="status">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading content…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Page Content</h1>
        <p className="mt-1 text-sm text-body">
          Every word and image on the site — edits go live the moment you save.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-badge p-1 sm:w-max">
          <TabsTrigger value="general" className="px-4 py-2 text-[13px]">General</TabsTrigger>
          <TabsTrigger value="about" className="px-4 py-2 text-[13px]">About Page</TabsTrigger>
          <TabsTrigger value="work" className="px-4 py-2 text-[13px]">Work Page</TabsTrigger>
          <TabsTrigger value="lists" className="px-4 py-2 text-[13px]">Tools, Skills &amp; Socials</TabsTrigger>
        </TabsList>

        {/* ————————————————— GENERAL ————————————————— */}
        <TabsContent value="general" className="mt-5">
          <div className="grid gap-5">
            <Card className="rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-ink">Identity &amp; contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="s-name">Name *</Label>
                    <Input id="s-name" value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="s-role">Role / title *</Label>
                    <Input id="s-role" value={site.role} onChange={(e) => setSite({ ...site, role: e.target.value })} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="s-biolead">Bio lead word (bold start)</Label>
                  <Input
                    id="s-biolead"
                    value={site.bioLead}
                    onChange={(e) => setSite({ ...site, bioLead: e.target.value })}
                    placeholder="Multi-disciplinary"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="s-bio">Bio (sidebar)</Label>
                  <Textarea
                    id="s-bio"
                    value={site.bio}
                    onChange={(e) => setSite({ ...site, bio: e.target.value })}
                    className="min-h-[88px]"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="s-email">Email *</Label>
                    <Input id="s-email" type="email" value={site.email} onChange={(e) => setSite({ ...site, email: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="s-location">Location</Label>
                    <Input id="s-location" value={site.location} onChange={(e) => setSite({ ...site, location: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="s-resume">Resume (PDF upload or external URL)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="s-resume"
                        value={site.resumeUrl ?? ""}
                        onChange={(e) => setSite({ ...site, resumeUrl: e.target.value })}
                        placeholder="Upload a PDF or paste a https:// link"
                      />
                      <input
                        ref={resumeRef}
                        type="file"
                        accept="application/pdf,image/*"
                        className="sr-only"
                        onChange={(e) => uploadResume(e.target.files)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 shrink-0 gap-2"
                        disabled={uploadingResume}
                        onClick={() => resumeRef.current?.click()}
                      >
                        {uploadingResume ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Upload className="h-4 w-4" aria-hidden="true" />
                        )}
                        Upload PDF
                      </Button>
                    </div>
                    <p className="text-[11px] text-soft">
                      Powers the “View Resume” button. While empty, the button honestly says the
                      resume isn’t available yet.
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 sm:mt-7">
                    <div>
                      <Label htmlFor="s-open" className="text-sm font-medium text-ink">Open to Work badge</Label>
                      <p className="text-xs text-soft">Show the availability badge on About</p>
                    </div>
                    <Switch id="s-open" checked={site.openToWork} onCheckedChange={(v) => setSite({ ...site, openToWork: v })} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="s-copyright">Footer copyright line</Label>
                  <Input
                    id="s-copyright"
                    value={texts["footer.copyright"] ?? ""}
                    onChange={(e) => setText("footer.copyright", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-ink">Images</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {IMAGE_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-4 rounded-xl border border-line bg-badge/40 p-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                      <Image src={site[field.key]} alt="" fill sizes="80px" className="object-contain" unoptimized />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{field.title}</p>
                      <p className="mb-2 truncate text-xs text-soft">{field.desc}</p>
                      <MediaPicker
                        current={site[field.key]}
                        onChange={(url) => setSite({ ...site, [field.key]: url })}
                        label="Replace"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveSite} disabled={savingSite} className="h-11 gap-2 px-6">
                {savingSite ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden="true" /> Save General Details
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ————————————————— ABOUT ————————————————— */}
        <TabsContent value="about" className="mt-5">
          <div className="grid gap-5">
            <Card className="rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-ink">About page copy</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="t-badge">Badge text</Label>
                    <Input id="t-badge" value={texts["about.badge"] ?? ""} onChange={(e) => setText("about.badge", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="t-exphead">Experience heading</Label>
                    <Input id="t-exphead" value={texts["about.experienceHeading"] ?? ""} onChange={(e) => setText("about.experienceHeading", e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="t-herobold">Hero bold word</Label>
                    <Input id="t-herobold" value={texts["about.hero.bold"] ?? ""} onChange={(e) => setText("about.hero.bold", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="t-herorest">Hero sentence (the gray part)</Label>
                    <Input id="t-herorest" value={texts["about.hero.rest"] ?? ""} onChange={(e) => setText("about.hero.rest", e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="t-p1">Paragraph 1</Label>
                  <Textarea id="t-p1" value={texts["about.p1"] ?? ""} onChange={(e) => setText("about.p1", e.target.value)} className="min-h-[88px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="t-p2">Paragraph 2</Label>
                  <Textarea id="t-p2" value={texts["about.p2"] ?? ""} onChange={(e) => setText("about.p2", e.target.value)} className="min-h-[88px]" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="t-connect">Footer connect line</Label>
                  <Input id="t-connect" value={texts["about.connectLine"] ?? ""} onChange={(e) => setText("about.connectLine", e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="t-ameta">Meta description (search engines)</Label>
                  <Textarea id="t-ameta" value={texts["about.metaDescription"] ?? ""} onChange={(e) => setText("about.metaDescription", e.target.value)} className="min-h-[64px]" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-ink">Services network diagram</CardTitle>
                <p className="text-sm text-body">
                  The 12 nodes on the About page, in reading order. Nodes 3, 4 and 7 are the solid
                  blocks — leave them empty to keep them clean.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {serviceLabels.map((label, i) => {
                  const solid = i === 2 || i === 3 || i === 6;
                  return (
                    <div key={i} className="flex flex-col gap-1.5">
                      <Label htmlFor={`svc-${i}`} className={solid ? "text-soft" : ""}>
                        Node {i + 1} {solid ? "· solid block" : ""}
                      </Label>
                      <Input
                        id={`svc-${i}`}
                        value={label}
                        disabled={solid}
                        onChange={(e) =>
                          setServiceLabels((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                        }
                        placeholder={solid ? "(solid — no text)" : "Service name"}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={saveServices} disabled={savingAbout} className="h-11 gap-2">
                <Save className="h-4 w-4" aria-hidden="true" /> Save Diagram Only
              </Button>
              <Button
                onClick={async () => {
                  await saveTexts(
                    ["about.badge", "about.hero.bold", "about.hero.rest", "about.p1", "about.p2", "about.experienceHeading", "about.connectLine", "about.metaDescription"],
                    "About page text saved.",
                    setSavingAbout,
                  );
                  await saveServices();
                }}
                disabled={savingAbout}
                className="h-11 gap-2 px-6"
              >
                {savingAbout ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden="true" /> Save About Page
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ————————————————— WORK ————————————————— */}
        <TabsContent value="work" className="mt-5">
          <Card className="rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-ink">Work page copy</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="t-whead">Heading</Label>
                <Input id="t-whead" value={texts["work.heading"] ?? ""} onChange={(e) => setText("work.heading", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="t-wsub">Subheading</Label>
                <Input id="t-wsub" value={texts["work.subheading"] ?? ""} onChange={(e) => setText("work.subheading", e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="t-wmeta">Meta description (search engines)</Label>
                <Textarea id="t-wmeta" value={texts["work.metaDescription"] ?? ""} onChange={(e) => setText("work.metaDescription", e.target.value)} className="min-h-[64px]" />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => saveTexts(["work.heading", "work.subheading", "work.metaDescription"], "Work page text saved.", setSavingWork)}
                  disabled={savingWork}
                  className="h-11 gap-2 px-6"
                >
                  {savingWork ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" aria-hidden="true" /> Save Work Page
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ————————————————— LISTS ————————————————— */}
        <TabsContent value="lists" className="mt-5">
          <ScrollArea className="pr-3">
            <div className="grid gap-5">
              {/* tools */}
              <Card className="rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-ink">
                    <Wrench className="h-4 w-4 text-brand" aria-hidden="true" /> Tools (sidebar)
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {tools.map((tool, index) => (
                    <div key={tool.id} className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-col">
                        <Button variant="ghost" size="icon" aria-label="Move up" className="h-6 w-6" disabled={index === 0} onClick={() => moveList("tools", tools, setTools, index, -1)}>
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Move down" className="h-6 w-6" disabled={index === tools.length - 1} onClick={() => moveList("tools", tools, setTools, index, 1)}>
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                      <Input
                        aria-label="Tool name"
                        value={tool.label}
                        className="h-10 min-w-40 flex-1"
                        onBlur={(e) => e.target.value !== tool.label && updateTool(tool, { label: e.target.value })}
                        defaultValue={tool.label}
                        key={`tool-name-${tool.id}`}
                      />
                      <Select value={tool.markId} onValueChange={(v) => updateTool(tool, { markId: v })}>
                        <SelectTrigger className="h-10 w-40" aria-label="Tool mark">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TOOL_MARKS.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${tool.label}`} className="h-10 w-10 text-red-500 hover:text-red-600" onClick={() => deleteRow("tools", tool.id, `Tool “${tool.label}”`)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 border-t border-line pt-3">
                    <Input
                      aria-label="New tool name"
                      value={newTool}
                      onChange={(e) => setNewTool(e.target.value)}
                      placeholder="Add a tool…"
                      className="h-10 min-w-40 flex-1"
                      onKeyDown={(e) => e.key === "Enter" && addTool()}
                    />
                    <Button variant="outline" className="h-10 gap-1.5" onClick={addTool} disabled={!newTool.trim()}>
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* skills */}
              <Card className="rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-ink">
                    <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" /> Skills (sidebar)
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span key={skill.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pl-3 pr-1.5 text-[13px] text-ink">
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brand" />
                        {skill.label}
                        <span className="flex">
                          <Button variant="ghost" size="icon" aria-label={`Move ${skill.label} up`} className="h-6 w-6" disabled={index === 0} onClick={() => moveList("skills", skills, setSkills, index, -1)}>
                            <ChevronUp className="h-3 w-3" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`Move ${skill.label} down`} className="h-6 w-6" disabled={index === skills.length - 1} onClick={() => moveList("skills", skills, setSkills, index, 1)}>
                            <ChevronDown className="h-3 w-3" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`Remove ${skill.label}`} className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => deleteRow("skills", skill.id, `Skill “${skill.label}”`)}>
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 border-t border-line pt-3">
                    <Input
                      aria-label="New skill name"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Add a skill…"
                      className="h-10 min-w-40 flex-1"
                      onKeyDown={(e) => e.key === "Enter" && addSkill()}
                    />
                    <Button variant="outline" className="h-10 gap-1.5" onClick={addSkill} disabled={!newSkill.trim()}>
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* socials */}
              <Card className="rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-ink">
                    <Users className="h-4 w-4 text-brand" aria-hidden="true" /> Social links
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {socials.map((social, index) => (
                    <div key={social.id} className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-col">
                        <Button variant="ghost" size="icon" aria-label="Move up" className="h-6 w-6" disabled={index === 0} onClick={() => moveList("socials", socials, setSocials, index, -1)}>
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Move down" className="h-6 w-6" disabled={index === socials.length - 1} onClick={() => moveList("socials", socials, setSocials, index, 1)}>
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                      <Input
                        aria-label="Social label"
                        defaultValue={social.label}
                        key={`soc-label-${social.id}`}
                        className="h-10 w-36"
                        onBlur={(e) => e.target.value !== social.label && updateSocial(social, { label: e.target.value })}
                      />
                      <div className="relative min-w-52 flex-1">
                        <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" aria-hidden="true" />
                        <Input
                          aria-label="Social URL"
                          defaultValue={social.url ?? ""}
                          key={`soc-url-${social.id}`}
                          className="h-10 pl-9"
                          placeholder="https://… (empty = shown but not linked)"
                          onBlur={(e) => e.target.value !== (social.url ?? "") && updateSocial(social, { url: e.target.value || null })}
                        />
                      </div>
                      <Button variant="ghost" size="icon" aria-label={`Remove ${social.label}`} className="h-10 w-10 text-red-500 hover:text-red-600" onClick={() => deleteRow("socials", social.id, `Social link “${social.label}”`)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <Input
                      aria-label="New social label"
                      value={newSocial.label}
                      onChange={(e) => setNewSocial({ ...newSocial, label: e.target.value })}
                      placeholder="Label (e.g. Dribbble)"
                      className="h-10 w-36"
                    />
                    <Input
                      aria-label="New social URL"
                      value={newSocial.url}
                      onChange={(e) => setNewSocial({ ...newSocial, url: e.target.value })}
                      placeholder="https://…"
                      className="h-10 min-w-52 flex-1"
                      onKeyDown={(e) => e.key === "Enter" && addSocial()}
                    />
                    <Button variant="outline" className="h-10 gap-1.5" onClick={addSocial} disabled={!newSocial.label.trim()}>
                      <Plus className="h-4 w-4" aria-hidden="true" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-soft">
                List changes save instantly — every add, remove and reorder is snapshotted to History.
              </p>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
