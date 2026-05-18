import { useState } from "react"
import { signOut } from "firebase/auth"
import { auth } from "./firebase"

function ToDoList() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState("")

  function addTask(event) {
    event.preventDefault()
    if (newTask.trim() !== "") {
      setTasks([...tasks, { text: newTask, done: false }])
      setNewTask("")
    }
  }

  function toggleTaskDone(index) {
    const updated = [...tasks]
    updated[index].done = !updated[index].done
    setTasks(updated)
  }

  function deleteTask(index) {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  return (
    <div className="to-do-list">
      <h1>Locked-In</h1>
      <h2>To do list</h2>
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
        style={{ color: "red", position: "absolute", top: 10, left: 10, cursor: "pointer"}}
        >
        Log Out
      </button>
      {tasks.length === 0 && (
        <p style={{ marginTop: 40, color: "grey", textAlign: "center" }}>
          No tasks yet. Add a task to get focused.
        </p>
      )}
      <ol>
        {tasks.map((task, index) => (
          <li key={index}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTaskDone(index)}
            />
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