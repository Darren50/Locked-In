import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/LoginAndRegistration";
import ToDoList from "./components/ToDoList";
import SideBar from "./components/SideBar";
import Captcha from "./components/Captcha";
import Calendar from "./components/Calendar";
import Statistics from "./components/Statistics";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [mainView, setMainView] = useState("tasks");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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
      <div className="ml-[200px] min-h-screen">
        {mainView === "calendar" ? (
          <Calendar user={user} />
        ) : mainView === "stats" ? (
          <Statistics user={user} />
        ) : (
          <ToDoList user={user} />
        )}
      </div>
    </div>
  );
}
