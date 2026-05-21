import { useState, useEffect } from "react"
import { database } from "../firebase";
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc} from "firebase/firestore";
import "./ToDoList.css";

function ToDoList({user}) {
    const[tasks, setTasks] = useState([]);
    const[newTask, setNewTask] = useState("");

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

    async function addTask(event) {
        event.preventDefault();
        if (newTask.trim() !== "") {
            const newAdd = crypto.randomUUID(); //Used to generate a unique id for each task for the database and also helps with React's rendering 
            await setDoc(doc(tasksReference(), newAdd), {
                text: newTask,
                done: false,
                order: tasks.length
            });
            setNewTask("");
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
        <h1>Locked-In</h1>
        <h2>To do list</h2>
        <div>
            <form onSubmit={addTask}>
                <input
                    type="text"
                    placeholder="Enter a task"
                    value={newTask}
                    onChange={(event) => setNewTask(event.target.value)}/>
                <button className="add-button">Add</button>  
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