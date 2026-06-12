import { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import "./Captcha.css";

const RECAPTCHA_SITE_KEY = "6LdaGhktAAAAAIvkFUyhtdGjmSQ2A5f3gKrwZVWP"; //V2 test key

export default function Captcha({ onSuccess }) {
    const [captchaToken, setCaptchaToken] = useState(null);

    return (
        <div className="captcha-gate">
            <h1>Locked-In</h1>
            <h2>Verify you are human</h2>
            <div className="captcha-container">
                <ReCAPTCHA
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={(t) => setCaptchaToken(t)}
                    onExpired={() => setCaptchaToken(null)}
                />
            </div>
            <button disabled={!captchaToken} onClick={onSuccess}>
                Continue
            </button>
        </div>
    );
}