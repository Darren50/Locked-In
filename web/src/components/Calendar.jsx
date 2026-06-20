import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { database } from "../firebase";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function WeekCalendar({ user }) {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("week");
  const [anchor, setAnchor] = useState(() => getWeekStart(new Date()));
  const now = new Date();

  useEffect(() => {
    if (!user) return;
    const ref = collection(database, "users", user.uid, "tasks");
    const unsubscribe = onSnapshot(ref, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user]);

  function tasksForDay(day) {
    return tasks
      .filter((t) => t.dueDate === toDateStr(day))
      .sort((a, b) => (a.dueTime || "").localeCompare(b.dueTime || ""));
  }

  const weekStart = getWeekStart(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const days = view === "day" ? [anchor] : weekDays;

  function label() {
    if (view === "day")
      return anchor.toLocaleDateString("en-SG", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    if (view === "month")
      return anchor.toLocaleDateString("en-SG", {
        month: "long",
        year: "numeric",
      });
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const opts = { month: "short", day: "numeric" };
    return `${weekStart.toLocaleDateString("en-SG", opts)} – ${end.toLocaleDateString("en-SG", opts)}, ${weekStart.getFullYear()}`;
  }

  function shift(dir) {
    const d = new Date(anchor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * (view === "day" ? 1 : 7));
    setAnchor(d);
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-5 px-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-[#111827]">{label()}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#98a2b3]">Plan your focus sessions.</p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-gray-100 p-1 text-sm font-medium">
              {["day", "week", "month"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`cursor-pointer rounded-md px-3.5 py-1.5 capitalize transition ${view === v ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-500 hover:bg-white/70 hover:text-gray-700"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => shift(-1)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-transparent text-gray-500 transition hover:bg-gray-100"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="h-9 cursor-pointer rounded-lg border border-gray-200 bg-white px-3.5 text-sm font-medium text-[#111827] transition hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => shift(1)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-transparent text-gray-500 transition hover:bg-gray-100"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      {view === "month" ? (
        <MonthGrid
          anchor={anchor}
          tasksForDay={tasksForDay}
          now={now}
          onPick={(d) => {
            setAnchor(d);
            setView("day");
          }}
        />
      ) : (
        <div className="flex-1 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0,1fr))`,
            }}
          >
            {days.map((day, i) => {
              const dayTasks = tasksForDay(day);
              const isToday = day.toDateString() === now.toDateString();
              return (
                <div
                  key={toDateStr(day)}
                  className={`flex min-h-[480px] flex-col ${i > 0 ? "border-l border-[#f3f4f6]" : ""}`}
                >
                  <div className="flex items-center justify-between border-b border-[#f3f4f6] px-3 py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#98a2b3]">
                        {day.toLocaleDateString("en-SG", { weekday: "short" })}
                      </span>
                      <span
                        className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-sm font-bold ${isToday ? "bg-blue-600 text-white" : "text-[#111827]"}`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                    {dayTasks.length > 0 && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-2.5">
                    {dayTasks.length === 0 ? (
                      <p className="mt-2 text-center text-xs text-gray-300">
                        Nothing due
                      </p>
                    ) : (
                      dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(17,24,39,0.08)]"
                        >
                          <p
                            className={`line-clamp-2 text-[13px] font-semibold ${t.done ? "text-gray-400 line-through" : "text-[#111827]"}`}
                          >
                            {t.text}
                          </p>
                          {t.dueTime && (
                            <span className="mt-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-600">
                              {t.dueTime}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthGrid({ anchor, tasksForDay, now, onPick }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = getWeekStart(first);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <div className="flex-1 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-[#f3f4f6]">
        {DAY_LABELS.map((l) => (
          <div
            key={l}
            className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[#98a2b3]"
          >
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayTasks = tasksForDay(day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = day.toDateString() === now.toDateString();
          return (
            <button
              key={toDateStr(day)}
              onClick={() => onPick(day)}
              className={`flex min-h-[96px] cursor-pointer flex-col gap-1 border-[#f3f4f6] bg-white p-2 text-left transition hover:bg-gray-50 ${i % 7 !== 0 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${inMonth ? "" : "opacity-40"}`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full text-sm font-semibold ${isToday ? "bg-blue-600 text-white" : "text-[#111827]"}`}
              >
                {day.getDate()}
              </span>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="truncate rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
                  >
                    {t.dueTime ? t.dueTime + " " : ""}
                    {t.text}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] font-semibold text-gray-400">
                    +{dayTasks.length - 3}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
