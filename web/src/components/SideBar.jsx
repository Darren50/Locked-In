import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, database } from "../firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  increment,
} from "firebase/firestore";
import Calendar from "react-calendar";

function SideBar({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState("calendar");
  const [date, setDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    totalFocusMinutes: 0,
    totalSessions: 0,
  });
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    //Tasks
    if (!user) return;
    const tasksCollection = collection(database, "users", user.uid, "tasks");
    const unsubscribe = onSnapshot(tasksCollection, (snapshot) => {
      const tasksData = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.order - b.order);
      setTasks(tasksData);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    //Stats
    if (!user) return;
    const statsDoc = doc(database, "users", user.uid, "stats", "summary");
    const unsubscribe = onSnapshot(statsDoc, (snapshot) => {
      if (snapshot.exists()) setStats(snapshot.data());
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    //Graphs
    if (!user) return;
    const sessionsCollection = collection(
      database,
      "users",
      user.uid,
      "sessions",
    );
    const unsubscribe = onSnapshot(sessionsCollection, (snapshot) => {
      setSessions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, [user]);

  function tasksOnDate(checkDate) {
    const yyyy = checkDate.getFullYear();
    const mm = String(checkDate.getMonth() + 1).padStart(2, "0");
    const dd = String(checkDate.getDate()).padStart(2, "0");
    const dateString = `${yyyy}-${mm}-${dd}`;
    return tasks.filter((task) => task.dueDate === dateString);
  }

  function isOverdue(task) {
    if (task.done || !task.dueDate) return false;
    const dueString = `${task.dueDate}T${task.dueTime || "23:59"}`;
    return new Date(dueString) < new Date();
  }

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

  const panelClass =
    "fixed left-[216px] top-4 z-[9] max-h-[calc(100vh-2rem)] w-80 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 text-[#1f2028] shadow-[0_10px_30px_rgba(0,0,0,0.1)]";
  const statCard =
    "mb-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center";
  const devBtn =
    "mt-4 w-full cursor-pointer rounded-lg border border-dashed border-blue-600 bg-white p-2 text-blue-600 transition-colors hover:bg-blue-50";

  function panel() {
    if (activeView === "statistics") {
      const hours = Math.floor((stats.totalFocusMinutes || 0) / 60);
      const minutes = (stats.totalFocusMinutes || 0) % 60;
      return (
        <div
          className={panelClass}
          style={{ animation: "panelSlideIn 0.25s ease both" }}
        >
          <h2 className="mb-3.5 text-xl font-bold text-[#1f2028]">
            Statistics
          </h2>
          <div className={statCard}>
            <div className="text-[32px] font-bold text-blue-600">
              {hours}h {minutes}m
            </div>
            <div className="mt-1 text-[13px] text-gray-500">
              Total focused time
            </div>
          </div>
          <div className={statCard}>
            <div className="text-[32px] font-bold text-blue-600">
              {stats.totalSessions || 0}
            </div>
            <div className="mt-1 text-[13px] text-gray-500">
              Pomodoro sessions completed
            </div>
          </div>
          {stats.lastSessionAt && (
            <p className="mt-2 text-center text-[12px] text-gray-400">
              Last session: {new Date(stats.lastSessionAt).toLocaleString()}
            </p>
          )}
          <button className={devBtn} onClick={addTestSession}>
            + Add test session
          </button>
        </div>
      );
    }

    if (activeView === "graphs") {
      const week = getWeekData();
      const maxMinutes = Math.max(
        60,
        ...week.map((d) => d.focusMinutes + d.breakMinutes),
      );
      return (
        <div
          className={panelClass}
          style={{ animation: "panelSlideIn 0.25s ease both" }}
        >
          <h2 className="mb-3.5 text-xl font-bold text-[#1f2028]">
            Weekly Focus
          </h2>
          <div className="flex h-[200px] items-end gap-2 px-2 pt-4">
            {week.map((d) => {
              const focusPct = (d.focusMinutes / maxMinutes) * 100;
              const breakPct = (d.breakMinutes / maxMinutes) * 100;
              return (
                <div
                  className="flex h-full flex-1 flex-col items-center"
                  key={d.label}
                >
                  <div className="flex w-full flex-1 flex-col justify-end">
                    <div
                      className="w-full rounded-t-[3px] bg-blue-100 transition-[height] duration-300"
                      style={{ height: `${breakPct}%` }}
                      title={`Break: ${d.breakMinutes} min`}
                    ></div>
                    <div
                      className="w-full rounded-b-[3px] bg-blue-600 transition-[height] duration-300"
                      style={{ height: `${focusPct}%` }}
                      title={`Focus: ${d.focusMinutes} min · ${d.sessionCount} sessions`}
                    ></div>
                  </div>
                  <div className="mt-1.5 text-[12px] text-gray-500">
                    {d.label}
                  </div>
                  <div className="text-[11px] text-gray-900">
                    {d.focusMinutes}m
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-center gap-4 text-[12px] text-gray-500">
            <span className="flex items-center">
              <span className="mr-1 inline-block size-2.5 rounded-sm bg-blue-600"></span>{" "}
              Focus
            </span>
            <span className="flex items-center">
              <span className="mr-1 inline-block size-2.5 rounded-sm bg-blue-100"></span>{" "}
              Break
            </span>
          </div>
          <button className={devBtn} onClick={addTestSession}>
            + Add test session
          </button>
        </div>
      );
    }

    if (activeView === "calendar") {
      const tasksForSelected = tasksOnDate(date);
      return (
        <div
          className={panelClass}
          style={{ animation: "panelSlideIn 0.25s ease both" }}
        >
          <h2 className="mb-3.5 text-xl font-bold text-[#1f2028]">Calendar</h2>
          <Calendar
            onChange={setDate}
            value={date}
            tileContent={({ date: tileDate, view }) => {
              if (view === "month" && tasksOnDate(tileDate).length > 0) {
                return (
                  <div className="mx-auto mt-0.5 h-1.5 w-1.5 rounded-full bg-[#c50c0c]"></div>
                );
              }
              return null;
            }}
          />
          <div className="mt-4 text-left">
            <h3 className="mb-2 text-[15px] font-semibold text-[#1f2028]">
              Task(s) on {date.toDateString()}
            </h3>
            {tasksForSelected.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks</p>
            ) : (
              <ul className="list-none p-0">
                {tasksForSelected
                  .sort((a, b) =>
                    (a.dueTime || "").localeCompare(b.dueTime || ""),
                  )
                  .map((t) => (
                    <li
                      key={t.id}
                      className="border-b border-gray-200 p-2 last:border-b-0"
                    >
                      <strong
                        className={
                          isOverdue(t) ? "text-red-500" : "text-[#1f2028]"
                        }
                      >
                        {t.text}
                      </strong>
                      {isOverdue(t) && (
                        <span className="ml-2 rounded bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          Overdue
                        </span>
                      )}
                      {t.description && (
                        <div className="text-[13px] text-gray-500">
                          {t.description}
                        </div>
                      )}
                      {t.dueTime && (
                        <div className="text-[12px] text-gray-400">
                          {t.dueTime}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  const navBtn =
    "cursor-pointer rounded-md border-none bg-white px-3 py-2.5 text-left text-black transition-colors hover:bg-gray-300";

  return (
    <>
      <div
        className={`fixed left-0 top-0 z-10 h-screen overflow-hidden bg-[#1f2028] text-white transition-[width] duration-300 ${isOpen ? "w-[200px]" : "w-[50px]"}`}
      >
        <button
          className="w-full cursor-pointer border-none bg-transparent p-2.5 text-[18px] text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "<" : ">"}
        </button>
        {isOpen && (
          <div className="flex flex-col gap-2 p-4">
            <button
              className={navBtn}
              onClick={() => setActiveView("calendar")}
            >
              Calendar
            </button>
            <button
              className={navBtn}
              onClick={() => setActiveView("statistics")}
            >
              Statistics
            </button>
            <button className={navBtn} onClick={() => setActiveView("graphs")}>
              Graphs
            </button>
            <button className={navBtn} onClick={() => signOut(auth)}>
              Log out
            </button>
          </div>
        )}
      </div>
      {isOpen && panel()}
    </>
  );
}

export default SideBar;
