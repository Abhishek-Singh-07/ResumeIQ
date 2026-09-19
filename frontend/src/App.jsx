import { useState } from "react";
import "./index.css";

function App() {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!resume) {
      alert("Please upload your resume first.");
      return;
    }

    if (!jobDescription.trim()) {
      alert("Please enter the job description.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const formData = new FormData();

      formData.append("resume", resume);
      formData.append("jobDescription", jobDescription);

      const response = await fetch(
        "http://localhost:5000/api/analyze",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        return;
      }

      setResult(data);

    } catch (error) {
      console.error(error);
      alert("Unable to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">

      {/* Header */}

      <div className="header">
        <h1>ResumeIQ</h1>
        <p>AI-Powered Resume Analyzer & ATS Optimization</p>
      </div>


      {/* Upload Card */}

      <div className="card">

        <h2>Upload Your Resume</h2>

        <input
          className="file-input"
          type="file"
          accept=".pdf"
          onChange={(e) => {
            setResume(e.target.files[0]);
            setResult(null);
          }}
        />

        {resume && (
          <p className="file-name">
            Selected Resume: <strong>{resume.name}</strong>
          </p>
        )}

      </div>


      {/* Job Description */}

      <div className="card">

        <h2>Job Description</h2>

        <textarea
          placeholder="Paste the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows="10"
        />

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? "Analyzing Resume..." : "Analyze Resume"}
        </button>

      </div>


      {/* Results */}

      {result && (

        <div className="result-card">

          <h2>Resume Analysis Result</h2>


          {/* ATS Score */}

         <div className="score">

  <p>ATS Compatibility Score</p>

  <div
    className="score-circle"
    style={{
      "--score": `${result.atsScore}%`
    }}
  >
    <div className="score-inner">
      <span>{result.atsScore}%</span>
    </div>
  </div>

</div>


          {/* Matched Skills */}

          <div className="skill-section">

            <h3>Matched Skills</h3>

           <div className="skill-list">
  {result.matchedSkills.length > 0 ? (
    result.matchedSkills.map((skill) => (
      <span className="skill matched" key={skill}>
        {skill}
      </span>
    ))
  ) : (
    <p className="empty">No matching skills found.</p>
  )}
</div>

          </div>


          {/* Missing Skills */}

          <div className="skill-section">

            <h3>Missing Skills</h3>

            <div className="skill-list">

              {result.missingSkills.length > 0 ? (

                result.missingSkills.map((skill) => (
                  <span
                    className="skill missing"
                    key={skill}
                  >
                    {skill}
                  </span>
                ))

              ) : (

                <p className="empty">
                  No missing skills.
                </p>

              )}

            </div>

          </div>
          {/* Suggestions */}

<div className="skill-section">

  <h3>Suggestions</h3>

  <ul>
    {result.suggestions.map((suggestion, index) => (
      <li key={index}>
        {suggestion}
      </li>
    ))}
  </ul>

</div>

        </div>

      )}

    </div>
  );
}

export default App;