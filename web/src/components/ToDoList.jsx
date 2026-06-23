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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Pencil } from "lucide-react";

function ToDoList({ user }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");

  const [editTask, setEditTask] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDueTime, setEditDueTime] = useState("");

  useEffect(() => {
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
    const t = tasks[index];
    await updateDoc(doc(tasksReference(), t.id), { done: !t.done });
  }

  async function deleteTask(index) {
    await deleteDoc(doc(tasksReference(), tasks[index].id));
  }

  function openEdit(task) {
    setEditTask(task);
    setEditText(task.text || "");
    setEditDesc(task.description || "");
    setEditDueDate(task.dueDate || "");
    setEditDueTime(task.dueTime || "");
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (editText.trim() === "") return;
    await updateDoc(doc(tasksReference(), editTask.id), {
      text: editText,
      description: editDesc,
      dueDate: editDueDate,
      dueTime: editDueTime,
    });
    setEditTask(null);
  }

  async function onDragEnd(result) {
    const { source, destination } = result;
    if (!destination || destination.index === source.index) return;
    const reordered = Array.from(tasks);
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);
    setTasks(reordered);
    await Promise.all(
      reordered.map((t, i) =>
        updateDoc(doc(tasksReference(), t.id), { order: i }),
      ),
    );
  }

  function isOverdue(task) {
    if (task.done || !task.dueDate) return false;
    const dueString = `${task.dueDate}T${task.dueTime || "23:59"}`;
    return new Date(dueString) < new Date();
  }

  const commonClass =
    "w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-card)] px-3.5 py-[11px] text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] transition focus:border-[var(--app-text)] focus:outline-none focus:ring-[3px] focus:ring-black/[0.08] dark:focus:ring-white/10";

  const iconBtn =
    "flex size-7 cursor-pointer items-center justify-center rounded-md bg-black/5 text-[var(--app-subtle)] transition-colors hover:bg-black/10 hover:text-[var(--app-text)] dark:bg-white/10 dark:hover:bg-white/20";

  return (
    <div className="mx-auto max-w-[700px] px-5 pb-20 pt-10 text-left">
      <header className="mb-7 text-center">
        <h1 className="m-0 text-[40px] font-bold text-[var(--app-text)]">
          Tasks
        </h1>
      </header>

      <form
        onSubmit={addTask}
        className="mb-7 flex flex-col gap-3 rounded-[14px] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-[0_4px_14px_rgba(0,0,0,0.05)]"
        style={{ animation: "todoFadeUp 0.5s ease both" }}
      >
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className={`${commonClass} text-[15px] font-medium`}
        />
        <input
          type="text"
          placeholder="Add a description (optional)"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className={commonClass}
        />
        <div className="flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-[12px] text-[var(--app-muted)]">
            Due date
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className={commonClass}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[12px] text-[var(--app-muted)]">
            Due time
            <input
              type="time"
              value={newDueTime}
              onChange={(e) => setNewDueTime(e.target.value)}
              className={commonClass}
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer whitespace-nowrap rounded-lg bg-[var(--app-primary)] px-[18px] py-[11px] text-sm font-semibold text-[var(--app-primary-text)] transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-[0_6px_18px_rgba(0,0,0,0.18)] active:translate-y-0 active:shadow-none"
          >
            + Add task
          </button>
        </div>
      </form>

      {tasks.length === 0 && (
        <p className="mt-10 text-center text-[15px] text-[var(--app-muted)]">
          No tasks yet
        </p>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tasks">
          {(provided) => (
            <ul
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="m-0 flex list-none flex-col gap-[5px] p-0"
            >
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(prov, snapshot) => (
                    <li
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className={`group flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-shadow ${snapshot.isDragging ? "shadow-[0_12px_28px_rgba(0,0,0,0.18)]" : ""} ${task.done ? "opacity-60" : ""} cursor-grab active:cursor-grabbing`}
                    >
                      <Checkbox
                        checked={task.done}
                        onCheckedChange={() => toggleTaskDone(index)}
                        className="mt-0.5 size-5 rounded-md border-[var(--app-field-border)] data-[state=checked]:border-[#16a34a] data-[state=checked]:bg-[#16a34a]"
                      />

                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-[15px] font-medium ${task.done ? "text-[var(--app-muted)]" : "text-[var(--app-text)]"}`}
                        >
                          {task.text}
                        </span>
                        {task.description && (
                          <p className="mt-1 text-[13px] text-[var(--app-subtle)]">
                            {task.description}
                          </p>
                        )}
                        {(task.dueDate || task.dueTime) && (
                          <span
                            className={`mt-2 inline-block rounded-md px-2 py-[3px] text-[12px] ${isOverdue(task) ? "bg-red-500/10 font-medium text-red-600 dark:text-red-400" : "bg-black/5 text-[var(--app-subtle)] dark:bg-white/10"}`}
                          >
                            {task.dueDate} {task.dueTime}
                            {isOverdue(task) && " · Overdue"}
                          </span>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          title="Edit"
                          className={iconBtn}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(index)}
                          title="Delete"
                          className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-black/5 text-sm text-[var(--app-subtle)] transition-colors hover:bg-red-500/10 hover:text-red-600 dark:bg-white/10 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>

      <Dialog
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit task</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Task name"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className={commonClass}
            />
            <input
              type="text"
              placeholder="Description"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className={commonClass}
            />
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-[12px] text-[var(--app-muted)]">
                Due date
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className={commonClass}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-[12px] text-[var(--app-muted)]">
                Due time
                <input
                  type="time"
                  value={editDueTime}
                  onChange={(e) => setEditDueTime(e.target.value)}
                  className={commonClass}
                />
              </label>
            </div>
            <DialogFooter className="mt-2">
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-[var(--app-primary)] px-[18px] py-2.5 text-sm font-semibold text-[var(--app-primary-text)] transition-all hover:opacity-90"
              >
                Save changes
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ToDoList;
