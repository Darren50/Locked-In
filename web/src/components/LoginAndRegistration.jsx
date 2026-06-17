import { useState } from "react";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth"; 
import { auth } from "../firebase";
import "./LoginAndRegistration.css";
import ForgotPassword from "./ForgotPassword";

/* Assets */
import googleLogo from "../assets/google-logo.png";
import viewPassword from "../assets/view-password.png";
import hidePassword from "../assets/hide-password.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  /* Handle email sign in/up */ 
  const handleEmail = async (e) => { 
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.")
      return;
    }

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
    } catch (err) {
        if (isSignUp) {
          if (err.code === "auth/email-already-in-use") {
            setError("That email is already registered.")
          } else if (err.code === "auth/weak-password") {
            setError("Password should be at least 6 characters.")
          } else if (err.code === "auth/invalid-email") {
            setError("Please enter a valid email address.")
          } else {
            setError("Could not create account. Please try again.")
          }
        } else {
            setError("Your email and password do not match.")
        }
    };
  }

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
  if (showForgot) {
    return <ForgotPassword onBack={() => setShowForgot(false)} />;
  }

  return (
    <div className="login-container">
      <h1>Locked-In</h1>
      <h2>{isSignUp ? "Sign up" : "Welcome back"}</h2>
      <h5>Please enter your details</h5>  
      
      {/* Email sign in/up */}
      <form onSubmit={handleEmail} noValidate>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <img
              src={showPassword ? hidePassword : viewPassword}
              alt=""
            />
          </button>
        </div>

        {/* Remember me and forgot password options */}
        <div className="form-options">
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember Me
          </label>
          {!isSignUp && (
            <button 
              type="button" 
              className="forgot-link" 
              onClick={() => setShowForgot(true)}
            >
            Forgot Password?
            </button>
          )}
        </div>

        <button 
          type="submit"
          className="submit-button">
          {isSignUp ? "Create Account" : "Log In"}
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

      <button 
        className="toggle-link" 
        onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? "Already have an account? Log in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}