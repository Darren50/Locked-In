import { useState } from "react";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth"; 
import { auth } from "../firebase";
import "./LoginAndRegistration.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");

  const handleEmail = async (e) => { 
    e.preventDefault();
    setError("");
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="login-container">
      <h1>Locked-In</h1>
      <h2>{isSignUp ? "Sign up page" : "Log in page"}</h2>

      {/*Email sign in/up*/}
      <form onSubmit={handleEmail}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button 
          type="submit" 
          className="submit-button">
          {isSignUp ? "Create account" : "Log in"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleGoogle}
        className="google-button"
        >Continue with Google
      </button>

      {error && <p className="login-error">{error}</p>}

      <button 
        className="toggle-link" 
        onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}