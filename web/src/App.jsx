import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, database } from "./firebase";

/* Components */
import Login from "./components/LoginAndRegistration";
import ToDoList from "./components/ToDoList";
import SideBar from "./components/SideBar";
import Calendar from "./components/Calendar";
import Statistics from "./components/Statistics";
import Settings from "./components/Settings";

/* UI */
import { GlassPanel } from "@/components/ui/glasspanel";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainView, setMainView] = useState("tasks");
  const [darkMode, setDarkMode] = useState(false);
  const [wallpaper, setWallpaper] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setDarkMode(false);
        setWallpaper("");
      }
    });
    return unsubscribe;
  }, []);

  /* Load account preferences after logging in */
  useEffect(() => {
    if (!user) return;
    const prefRef = doc(database, "users", user.uid, "settings", "preferences");
    const unsubscribe = onSnapshot(prefRef, (snap) => {
      const data = snap.data() || {};
      setDarkMode(!!data.darkMode);
      setWallpaper(data.wallpaper || "");
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  function changeDarkMode(value) {
    setDarkMode(value);
    if (user) {
      setDoc(
        doc(database, "users", user.uid, "settings", "preferences"),
        { darkMode: value },
        { merge: true },
      );
    }
  }

  function changeWallpaper(value) {
    setWallpaper(value);
    if (user) {
      setDoc(
        doc(database, "users", user.uid, "settings", "preferences"),
        { wallpaper: value },
        { merge: true },
      );
    }
  }

  const view =
    mainView === "calendar" ? (
      <Calendar user={user} />
    ) : mainView === "stats" ? (
      <Statistics user={user} />
    ) : mainView === "settings" ? (
      <Settings
        darkMode={darkMode}
        setDarkMode={changeDarkMode}
        wallpaper={wallpaper}
        setWallpaper={changeWallpaper}
        user={user}
      />
    ) : (
      <ToDoList user={user} />
    );

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: 80 }}>Loading...</p>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <SideBar mainView={mainView} setMainView={setMainView} />
      <div
        className="ml-[200px] min-h-screen bg-cover bg-center"
        style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : undefined}
      >
        {wallpaper ? (
          <GlassPanel className="min-h-screen rounded-none border-0 shadow-none">
            {view}
          </GlassPanel>
        ) : (
          view
        )}
      </div>
    </div>
  );
}
