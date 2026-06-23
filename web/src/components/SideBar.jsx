import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function SideBar({ mainView, setMainView }) {
  const navBtn =
    "cursor-pointer rounded-md border-none px-3 py-2.5 text-left text-sm font-medium transition-colors";
  const item = (active) =>
    `${navBtn} ${active ? "bg-blue-600 text-white" : "text-[var(--app-text)] hover:bg-black/5 dark:hover:bg-white/10"}`;

  return (
    <div className="fixed left-0 top-0 z-10 flex h-screen w-[200px] flex-col border-r border-[var(--app-border)] bg-[var(--app-card)] p-4">
      <div className="mb-6 px-1 text-lg font-bold text-[var(--app-text)]">
        Locked-In
      </div>

      <nav className="flex flex-col gap-1.5">
        <button
          className={item(mainView === "tasks")}
          onClick={() => setMainView("tasks")}
        >
          Tasks
        </button>
        <button
          className={item(mainView === "calendar")}
          onClick={() => setMainView("calendar")}
        >
          Calendar
        </button>
        <button
          className={item(mainView === "stats")}
          onClick={() => setMainView("stats")}
        >
          Statistics
        </button>
        <button
          className={item(mainView === "settings")}
          onClick={() => setMainView("settings")}
        >
          Settings
        </button>
      </nav>

      <button
        onClick={() => signOut(auth)}
        className={`${navBtn} mt-auto text-[var(--app-muted)] hover:bg-black/5 dark:hover:bg-white/10`}
      >
        Log out
      </button>
    </div>
  );
}

export default SideBar;
