import { useState, useEffect } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { database } from "../firebase";

export default function StatsView({ user }) {
  const [stats, setStats] = useState({
    totalFocusMinutes: 0,
    totalSessions: 0,
  });
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!user) return;
    const statsDoc = doc(database, "users", user.uid, "stats", "summary");
    const unsubscribe = onSnapshot(statsDoc, (snap) => {
      if (snap.exists()) setStats(snap.data());
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ref = collection(database, "users", user.uid, "sessions");
    const unsubscribe = onSnapshot(ref, (snap) => {
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user]);

  function getWeekData() {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + diffToMonday);

    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return labels.map((label, i) => {
      const dayStart = new Date(monday);
      dayStart.setDate(monday.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const daySessions = sessions
        .filter((s) => {
          const t = new Date(s.startedAt);
          return t >= dayStart && t < dayEnd;
        })
        .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

      const focusMinutes = daySessions.reduce(
        (sum, s) => sum + (s.durationMinutes || 0),
        0,
      );
      return {
        label,
        focusMinutes,
        sessionCount: daySessions.length,
      };
    });
  }

  const week = getWeekData();
  const maxMinutes = Math.max(60, ...week.map((d) => d.focusMinutes));
  const totalSeconds = Math.round((stats.totalFocusMinutes || 0) * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const focusLabel =
    hours > 0
      ? `${hours}h ${minutes}m`
      : minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;

  const card =
    "rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-sm";

  function formatShort(totalMinutes) {
    const totalSeconds = Math.round((totalMinutes || 0) * 60);
    if (totalSeconds === 0) return "0m";
    if (totalSeconds < 60) return `${totalSeconds}s`;
    return `${Math.round(totalMinutes)}m`;
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-5 px-6 py-8">
      <h1 className="text-2xl font-bold text-[var(--app-text)]">Statistics</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <div className="text-[34px] font-bold text-blue-600 dark:text-blue-400">
            {focusLabel}
          </div>
          <div className="mt-1 text-sm text-[var(--app-subtle)]">
            Total focused time
          </div>
        </div>
        <div className={card}>
          <div className="text-[34px] font-bold text-blue-600 dark:text-blue-400">
            {stats.totalSessions || 0}
          </div>
          <div className="mt-1 text-sm text-[var(--app-subtle)]">
            Pomodoro sessions completed
          </div>
        </div>
      </div>

      {/* Weekly graph */}
      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--app-text)]">
            Weekly Focus
          </h2>
        </div>
        <div className="flex h-[240px] items-end gap-3">
          {week.map((d) => {
            const focusPct = (d.focusMinutes / maxMinutes) * 100;
            return (
              <div
                key={d.label}
                className="flex h-full flex-1 flex-col items-center"
              >
                <div className="flex w-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-[3px] bg-blue-600 transition-[height] duration-300"
                    style={{ height: `${focusPct}%` }}
                    title={`Focus: ${d.focusMinutes} min · ${d.sessionCount} sessions`}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-[var(--app-subtle)]">
                  {d.label}
                </div>
                <div className="text-[11px] text-[var(--app-text)]">
                  {formatShort(d.focusMinutes)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stats.lastSessionAt && (
        <p className="text-xs text-[var(--app-muted)]">
          Last session: {new Date(stats.lastSessionAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
