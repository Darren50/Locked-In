import { useState, useEffect } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import Login from "./components/LoginAndRegistration"
import ToDoList from "./components/ToDoList"
import SideBar from "./components/SideBar"
import Captcha from "./components/Captcha"

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [captchaPassed, setCaptchaPassed] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (!currentUser) setCaptchaPassed(false)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return <p style = {{textAlign: "center", marginTop: 80}}>Loading...</p>  
  }

  if (!user) {
    return <Login />
  }

  if (!captchaPassed) {
    return <Captcha onSuccess={() => setCaptchaPassed(true)} />
  }

  return (
    <div className="app">
      <SideBar user={user} />
      <ToDoList user={user} />
    </div>
  )
}