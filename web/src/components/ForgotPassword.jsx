import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Button } from "@/components/ui/button";

/* Assets */
import todoLight from "../assets/todolist-preview-light.png";
import calendarLight from "../assets/calendar-preview-light.png";
import statisticsLight from "../assets/statistics-preview-light.png";

const FADE = "fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) both";
const FEATURES = [
  {
    title: "To-Do List",
    desc: "Capture tasks with due dates, and check them off as you stay focused.",
    imgLight: todoLight,
  },
  {
    title: "Calendar",
    desc: "See your week and month at a glance.",
    imgLight: calendarLight,
  },
  {
    title: "Statistics",
    desc: "Track your focus and Pomodoro sessions with weekly insights.",
    imgLight: statisticsLight,
  },
];

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      if (err.code !== "auth/user-not-found") {
        setError("Please enter a valid email address.");
        return;
      }
    }
    setNotice(
      "If an account exists for that email, a reset link has been sent.",
    );
  };

  const commonClass =
    "mb-3.5 w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-card)] px-3.5 py-2.5 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] transition focus:border-[var(--app-text)] focus:outline-none focus:ring-[3px] focus:ring-black/[0.08]";

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
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${f.imgLight})` }}
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
        Reset Password
      </h2>
      <h5
        className="m-0 mb-2 w-full max-w-[360px] text-sm font-normal text-[var(--app-muted)]"
        style={{ animation: FADE, animationDelay: "0.14s" }}
      >
        Please enter your email
      </h5>

      <form
        onSubmit={handleReset}
        noValidate
        className="flex w-full max-w-[360px] flex-col"
        style={{ animation: FADE, animationDelay: "0.22s" }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={commonClass}
        />
        <Button
          type="submit"
          className="h-auto w-full cursor-pointer rounded-lg bg-[var(--app-primary)] py-3 text-[15px] font-semibold text-[var(--app-primary-text)] transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-[0_6px_18px_rgba(17,24,39,0.25)] active:translate-y-0"
        >
          Reset Password
        </Button>
      </form>

      {error && (
        <p
          className="m-0 w-full max-w-[360px] text-[13px] text-[#ef4444]"
          style={{ animation: FADE }}
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          className="m-0 w-full max-w-[360px] text-[13px] text-[#16a34a]"
          style={{ animation: FADE }}
        >
          {notice}
        </p>
      )}

      <button
        onClick={onBack}
        className="m-0 mt-[18px] w-full max-w-[360px] cursor-pointer self-start border-none bg-transparent text-center text-[13px] text-[#2563eb] transition-colors hover:text-[#1e40af] hover:underline"
        style={{ animation: FADE, animationDelay: "0.30s" }}
      >
        Back to Log In
      </button>
    </div>
  );
}
