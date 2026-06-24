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
import ForgotPassword from "./ForgotPassword";
import { Button } from "@/components/ui/button";

/* Assets */
import googleLogo from "../assets/google-logo.png";
import viewPassword from "../assets/view-password.png";
import hidePassword from "../assets/hide-password.png";

import todoLight from "../assets/todolist-preview-light.png";
import calendarLight from "../assets/calendar-preview-light.png";
import statisticsLight from "../assets/statistics-preview-light.png";
import todoDark from "../assets/todolist-preview-dark.png";
import calendarDark from "../assets/calendar-preview-dark.png";
import statisticsDark from "../assets/statistics-preview-dark.png";

const FADE = "fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) both";
const FEATURES = [
  {
    title: "To-Do List",
    desc: "Capture tasks with due dates, and check them off as you stay focused.",
    imgLight: todoLight,
    imgDark: todoDark,
  },
  {
    title: "Calendar",
    desc: "See your week and month at a glance.",
    imgLight: calendarLight,
    imgDark: calendarDark,
  },
  {
    title: "Statistics",
    desc: "Track your focus and Pomodoro sessions with weekly insights.",
    imgLight: statisticsLight,
    imgDark: statisticsDark,
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleEmail = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      if (isSignUp) {
        if (err.code === "auth/email-already-in-use") {
          setError("That email is already registered.");
        } else if (err.code === "auth/weak-password") {
          setError("Password should be at least 6 characters.");
        } else if (err.code === "auth/invalid-email") {
          setError("Please enter a valid email address.");
        } else {
          setError("Could not create account. Please try again.");
        }
      } else {
        setError("Your email and password do not match.");
      }
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch {
      setError("Failed to sign in with Google. Please try again.");
    }
  };

  if (showForgot) {
    return <ForgotPassword onBack={() => setShowForgot(false)} />;
  }

  const commonClass =
    "w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-card)] px-3.5 py-2.5 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] transition focus:border-[var(--app-text)] focus:outline-none focus:ring-[3px] focus:ring-black/[0.08] dark:focus:ring-white/10";

  return (
    <div className="fixed inset-0 flex flex-col items-stretch justify-center gap-[15px] overflow-y-auto bg-[var(--app-card)] px-[8%] text-left md:items-start md:pl-[15%] md:pr-0">
      <h1 className="fixed left-[2%] top-8 m-0 text-[25px] font-bold text-[var(--app-text)]">
        Locked-In
      </h1>

      {/* Right side image preview */}
      <div className="fixed right-0 top-0 hidden h-full w-[50%] flex-col gap-4 bg-gradient-to-br p-10 md:flex">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative flex-1 overflow-hidden rounded-2xl border border-white/20"
          >
            <div
              className="absolute inset-0 bg-cover bg-center dark:hidden"
              style={{ backgroundImage: `url(${f.imgLight})` }}
            />
            <div
              className="absolute inset-0 hidden bg-cover bg-center dark:block"
              style={{ backgroundImage: `url(${f.imgDark})` }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 group-hover:opacity-0">
              <span className="text-2xl font-bold text-white">{f.title}</span>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--app-card)] px-8 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <h3 className="text-xl font-bold text-[var(--app-text)]">
                {f.title}
              </h3>
              <p className="text-sm text-[var(--app-muted)]">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h2
        className="m-0 w-full max-w-[360px] text-[40px] font-bold text-[var(--app-text)]"
        style={{ animation: FADE, animationDelay: "0.08s" }}
      >
        {isSignUp ? "Sign up" : "Welcome back"}
      </h2>
      <h5
        className="m-0 mb-2 w-full max-w-[360px] text-sm font-normal text-[var(--app-muted)]"
        style={{ animation: FADE, animationDelay: "0.12s" }}
      >
        Please enter your details
      </h5>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogle}
        className="flex w-full max-w-[360px] cursor-pointer items-center justify-center rounded-lg border border-[var(--app-field-border)] bg-[var(--app-card)] py-[11px] text-sm font-semibold text-[var(--app-text)] transition-all hover:-translate-y-px hover:border-[var(--app-muted)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
        style={{ animation: FADE, animationDelay: "0.16s" }}
      >
        <img
          src={googleLogo}
          alt="Google Logo"
          className="mr-2 h-[18px] w-[18px] object-contain"
        />
        Sign in with Google
      </button>

      <form
        onSubmit={handleEmail}
        noValidate
        className="flex w-full max-w-[360px] flex-col"
        style={{ animation: FADE, animationDelay: "0.24s" }}
      >
        <div className="mb-4 text-center text-[13px] text-[var(--app-muted)]">
          or
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={`mb-3.5 ${commonClass}`}
        />

        <div className="relative mb-3.5 w-full">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={`${commonClass} pr-[42px]`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-0"
          >
            <img
              src={showPassword ? hidePassword : viewPassword}
              alt=""
              className="h-[18px] w-[18px] object-contain transition-opacity hover:opacity-60 dark:invert"
            />
          </button>
        </div>

        <div className="mb-3.5 flex items-center justify-between text-[13px]">
          <label className="flex cursor-pointer items-center gap-1.5 text-[var(--app-subtle)]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="m-0 w-auto"
            />
            Remember Me
          </label>
          {!isSignUp && (
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-[#2563eb] hover:underline dark:text-blue-400"
            >
              Forgot Password?
            </button>
          )}
        </div>

        <Button
          type="submit"
          className="mt-1 h-auto w-full cursor-pointer rounded-lg bg-[var(--app-primary)] py-3 text-[15px] font-semibold text-[var(--app-primary-text)] transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-[0_6px_18px_rgba(17,24,39,0.25)] active:translate-y-0"
        >
          {isSignUp ? "Create Account" : "Log In"}
        </Button>
      </form>

      {error && (
        <p className="m-0 w-full max-w-[360px] text-[13px] text-[#ef4444] dark:text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="m-0 mt-[18px] w-full max-w-[360px] cursor-pointer self-start border-none bg-transparent text-center text-[13px] text-[#2563eb] transition-colors hover:text-[#1e40af] hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        style={{ animation: FADE, animationDelay: "0.32s" }}
      >
        {isSignUp
          ? "Already have an account? Log in"
          : "Need an account? Sign up"}
      </button>
    </div>
  );
}
