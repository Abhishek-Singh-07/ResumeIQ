import { useState, useEffect } from "react";
import "./index.css";
import Auth from "./Auth";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [user, setUser] = useState(null);

  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ==========================================
  // THEME
  // ==========================================

  const [theme, setTheme] = useState(() => {
    const savedTheme =
      localStorage.getItem("resumeiq_theme");

    return savedTheme === "light"
      ? "light"
      : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme =
      theme;

    localStorage.setItem(
      "resumeiq_theme",
      theme
    );
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark"
        ? "light"
        : "dark"
    );
  };

  // ==========================================
  // CHECK EXISTING LOGIN
  // ==========================================

  useEffect(() => {
    const savedUser =
      localStorage.getItem("resumeiq_user");

    const savedToken =
      localStorage.getItem("resumeiq_token");

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error(
          "Invalid saved user data"
        );

        localStorage.removeItem(
          "resumeiq_user"
        );

        localStorage.removeItem(
          "resumeiq_token"
        );
      }
    }
  }, []);

  // ==========================================
  // FETCH HISTORY AFTER LOGIN
  // ==========================================

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  // ==========================================
  // FETCH ANALYSIS HISTORY
  // ==========================================

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);

      const token =
        localStorage.getItem(
          "resumeiq_token"
        );

      if (!token) {
        setHistory([]);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/history`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error(
          data.message ||
            "Unable to fetch history."
        );

        if (response.status === 401) {
          handleLogout();
        }

        return;
      }

      setHistory(data.history || []);

    } catch (error) {
      console.error(
        "Unable to fetch analysis history:",
        error
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // ==========================================
  // HANDLE LOGIN
  // ==========================================

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem(
      "resumeiq_token"
    );

    localStorage.removeItem(
      "resumeiq_user"
    );

    setUser(null);
    setResume(null);
    setJobDescription("");
    setResult(null);
    setHistory([]);
  };

  // ==========================================
  // VIEW SINGLE ANALYSIS
  // ==========================================

  const handleViewAnalysis = async (id) => {
    try {
      const token =
        localStorage.getItem(
          "resumeiq_token"
        );

      if (!token) {
        alert("Please login again.");
        handleLogout();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/history/${id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Unable to fetch analysis."
        );

        if (response.status === 401) {
          handleLogout();
        }

        return;
      }

      setResult(data.analysis);

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    } catch (error) {
      console.error(
        "Unable to fetch analysis:",
        error
      );

      alert(
        "Unable to connect to backend."
      );
    }
  };

  // ==========================================
  // ANALYZE RESUME
  // ==========================================

  const handleAnalyze = async () => {
    if (!resume) {
      alert(
        "Please upload your resume first."
      );
      return;
    }

    if (!jobDescription.trim()) {
      alert(
        "Please enter the job description."
      );
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const formData = new FormData();

      formData.append(
        "resume",
        resume
      );

      formData.append(
        "jobDescription",
        jobDescription
      );

      const token =
        localStorage.getItem(
          "resumeiq_token"
        );

      if (!token) {
        alert("Please login again.");
        handleLogout();
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/analyze`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Unable to analyze resume."
        );

        if (response.status === 401) {
          handleLogout();
        }

        return;
      }

      setResult(data);

      await fetchHistory();

    } catch (error) {
      console.error(
        "Analysis error:",
        error
      );

      alert(
        "Unable to connect to backend."
      );

    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // NAVIGATION
  // ==========================================

  const scrollToHistory = () => {
    document
      .getElementById("history-section")
      ?.scrollIntoView({
        behavior: "smooth"
      });
  };

  const scrollToDashboard = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // ==========================================
  // USER INITIALS
  // ==========================================

  const getInitials = () => {
    if (!user?.name) {
      return "U";
    }

    return user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================

  const totalAnalyses =
    history.length;

  const latestScore =
    history.length > 0
      ? Number(history[0].atsScore) || 0
      : 0;

  const averageScore =
    history.length > 0
      ? Math.round(
          history.reduce(
            (sum, item) =>
              sum +
              (Number(item.atsScore) || 0),
            0
          ) / history.length
        )
      : 0;

  // ==========================================
  // SHOW LOGIN / REGISTER SCREEN
  // ==========================================

  if (!user) {
    return (
      <Auth
        onLogin={handleLogin}
      />
    );
  }

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================

  return (
    <div className="app-shell">

      {/* ========================================
          TOP NAVIGATION
      ======================================== */}

      <header className="topbar">

        <div className="topbar-inner">

          <button
            className="brand"
            onClick={scrollToDashboard}
          >
            <span className="brand-mark">
              IQ
            </span>

            <span className="brand-text">
              Resume<span>IQ</span>
            </span>
          </button>

          <nav className="nav-links">

            <button
              className="nav-link active"
              onClick={scrollToDashboard}
            >
              Dashboard
            </button>

            <button
              className="nav-link"
              onClick={scrollToHistory}
            >
              History
            </button>

          </nav>

          <div className="topbar-actions">

            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              <span className="theme-icon">
                {theme === "dark"
                  ? "☀"
                  : "☾"}
              </span>

              <span className="theme-label">
                {theme === "dark"
                  ? "Daylight"
                  : "Dark"}
              </span>
            </button>

            <div className="user-menu">

              <div className="avatar">
                {getInitials()}
              </div>

              <div className="user-copy">
                <strong>
                  {user.name}
                </strong>

                <span>
                  Resume Analyst
                </span>
              </div>

            </div>

            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </div>

      </header>

      <main className="main-content">

        {/* ======================================
            HERO
        ====================================== */}

        <section className="hero-section">

          <div className="hero-content">

            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              AI-powered resume intelligence
            </div>

            <h1 className="hero-title">
              Optimize your resume.
              <span>
                Stand out with confidence.
              </span>
            </h1>

            <p className="hero-description">
              Compare your resume against a
              target job description and discover
              the skills, keywords, and sections
              that can improve your ATS compatibility.
            </p>

            <div className="hero-badges">
              <span>PDF Analysis</span>
              <span>ATS Scoring</span>
              <span>Skill Matching</span>
              <span>Analysis History</span>
            </div>

          </div>

        </section>

        {/* ======================================
            OVERVIEW
        ====================================== */}

        <section className="overview-grid">

          <div className="overview-card">

            <div className="overview-icon purple">
              ◎
            </div>

            <div>
              <span>Total Analyses</span>
              <strong>
                {totalAnalyses}
              </strong>
            </div>

          </div>

          <div className="overview-card">

            <div className="overview-icon blue">
              ◈
            </div>

            <div>
              <span>Latest ATS Score</span>
              <strong>
                {totalAnalyses
                  ? `${latestScore}%`
                  : "--"}
              </strong>
            </div>

          </div>

          <div className="overview-card">

            <div className="overview-icon green">
              ↗
            </div>

            <div>
              <span>Average Score</span>
              <strong>
                {totalAnalyses
                  ? `${averageScore}%`
                  : "--"}
              </strong>
            </div>

          </div>

        </section>

        {/* ======================================
            ANALYZER WORKSPACE
        ====================================== */}

        <section className="section-heading">

          <div>
            <span className="section-kicker">
              ANALYZER
            </span>

            <h2>
              Start a new analysis
            </h2>

            <p>
              Upload your resume and paste the
              target job description.
            </p>
          </div>

        </section>

        <section className="workspace-grid">

          {/* ====================================
              RESUME CARD
          ==================================== */}

          <div className="premium-card upload-card">

            <div className="card-heading">

              <div>
                <span className="step-number">
                  01
                </span>

                <h3>
                  Upload Resume
                </h3>
              </div>

              <span className="card-label">
                PDF
              </span>

            </div>

            <label className="upload-zone">

              <div className="upload-icon-large">
                ↑
              </div>

              <strong>
                Choose your resume
              </strong>

              <span>
                Upload a PDF file to analyze
                its ATS compatibility.
              </span>

              <span className="upload-action">
                Browse files
              </span>

              <input
                className="file-input"
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const selectedFile =
                    e.target.files[0];

                  setResume(
                    selectedFile || null
                  );

                  setResult(null);
                }}
              />

            </label>

            <div className="upload-footer">
              <span>
                PDF only
              </span>

              <span>
                Maximum 10 MB
              </span>
            </div>

            {resume && (
              <div className="selected-file">

                <div className="file-status-icon">
                  ✓
                </div>

                <div>
                  <span>
                    Selected Resume
                  </span>

                  <strong>
                    {resume.name}
                  </strong>
                </div>

              </div>
            )}

          </div>

          {/* ====================================
              JOB DESCRIPTION CARD
          ==================================== */}

          <div className="premium-card jd-card">

            <div className="card-heading">

              <div>
                <span className="step-number">
                  02
                </span>

                <h3>
                  Job Description
                </h3>
              </div>

              <span className="char-count">
                {jobDescription.length} chars
              </span>

            </div>

            <textarea
              className="jd-textarea"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) =>
                setJobDescription(
                  e.target.value
                )
              }
              rows="12"
            />

            <div className="jd-footer">
              <span>
                Include required and preferred
                skills for better matching.
              </span>

              <span>
                {jobDescription.trim()
                  ? "Ready"
                  : "Waiting for JD"}
              </span>
            </div>

            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <span>
                    ✦
                  </span>
                  Analyze Resume
                </>
              )}
            </button>

          </div>

        </section>

        {/* ======================================
            CURRENT RESULT
        ====================================== */}

        {result && (

          <section className="result-card premium-card">

            <div className="result-header">

              <div>
                <span className="section-kicker">
                  ANALYSIS COMPLETE
                </span>

                <h2>
                  Resume Analysis Result
                </h2>

                <p>
                  Your resume has been compared
                  against the selected job description.
                </p>
              </div>

              <div className="result-meta">

                {result.fileName && (
                  <span>
                    {result.fileName}
                  </span>
                )}

                {result.createdAt && (
                  <span>
                    {new Date(
                      result.createdAt
                    ).toLocaleString()}
                  </span>
                )}

              </div>

            </div>

            {/* ==================================
                SCORE TOP AREA
            ================================== */}

            <div className="result-overview">

              <div className="score-panel">

                <span className="score-caption">
                  ATS Compatibility
                </span>

                <div
                  className="score-circle"
                  style={{
                    "--score":
                      `${result.atsScore}%`
                  }}
                >

                  <div className="score-inner">

                    <span>
                      {result.atsScore}%
                    </span>

                    <small>
                      Match
                    </small>

                  </div>

                </div>

                <p>
                  Overall resume compatibility
                </p>

              </div>

              {result.scoreBreakdown && (

                <div className="breakdown-panel">

                  <div className="breakdown-heading">
                    <div>
                      <span>
                        SCORE BREAKDOWN
                      </span>

                      <h3>
                        Where your score comes from
                      </h3>
                    </div>
                  </div>

                  <div className="breakdown-list">

                    <div className="breakdown-row">

                      <span>
                        Technical Skills
                      </span>

                      <div className="progress-wrapper">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width:
                                `${result.scoreBreakdown.technicalSkills}%`
                            }}
                          ></div>
                        </div>
                      </div>

                      <strong>
                        {
                          result.scoreBreakdown
                            .technicalSkills
                        }%
                      </strong>

                    </div>

                    <div className="breakdown-row">

                      <span>
                        Keywords
                      </span>

                      <div className="progress-wrapper">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width:
                                `${result.scoreBreakdown.keywords}%`
                            }}
                          ></div>
                        </div>
                      </div>

                      <strong>
                        {
                          result.scoreBreakdown
                            .keywords
                        }%
                      </strong>

                    </div>

                    <div className="breakdown-row">

                      <span>
                        Resume Sections
                      </span>

                      <div className="progress-wrapper">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width:
                                `${result.scoreBreakdown.resumeSections}%`
                            }}
                          ></div>
                        </div>
                      </div>

                      <strong>
                        {
                          result.scoreBreakdown
                            .resumeSections
                        }%
                      </strong>

                    </div>

                    <div className="breakdown-row">

                      <span>
                        JD Match
                      </span>

                      <div className="progress-wrapper">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width:
                                `${result.scoreBreakdown.jobDescriptionMatch}%`
                            }}
                          ></div>
                        </div>
                      </div>

                      <strong>
                        {
                          result.scoreBreakdown
                            .jobDescriptionMatch
                        }%
                      </strong>

                    </div>

                  </div>

                </div>

              )}

            </div>

            {/* ==================================
                MATCHED / MISSING SKILLS
            ================================== */}

            <div className="result-columns">

              <div className="result-section">

                <div className="result-section-header">
                  <div>
                    <span className="status-dot success"></span>
                    <h3>
                      Matched Skills
                    </h3>
                  </div>

                  <span className="result-count">
                    {result.matchedSkills?.length || 0}
                  </span>
                </div>

                <div className="skill-list">

                  {result.matchedSkills &&
                  result.matchedSkills.length > 0 ? (

                    result.matchedSkills.map(
                      (skill) => (
                        <span
                          className="skill matched"
                          key={skill}
                        >
                          ✓ {skill}
                        </span>
                      )
                    )

                  ) : (

                    <p className="empty">
                      No matching skills found.
                    </p>

                  )}

                </div>

              </div>

              <div className="result-section">

                <div className="result-section-header">
                  <div>
                    <span className="status-dot danger"></span>
                    <h3>
                      Missing Skills
                    </h3>
                  </div>

                  <span className="result-count danger-count">
                    {result.missingSkills?.length || 0}
                  </span>
                </div>

                <div className="skill-list">

                  {result.missingSkills &&
                  result.missingSkills.length > 0 ? (

                    result.missingSkills.map(
                      (skill) => (
                        <span
                          className="skill missing"
                          key={skill}
                        >
                          + {skill}
                        </span>
                      )
                    )

                  ) : (

                    <p className="empty">
                      No missing skills.
                    </p>

                  )}

                </div>

              </div>

            </div>

            {/* ==================================
                KEYWORDS
            ================================== */}

            <div className="result-columns">

              <div className="result-section">

                <div className="result-section-header">
                  <div>
                    <span className="status-dot success"></span>
                    <h3>
                      Matched Keywords
                    </h3>
                  </div>
                </div>

                <div className="skill-list">

                  {result.matchedKeywords &&
                  result.matchedKeywords.length > 0 ? (

                    result.matchedKeywords.map(
                      (keyword) => (
                        <span
                          className="skill keyword-matched"
                          key={keyword}
                        >
                          {keyword}
                        </span>
                      )
                    )

                  ) : (

                    <p className="empty">
                      No matching keywords found.
                    </p>

                  )}

                </div>

              </div>

              <div className="result-section">

                <div className="result-section-header">
                  <div>
                    <span className="status-dot danger"></span>
                    <h3>
                      Missing Keywords
                    </h3>
                  </div>
                </div>

                <div className="skill-list">

                  {result.missingKeywords &&
                  result.missingKeywords.length > 0 ? (

                    result.missingKeywords.map(
                      (keyword) => (
                        <span
                          className="skill missing"
                          key={keyword}
                        >
                          {keyword}
                        </span>
                      )
                    )

                  ) : (

                    <p className="empty">
                      No missing keywords.
                    </p>

                  )}

                </div>

              </div>

            </div>

            {/* ==================================
                RESUME SECTIONS
            ================================== */}

            <div className="section-status">

              <div className="result-section-header">
                <div>
                  <span className="status-dot purple-dot"></span>
                  <h3>
                    Resume Sections
                  </h3>
                </div>
              </div>

              <div className="section-columns">

                <div className="section-box present-box">

                  <div className="section-box-title">
                    <span>
                      ✓
                    </span>

                    <h4>
                      Present Sections
                    </h4>
                  </div>

                  <ul>

                    {result.presentSections &&
                    result.presentSections.length > 0 ? (

                      result.presentSections.map(
                        (section) => (
                          <li key={section}>
                            {section}
                          </li>
                        )
                      )

                    ) : (

                      <li>
                        No sections detected.
                      </li>

                    )}

                  </ul>

                </div>

                <div className="section-box missing-box">

                  <div className="section-box-title">
                    <span>
                      +
                    </span>

                    <h4>
                      Missing Sections
                    </h4>
                  </div>

                  <ul>

                    {result.missingSections &&
                    result.missingSections.length > 0 ? (

                      result.missingSections.map(
                        (section) => (
                          <li key={section}>
                            {section}
                          </li>
                        )
                      )

                    ) : (

                      <li>
                        No missing sections.
                      </li>

                    )}

                  </ul>

                </div>

              </div>

            </div>

            {/* ==================================
                SUGGESTIONS
            ================================== */}

            <div className="suggestion-section">

              <div className="suggestion-header">

                <div>
                  <span className="suggestion-icon">
                    ✦
                  </span>

                  <div>
                    <span className="section-kicker">
                      RECOMMENDATIONS
                    </span>

                    <h3>
                      Suggestions to improve
                    </h3>
                  </div>
                </div>

              </div>

              <ul>

                {result.suggestions &&
                result.suggestions.map(
                  (suggestion, index) => (

                    <li key={index}>
                      <span>
                        {index + 1}
                      </span>

                      {suggestion}
                    </li>

                  )
                )}

              </ul>

            </div>

          </section>

        )}

        {/* ======================================
            HISTORY
        ====================================== */}

        <section
          id="history-section"
          className="history-section"
        >

          <div className="section-heading history-heading">

            <div>
              <span className="section-kicker">
                HISTORY
              </span>

              <h2>
                Recent analyses
              </h2>

              <p>
                Review your previous resume
                compatibility reports.
              </p>
            </div>

            <button
              className="refresh-btn"
              onClick={fetchHistory}
              disabled={historyLoading}
            >
              {historyLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

          <div className="premium-card history-card">

            {historyLoading ? (

              <div className="empty-state">
                <div className="empty-loader"></div>
                <p>
                  Loading analysis history...
                </p>
              </div>

            ) : history.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  ◌
                </div>

                <h3>
                  No analyses yet
                </h3>

                <p>
                  Your completed analyses will
                  appear here.
                </p>

              </div>

            ) : (

              <div className="history-list">

                {history.map(
                  (item, index) => (

                    <div
                      className="history-item"
                      key={item.id}
                    >

                      <div className="history-index">
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </div>

                      <div className="history-info">

                        <strong>
                          {item.fileName}
                        </strong>

                        <p>
                          {
                            new Date(
                              item.createdAt
                            ).toLocaleString()
                          }
                        </p>

                      </div>

                      <div className="history-score">

                        <span>
                          ATS Score
                        </span>

                        <strong>
                          {item.atsScore}%
                        </strong>

                      </div>

                      <button
                        className="view-btn"
                        onClick={() =>
                          handleViewAnalysis(
                            item.id
                          )
                        }
                      >
                        View Analysis
                        <span>
                          →
                        </span>
                      </button>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </section>

      </main>

      <footer className="footer">
        <span>
          ResumeIQ
        </span>

        <span>
          Resume intelligence for better opportunities.
        </span>
      </footer>

    </div>
  );
}

export default App;
