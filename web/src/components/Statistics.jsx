import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  increment,
} from "firebase/firestore";
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
      let breakMinutes = 0;
      daySessions.forEach((s, idx) => {
        breakMinutes += (idx + 1) % 4 === 0 ? 15 : 5;
      });
      return {
        label,
        focusMinutes,
        breakMinutes,
        sessionCount: daySessions.length,
      };
    });
  }

  async function addTestSession() {
    await addDoc(collection(database, "users", user.uid, "sessions"), {
      startedAt: new Date().toISOString(),
      durationMinutes: 25,
    });
    const statsDoc = doc(database, "users", user.uid, "stats", "summary");
    await setDoc(
      statsDoc,
      {
        totalFocusMinutes: increment(25),
        totalSessions: increment(1),
        lastSessionAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  const week = getWeekData();
  const maxMinutes = Math.max(
    60,
    ...week.map((d) => d.focusMinutes + d.breakMinutes),
  );
  const hours = Math.floor((stats.totalFocusMinutes || 0) / 60);
  const minutes = (stats.totalFocusMinutes || 0) % 60;

  const card =
    "rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-sm";

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-5 px-6 py-8">
      <h1 className="text-2xl font-bold text-[var(--app-text)]">Statistics</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <div className="text-[34px] font-bold text-blue-600 dark:text-blue-400">
            {hours}h {minutes}m
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
          <div className="flex gap-4 text-xs text-[var(--app-subtle)]">
            <span className="flex items-center">
              <span className="mr-1 inline-block size-2 rounded-sm bg-blue-600"></span>{" "}
              Focus
            </span>
            <span className="flex items-center">
              <span className="mr-1 inline-block size-2 rounded-sm bg-blue-500/30"></span>{" "}
              Break
            </span>
          </div>
        </div>
        <div className="flex h-[240px] items-end gap-3">
          {week.map((d) => {
            const focusPct = (d.focusMinutes / maxMinutes) * 100;
            const breakPct = (d.breakMinutes / maxMinutes) * 100;
            return (
              <div
                key={d.label}
                className="flex h-full flex-1 flex-col items-center"
              >
                <div className="flex w-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-[3px] bg-blue-500/30 transition-[height] duration-300"
                    style={{ height: `${breakPct}%` }}
                    title={`Break: ${d.breakMinutes} min`}
                  ></div>
                  <div
                    className="w-full rounded-b-[3px] bg-blue-600 transition-[height] duration-300"
                    style={{ height: `${focusPct}%` }}
                    title={`Focus: ${d.focusMinutes} min · ${d.sessionCount} sessions`}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-[var(--app-subtle)]">
                  {d.label}
                </div>
                <div className="text-[11px] text-[var(--app-text)]">
                  {d.focusMinutes}m
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

      <button
        onClick={addTestSession}
        className="w-fit cursor-pointer rounded-lg border border-dashed border-blue-600 bg-[var(--app-card)] px-4 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400"
      >
        + Add test session
      </button>
    </div>
  );
}
