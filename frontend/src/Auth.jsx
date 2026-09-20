import { useState } from "react";

function Auth({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  // ==========================================
  // HANDLE AUTHENTICATION
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");


    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (mode === "register" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }


    try {
      setLoading(true);


      const endpoint =
        mode === "register"
          ? "http://localhost:5000/api/register"
          : "http://localhost:5000/api/login";


      const body =
        mode === "register"
          ? {
              name: name.trim(),
              email: email.trim(),
              password: password
            }
          : {
              email: email.trim(),
              password: password
            };


      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(body)
      });


      const data = await response.json();


      if (!response.ok) {
        setError(
          data.message || "Something went wrong."
        );
        return;
      }


      // ==========================================
      // SAVE LOGIN INFORMATION
      // ==========================================

      if (data.token) {
        localStorage.setItem(
          "resumeiq_token",
          data.token
        );
      }


      if (data.user) {
        localStorage.setItem(
          "resumeiq_user",
          JSON.stringify(data.user)
        );
      }


      setMessage(
        data.message || "Success"
      );


      // Clear form

      setName("");
      setEmail("");
      setPassword("");


      // Send user information to App

      if (onLogin && data.user) {
        onLogin(data.user);
      }


    } catch (error) {

      console.error(
        "Authentication error:",
        error
      );

      setError(
        "Unable to connect to backend."
      );

    } finally {

      setLoading(false);
    }
  };


  return (
    <div className="auth-container">

      <div className="auth-card">

        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="auth-header">

          <h1>
            ResumeIQ
          </h1>

          <p>
            Resume Analyzer & ATS Optimization Platform
          </p>

        </div>


        {/* ==========================================
            LOGIN / REGISTER TABS
        ========================================== */}

        <div className="auth-tabs">

          <button
            type="button"
            className={
              mode === "login"
                ? "auth-tab active"
                : "auth-tab"
            }
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
          >
            Login
          </button>


          <button
            type="button"
            className={
              mode === "register"
                ? "auth-tab active"
                : "auth-tab"
            }
            onClick={() => {
              setMode("register");
              setError("");
              setMessage("");
            }}
          >
            Register
          </button>

        </div>


        {/* ==========================================
            FORM
        ========================================== */}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >

          {/* NAME */}

          {mode === "register" && (

            <div className="form-group">

              <label>
                Full Name
              </label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />

            </div>

          )}


          {/* EMAIL */}

          <div className="form-group">

            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

          </div>


          {/* PASSWORD */}

          <div className="form-group">

            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />

          </div>


          {/* ERROR */}

          {error && (

            <div className="auth-error">
              {error}
            </div>

          )}


          {/* SUCCESS */}

          {message && (

            <div className="auth-success">
              {message}
            </div>

          )}


          {/* SUBMIT */}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >

            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Login"
                : "Create Account"}

          </button>

        </form>


        {/* ==========================================
            SWITCH MODE
        ========================================== */}

        <p className="auth-switch">

          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            onClick={() => {
              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              );

              setError("");
              setMessage("");
            }}
          >

            {mode === "login"
              ? " Register"
              : " Login"}

          </button>

        </p>

      </div>

    </div>
  );
}

export default Auth;