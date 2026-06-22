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
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

function ToDoList({ user }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueTime, setNewDueTime] = useState("");

  //When editing tasks
  const [editTask, setEditTask] = useState(null);
  const [editText, setEditText] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDueTime, setEditDueTime] = useState("");

  //Common
  const commonClass =
    "w-full rounded-lg border border-[#d0d5dd] bg-white px-3.5 py-[11px] text-sm text-[#111827] placeholder:text-[#98a2b3] transition focus:border-[#111827] focus:outline-none focus:ring-[3px] focus:ring-black/[0.08]";

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

  function isOverdue(task) {
    if (task.done || !task.dueDate) return false;
    const dueString = `${task.dueDate}T${task.dueTime || "23:59"}`;
    return new Date(dueString) < new Date();
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

      {/* Draggable task list */}
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
                      className={`group flex items-start gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-shadow ${snapshot.isDragging ? "shadow-[0_12px_28px_rgba(0,0,0,0.18)]" : ""} ${task.done ? "opacity-60" : ""} cursor-grab active:cursor-grabbing`}
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

                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openEdit(task)}
                          title="Edit"
                          className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#f3f4f6] text-[#6b7280] transition-colors hover:bg-[#e5e7eb] hover:text-[#111827]"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(index)}
                          title="Delete"
                          className="flex size-7 cursor-pointer items-center justify-center rounded-md bg-[#f3f4f6] text-sm text-[#6b7280] transition-colors hover:bg-[#fee2e2] hover:text-[#dc2626]"
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

      {/* Edit task dialog */}
      <Dialog
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[#111827]">Edit task</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={saveEdit}
            className="flex flex-col gap-3 text-[#111827]"
          >
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
              <label className="flex flex-1 flex-col gap-1 text-[12px] text-[#98a2b3]">
                Due date
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className={commonClass}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-[12px] text-[#98a2b3]">
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
                className="cursor-pointer rounded-lg bg-[#111827] px-[18px] py-2.5 text-sm font-semibold text-white transition-all hover:bg-black"
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
