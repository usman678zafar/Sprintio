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
} from "lucide-react";

type ThemeMode = "system" | "light";
type Density = "comfortable" | "compact";

type SettingsState = {
  fullName: string;
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

const STORAGE_KEY = "sprintio-settings";

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
      className={`relative h-7 w-12 rounded-full transition ${
        checked ? "bg-primary" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
          checked ? "left-6" : "left-1"
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
      <label className="mb-2 block text-sm font-medium text-slate-600">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
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
    <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-blue-50 p-3 text-primary">{icon}</div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
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
      fullName: session?.user?.name || "Sprintio User",
      title: "Workspace Owner",
      email: session?.user?.email || "",
      timezone: "Asia/Karachi",
      bio: "Leading product delivery, planning milestones, and keeping the workspace aligned.",
      emailUpdates: true,
      desktopAlerts: true,
      workspaceName: "Sprintio Workspace",
      workspaceSlug: "sprintio-workspace",
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
      {
        id: "appearance",
        title: "Appearance",
        keywords: "appearance theme density motion calendar sidebar layout",
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

  const persistSettings = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSavedMessage("Settings saved locally.");
    window.setTimeout(() => setSavedMessage(""), 2400);
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
        <section className="flex flex-col gap-5 rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.04)] lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Workspace Settings
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage your account details, workspace identity, and the way Sprintio
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
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[920px] space-y-6">
            {noMatches ? (
              <div className="rounded-[26px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
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
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-primary">
                            {form.fullName
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <h3 className="mt-4 text-lg font-semibold text-slate-950">
                            {form.fullName}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">{form.title}</p>
                          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-primary">
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
                            <label className="mb-2 block text-sm font-medium text-slate-600">Bio</label>
                            <textarea
                              value={form.bio}
                              onChange={(event) =>
                                setForm((prev) => ({ ...prev, bio: event.target.value }))
                              }
                              rows={4}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                            />
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">Email Updates</p>
                                  <p className="mt-1 text-xs text-slate-500">
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
                            <div className="rounded-2xl border border-slate-200 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">Desktop Alerts</p>
                                  <p className="mt-1 text-xs text-slate-500">
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
                      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                            Live Preview
                          </p>
                          <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-5">
                            <div
                              className={`flex h-16 w-16 items-center justify-center bg-primary text-lg font-semibold text-white ${
                                form.logoStyle === "circle" ? "rounded-full" : "rounded-2xl"
                              }`}
                            >
                              {initials || "SW"}
                            </div>
                            <p className="mt-4 text-lg font-semibold text-slate-950">
                              {form.workspaceName}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              sprintio.app/{form.workspaceSlug || "workspace"}
                            </p>
                          </div>
                        </div>

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
                            <label className="mb-2 block text-sm font-medium text-slate-600">
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
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:ring-4 focus:ring-blue-100"
                            />
                          </div>

                          <div className="rounded-[24px] border border-slate-200 p-4">
                            <p className="text-sm font-medium text-slate-900">Logo Style</p>
                            <div className="mt-3 flex gap-3">
                              {(["rounded", "circle"] as const).map((style) => (
                                <button
                                  key={style}
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({ ...prev, logoStyle: style }))
                                  }
                                  className={`rounded-2xl border px-4 py-2.5 text-sm font-medium capitalize transition ${
                                    form.logoStyle === style
                                      ? "border-primary bg-blue-50 text-primary"
                                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {style}
                                </button>
                              ))}
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                              Accent color stays on the Sprintio blue system already used across the app.
                            </p>
                          </div>
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                )}

                {filteredSections.has("appearance") && (
                  <div id="appearance">
                    <SectionCard
                      title="Appearance"
                      description="Tune the visual density and interaction feel while keeping the product color system consistent."
                      icon={<Paintbrush size={18} />}
                    >
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-[24px] border border-slate-200 p-4">
                              <p className="text-sm font-medium text-slate-900">Theme Preference</p>
                              <div className="mt-3 flex gap-3">
                                {[
                                  { key: "system" as ThemeMode, label: "System", icon: <MonitorCog size={16} /> },
                                  { key: "light" as ThemeMode, label: "Light", icon: <SunMedium size={16} /> },
                                ].map((option) => (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() =>
                                      setForm((prev) => ({ ...prev, themeMode: option.key }))
                                    }
                                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                                      form.themeMode === option.key
                                        ? "border-primary bg-blue-50 text-primary"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    {option.icon}
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-[24px] border border-slate-200 p-4">
                              <p className="text-sm font-medium text-slate-900">Density</p>
                              <div className="mt-3 flex gap-3">
                                {(["comfortable", "compact"] as Density[]).map((density) => (
                                  <button
                                    key={density}
                                    type="button"
                                    onClick={() =>
                                      setForm((prev) => ({ ...prev, density }))
                                    }
                                    className={`rounded-2xl border px-4 py-2.5 text-sm font-medium capitalize transition ${
                                      form.density === density
                                        ? "border-primary bg-blue-50 text-primary"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    {density}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">Reduced Motion</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Minimize animated transitions across the UI.
                                  </p>
                                </div>
                                <Toggle
                                  checked={form.reducedMotion}
                                  onChange={(value) =>
                                    setForm((prev) => ({ ...prev, reducedMotion: value }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">Show Weekends</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Display weekends by default in the calendar workspace.
                                  </p>
                                </div>
                                <Toggle
                                  checked={form.calendarWeekends}
                                  onChange={(value) =>
                                    setForm((prev) => ({ ...prev, calendarWeekends: value }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">Compact Sidebar</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Prefer denser navigation spacing for more room.
                                  </p>
                                </div>
                                <Toggle
                                  checked={form.compactSidebar}
                                  onChange={(value) =>
                                    setForm((prev) => ({ ...prev, compactSidebar: value }))
                                  }
                                />
                              </div>
                            </div>

                            <div className="rounded-[24px] border border-slate-200 p-4">
                              <p className="text-sm font-medium text-slate-900">Calendar Start Day</p>
                              <div className="mt-3 flex gap-3">
                                {(["sunday", "monday"] as const).map((day) => (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() =>
                                      setForm((prev) => ({ ...prev, calendarStartDay: day }))
                                    }
                                    className={`rounded-2xl border px-4 py-2.5 text-sm font-medium capitalize transition ${
                                      form.calendarStartDay === day
                                        ? "border-primary bg-blue-50 text-primary"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                    }`}
                                  >
                                    {day}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                          <div className="flex items-center gap-2 text-primary">
                            <Sparkles size={16} />
                            <p className="text-sm font-semibold">Preview</p>
                          </div>
                          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-slate-900">Interface Mood</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {form.density === "compact"
                                    ? "Denser spacing for more content on screen."
                                    : "Comfortable spacing for calmer scanning."}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-blue-50 p-3 text-primary">
                                {form.themeMode === "light" ? <SunMedium size={18} /> : <MoonStar size={18} />}
                              </div>
                            </div>
                            <div className="mt-4 space-y-3">
                              <div className="rounded-2xl border border-slate-200 px-3 py-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-900">Sidebar spacing</span>
                                  <span className="text-xs text-slate-500">
                                    {form.compactSidebar ? "Compact" : "Standard"}
                                  </span>
                                </div>
                              </div>
                              <div className="rounded-2xl border border-slate-200 px-3 py-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-900">Calendar weekends</span>
                                  <span className="text-xs text-slate-500">
                                    {form.calendarWeekends ? "Visible" : "Hidden"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
}
