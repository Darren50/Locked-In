import { useState, useEffect } from "react"
import { database } from "../firebase";
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc} from "firebase/firestore";
import "./ToDoList.css";

function ToDoList({user}) {
    const[tasks, setTasks] = useState([]);
    const[newTask, setNewTask] = useState("");
    const[newDesc, setNewDesc] = useState("");
    const[newDueDate, setNewDueDate] = useState("");
    const[newDueTime, setNewDueTime] = useState("");

    useEffect(() => { //To load tasks from the database in real time
        if (!user) return;
        const tasksCollection = collection(database, "users", user.uid, "tasks");
        const unsubscribe = onSnapshot(tasksCollection, (snapshot) => {
            const tasksData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.order - b.order);
            setTasks(tasksData);
        })
        return unsubscribe;
    }, [user]);

    function tasksReference() {
        return collection(database, "users", user.uid, "tasks");
    }

    async function addTask(e) { //Also allows the user to key in due date and time, and description
        e.preventDefault();
        if (newTask.trim() !== "") {
            const newAdd = crypto.randomUUID(); //Used to generate a unique id for each task for the database and also helps with React's rendering 
            await setDoc(doc(tasksReference(), newAdd), {
                text: newTask,
                description: newDesc,
                dueDate: newDueDate,
                dueTime: newDueTime,
                done: false,
                order: tasks.length
            });
            setNewTask("");
            setNewDesc("");
            setNewDueDate("");
            setNewDueTime("");
        }
    }

    async function toggleTaskDone(index) {
        const updatedTask = tasks[index];
        await updateDoc(doc(tasksReference(), updatedTask.id), {
            done: !updatedTask.done
        });
    }

    async function deleteTask(index) {
        const taskToDelete = tasks[index];
        await deleteDoc(doc(tasksReference(), taskToDelete.id));
    }

    async function moveTaskDown(index) {
        if (index < tasks.length - 1) {
            await updateDoc(doc(tasksReference(), tasks[index].id), {
                order: index + 1
            });
            await updateDoc(doc(tasksReference(), tasks[index + 1].id), {
                order: index
            });
        }
    }

    async function moveTaskUp(index) {
        if (index > 0) {
            await updateDoc(doc(tasksReference(), tasks[index].id), {
                order: index - 1
            });
            await updateDoc(doc(tasksReference(), tasks[index - 1].id), {
                order: index
            });
        }
    }
    
    function isOverdue(task) {
        if (task.done || !task.dueDate) return false; //Done or no date means not overdue
        const dueString = `${task.dueDate}T${task.dueTime || "23:59"}`; //Default to end of day if no time
        return new Date(dueString) < new Date();
    }

    return (
        <div className="to-do-list">
            {/* Header and subtitle */}
            <header className="todo-header">
                <h1>Locked-In</h1>
                <p className="todo-subtitle">Stay Focused. Get Things Done.</p>
            </header>

            {/* Handle task card */}
            <form onSubmit={addTask} className="task-form">
                <input
                    className="task-input task-name"
                    type="text"
                    placeholder="What needs to be done?"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                />
                <input
                    className="task-input task-description"
                    type="text"
                    placeholder="Add a description (optional)"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                />
                <div className="task-form-row">
                    <label className="task-label">
                        Due date
                        <input className="task-input" type="date" value={newDueDate}
                            onChange={(e) => setNewDueDate(e.target.value)} />
                    </label>
                    <label className="task-label">
                        Due time
                        <input className="task-input" type="time" value={newDueTime}
                            onChange={(e) => setNewDueTime(e.target.value)} />
                    </label>
                    <button className="add-button" type="submit">+ Add task</button>
                </div>
            </form>

            {/* No tasks */}
            {tasks.length === 0 && (
                <p className="no-tasks-message">No tasks yet. Add one above to get focused.</p>
            )}

            {/* Task cards */}
            <ul className="task-list">
                {tasks.map((task, index) => (
                    <li key={task.id} className={`task-card ${task.done ? "done" : ""}`}>
                        <label className="task-check">
                            <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => toggleTaskDone(index)}
                            />
                            <span className="checkmark"></span>
                        </label>

                        <div className="task-content">
                            <span className="task-text">{task.text}</span>
                            {task.description && <p className="task-desc">{task.description}</p>}
                            {(task.dueDate || task.dueTime) && (
                                <span className={isOverdue(task) ? "due-chip overdue" : "due-chip"}>
                                    {task.dueDate} {task.dueTime}
                                    {isOverdue(task) && " · Overdue"}
                                </span>
                            )}
                        </div>

                        <div className="task-actions">
                            <button className="icon-button" onClick={() => moveTaskUp(index)} title="Move up">↑</button>
                            <button className="icon-button" onClick={() => moveTaskDown(index)} title="Move down">↓</button>
                            <button className="icon-button delete" onClick={() => deleteTask(index)} title="Delete">✕</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ToDoList