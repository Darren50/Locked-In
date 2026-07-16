import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { database } from "../firebase";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [selectedTask, setSelectedTask] = useState(null);
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
        <h1 className="text-2xl font-bold text-[var(--app-text)]">{label()}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-black/5 p-1 text-sm font-medium dark:bg-white/10">
              {["day", "week", "month"].map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`cursor-pointer rounded-md px-3.5 py-1.5 capitalize transition ${view === v ? "bg-[var(--app-card)] text-blue-600 shadow-sm dark:text-blue-400" : "text-[var(--app-subtle)] hover:bg-[var(--app-card)] hover:text-[var(--app-text)]"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => shift(-1)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-[var(--app-subtle)] transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="h-9 cursor-pointer rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3.5 text-sm font-medium text-[var(--app-text)] transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              Today
            </button>
            <button
              onClick={() => shift(1)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-[var(--app-subtle)] transition hover:bg-black/5 dark:hover:bg-white/10"
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
          onTaskClick={setSelectedTask}
        />
      ) : (
        <div className="flex-1 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
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
                  className={`flex min-h-[480px] flex-col ${i > 0 ? "border-l border-[var(--app-border)]" : ""}`}
                >
                  <div className="flex items-center justify-between border-b border-[var(--app-border)] px-3 py-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                        {day.toLocaleDateString("en-SG", { weekday: "short" })}
                      </span>
                      <span
                        className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-sm font-bold ${isToday ? "bg-blue-600 text-white" : "text-[var(--app-text)]"}`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                    {dayTasks.length > 0 && (
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                    {dayTasks.length === 0 ? (
                      <p className="mt-2 text-center text-xs text-[var(--app-muted)]">
                        Nothing due
                      </p>
                    ) : (
                      dayTasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="w-full cursor-pointer rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2 text-left shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(17,24,39,0.08)]"
                        >
                          <p
                            className={`line-clamp-2 text-[13px] font-semibold ${t.done ? "text-[var(--app-muted)] line-through" : "text-[var(--app-text)]"}`}
                          >
                            {t.text}
                          </p>
                          {t.dueTime && (
                            <span className="mt-1 inline-block rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                              {t.dueTime}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog
        open={!!selectedTask}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="break-words pr-8 text-foreground">
              {selectedTask?.text ?? "Task"}
            </DialogTitle>
          </DialogHeader>
          {selectedTask?.description && (
            <p className="whitespace-pre-wrap break-words text-sm text-[var(--app-subtle)]">
              {selectedTask.description}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {(selectedTask?.dueDate || selectedTask?.dueTime) && (
              <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                {selectedTask?.dueDate}
                {selectedTask?.dueTime ? ` · ${selectedTask.dueTime}` : ""}
              </span>
            )}
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                selectedTask?.done
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-black/5 text-[var(--app-subtle)] dark:bg-white/10"
              }`}
            >
              {selectedTask?.done ? "Completed" : "Pending"}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthGrid({ anchor, tasksForDay, now, onPick, onTaskClick }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = getWeekStart(first);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  return (
    <div className="flex-1 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
      <div className="grid grid-cols-7 border-b border-[var(--app-border)]">
        {DAY_LABELS.map((l) => (
          <div
            key={l}
            className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]"
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
              className={`flex min-h-[96px] cursor-pointer flex-col gap-1 border-[var(--app-border)] bg-[var(--app-card)] p-2 text-left transition hover:bg-black/5 dark:hover:bg-white/5 ${i % 7 !== 0 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${inMonth ? "" : "opacity-40"}`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full text-sm font-semibold ${isToday ? "bg-blue-600 text-white" : "text-[var(--app-text)]"}`}
              >
                {day.getDate()}
              </span>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(t);
                    }}
                    title={
                      t.description ? `${t.text} — ${t.description}` : t.text
                    }
                    className="cursor-pointer truncate rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 transition hover:bg-blue-500/20 dark:text-blue-400"
                  >
                    {t.dueTime ? t.dueTime + " " : ""}
                    {t.text}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] font-semibold text-[var(--app-muted)]">
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
