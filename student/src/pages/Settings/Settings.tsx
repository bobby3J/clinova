import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import AppShell from "../../components/AppShell";
import BottomNav from "../../components/BottomNav";
import MobileTopBar from "../../components/MobileTopBar";
import Toggle from "../../components/Toggle";
import { ChevronLeftIcon } from "../../components/icons";
import { getSettings, updateSettings } from "../../lib/settings";
import { getSounds } from "../../lib/sounds";
import { ApiError } from "../../types/common";
import type { UserSettings } from "../../types/settings";
import type { Sound } from "../../types/sounds";

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getSettings(), getSounds()])
      .then(([settingsRes, soundsRes]) => {
        setSettings(settingsRes.data);
        setSounds(soundsRes.data);
      })
      .catch(() => {
        setError("Couldn't load your settings. Check your connection and try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await updateSettings(settings);
      setSettings(res.data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell background="bg-gray-50">
      <MobileTopBar />
      <div className="px-5 pt-6 pb-28 lg:px-0 lg:pt-0 lg:pb-0">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/profile" className="text-gray-500">
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800 lg:text-2xl">
            Session Settings
          </h1>
        </div>

        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl bg-gray-100 lg:max-w-md" />
        ) : !settings ? (
          <p className="text-sm text-error-600">{error}</p>
        ) : (
          <form onSubmit={handleSave} className="lg:max-w-md">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-sm">
              <div className="border-b border-gray-100 pb-4">
                <label
                  htmlFor="default_duration_minutes"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Session Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="default_duration_minutes"
                    type="number"
                    min={5}
                    max={180}
                    value={settings.default_duration_minutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_duration_minutes: Number(e.target.value),
                      })
                    }
                    className="h-11 w-24 rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                  />
                  <span className="text-sm text-gray-400">minutes</span>
                </div>
              </div>

              <div className="border-b border-gray-100 py-4">
                <label htmlFor="default_sound_id" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Sound
                </label>
                <select
                  id="default_sound_id"
                  value={settings.default_sound_id ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_sound_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                >
                  <option value="">None</option>
                  {sounds.map((sound) => (
                    <option key={sound.id} value={sound.id}>
                      {sound.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="divide-y divide-gray-100">
                <Toggle
                  checked={settings.auto_breaks}
                  onChange={(v) => setSettings({ ...settings, auto_breaks: v })}
                  label="Auto Breaks"
                  description="Start a break after each session"
                />
                <Toggle
                  checked={settings.notifications_enabled}
                  onChange={(v) => setSettings({ ...settings, notifications_enabled: v })}
                  label="Notifications"
                  description="Get reminded to start a session"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
                {error}
              </div>
            )}
            {saved && !error && (
              <p className="mt-4 text-sm font-medium text-success-600">Saved.</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-6 h-12 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:px-10"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </form>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
