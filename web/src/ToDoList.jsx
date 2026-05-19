import { useState, useEffect } from "react"
import { signOut } from "firebase/auth"
import { auth, database } from "./firebase"
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc } from "firebase/firestore"

function ToDoList({ user }) {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState("")

  useEffect(() => { //To load tasks from the database in real time 
    if (!user) return
    const tasksCollection = collection(database, "users", user.uid, "tasks")
    const unsubscribe = onSnapshot(tasksCollection, (snapshot) => {
      const tasksData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setTasks(tasksData)
    })
    return unsubscribe
  }, [user])

  function tasksReference() {
    return collection(database, "users", user.uid, "tasks")
  }

  async function addTask(event) {
    event.preventDefault()
    if (newTask.trim() !== "") {
      const newId = crypto.randomUUID() //Used to generate a unique id for each task for the database and also helps with React's rendering
      await setDoc(doc(tasksReference(), newId), {
        text: newTask,
        done: false,
      })
      setNewTask("")
    }
  }

  async function toggleTaskDone(index) {
    const task = tasks[index]
    await updateDoc(doc(tasksReference(), task.id), { done: !task.done })
  }

  async function deleteTask(index) {
    await deleteDoc(doc(tasksReference(), tasks[index].id))
  }

  return (
    <div className="to-do-list">
      <h1>Locked-In</h1>
      <h2>To do list</h2>
      <div>
        <form onSubmit={addTask}>
          <input
            type="text"
            placeholder="Enter a task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button className="add-button" style={{ marginLeft: "10px", cursor: "pointer" }}>
            Add
          </button>
        </form>
        <button
          className="log-out-button"
          onClick={() => signOut(auth)}
          style={{ color: "red", position: "absolute", top: 10, left: 10, cursor: "pointer" }}
        >
          Log out
        </button>
      </div>

      {/* When there are no tasks, show this message */}
      {tasks.length === 0 && (
        <p style={{ marginTop: 40, color: "grey", textAlign: "center" }}>
          No tasks yet. Add a task to get focused.
        </p>
      )}

      <ol>
        {tasks.map((task, index) => (
          <li key={task.id}>
            <input type="checkbox" checked={task.done} onChange={() => toggleTaskDone(index)} />
            <span
              className="text"
              style={{
                textDecoration: task.done ? "line-through" : "none",
                color: task.done ? "grey" : "white",
                marginLeft: "8px",
              }}
            >
              {task.text}
            </span>
            <button
              className="delete-button"
              onClick={() => deleteTask(index)}
              style={{ marginLeft: "10px", cursor: "pointer" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default ToDoList