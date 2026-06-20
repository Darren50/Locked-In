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

function SideBar({ user, mainView, setMainView }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState(null);
  const [stats, setStats] = useState({
    totalFocusMinutes: 0,
    totalSessions: 0,
  });
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!user) return;
    const statsDoc = doc(database, "users", user.uid, "stats", "summary");
    const unsubscribe = onSnapshot(statsDoc, (snapshot) => {
      if (snapshot.exists()) setStats(snapshot.data());
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
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
    return null;
  }

  const navBtn =
    "cursor-pointer rounded-md border-none px-3 py-2.5 text-left transition-colors";
  const mainNav = (active) =>
    `${navBtn} ${active ? "bg-blue-600 text-white" : "bg-white text-black hover:bg-gray-300"}`;
  const plainNav = `${navBtn} bg-white text-black hover:bg-gray-300`;

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
              className={mainNav(mainView === "tasks")}
              onClick={() => {
                setMainView("tasks");
                setActiveView(null);
              }}
            >
              Tasks
            </button>
            <button
              className={mainNav(mainView === "calendar")}
              onClick={() => {
                setMainView("calendar");
                setActiveView(null);
              }}
            >
              Calendar
            </button>
            <button
              className={plainNav}
              onClick={() => setActiveView("statistics")}
            >
              Statistics
            </button>
            <button
              className={plainNav}
              onClick={() => setActiveView("graphs")}
            >
              Graphs
            </button>
            <button className={plainNav} onClick={() => signOut(auth)}>
              Log out
            </button>
          </div>
        )}
      </div>
      {isOpen && activeView && panel()}
    </>
  );
}

export default SideBar;
