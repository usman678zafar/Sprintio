"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  BadgeCheck,
  Building2,
  Camera,
  Loader2,
  MonitorCog,
  MoonStar,
  Paintbrush,
  Save,
  SunMedium,
  UserRound,
} from "lucide-react";

type ThemeMode = "system" | "light" | "dark";
type Density = "comfortable" | "compact";

type SettingsState = {
  fullName: string;
  image?: string | null;
  title: string;
  email: string;
  timezone: string;
  bio: string;
  emailUpdates: boolean;
  desktopAlerts: boolean;
  workspaceName: string;
  workspaceSlug: string;
  workspaceDescription: string;
  logoStyle: "rounded" | "circle";
  density: Density;
  themeMode: ThemeMode;
  reducedMotion: boolean;
  calendarWeekends: boolean;
  compactSidebar: boolean;
  calendarStartDay: "sunday" | "monday";
};

const STORAGE_KEY = "sprinto-settings";

function isThemeMode(value?: string): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full border transition ${
        checked ? "border-primary/30 bg-primary" : "border-border-subtle bg-base"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel-surface p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text-base">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ThemeCard({
  mode,
  active,
  title,
  description,
  icon,
  onSelect,
}: {
  mode: ThemeMode;
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onSelect: (mode: ThemeMode) => void;
}) {
  const preview =
    mode === "dark"
      ? "bg-[#1c1b19]"
      : mode === "light"
        ? "bg-[#faf9f5]"
        : "bg-[linear-gradient(135deg,#faf9f5_0%,#faf9f5_49%,#1c1b19_51%,#1c1b19_100%)]";

  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`rounded-[24px] border p-4 text-left transition ${
        active ? "border-primary bg-primary/8" : "border-border-subtle bg-base/60 hover:bg-base"
      }`}
    >
      <div className={`rounded-[18px] border border-border-subtle p-3 ${preview}`}>
        <div className={`rounded-[16px] p-3 ${mode === "dark" ? "bg-[#262624]" : "bg-[#f0eee6]"}`}>
          <div className="h-2.5 w-16 rounded-full bg-primary/80" />
          <div className={`mt-2 h-2 w-10 rounded-full ${mode === "dark" ? "bg-white/25" : "bg-black/10"}`} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className={`h-10 rounded-xl ${mode === "dark" ? "bg-[#141413]" : "bg-white/70"}`} />
            <div className={`h-10 rounded-xl ${mode === "dark" ? "bg-[#141413]" : "bg-[#faf9f5]"}`} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-text-base">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
    </button>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const defaults = useMemo<SettingsState>(
    () => ({
      fullName: session?.user?.name || "Sprinto User",
      image: (session?.user as any)?.image || null,
      title: "Workspace Owner",
      email: session?.user?.email || "",
      timezone: "Asia/Karachi",
      bio: "Leading product delivery, planning milestones, and keeping the workspace aligned.",
      emailUpdates: true,
      desktopAlerts: true,
      workspaceName: "Sprinto Workspace",
      workspaceSlug: "sprinto-workspace",
      workspaceDescription: "Project planning, task execution, and team coordination in one place.",
      logoStyle: "rounded",
      density: "comfortable",
      themeMode: "system",
      reducedMotion: false,
      calendarWeekends: true,
      compactSidebar: false,
      calendarStartDay: "sunday",
    }),
    [session?.user?.email, session?.user?.name, (session?.user as any)?.image]
  );

  const [form, setForm] = useState<SettingsState>(defaults);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) {
      setForm(defaults);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      setForm({
        ...defaults,
        ...parsed,
        themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : defaults.themeMode,
      });
    } catch {
      setForm(defaults);
    }
  }, [defaults]);

  useEffect(() => {
    if (!mounted || !isThemeMode(theme)) return;
    setForm((prev) => (prev.themeMode === theme ? prev : { ...prev, themeMode: theme }));
  }, [mounted, theme]);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      setSearchQuery((event as CustomEvent<string>).detail || "");
    };

    window.addEventListener("settings-search", handleSearch as EventListener);
    return () => window.removeEventListener("settings-search", handleSearch as EventListener);
  }, []);

  const visible = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { profile: true, branding: true, appearance: true };

    return {
      profile: /profile|account|name|bio|email|timezone/.test(query),
      branding: /brand|workspace|slug|logo|description/.test(query),
      appearance: /theme|light|dark|system|motion|density|sidebar|calendar/.test(query),
    };
  }, [searchQuery]);

  const showNothing = !visible.profile && !visible.branding && !visible.appearance;

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");

      const { presignedUrl, publicUrl } = await res.json();
      const put = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) throw new Error("Upload failed");

      setForm((prev) => ({ ...prev, image: publicUrl }));
      setSavedMessage("Photo uploaded. Save to keep it.");
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const saveSettings = async () => {
    if (typeof window === "undefined") return;
    setIsSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.fullName, image: form.image }),
      });

      setTheme(form.themeMode);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      window.localStorage.setItem("sprinto-sidebar-collapsed", form.compactSidebar ? "1" : "0");
      setSavedMessage("Settings saved successfully.");
      window.setTimeout(() => setSavedMessage(""), 2400);
    } catch (error) {
      console.error("Failed to save settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  const initials = form.workspaceName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const themeLabel =
    !mounted || form.themeMode !== "system"
      ? form.themeMode
      : `system (${resolvedTheme === "dark" ? "dark" : "light"})`;

  return (
    <div className="min-h-full bg-base px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1120px] space-y-6">
        <section className="panel-surface flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Workspace Settings
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text-base sm:text-4xl">
              Polish the workspace across light, dark, and system themes.
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted sm:text-base">
              Adjust profile details, workspace identity, and the full appearance system from one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {savedMessage ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                {savedMessage}
              </span>
            ) : null}
            <button type="button" onClick={saveSettings} disabled={isSaving || isUploading} className="btn-primary">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>

        {showNothing ? (
          <div className="panel-surface border-dashed px-6 py-14 text-center text-sm text-muted">
            No settings sections match "{searchQuery}".
          </div>
        ) : (
          <div className="mx-auto max-w-[980px] space-y-6">
            {visible.profile && (
              <Section
                title="User Profile"
                description="Control how your identity appears across the workspace and how updates reach you."
                icon={<UserRound size={18} />}
              >
                <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="rounded-[24px] border border-border-subtle bg-base/70 p-5">
                    <div className="group relative inline-block">
                      {form.image ? (
                        <div className="relative flex h-24 w-24 overflow-hidden rounded-full border border-border-subtle bg-surface">
                          <img src={form.image} alt="Profile avatar" className="h-full w-full object-cover" />
                          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            {isUploading ? <Loader2 size={22} className="animate-spin text-white" /> : <Camera size={22} className="text-white" />}
                            <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={isUploading || isSaving} />
                          </label>
                        </div>
                      ) : (
                        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/14 text-2xl font-semibold text-primary">
                          {form.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                          <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            {isUploading ? <Loader2 size={22} className="animate-spin text-white" /> : <Camera size={22} className="text-white" />}
                            <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} disabled={isUploading || isSaving} />
                          </label>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-text-base">{form.fullName}</h3>
                    <p className="mt-1 text-sm text-muted">{form.title}</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <BadgeCheck size={14} />
                      Active Workspace Admin
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><label className="mb-2 block text-sm font-medium text-muted">Full Name</label><input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} className="field-surface" /></div>
                      <div><label className="mb-2 block text-sm font-medium text-muted">Role Title</label><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="field-surface" /></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><label className="mb-2 block text-sm font-medium text-muted">Email</label><input value={form.email} disabled className="field-surface disabled:bg-base/70 disabled:text-muted" /></div>
                      <div><label className="mb-2 block text-sm font-medium text-muted">Timezone</label><input value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} className="field-surface" /></div>
                    </div>
                    <div><label className="mb-2 block text-sm font-medium text-muted">Bio</label><textarea rows={4} value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} className="field-surface min-h-[120px] resize-none" /></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border-subtle bg-base/60 px-4 py-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-text-base">Email Updates</p><p className="mt-1 text-xs text-muted">Planning summaries and due date alerts.</p></div><Toggle checked={form.emailUpdates} onChange={(value) => setForm((p) => ({ ...p, emailUpdates: value }))} /></div></div>
                      <div className="rounded-2xl border border-border-subtle bg-base/60 px-4 py-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-text-base">Desktop Alerts</p><p className="mt-1 text-xs text-muted">Immediate reminders for urgent work.</p></div><Toggle checked={form.desktopAlerts} onChange={(value) => setForm((p) => ({ ...p, desktopAlerts: value }))} /></div></div>
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {visible.branding && (
              <Section
                title="Workspace Branding"
                description="Shape the identity your team sees across dashboards, projects, and calendars."
                icon={<Building2 size={18} />}
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><label className="mb-2 block text-sm font-medium text-muted">Workspace Name</label><input value={form.workspaceName} onChange={(e) => setForm((p) => ({ ...p, workspaceName: e.target.value }))} className="field-surface" /></div>
                      <div><label className="mb-2 block text-sm font-medium text-muted">Workspace Slug</label><input value={form.workspaceSlug} onChange={(e) => setForm((p) => ({ ...p, workspaceSlug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} className="field-surface" /></div>
                    </div>
                    <div><label className="mb-2 block text-sm font-medium text-muted">Workspace Description</label><textarea rows={4} value={form.workspaceDescription} onChange={(e) => setForm((p) => ({ ...p, workspaceDescription: e.target.value }))} className="field-surface min-h-[120px] resize-none" /></div>
                    <div className="rounded-[24px] border border-border-subtle bg-base/60 p-4">
                      <p className="text-sm font-medium text-text-base">Logo Style</p>
                      <div className="mt-3 flex gap-3">
                        {(["rounded", "circle"] as const).map((style) => (
                          <button key={style} type="button" onClick={() => setForm((p) => ({ ...p, logoStyle: style }))} className={`rounded-2xl border px-4 py-2.5 text-sm font-medium capitalize transition ${form.logoStyle === style ? "border-primary bg-primary/10 text-primary" : "border-border-subtle bg-base/70 text-muted hover:bg-base"}`}>{style}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-border-subtle bg-base/75 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Live Preview</p>
                    <div className="mt-4 rounded-[26px] border border-border-subtle bg-surface p-5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center bg-primary text-sm font-semibold text-white ${form.logoStyle === "circle" ? "rounded-full" : "rounded-2xl"}`}>{initials}</div>
                        <div><h3 className="font-semibold text-text-base">{form.workspaceName}</h3><p className="text-sm text-muted">{form.workspaceSlug}</p></div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-muted">{form.workspaceDescription}</p>
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {visible.appearance && (
              <Section
                title="Appearance"
                description="Tune the theme system, layout density, and interaction feel across the app."
                icon={<Paintbrush size={18} />}
              >
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-text-base">Theme Mode</p>
                      <p className="mt-1 text-sm leading-6 text-muted">Choose light, dark, or let Sprinto follow your operating system.</p>
                    </div>
                    <div className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{themeLabel}</div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <ThemeCard mode="light" active={form.themeMode === "light"} title="Light" description="Warm neutrals with clean contrast." icon={<SunMedium size={16} />} onSelect={(mode) => { setForm((p) => ({ ...p, themeMode: mode })); setTheme(mode); }} />
                    <ThemeCard mode="dark" active={form.themeMode === "dark"} title="Dark" description="Soft charcoal surfaces and quieter glare." icon={<MoonStar size={16} />} onSelect={(mode) => { setForm((p) => ({ ...p, themeMode: mode })); setTheme(mode); }} />
                    <ThemeCard mode="system" active={form.themeMode === "system"} title="System" description="Automatically follow your device theme." icon={<MonitorCog size={16} />} onSelect={(mode) => { setForm((p) => ({ ...p, themeMode: mode })); setTheme(mode); }} />
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[24px] border border-border-subtle bg-base/60 p-5">
                      <p className="text-sm font-medium text-text-base">Density</p>
                      <div className="mt-3 flex gap-3">
                        {(["comfortable", "compact"] as const).map((density) => (
                          <button key={density} type="button" onClick={() => setForm((p) => ({ ...p, density }))} className={`rounded-2xl border px-4 py-2.5 text-sm font-medium capitalize transition ${form.density === density ? "border-primary bg-primary/10 text-primary" : "border-border-subtle bg-base/70 text-muted hover:bg-base"}`}>{density}</button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-border-subtle bg-base/60 p-5">
                      <p className="text-sm font-medium text-text-base">Calendar Start Day</p>
                      <div className="mt-3 flex gap-3">
                        {(["sunday", "monday"] as const).map((day) => (
                          <button key={day} type="button" onClick={() => setForm((p) => ({ ...p, calendarStartDay: day }))} className={`rounded-2xl border px-4 py-2.5 text-sm font-medium capitalize transition ${form.calendarStartDay === day ? "border-primary bg-primary/10 text-primary" : "border-border-subtle bg-base/70 text-muted hover:bg-base"}`}>{day}</button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-border-subtle bg-base/60 p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-text-base">Reduced Motion</p><p className="mt-1 text-xs leading-5 text-muted">Soften transitions and motion-heavy interactions.</p></div><Toggle checked={form.reducedMotion} onChange={(value) => setForm((p) => ({ ...p, reducedMotion: value }))} /></div></div>
                    <div className="rounded-[24px] border border-border-subtle bg-base/60 p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-text-base">Compact Sidebar</p><p className="mt-1 text-xs leading-5 text-muted">Default the desktop shell to the narrow rail.</p></div><Toggle checked={form.compactSidebar} onChange={(value) => setForm((p) => ({ ...p, compactSidebar: value }))} /></div></div>
                  </div>
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
