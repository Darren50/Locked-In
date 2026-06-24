import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";

const RECAPTCHA_SITE_KEY = "6LdaGhktAAAAAIvkFUyhtdGjmSQ2A5f3gKrwZVWP"; // V2 test key

/* Assets */
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

export default function Captcha({ onSuccess }) {
  const [captchaToken, setCaptchaToken] = useState(null);

  return (
    <div className="fixed inset-0 flex flex-col items-stretch justify-center gap-4 overflow-y-auto bg-[var(--app-card)] px-[8%] text-left md:items-start md:pl-[15%] md:pr-0">
      {/* Top left logo */}
      <h1
        className="fixed left-[2%] top-8 m-0 text-[25px] font-bold text-[var(--app-text)]"
        style={{ animation: FADE }}
      >
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

      {/* Title */}
      <h2
        className="m-0 w-full max-w-[360px] text-[34px] font-bold text-[var(--app-text)]"
        style={{ animation: FADE, animationDelay: "0.08s" }}
      >
        Verify you are human
      </h2>

      <div
        className="my-1 w-full max-w-[360px]"
        style={{ animation: FADE, animationDelay: "0.18s" }}
      >
        <ReCAPTCHA
          sitekey={RECAPTCHA_SITE_KEY}
          onChange={(t) => setCaptchaToken(t)}
          onExpired={() => setCaptchaToken(null)}
        />
      </div>

      <Button
        disabled={!captchaToken}
        onClick={onSuccess}
        style={{ animation: FADE, animationDelay: "0.28s" }}
        className="h-auto w-full max-w-[360px] bg-[var(--app-primary)] py-3 text-[15px] font-semibold text-[var(--app-primary-text)] transition-all hover:-translate-y-px hover:opacity-90 hover:shadow-[0_6px_18px_rgba(17,24,39,0.25)] active:translate-y-0 disabled:opacity-50"
      >
        Continue
      </Button>
    </div>
  );
}
