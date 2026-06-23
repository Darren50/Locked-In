import { useState } from "react";
import { Switch } from "@/components/ui/switch";

export default function Settings({
  darkMode,
  setDarkMode,
  wallpaper,
  setWallpaper,
}) {
  const [error, setError] = useState("");

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem("wallpaper", reader.result);
        setWallpaper(reader.result);
        setError("");
      } catch {
        setError(
          "This file exceeds the size limit. The max file size is 5 MB.",
        );
      }
    };
    reader.readAsDataURL(file);
  }

  const card =
    "rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm";

  return (
    <div className="mx-auto flex w-full max-w-[700px] flex-col gap-5 px-6 py-8">
      <h1 className="text-2xl font-bold text-[var(--app-text)]">Settings</h1>

      {/* Dark mode */}
      <div className={`flex items-center justify-between ${card}`}>
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--app-text)]">
            Dark mode
          </h2>
          <p className="mt-0.5 text-[13px] text-[var(--app-muted)]">
            Switch between light and dark themes
          </p>
        </div>
        <Switch checked={darkMode} onCheckedChange={setDarkMode} />
      </div>

      {/* Wallpaper */}
      <div className={card}>
        <h2 className="text-[15px] font-semibold text-[var(--app-text)]">
          Background wallpaper
        </h2>
        <p className="mt-0.5 text-[13px] text-[var(--app-muted)]">
          Upload a custom background for your dashboard
        </p>

        {wallpaper && (
          <div
            className="mt-4 h-32 w-full rounded-xl border border-[var(--app-border)] bg-cover bg-center"
            style={{ backgroundImage: `url(${wallpaper})` }}
          />
        )}

        <div className="mt-4 flex gap-3">
          <label className="cursor-pointer rounded-lg bg-[var(--app-primary)] px-4 py-2 text-sm font-semibold text-[var(--app-primary-text)] transition hover:opacity-90">
            Upload
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
          {wallpaper && (
            <button
              onClick={() => setWallpaper("")}
              className="cursor-pointer rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-2 text-sm font-medium text-[var(--app-text)] transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              Remove
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
