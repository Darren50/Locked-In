export function isOverdue(task, now = new Date()) {
  if (task.done || !task.dueDate) return false;
  const dueString = `${task.dueDate}T${task.dueTime || "23:59"}`;
  return new Date(dueString) < now;
}
