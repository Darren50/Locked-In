import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  increment,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { database } from "../firebase";
import {
  Flame,
  Clock,
  Timer,
  TrendingUp,
  TrendingDown,
  CalendarCheck,
} from "lucide-react";

/* System testing */
import { formatShort } from "@/lib/time";

const WEEKDAYS = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];

function toDateKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
}

function computeStreak(sessions) {
  const days = new Set(sessions.map((s) => toDateKey(s.startedAt)));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function ProgressRing({ pct }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" className="shrink-0">
      <circle
        cx="27"
        cy="27"
        r={r}
        fill="none"
        strokeWidth="5"
        className="stroke-black/10 dark:stroke-white/10"
      />
      <circle
        cx="27"
        cy="27"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 27 27)"
        className="stroke-blue-600 dark:stroke-blue-400"
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text
        x="27"
        y="27"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-[var(--app-text)]"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        {pct}%
      </text>
    </svg>
  );
}

function weekBounds(offset) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return [monday, nextMonday];
}

function weekTotal(sessions, offset) {
  const [start, end] = weekBounds(offset);
  return sessions
    .filter((s) => {
      const t = new Date(s.startedAt);
      return t >= start && t < end;
    })
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
}

function hourRange(h) {
  const to12 = (x) => (x % 12 === 0 ? 12 : x % 12);
  const period = (x) => (x < 12 ? "am" : "pm");
  const a = h;
  const b = (h + 2) % 24;
  return period(a) === period(b)
    ? `${to12(a)}–${to12(b)}${period(b)}`
    : `${to12(a)}${period(a)}–${to12(b)}${period(b)}`;
}

function focusInsights(sessions) {
  if (!sessions.length) return null;
  const longest = sessions.reduce(
    (m, s) => Math.max(m, s.durationMinutes || 0),
    0,
  );
  const byHour = new Array(24).fill(0);
  const byDay = new Array(7).fill(0);
  for (const s of sessions) {
    const t = new Date(s.startedAt);
    byHour[t.getHours()] += s.durationMinutes || 0;
    byDay[t.getDay()] += s.durationMinutes || 0;
  }
  let peakHour = 0;
  for (let h = 1; h < 24; h++) if (byHour[h] > byHour[peakHour]) peakHour = h;
  let peakDay = 0;
  for (let d = 1; d < 7; d++) if (byDay[d] > byDay[peakDay]) peakDay = d;
  return {
    longest,
    peakHour,
    peakDay,
    hasHourData: byHour[peakHour] > 0,
    thisWeek: weekTotal(sessions, 0),
    lastWeek: weekTotal(sessions, -1),
  };
}

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
  const [weekOffset, setWeekOffset] = useState(0);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

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
    monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);

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
  const weekLabel = `${week[0].date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  })} - ${week[6].date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  })}`;
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
  const dailyGoal = stats.dailyGoalMinutes || 60;
  const todayKey = toDateKey(new Date());
  const todayMinutes = sessions
    .filter((s) => toDateKey(s.startedAt) === todayKey)
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const goalPct =
    dailyGoal > 0
      ? Math.min(100, Math.round((todayMinutes / dailyGoal) * 100))
      : 0;
  const streak = computeStreak(sessions);
  const insights = focusInsights(sessions);
  const weekDelta =
    insights && insights.lastWeek > 0
      ? Math.round(
          ((insights.thisWeek - insights.lastWeek) / insights.lastWeek) * 100,
        )
      : null;

  const card =
    "rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-sm";

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
      await setDoc(
        doc(database, "users", user.uid, "stats", "summary"),
        updatePayload,
        { merge: true },
      );

      setManualMins("");
      setManualSecs("");
      setShowManual(false);
    } finally {
      setAdding(false);
    }
  }

  /* Delete session functionality */
  async function deleteSession(session) {
    await deleteDoc(doc(database, "users", user.uid, "sessions", session.id));
    await setDoc(
      doc(database, "users", user.uid, "stats", "summary"),
      {
        totalFocusMinutes: increment(-(session.durationMinutes || 0)),
        totalSessions: increment(-1),
      },
      { merge: true },
    );
  }

  /* Save daily goal functionality */
  async function saveGoal() {
    const g = parseInt(goalInput);
    if (!g || g <= 0) return;
    await setDoc(
      doc(database, "users", user.uid, "stats", "summary"),
      { dailyGoalMinutes: g },
      { merge: true },
    );
    setEditGoal(false);
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

      {/* Streak */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${card} flex items-center gap-4`}>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
            <Flame className="text-orange-500" size={26} />
          </div>
          <div>
            <div className="text-[28px] font-bold leading-tight text-[var(--app-text)]">
              {streak} {streak === 1 ? "day" : "days"}
            </div>
            <div className="text-sm text-[var(--app-subtle)]">
              {streak > 0
                ? "Current focus streak"
                : "Study today to start a streak"}
            </div>
          </div>
        </div>

        {/* Daily goal */}
        <div className={`${card} flex items-center gap-4`}>
          <ProgressRing pct={goalPct} />
          <div className="flex-1">
            {editGoal ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveGoal();
                  }}
                  className="w-20 rounded-lg border border-[var(--app-field-border)] bg-[var(--app-card)] px-2 py-1.5 text-sm text-[var(--app-text)] outline-none focus:border-blue-500"
                />
                <span className="text-sm text-[var(--app-subtle)]">min</span>
                <button
                  onClick={saveGoal}
                  className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <div className="text-[28px] font-bold leading-tight text-[var(--app-text)]">
                  {formatShort(todayMinutes)}
                  <span className="ml-1 text-sm font-medium text-[var(--app-subtle)]">
                    / {dailyGoal}m today
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-sm text-[var(--app-subtle)]">
                  Daily goal
                  <button
                    onClick={() => {
                      setGoalInput(String(dailyGoal));
                      setEditGoal(true);
                    }}
                    className="cursor-pointer text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Focus insights */}
      <div className={card}>
        <h2 className="mb-4 text-lg font-bold text-[var(--app-text)]">
          Focus Insights
        </h2>
        {insights ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <Clock className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--app-text)]">
                  {insights.hasHourData ? hourRange(insights.peakHour) : "—"}
                </div>
                <div className="text-xs text-[var(--app-subtle)]">
                  Peak focus time
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <Timer className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--app-text)]">
                  {formatShort(insights.longest)}
                </div>
                <div className="text-xs text-[var(--app-subtle)]">
                  Longest session
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                {weekDelta !== null && weekDelta < 0 ? (
                  <TrendingDown
                    className="text-red-600 dark:text-red-400"
                    size={20}
                  />
                ) : (
                  <TrendingUp
                    className={
                      weekDelta === null
                        ? "text-[var(--app-subtle)]"
                        : "text-green-600 dark:text-green-400"
                    }
                    size={20}
                  />
                )}
              </div>
              <div>
                <div
                  className={`text-lg font-bold ${
                    weekDelta === null
                      ? "text-[var(--app-text)]"
                      : weekDelta >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {weekDelta === null
                    ? "—"
                    : `${weekDelta >= 0 ? "+" : ""}${weekDelta}%`}
                </div>
                <div className="text-xs text-[var(--app-subtle)]">
                  This week vs last week
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <CalendarCheck
                  className="text-blue-600 dark:text-blue-400"
                  size={20}
                />
              </div>
              <div>
                <div className="text-lg font-bold text-[var(--app-text)]">
                  {WEEKDAYS[insights.peakDay]}
                </div>
                <div className="text-xs text-[var(--app-subtle)]">
                  Most productive day
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--app-muted)]">
            Log some focus sessions to see your insights.
          </p>
        )}
      </div>

      {/* Weekly graph */}
      <div className={card}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[var(--app-text)]">
              Weekly Focus
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setWeekOffset((v) => v - 1);
                  setSelectedDay(null);
                  setShowManual(false);
                }}
                title="Previous week"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-base text-[var(--app-subtle)] transition hover:bg-black/5 hover:text-[var(--app-text)] dark:hover:bg-white/5"
              >
                ‹
              </button>
              <span className="min-w-[110px] text-center text-sm text-[var(--app-subtle)]">
                {weekLabel}
              </span>
              <button
                onClick={() => {
                  setWeekOffset((v) => v + 1);
                  setSelectedDay(null);
                  setShowManual(false);
                }}
                title="Next week"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md text-base text-[var(--app-subtle)] transition hover:bg-black/5 hover:text-[var(--app-text)] dark:hover:bg-white/5"
              >
                ›
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => {
                    setWeekOffset(0);
                    setSelectedDay(null);
                    setShowManual(false);
                  }}
                  className="ml-1 cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-500/10 dark:text-blue-400"
                >
                  Go to this week
                </button>
              )}
            </div>
          </div>
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
