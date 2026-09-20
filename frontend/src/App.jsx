import { useState, useEffect } from "react";
import "./index.css";
import Auth from "./Auth";

function App() {
  const [user, setUser] = useState(null);

  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);


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
        console.error("Invalid saved user data");

        localStorage.removeItem("resumeiq_user");
        localStorage.removeItem("resumeiq_token");
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
        localStorage.getItem("resumeiq_token");

      if (!token) {
        setHistory([]);
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/history",
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
          data.message || "Unable to fetch history."
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
    localStorage.removeItem("resumeiq_token");
    localStorage.removeItem("resumeiq_user");

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
        localStorage.getItem("resumeiq_token");

      if (!token) {
        alert("Please login again.");
        handleLogout();
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/history/${id}`,
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
        localStorage.getItem("resumeiq_token");

      if (!token) {
        alert("Please login again.");
        handleLogout();
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/analyze",
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
    <div className="container">


      {/* ==========================================
          HEADER
      ========================================== */}

      <div className="header">

        <div className="header-top">

          <div>

            <h1>
              ResumeIQ
            </h1>

            <p>
              Resume Analyzer & ATS Optimization Platform
            </p>

          </div>


          <div className="user-area">

            <span>
              Welcome,{" "}
              <strong>
                {user.name}
              </strong>
            </span>

            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </div>

      </div>


      {/* ==========================================
          RESUME UPLOAD
      ========================================== */}

      <div className="card">

        <h2>
          Upload Your Resume
        </h2>

        <input
          className="file-input"
          type="file"
          accept=".pdf"
          onChange={(e) => {
            setResume(
              e.target.files[0]
            );

            setResult(null);
          }}
        />

        {resume && (

          <p className="file-name">
            Selected Resume:{" "}
            <strong>
              {resume.name}
            </strong>
          </p>

        )}

      </div>


      {/* ==========================================
          JOB DESCRIPTION
      ========================================== */}

      <div className="card">

        <h2>
          Job Description
        </h2>

        <textarea
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) =>
            setJobDescription(
              e.target.value
            )
          }
          rows="10"
        />

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading
            ? "Analyzing Resume..."
            : "Analyze Resume"}
        </button>

      </div>


      {/* ==========================================
          CURRENT ANALYSIS RESULT
      ========================================== */}

      {result && (

        <div className="result-card">

          <h2>
            Resume Analysis Result
          </h2>


          {/* ==========================================
              FILE INFORMATION
          ========================================== */}

          {result.fileName && (

            <p className="analysis-info">

              Resume:{" "}

              <strong>
                {result.fileName}
              </strong>

            </p>

          )}


          {result.createdAt && (

            <p className="analysis-info">

              Analyzed:{" "}

              <strong>
                {new Date(
                  result.createdAt
                ).toLocaleString()}
              </strong>

            </p>

          )}


          {/* ==========================================
              ATS SCORE
          ========================================== */}

          <div className="score">

            <p>
              ATS Compatibility Score
            </p>

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

              </div>

            </div>

          </div>


          {/* ==========================================
              SCORE BREAKDOWN
          ========================================== */}

          {result.scoreBreakdown && (

            <div className="score-breakdown">

              <h3>
                Score Breakdown
              </h3>

              <div className="breakdown-grid">

                <div className="breakdown-item">

                  <span>
                    Technical Skills
                  </span>

                  <strong>
                    {
                      result.scoreBreakdown
                        .technicalSkills
                    }%
                  </strong>

                </div>


                <div className="breakdown-item">

                  <span>
                    Keywords
                  </span>

                  <strong>
                    {
                      result.scoreBreakdown
                        .keywords
                    }%
                  </strong>

                </div>


                <div className="breakdown-item">

                  <span>
                    Resume Sections
                  </span>

                  <strong>
                    {
                      result.scoreBreakdown
                        .resumeSections
                    }%
                  </strong>

                </div>


                <div className="breakdown-item">

                  <span>
                    Job Description Match
                  </span>

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


          {/* ==========================================
              MATCHED SKILLS
          ========================================== */}

          <div className="skill-section">

            <h3>
              Matched Skills
            </h3>

            <div className="skill-list">

              {result.matchedSkills &&
              result.matchedSkills.length > 0 ? (

                result.matchedSkills.map(
                  (skill) => (

                    <span
                      className="skill matched"
                      key={skill}
                    >
                      {skill}
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


          {/* ==========================================
              MISSING SKILLS
          ========================================== */}

          <div className="skill-section">

            <h3>
              Missing Skills
            </h3>

            <div className="skill-list">

              {result.missingSkills &&
              result.missingSkills.length > 0 ? (

                result.missingSkills.map(
                  (skill) => (

                    <span
                      className="skill missing"
                      key={skill}
                    >
                      {skill}
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


          {/* ==========================================
              MATCHED KEYWORDS
          ========================================== */}

          <div className="skill-section">

            <h3>
              Matched Keywords
            </h3>

            <div className="skill-list">

              {result.matchedKeywords &&
              result.matchedKeywords.length > 0 ? (

                result.matchedKeywords.map(
                  (keyword) => (

                    <span
                      className="skill matched"
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


          {/* ==========================================
              MISSING KEYWORDS
          ========================================== */}

          <div className="skill-section">

            <h3>
              Missing Keywords
            </h3>

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


          {/* ==========================================
              RESUME SECTIONS
          ========================================== */}

          <div className="section-status">

            <h3>
              Resume Sections
            </h3>

            <div className="section-columns">

              <div>

                <h4>
                  Present Sections
                </h4>

                <ul>

                  {result.presentSections &&
                  result.presentSections.length > 0 ? (

                    result.presentSections.map(
                      (section) => (

                        <li key={section}>
                          ✓ {section}
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


              <div>

                <h4>
                  Missing Sections
                </h4>

                <ul>

                  {result.missingSections &&
                  result.missingSections.length > 0 ? (

                    result.missingSections.map(
                      (section) => (

                        <li key={section}>
                          ✗ {section}
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


          {/* ==========================================
              SUGGESTIONS
          ========================================== */}

          <div className="suggestion-section">

            <h3>
              Suggestions
            </h3>

            <ul>

              {result.suggestions &&
              result.suggestions.map(
                (suggestion, index) => (

                  <li key={index}>
                    {suggestion}
                  </li>

                )
              )}

            </ul>

          </div>

        </div>

      )}


      {/* ==========================================
          ANALYSIS HISTORY
      ========================================== */}

      <div className="card">

        <h2>
          Analysis History
        </h2>

        {historyLoading ? (

          <p className="empty">
            Loading analysis history...
          </p>

        ) : history.length === 0 ? (

          <p className="empty">
            No previous analyses yet.
          </p>

        ) : (

          <div className="history-list">

            {history.map(
              (item) => (

                <div
                  className="history-item"
                  key={item.id}
                >

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

                    <strong>
                      {item.atsScore}%
                    </strong>

                    <p>
                      ATS Score
                    </p>

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
                  </button>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default App;