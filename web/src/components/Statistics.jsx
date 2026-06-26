import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  increment,
  deleteDoc,
} from "firebase/firestore";
import { database } from "../firebase";

export default function StatsView({ user }) {
  const [stats, setStats] = useState({
    totalFocusMinutes: 0,
    totalSessions: 0,
  });
  const [sessions, setSessions] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [manualMins, setManualMins] = useState("");
  const [manualSecs, setManualSecs] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

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
        sessions: daySessions,
        date: dayStart,
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
  const lastSession = sessions.length
    ? sessions.reduce((latest, s) =>
        new Date(s.startedAt) > new Date(latest.startedAt) ? s : latest,
      )
    : null;

  const card =
    "rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-sm";

  /* Time formatting for bar graph */
  function formatShort(totalMinutes) {
    const totalSeconds = Math.round((totalMinutes || 0) * 60);
    if (totalSeconds === 0) return "0m";
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(" ");
  }

  /* Add session functionality */
  async function handleAddSession() {
    if (selectedDay === null) return;
    const mins = parseInt(manualMins) || 0;
    const secs = parseInt(manualSecs) || 0;
    if (mins < 0 || secs < 0) return;
    const totalMins = mins + secs / 60;
    if (totalMins <= 0) return;
    setAdding(true);
    try {
      const dayStart = new Date(week[selectedDay].date);
      const realNow = new Date();
      const stamp = new Date(dayStart);
      stamp.setHours(
        realNow.getHours(),
        realNow.getMinutes(),
        realNow.getSeconds(),
        0,
      );
      const isoStamp = stamp.toISOString();

      const sessionsRef = collection(database, "users", user.uid, "sessions");
      await addDoc(sessionsRef, {
        startedAt: isoStamp,
        durationMinutes: totalMins,
        manual: true,
      });

      const updatePayload = {
        totalFocusMinutes: increment(totalMins),
        totalSessions: increment(1),
      };
      if (!stats.lastSessionAt || isoStamp > stats.lastSessionAt) {
        updatePayload.lastSessionAt = isoStamp;
      }
      await updateDoc(
        doc(database, "users", user.uid, "stats", "summary"),
        updatePayload,
      );

      setManualMins("");
      setManualSecs("");
      setShowManual(false);
    } finally {
      setAdding(false);
    }
  }

  async function deleteSession(session) {
    await deleteDoc(doc(database, "users", user.uid, "sessions", session.id));
    await updateDoc(doc(database, "users", user.uid, "stats", "summary"), {
      totalFocusMinutes: increment(-(session.durationMinutes || 0)),
      totalSessions: increment(-1),
    });
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
          <button
            onClick={() => setShowManual((v) => !v)}
            disabled={selectedDay === null}
            className="cursor-pointer rounded-lg border border-[var(--app-border)] px-3 py-1.5 text-sm font-medium text-[var(--app-text)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5"
          >
            {selectedDay === null
              ? "Select a day to add a session"
              : `Add session for ${week[selectedDay].label}`}
          </button>
        </div>
        {showManual && (
          <div className="mb-4 flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="min"
              value={manualMins}
              onChange={(e) => setManualMins(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSession();
              }}
              className="w-24 rounded-lg border border-[var(--app-field-border)] bg-[var(--app-card)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-blue-500"
            />
            <span className="text-sm text-[var(--app-muted)]"></span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="sec"
              value={manualSecs}
              onChange={(e) => setManualSecs(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSession();
              }}
              className="w-24 rounded-lg border border-[var(--app-field-border)] bg-[var(--app-card)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:border-blue-500"
            />
            <span className="text-sm text-[var(--app-muted)]"></span>
            <button
              onClick={handleAddSession}
              disabled={adding}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? "Saving..." : "Add"}
            </button>
            <button
              onClick={() => {
                setShowManual(false);
                setManualMins("");
                setManualSecs("");
              }}
              className="text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="flex h-[240px] items-end gap-3">
          {week.map((d, i) => {
            const focusPct = (d.focusMinutes / maxMinutes) * 100;
            const isSelected = selectedDay === i;
            return (
              <div
                key={d.label}
                onClick={() => setSelectedDay(isSelected ? null : i)}
                className="group flex h-full flex-1 cursor-pointer flex-col items-center"
              >
                <div className="flex w-full flex-1 flex-col justify-end">
                  <div
                    className={`w-full rounded-t-[3px] transition-all duration-200 ${
                      isSelected
                        ? "bg-blue-400"
                        : "bg-blue-600 group-hover:bg-blue-500"
                    }`}
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

      {selectedDay !== null && (
        <div className="mt-5 border-t border-[var(--app-border)] pt-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">
            {week[selectedDay].label} - {week[selectedDay].sessionCount}{" "}
            {week[selectedDay].sessionCount === 1 ? "session" : "sessions"}
          </h3>
          {week[selectedDay].sessions.length === 0 ? (
            <p className="text-sm text-[var(--app-muted)]">
              No sessions on this day
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {week[selectedDay].sessions.map((s, i) => (
                <li
                  key={s.id}
                  className="group flex items-center justify-between rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm"
                >
                  <span className="text-[var(--app-subtle)]">
                    Session {i + 1} -{" "}
                    {new Date(s.startedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[var(--app-text)]">
                      {formatShort(s.durationMinutes)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteSession(s)}
                      title="Delete"
                      className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-black/5 text-sm text-[var(--app-subtle)] hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 dark:bg-white/10 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {lastSession && (
        <p className="text-xs text-[var(--app-muted)]">
          Last session: {new Date(lastSession.startedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
