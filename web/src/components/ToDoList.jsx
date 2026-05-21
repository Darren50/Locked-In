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

    async function addTask(event) { //Also allows the user to key in due date and time, and description
        event.preventDefault();
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
    
    return (
    <div className = "to-do-list">
        { /* Header and title */ }
        <h1>Locked-In</h1>
        <h2>To do list</h2>

        { /* To key in new tasks, descriptions, due dates and times */ }
        <div>
            <form onSubmit={addTask} className="task-form">

                {/* Task name and description input fields */}
                <div className="task-form-row">
                    <input
                        className="task-input task-name"
                        type="text"
                        placeholder="Enter a task"
                        value={newTask}
                        onChange={(event) => setNewTask(event.target.value)}
                    />
                    <input
                        className="task-input task-description"
                        type="text"
                        placeholder="Description (optional)"
                        value={newDesc}
                        onChange={(event) => setNewDesc(event.target.value)}
                    />
                </div>

                {/* Due date and time input fields */}
                <div className="task-form-row">
                    <label className="task-label">
                        Due date:
                        <input
                            className="task-input task-due-date"
                            type="date"
                            value={newDueDate}
                            onChange={(event) => setNewDueDate(event.target.value)}
                        />
                    </label>    
                    <label className="task-label">
                        Due time:
                        <input
                            className="task-input task-due-time"
                            type="time"
                            value={newDueTime}
                            onChange={(event) => setNewDueTime(event.target.value)}
                        />
                    </label>
                    <button className="add-button">Add</button>
                </div>

            </form>
        </div>

        {/* When there are no tasks, show this message */}
        {tasks.length === 0 && (
            <p className="no-tasks-message">No tasks yet. Add a task to get focused.</p>
        )}

        <ol>
            {tasks.map((task, index) => 
                <li key={index}>
                    <input
                        type="checkbox" 
                        checked={task.done}
                        onChange={() => toggleTaskDone(index)}
                    />

                    <span className={task.done ? "text done" : "text"}>
                        {task.text}
                    </span>

                    {task.description && <p className="description">{task.description}</p>}
                    {(task.dueDate || task.dueTime) && (
                        <div className="task-due">
                            Due: {task.dueDate} {task.dueTime} 
                        </div>
                    )}

                    <button className="delete-button" onClick={() => deleteTask(index)}>Delete</button>
                    <button className="move-button" onClick={() => moveTaskUp(index)}>Move up</button>
                    <button className="move-button" onClick={() => moveTaskDown(index)}>Move down</button>
                </li>
            )}
        </ol>
    </div>
    )
}

export default ToDoList