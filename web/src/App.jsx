import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

/* Components */
import Login from "./components/LoginAndRegistration";
import ToDoList from "./components/ToDoList";
import SideBar from "./components/SideBar";
import Captcha from "./components/Captcha";
import Calendar from "./components/Calendar";
import Statistics from "./components/Statistics";
import Settings from "./components/Settings";

/* UI */
import { GlassPanel } from "@/components/ui/glasspanel";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [mainView, setMainView] = useState("tasks");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [wallpaper, setWallpaper] = useState(
    () => localStorage.getItem("wallpaper") || "",
  );
  const view =
    mainView === "calendar" ? (
      <Calendar user={user} />
    ) : mainView === "stats" ? (
      <Statistics user={user} />
    ) : mainView === "settings" ? (
      <Settings
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        wallpaper={wallpaper}
        setWallpaper={setWallpaper}
      />
    ) : (
      <ToDoList user={user} />
    );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    try {
      if (wallpaper) localStorage.setItem("wallpaper", wallpaper);
      else localStorage.removeItem("wallpaper");
    } catch {
      //Image too large (5Mb maximum)
    }
  }, [wallpaper]);

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: 80 }}>Loading...</p>;
  }

  if (!user) {
    return <Login />;
  }

  if (!captchaPassed) {
    return <Captcha onSuccess={() => setCaptchaPassed(true)} />;
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
