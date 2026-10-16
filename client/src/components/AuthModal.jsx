import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  TrainFront,
  UserRound,
  X,
} from "lucide-react";

import {
  loginUser,
  registerUser,
  loginWithGoogle,
} from "../services/api";

export default function AuthModal({
  initialMode = "login",
  onClose,
  onAuthenticated,
}) {
  const [mode, setMode] = useState(initialMode);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isSignup = mode === "signup";

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
    setShowPassword(false);

    setForm((previous) => ({
      ...previous,
      password: "",
      confirmPassword: "",
    }));
  };

  const completeLogin = (result) => {
    const token =
      result.token ||
      result.data?.token ||
      result.accessToken ||
      result.data?.accessToken;

    if (typeof token !== "string" || !token) {
      throw new Error(
        "Authentication succeeded, but no session token was returned."
      );
    }

    onAuthenticated(token);
  };

  const handleGoogleSuccess = async (response) => {
    if (!response.credential) {
      setError("Google did not return a valid credential.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await loginWithGoogle(
        response.credential
      );

      completeLogin(result);
    } catch (err) {
      setError(
        err.message || "Google Sign-In failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (isSignup && name.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    if (isSignup && form.password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (
      isSignup &&
      form.password !== form.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      if (isSignup) {
        await registerUser({
          name,
          email,
          password: form.password,
        });

        setForm((previous) => ({
          ...previous,
          password: "",
          confirmPassword: "",
        }));

        setMode("login");
        setNotice(
          "Account created successfully. Sign in to continue."
        );

        return;
      }

      const result = await loginUser({
        email,
        password: form.password,
      });

      completeLogin(result);
    } catch (err) {
      setError(
        err.message ||
          "Authentication failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          type="button"
          className="auth-close"
          onClick={onClose}
          aria-label="Close authentication"
        >
          <X size={20} />
        </button>

        <div className="auth-brand-icon">
          <TrainFront size={27} />
        </div>

        <p className="auth-eyebrow">
          WELCOME TO METROMIND AI
        </p>

        <h2 id="auth-title">
          {isSignup
            ? "Create your account"
            : "Welcome back"}
        </h2>

        <p className="auth-description">
          {isSignup
            ? "Join MetroMind AI and start exploring smarter journeys."
            : "Sign in to your MetroMind AI account."}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={
              !isSignup ? "auth-tab active" : "auth-tab"
            }
            onClick={() => switchMode("login")}
          >
            Login
          </button>

          <button
            type="button"
            className={
              isSignup ? "auth-tab active" : "auth-tab"
            }
            onClick={() => switchMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <div className="auth-google-section">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              setError(
                "Google Sign-In was unsuccessful. Please try again."
              )
            }
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width="340"
          />
        </div>

        <div className="auth-divider">
          <span>or continue with email</span>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          {isSignup && (
            <label className="auth-field">
              <span>Full name</span>

              <div className="auth-input-wrap">
                <UserRound size={18} />

                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={updateField}
                  required
                />
              </div>
            </label>
          )}

          <label className="auth-field">
            <span>Email address</span>

            <div className="auth-input-wrap">
              <Mail size={18} />

              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={updateField}
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>

            <div className="auth-input-wrap">
              <LockKeyhole size={18} />

              <input
                type={
                  showPassword ? "text" : "password"
                }
                name="password"
                autoComplete={
                  isSignup
                    ? "new-password"
                    : "current-password"
                }
                placeholder="Enter your password"
                value={form.password}
                onChange={updateField}
                required
              />

              <button
                type="button"
                className="auth-eye"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          {isSignup && (
            <label className="auth-field">
              <span>Confirm password</span>

              <div className="auth-input-wrap">
                <LockKeyhole size={18} />

                <input
                  type={
                    showPassword ? "text" : "password"
                  }
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                  onChange={updateField}
                  required
                />
              </div>
            </label>
          )}

          {notice && (
            <p className="auth-notice" role="status">
              {notice}
            </p>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isSignup
              ? "Create Account"
              : "Login"}

            {!loading && <ArrowRight size={19} />}
          </button>
        </form>

        <p className="auth-footer-text">
          {isSignup
            ? "Already have an account?"
            : "New to MetroMind AI?"}{" "}
          <button
            type="button"
            onClick={() =>
              switchMode(
                isSignup ? "login" : "signup"
              )
            }
          >
            {isSignup ? "Login" : "Create an account"}
          </button>
        </p>
      </section>
    </div>
  );
}