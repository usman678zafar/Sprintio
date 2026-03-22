"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BadgeCheck,
  Building2,
  MonitorCog,
  MoonStar,
  Paintbrush,
  Save,
  Sparkles,
  SunMedium,
  UserRound,
  Camera,
  Loader2,
} from "lucide-react";

type ThemeMode = "system" | "light";
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
      className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-primary" : "bg-slate-200"
        }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] transition ${checked ? "left-6" : "left-1"
          }`}
      />
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] px-4 py-3 text-sm text-neutral-800 dark:text-neutral-200 focus:border-primary focus:ring-4 focus:ring-brand/20 disabled:bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-bg)] disabled:text-slate-400"
      />
    </div>
  );
}

function SectionCard({
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
    <section className="rounded-[26px] border border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-brand/10 dark:bg-brand/5 p-3 text-primary">{icon}</div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const initialState = useMemo<SettingsState>(
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
      themeMode: "light",
      reducedMotion: false,
      calendarWeekends: true,
      compactSidebar: false,
      calendarStartDay: "sunday",
    }),
    [session?.user?.email, session?.user?.name]
  );

  const [form, setForm] = useState<SettingsState>(initialState);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!res.ok) throw new Error("Failed to get presigned URL");

      const { presignedUrl, publicUrl } = await res.json();

      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        throw new Error(`Cloudflare R2 returned ${uploadRes.status}: ${uploadRes.statusText}`);
      }

      setForm((prev) => ({ ...prev, image: publicUrl }));
      setSavedMessage("Photo uploaded. Click Save to apply.");
    } catch (error: any) {
      console.error("Upload failed", error);
      alert(`Failed to upload image. Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;

    if (!stored) {
      setForm(initialState);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<SettingsState>;
      setForm({ ...initialState, ...parsed });
    } catch {
      setForm(initialState);
    }
  }, [initialState]);

  useEffect(() => {
    const handleSearch = (event: Event) => {
      setSearchQuery((event as CustomEvent<string>).detail || "");
    };

    window.addEventListener("settings-search", handleSearch as EventListener);
    return () =>
      window.removeEventListener("settings-search", handleSearch as EventListener);
  }, []);

  const sections = useMemo(
    () => [
      {
        id: "profile",
        title: "User Profile",
        keywords: "profile account name title bio notifications email timezone",
      },
      {
        id: "branding",
        title: "Workspace Branding",
        keywords: "workspace branding logo slug description identity name",
      },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return new Set(sections.map((section) => section.id));

    return new Set(
      sections
        .filter(
          (section) =>
            section.title.toLowerCase().includes(query) ||
            section.keywords.toLowerCase().includes(query)
        )
        .map((section) => section.id)
    );
  }, [searchQuery, sections]);

  const persistSettings = async () => {
    if (typeof window === "undefined") return;
    setIsSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          image: form.image,
        }),
      });

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      setSavedMessage("Settings saved successfully.");
      window.setTimeout(() => setSavedMessage(""), 2400);
    } catch (error) {
      console.error("Failed to save settings to DB", error);
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

  const noMatches = filteredSections.size === 0;

  return (
    <div className="min-h-full bg-[#f6f8fc] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1160px] space-y-6">
        <section className="flex flex-col gap-5 rounded-[26px] border border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Workspace Settings
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
              Manage your account details, workspace identity, and the way Sprinto
              feels day to day.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {savedMessage ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                {savedMessage}
              </span>
            ) : null}
            <button
              type="button"
              onClick={persistSettings}
              disabled={isSaving || isUploading}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[920px] space-y-6">
          {noMatches ? (
            <div className="rounded-[26px] border border-dashed border-neutral-300 dark:border-neutral-700 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] px-6 py-14 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No settings sections match "{searchQuery}".
            </div>
          ) : (
            <>
              {filteredSections.has("profile") && (
                <div id="profile">
                  <SectionCard
                    title="User Profile"
                    description="Control how your identity appears across workspaces and how updates reach you."
                    icon={<UserRound size={18} />}
                  >
                    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                      <div className="rounded-[24px] border border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-bg)] p-5">
                        <div className="relative group mb-4 inline-block">
                          {form.image ? (
                            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] relative">
                              <img src={form.image} alt="Profile Avatar" className="h-full w-full object-cover" />
                              <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                {isUploading ? <Loader2 className="animate-spin text-white" size={24} /> : <Camera className="text-white" size={24} />}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading || isSaving} />
                              </label>
                            </div>
                          ) : (
                            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full overflow-hidden bg-brand/20 dark:bg-brand/30 text-2xl font-semibold text-primary relative">
                              {form.fullName
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                              <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                {isUploading ? <Loader2 className="animate-spin text-white" size={24} /> : <Camera className="text-white" size={24} />}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading || isSaving} />
                              </label>
                            </div>
                          )}
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-950">
                          {form.fullName}
                        </h3>
                        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{form.title}</p>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand/20 dark:bg-brand/30 px-3 py-1 text-xs font-semibold text-primary">
                          <BadgeCheck size={14} />
                          Active Workspace Admin
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input
                            label="Full Name"
                            value={form.fullName}
                            onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
                          />
                          <Input
                            label="Role Title"
                            value={form.title}
                            onChange={(value) => setForm((prev) => ({ ...prev, title: value }))}
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input
                            label="Email Address"
                            value={form.email}
                            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                            disabled
                          />
                          <Input
                            label="Timezone"
                            value={form.timezone}
                            onChange={(value) => setForm((prev) => ({ ...prev, timezone: value }))}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-400">Bio</label>
                          <textarea
                            value={form.bio}
                            onChange={(event) =>
                              setForm((prev) => ({ ...prev, bio: event.target.value }))
                            }
                            rows={4}
                            className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] px-4 py-3 text-sm text-neutral-800 dark:text-neutral-200 focus:border-primary focus:ring-4 focus:ring-brand/20"
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Email Updates</p>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                  Receive planning summaries and due date alerts.
                                </p>
                              </div>
                              <Toggle
                                checked={form.emailUpdates}
                                onChange={(value) =>
                                  setForm((prev) => ({ ...prev, emailUpdates: value }))
                                }
                              />
                            </div>
                          </div>
                          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Desktop Alerts</p>
                                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                  Show immediate reminders for urgent work.
                                </p>
                              </div>
                              <Toggle
                                checked={form.desktopAlerts}
                                onChange={(value) =>
                                  setForm((prev) => ({ ...prev, desktopAlerts: value }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {filteredSections.has("branding") && (
                <div id="branding">
                  <SectionCard
                    title="Workspace Branding"
                    description="Shape the identity your team sees across calendars, dashboards, and project spaces."
                    icon={<Building2 size={18} />}
                  >
                    <div>
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Input
                            label="Workspace Name"
                            value={form.workspaceName}
                            onChange={(value) =>
                              setForm((prev) => ({ ...prev, workspaceName: value }))
                            }
                          />
                          <Input
                            label="Workspace Slug"
                            value={form.workspaceSlug}
                            onChange={(value) =>
                              setForm((prev) => ({
                                ...prev,
                                workspaceSlug: value.toLowerCase().replace(/\s+/g, "-"),
                              }))
                            }
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-400">
                            Workspace Description
                          </label>
                          <textarea
                            value={form.workspaceDescription}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                workspaceDescription: event.target.value,
                              }))
                            }
                            rows={4}
                            className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-[var(--color-light-surface)] dark:bg-[var(--color-dark-surface)] px-4 py-3 text-sm text-neutral-800 dark:text-neutral-200 focus:border-primary focus:ring-4 focus:ring-brand/20"
                          />
                        </div>

                        <div className="rounded-[24px] border border-neutral-200 dark:border-neutral-800 p-4">
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Logo Style</p>
                          <div className="mt-3 flex gap-3">
                            {(["rounded", "circle"] as const).map((style) => (
                              <button
                                key={style}
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({ ...prev, logoStyle: style }))
                                }
                                className={`rounded-2xl border px-4 py-2.5 text-sm font-medium capitalize transition ${form.logoStyle === style
                                  ? "border-primary bg-brand/10 dark:bg-brand/5 text-primary"
                                  : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-bg)]"
                                  }`}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                          <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                            Accent color stays on the Sprinto blue system already used across the app.
                          </p>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}


            </>
          )
          }
        </div>
      </div>
    </div>
  );
}
