import { useState } from "react";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from "firebase/auth"; 
import { auth } from "../firebase";
import "./LoginAndRegistration.css";
import googleLogo from "../assets/google-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [notice, setNotice] = useState("");

  /* Handle email sign in/up */ 
  const handleEmail = async (e) => { 
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      await setPersistence(
        auth, 
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch {
      setError("Your email and password do not match. Please try again.");
    }
  };

  /* Handle Google sign in */
  const handleGoogle = async () => {
    setError("");
    try {
      await setPersistence(
        auth, 
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch {
      setError("Failed to sign in with Google. Please try again.");
    }
  };

  /* Handle forgot password */
  const handleForgotPassword = async () => {
    setError("");
    setNotice("");
    if (!email) {
      setError("Please enter your email to reset the password");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice("Password reset email sent. Please check your inbox");
    } catch {
      setError("Failed to send password reset email. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <h1>Locked-In</h1>
      <h2>{isSignUp ? "Sign up" : "Welcome back"}</h2>
      <h5>Please enter your details</h5>  
      
      {/* Email sign in/up */}
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

        {/* Remember me and forgot password options */}
        <div className="form-options">
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          {!isSignUp && (
            <button 
              type="button" 
              className="forgot-link" 
              onClick={handleForgotPassword}>
              Forgot password?
            </button>
          )}
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
      >
        <img src={googleLogo} alt="Google Logo" />
        Sign in with Google
      </button>

      {error && <p className="login-error">{error}</p>}
      {notice && <p className="login-notice">{notice}</p>}

      <button 
        className="toggle-link" 
        onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}