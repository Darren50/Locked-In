import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import Image from "../assets/testing.png";

const RECAPTCHA_SITE_KEY = "6LdaGhktAAAAAIvkFUyhtdGjmSQ2A5f3gKrwZVWP"; // V2 test key

const FADE = "fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) both";

export default function Captcha({ onSuccess }) {
    const [captchaToken, setCaptchaToken] = useState(null);

    return (
        <div className="fixed inset-0 flex flex-col items-stretch justify-center gap-4 overflow-y-auto bg-white px-[8%] text-left md:items-start md:pl-[15%] md:pr-0">
            {/* Top left logo */}
            <h1
                className="fixed left-[2%] top-8 m-0 text-[25px] font-bold text-[#111827]"
                style={{ animation: FADE }}
            >
                Locked-In
            </h1>

            {/* Image */}
            <img
                src={Image}
                alt=""
                className="fixed right-0 top-0 hidden h-full w-[45%] object-cover md:block"
                style={{
                    transformOrigin: "center",
                    animation: "heroReveal 0.9s ease both, kenBurns 14s ease-in-out 0.9s infinite alternate",
                }}
            />

            {/* Title */}
            <h2
                className="m-0 w-full max-w-[360px] text-[34px] font-bold text-[#111827]"
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
                className="h-auto w-full max-w-[360px] bg-[#111827] py-3 text-[15px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-black hover:shadow-[0_6px_18px_rgba(17,24,39,0.25)] active:translate-y-0 disabled:bg-[#808080] disabled:opacity-50"
            >
                Continue
            </Button>
        </div>
    );
}