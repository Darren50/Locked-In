import { useState } from "react"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "./firebase"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div>
      <h1>Locked-In</h1>
      <h2>{isSignUp ? "Sign up page" : "Log in page"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "200px", padding: 8, marginBottom: 10 }}
          required
        />
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "200px", padding: 8, marginBottom: 10 }}
            required
          />
        </div>
        <button type="submit" style={{ width: "auto", padding: 8 }}>
          {isSignUp ? "Create account" : "Log in"}
        </button>
      </form>
      {error && <p style={{ color: "red", fontSize: 14 }}>{error}</p>}
      <button
        onClick={() => setIsSignUp(!isSignUp)}
        style={{ marginTop: 16, background: "none", border: "none", color: "blue", cursor: "pointer" }}
      >
        {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
      </button>
    </div>
  )
}