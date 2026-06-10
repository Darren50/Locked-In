import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, database } from "../firebase";
import { collection, onSnapshot, doc, setDoc, addDoc, increment} from "firebase/firestore";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./SideBar.css";

function SideBar({user}) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveView] = useState("calendar");
    const [date, setDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ totalFocusMinutes: 0, totalSessions: 0 });
    const [sessions, setSessions] = useState([]);

    useEffect(() => { //To load tasks from the database in real time for the calendar view
        if (!user) return;
        const tasksCollection = collection(database, "users", user.uid, "tasks");
        const unsubscribe = onSnapshot(tasksCollection, (snapshot) => {
            //Sort tasks by their order field so it shows the correct order in calendar view
            const tasksData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.order - b.order);
            setTasks(tasksData);
        });
        return unsubscribe;
    }, [user]);

    useEffect(() => { //To load the focus statistics in real time for the statistics view
        if (!user) return;
        const statsDoc = doc(database, "users", user.uid, "stats", "summary");
        const unsubscribe = onSnapshot(statsDoc, (snapshot) => {
            if (snapshot.exists()) {
                setStats(snapshot.data());
                }
            });
        return unsubscribe;
    }, [user]);

    useEffect(() => { //To load individual Pomodoro sessions for the weekly graph
    if (!user) return;
    const sessionsCollection = collection(database, "users", user.uid, "sessions");
    const unsubscribe = onSnapshot(sessionsCollection, (snapshot) => {
        setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
}, [user]);

    function tasksOnDate(checkDate) { //To filter tasks that are due on the selected date in the calendar view
        const yyyy = checkDate.getFullYear();
        const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
        const dd = String(checkDate.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;
        return tasks.filter(task => task.dueDate === dateString);
    }

    function isOverdue(task) {
        if (task.done || !task.dueDate) return false;
            const dueString = `${task.dueDate}T${task.dueTime || "23:59"}`;
            return new Date(dueString) < new Date();
    }

    function getWeekData() {
        const now = new Date();
        const day = now.getDay();                       //0 = Sun, 1 = Mon, etc.
        const diffToMonday = (day === 0 ? -6 : 1 - day); //Shift back to Monday (or Sunday if today is Sunday)
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
                .filter(s => {
                    const t = new Date(s.startedAt);
                    return t >= dayStart && t < dayEnd;
                })
                .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

            const focusMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

            // Pomodoro breaks: 5 min after each session, 15 min after every 4th
            let breakMinutes = 0;
            daySessions.forEach((s, idx) => {
                breakMinutes += ((idx + 1) % 4 === 0) ? 15 : 5;
            });

            return { label, focusMinutes, breakMinutes, sessionCount: daySessions.length };
        });
    }

    async function addTestSession() {
        //Individual session record for weekly graph
        await addDoc(collection(database, "users", user.uid, "sessions"), {
            startedAt: new Date().toISOString(),
            durationMinutes: 25
        });
        //Summary for statistics
        const statsDoc = doc(database, "users", user.uid, "stats", "summary");
        await setDoc(statsDoc, {
            totalFocusMinutes: increment(25),
            totalSessions: increment(1),
            lastSessionAt: new Date().toISOString()
        }, { merge: true });
    }

    function panel() {
        {/* Placeholder for statistics and graphs views, work in progress */}
        if (activeView === "statistics") {
            const hours = Math.floor((stats.totalFocusMinutes || 0) / 60);
            const minutes = (stats.totalFocusMinutes || 0) % 60;
            return (
                <div className="sidebar-panel">
                    <h2>Statistics</h2>
                    <div className="stat-card">
                        <div className="stat-value">{hours}h {minutes}m</div>
                        <div className="stat-label">Total focused time</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalSessions || 0}</div>
                        <div className="stat-label">Pomodoro sessions completed</div>
                    </div>
                    {stats.lastSessionAt && (
                        <p className="stat-note">
                            Last session: {new Date(stats.lastSessionAt).toLocaleString()}
                        </p>
                    )}
                    <button className="dev-add-session" onClick={addTestSession}>
                        + Add test session
                    </button>
                </div>
            );
        }

        if (activeView === "graphs") {
            const week = getWeekData();
            const maxMinutes = Math.max(60, ...week.map(d => d.focusMinutes + d.breakMinutes));
            return (
                <div className="sidebar-panel">
                    <h2>Weekly Focus</h2>
                    <div className="bar-chart">
                        {week.map(d => {
                            const focusPct = (d.focusMinutes / maxMinutes) * 100;
                            const breakPct = (d.breakMinutes / maxMinutes) * 100;
                            return (
                                <div className="bar-column" key={d.label}>
                                    <div className="bar-stack">
                                        <div className="bar-break" style={{ height: `${breakPct}%` }}
                                            title={`Break: ${d.breakMinutes} min`}></div>
                                        <div className="bar-focus" style={{ height: `${focusPct}%` }}
                                            title={`Focus: ${d.focusMinutes} min · ${d.sessionCount} sessions`}></div>
                                    </div>
                                    <div className="bar-label">{d.label}</div>
                                    <div className="bar-total">{d.focusMinutes}m</div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="chart-legend">
                        <span><span className="legend-swatch focus"></span> Focus</span>
                        <span><span className="legend-swatch break"></span> Break</span>
                    </div>
                    <button className="dev-add-session" onClick={addTestSession}>
                        + Add test session
                    </button>
                </div>
            );
        }

        {/* Calendar view */}
        if (activeView === "calendar") {
            const tasksForSelected = tasksOnDate(date);
            return (
                <div className="sidebar-panel">
                    <h2>Calendar</h2>
                    <Calendar 
                        onChange={setDate} 
                        value={date} 
                        //Used to display a dot indicator on dates that have tasks due
                        tileContent={({ date: tileDate, view }) => { 
                            if (view === "month" && tasksOnDate(tileDate).length > 0) {
                                return <div className="task-indicator"></div>;
                            }
                            return null;
                        }}
                    />
                    <div className="calendar-task-list">
                        <h3>Task(s) on {date.toDateString()}</h3>
                        {tasksForSelected.length === 0 ? (
                            <p>No tasks</p>
                        ) : (
                            <ul>
                                {tasksForSelected.sort((a, b) => (a.dueTime || "").localeCompare(b.dueTime || "")).map(t => (
                                    <li key={t.id} className={isOverdue(t) ? "cal-task overdue" : "cal-task"}>
                                        <strong>{t.text}</strong>
                                        {isOverdue(t) && <span className="overdue-badge">Overdue</span>}
                                        {t.description && <div className="cal-task-desc">{t.description}</div>}
                                        {t.dueTime && <div className="cal-task-time">{t.dueTime}</div>}
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

    return (
        <>
            <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
                <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? "<" : ">"}
                </button>
                {isOpen && (
                    <div className="sidebar-buttons">
                        <button onClick={() => setActiveView("calendar")}>Calendar</button>
                        <button onClick={() => setActiveView("statistics")}>Statistics</button>
                        <button onClick={() => setActiveView("graphs")}>Graphs</button>
                        <button onClick={() => signOut(auth)}>Log out</button>
                    </div>
                )}
            </div>
            {isOpen && panel()}
        </>
    );
}

export default SideBar;