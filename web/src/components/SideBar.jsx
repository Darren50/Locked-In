import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, database } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./SideBar.css";

function SideBar({user}) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveView] = useState("calendar");
    const [date, setDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);

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

    function tasksOnDate(checkDate) { //To filter tasks that are due on the selected date in the calendar view
        const yyyy = checkDate.getFullYear();
        const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
        const dd = String(checkDate.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;
        return tasks.filter(task => task.dueDate === dateString);
    }

    function panel() {
        {/* Placeholder for statistics and graphs views, work in progress */}
        if (activeView === "statistics") {
            return <div className="sidebar-panel">
                <h2>Statistics</h2>
                <p>WIP</p>
            </div>
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
                                    <li key={t.id}>
                                        <strong>{t.text}</strong>
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