import { useState, useEffect } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import Login from "./LoginAndRegistration"
import ToDoList from "./components/ToDoList"
import SideBar from "./components/SideBar"

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return <p style = {{textAlign: "center", marginTop: 80}}>Loading...</p>  
  }

  return user ? (
    <div className="app">
      <SideBar />
      <ToDoList user={user} />
    </div>
  ) : (
    <Login />
  )
}