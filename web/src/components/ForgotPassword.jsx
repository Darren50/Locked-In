import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import "./ForgotPassword.css";

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
        setNotice("If an account exists for that email, a reset link has been sent.");
    };

    return (
        <div className="forgot-container">
            <h1>Locked-In</h1>
            <h2>Reset Password</h2>
            <h5>Please enter your email</h5>

            <form onSubmit={handleReset} noValidate>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <button type="submit" className="submit-button">
                    Reset Password
                </button>
            </form>

            {error && <p className="login-error">{error}</p>}
            {notice && <p className="login-notice">{notice}</p>}

            <button className="toggle-link" onClick={onBack}>
                Back to Log In
            </button>
        </div>
    );
}