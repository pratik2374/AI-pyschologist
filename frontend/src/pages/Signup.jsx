import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import "./Auth.css";

const STEPS = { email: 1, otp: 2, details: 3 };

export default function Signup() {
  const [step, setStep] = useState(STEPS.email);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role] = useState("Visitor");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const sendOTP = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.generateOTP(email);
      setStep(STEPS.otp);
    } catch (err) {
      setError(err.message || "Failed to send OTP. Check your email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup({ name, email, password, role, otp: parseInt(otp, 10) });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <img src="/brain.svg" alt="" className="auth-icon" />
          <h1>AI Psychologist</h1>
          <p>{step === STEPS.email ? "Enter your email" : step === STEPS.otp ? "Enter OTP" : "Create your account"}</p>
        </div>

        {step === STEPS.email && (
          <form onSubmit={sendOTP} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Sending OTP…" : "Send OTP"}
            </button>
          </form>
        )}

        {step === STEPS.otp && (
          <>
            <form onSubmit={() => setStep(STEPS.details)} className="auth-form">
              {error && <div className="auth-error">{error}</div>}
              <label>
                <span>OTP (check your email)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </label>
              <button type="submit" className="btn-primary">Continue</button>
            </form>
            <button type="button" className="btn-text" onClick={sendOTP} disabled={loading}>
              Resend OTP
            </button>
          </>
        )}

        {step === STEPS.details && (
          <form onSubmit={handleSignup} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            <input type="hidden" value={otp} readOnly />
            <label>
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                autoComplete="name"
              />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={email} readOnly className="readonly" />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Creating account…" : "Sign up"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
