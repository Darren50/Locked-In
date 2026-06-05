import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, database } from "../firebase";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { setDoc, increment } from "firebase/firestore";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./SideBar.css";

function SideBar({user}) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveView] = useState("calendar");
    const [date, setDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ totalFocusMinutes: 0, totalSessions: 0 });

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

    async function addTestSession() {
        const statsDoc = doc(database, "users", user.uid, "stats", "summary");
        await setDoc(
            statsDoc,
            {
                totalFocusMinutes: increment(25),
                totalSessions: increment(1),
                lastSessionAt: new Date().toISOString()
            },
            { merge: true }
        );
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
            return <div className="sidebar-panel">
                <h2>Graphs</h2>
                <p>WIP</p>
            </div>
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