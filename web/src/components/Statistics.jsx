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

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-5 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Statistics</h1>
        <p className="mt-0.5 text-sm text-[#98a2b3]">Your focus at a glance.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <div className="text-[34px] font-bold text-blue-600">
            {hours}h {minutes}m
          </div>
          <div className="mt-1 text-sm text-gray-500">Total focused time</div>
        </div>
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
          <div className="text-[34px] font-bold text-blue-600">
            {stats.totalSessions || 0}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Pomodoro sessions completed
          </div>
        </div>
      </div>

      {/* Weekly graph */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#111827]">Weekly Focus</h2>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center">
              <span className="mr-1 inline-block size-2 rounded-sm bg-blue-600"></span>{" "}
              Focus
            </span>
            <span className="flex items-center">
              <span className="mr-1 inline-block size-2 rounded-sm bg-blue-200"></span>{" "}
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
                    className="w-full rounded-t-[3px] bg-blue-200 transition-[height] duration-300"
                    style={{ height: `${breakPct}%` }}
                    title={`Break: ${d.breakMinutes} min`}
                  ></div>
                  <div
                    className="w-full rounded-b-[3px] bg-blue-600 transition-[height] duration-300"
                    style={{ height: `${focusPct}%` }}
                    title={`Focus: ${d.focusMinutes} min · ${d.sessionCount} sessions`}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-500">{d.label}</div>
                <div className="text-[11px] text-gray-900">
                  {d.focusMinutes}m
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {stats.lastSessionAt && (
        <p className="text-xs text-gray-400">
          Last session: {new Date(stats.lastSessionAt).toLocaleString()}
        </p>
      )}

      <button
        onClick={addTestSession}
        className="w-fit cursor-pointer rounded-lg border border-dashed border-blue-600 bg-white px-4 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50"
      >
        + Add test session
      </button>
    </div>
  );
}
