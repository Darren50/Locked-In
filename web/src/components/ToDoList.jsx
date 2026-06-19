import { useState, useEffect } from "react";
import { database } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { Checkbox } from "@/components/ui/checkbox";

function ToDoList({ user }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");

  useEffect(() => {
    //To load tasks from the database in real time
    if (!user) return;
    const tasksCollection = collection(database, "users", user.uid, "tasks");
    const unsubscribe = onSnapshot(tasksCollection, (snapshot) => {
      const tasksData = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.order - b.order);
      setTasks(tasksData);
    });
    return unsubscribe;
  }, [user]);

  function tasksReference() {
    return collection(database, "users", user.uid, "tasks");
  }

  async function addTask(e) {
    e.preventDefault();
    if (newTask.trim() !== "") {
      const newAdd = crypto.randomUUID();
      await setDoc(doc(tasksReference(), newAdd), {
        text: newTask,
        description: newDesc,
        dueDate: newDueDate,
        dueTime: newDueTime,
        done: false,
        order: tasks.length,
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
      done: !updatedTask.done,
    });
  }

  async function deleteTask(index) {
    const taskToDelete = tasks[index];
    await deleteDoc(doc(tasksReference(), taskToDelete.id));
  }

  async function moveTaskDown(index) {
    if (index < tasks.length - 1) {
      await updateDoc(doc(tasksReference(), tasks[index].id), {
        order: index + 1,
      });
      await updateDoc(doc(tasksReference(), tasks[index + 1].id), {
        order: index,
      });
    }
  }

  async function moveTaskUp(index) {
    if (index > 0) {
      await updateDoc(doc(tasksReference(), tasks[index].id), {
        order: index - 1,
      });
      await updateDoc(doc(tasksReference(), tasks[index - 1].id), {
        order: index,
      });
    }
  }

  function isOverdue(task) {
    if (task.done || !task.dueDate) return false;
    const dueString = `${task.dueDate}T${task.dueTime || "23:59"}`;
    return new Date(dueString) < new Date();
  }

  return (
    <div className="mx-auto max-w-[700px] px-5 pb-20 pt-10 text-left">
      {/* Header */}
      <header className="mb-7 text-center">
        <h1 className="m-0 text-[40px] font-bold text-[#111827]">Locked-In</h1>
        <p className="mt-1 text-[15px] text-[#98a2b3]">
          Stay Focused. Get Things Done.
        </p>
      </header>

      {/* Add task card */}
      <form
        onSubmit={addTask}
        className="mb-7 flex flex-col gap-3 rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0_4px_14px_rgba(0,0,0,0.05)]"
        style={{ animation: "todoFadeUp 0.5s ease both" }}
      >
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="w-full rounded-lg border border-[#d0d5dd] bg-white px-3.5 py-[11px] text-[15px] font-medium text-[#111827] placeholder:text-[#98a2b3] transition focus:border-[#111827] focus:outline-none focus:ring-[3px] focus:ring-black/[0.08]"
        />
        <input
          type="text"
          placeholder="Add a description (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="w-full rounded-lg border border-[#d0d5dd] bg-white px-3.5 py-[11px] text-sm text-[#111827] placeholder:text-[#98a2b3] transition focus:border-[#111827] focus:outline-none focus:ring-[3px] focus:ring-black/[0.08]"
        />
        <div className="flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-[12px] text-[#98a2b3]">
            Due date
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full rounded-lg border border-[#d0d5dd] bg-white px-3.5 py-[11px] text-sm text-[#111827] transition focus:border-[#111827] focus:outline-none focus:ring-[3px] focus:ring-black/[0.08]"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[12px] text-[#98a2b3]">
            Due time
            <input
              type="time"
              value={newDueTime}
              onChange={(e) => setNewDueTime(e.target.value)}
              className="w-full rounded-lg border border-[#d0d5dd] bg-white px-3.5 py-[11px] text-sm text-[#111827] transition focus:border-[#111827] focus:outline-none focus:ring-[3px] focus:ring-black/[0.08]"
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer whitespace-nowrap rounded-lg bg-[#111827] px-[18px] py-[11px] text-sm font-semibold text-white transition-all hover:-translate-y-px hover:bg-black hover:shadow-[0_6px_18px_rgba(17,24,39,0.25)] active:translate-y-0 active:shadow-none"
          >
            + Add task
          </button>
        </div>
      </form>

      {/* Empty */}
      {tasks.length === 0 && (
        <p className="mt-10 text-center text-[15px] text-[#98a2b3]">
          No tasks yet. Add one above to get focused.
        </p>
      )}

      {/* Task cards */}
      <ul className="m-0 flex list-none flex-col gap-[5px] p-0">
        {tasks.map((task, index) => (
          <li
            key={task.id}
            className={`group flex items-start gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] ${task.done ? "opacity-60" : ""}`}
            style={{
              animation: "todoFadeUp 0.4s ease both",
              animationDelay: `${Math.min(index, 6) * 0.04}s`,
            }}
          >
            <Checkbox
              checked={task.done}
              onCheckedChange={() => toggleTaskDone(index)}
              className="mt-0.5 size-5 rounded-md border-[#d0d5dd] data-[state=checked]:border-[#16a34a] data-[state=checked]:bg-[#16a34a]"
            />

            <div className="min-w-0 flex-1">
              <span
                className={`text-[15px] font-medium ${task.done ? "text-[#98a2b3]" : "text-[#111827]"}`}
              >
                {task.text}
              </span>
              {task.description && (
                <p className="mt-1 text-[13px] text-[#6b7280]">
                  {task.description}
                </p>
              )}
              {(task.dueDate || task.dueTime) && (
                <span
                  className={`mt-2 inline-block rounded-md px-2 py-[3px] text-[12px] ${isOverdue(task) ? "bg-[#fee2e2] font-medium text-[#dc2626]" : "bg-[#e9eaec] text-[#6b7280]"}`}
                >
                  {task.dueDate} {task.dueTime}
                  {isOverdue(task) && " · Overdue"}
                </span>
              )}
            </div>

            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => moveTaskUp(index)}
                title="Move up"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#f3f4f6] text-sm text-[#6b7280] transition-colors hover:bg-[#e5e7eb] hover:text-[#111827]"
              >
                ↑
              </button>
              <button
                onClick={() => moveTaskDown(index)}
                title="Move down"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#f3f4f6] text-sm text-[#6b7280] transition-colors hover:bg-[#e5e7eb] hover:text-[#111827]"
              >
                ↓
              </button>
              <button
                onClick={() => deleteTask(index)}
                title="Delete"
                className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#f3f4f6] text-sm text-[#6b7280] transition-colors hover:bg-[#fee2e2] hover:text-[#dc2626]"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ToDoList;
