import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./SideBar.css";

function SideBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveView] = useState("calendar");
    const [date, setDate] = useState(new Date());

    function panel() {
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
        if (activeView === "calendar") {
            return (
                <div className="sidebar-panel">
                    <h2>Calendar</h2>
                    <Calendar onChange={setDate} value={date} />
                </div>
            )
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