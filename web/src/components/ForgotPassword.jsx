import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Button } from "@/components/ui/button";
import image from "../assets/testing.png";

const FADE = "fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) both";

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
    "mb-3.5 w-full rounded-lg border border-[var(--app-field-border)] bg-[var(--app-card)] px-3.5 py-2.5 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] transition focus:border-[var(--app-text)] focus:outline-none focus:ring-[3px] focus:ring-black/[0.08] dark:focus:ring-white/10";

  return (
    <div className="fixed inset-0 flex flex-col items-stretch justify-center gap-[15px] overflow-y-auto bg-[var(--app-card)] px-[8%] text-left md:items-start md:pl-[15%] md:pr-0">
      <h1
        className="fixed left-[2%] top-8 m-0 text-[25px] font-bold text-[var(--app-text)]"
        style={{ animation: FADE }}
      >
        Locked-In
      </h1>

      <img
        src={image}
        alt=""
        className="fixed right-0 top-0 hidden h-full w-[45%] object-cover md:block"
        style={{
          transformOrigin: "center",
          animation:
            "heroReveal 0.9s ease both, kenBurns 14s ease-in-out 0.9s infinite alternate",
        }}
      />

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
          className="m-0 w-full max-w-[360px] text-[13px] text-[#ef4444] dark:text-red-400"
          style={{ animation: FADE }}
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          className="m-0 w-full max-w-[360px] text-[13px] text-[#16a34a] dark:text-green-400"
          style={{ animation: FADE }}
        >
          {notice}
        </p>
      )}

      <button
        onClick={onBack}
        className="m-0 mt-[18px] w-full max-w-[360px] cursor-pointer self-start border-none bg-transparent text-center text-[13px] text-[#2563eb] transition-colors hover:text-[#1e40af] hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        style={{ animation: FADE, animationDelay: "0.30s" }}
      >
        Back to Log In
      </button>
    </div>
  );
}
