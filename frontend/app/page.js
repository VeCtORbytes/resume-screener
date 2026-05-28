"use client";

import { useState, useEffect, useRef } from "react";
import FileUpload from "../components/FileUpload";
import JobDescInput from "../components/JobDescInput";
import ResultsTable from "../components/ResultsTable";
import FilterControl from "../components/FilterControl";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import CandidateComparison from "../components/CandidateComparison";
import { screenResumes, getResults, getSessions } from "../lib/api";
import styles from "./page.module.css";

const SAMPLE_JD = `Job Description — Full Stack Developer (MERN + AI Integrations)

Job Title: Full Stack Developer (MERN Stack)

Location: Remote / Hybrid / On-site
Experience: Internship / Fresher / 0–1 Year

About the Role

We are looking for a passionate and driven Full Stack Developer with hands-on experience in building scalable web applications using the MERN stack. The ideal candidate should have practical experience developing end-to-end applications, integrating APIs, working with databases, and implementing modern frontend interfaces.

Candidates with exposure to AI/LLM integrations, cloud deployments, and strong problem-solving skills will be preferred.

Key Responsibilities
Develop responsive and interactive frontend applications using React.js
Build scalable backend services and RESTful APIs using Node.js and Express.js
Design and manage MongoDB databases, schemas, CRUD operations, and queries
Integrate third-party APIs such as AI APIs, cloud media storage, and external data services
Implement user authentication, session handling, and authorization flows
Build dashboard interfaces, analytics views, and dynamic data visualizations
Optimize application performance, responsiveness, and maintainability
Debug, test, and improve application reliability
Collaborate using Git/GitHub workflows in team environments
Participate in architecture discussions and feature development
Required Skills
Frontend
React.js
JavaScript (ES6+)
HTML5
CSS3
Tailwind CSS
Bootstrap / Material UI
State management
Component architecture
Backend
Node.js
Express.js
REST API development
Middleware
Authentication systems
Request/response lifecycle handling
Database
MongoDB
CRUD operations
Schema design
Query optimization basics
Tools
Git
GitHub
Postman
npm / yarn
Preferred Skills
AI API integration (Groq / OpenAI / LLM workflows)
Cloudinary / media storage
Deployment experience (Render / Vercel / Netlify)
Chart.js / dashboard visualization
Basic DevOps understanding
DSA / problem solving
Relevant Project Experience

Candidates should ideally have built projects similar to:

AI-powered code review tools
Resume screening or HR automation platforms
Trading/dashboard applications
Travel marketplace / listing platforms
Authentication-based CRUD applications
Qualification
B.Tech / BE in Computer Science or related field
Final year students / recent graduates can apply
Nice to Have
100+ DSA problems solved
Open-source contributions
Technical blogging
Internship experience in full-stack development`;

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFiles, setResumeFiles] = useState([]);
  const [screeningId, setScreeningId] = useState(null);
  const [results, setResults] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Screening resumes...");
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  const workspaceRef = useRef(null);
  const howItWorksRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const sessionsData = await getSessions();
      setSessions(sessionsData);
    } catch (err) {
      console.error("Failed to load screening history:", err);
    }
  };

  const handleSelectSession = async (session) => {
    setLoading(true);
    setError(null);
    setSelectedCandidateIds([]);
    setShowComparison(false);
    try {
      setScreeningId(session.id);
      setJobDescription(session.job_description);

      const resultsData = await getResults(session.id, minScore);
      setResults(resultsData.results);
      setFilteredResults(resultsData.results);

      workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError("Failed to load results for this session: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic status text cycler for a highly polished SaaS feel
  useEffect(() => {
    if (!loading) return;
    const stages = [
      "Extracting text content from uploaded PDFs...",
      "Analyzing candidate profiles against guidelines...",
      "Running deterministic grading rubric using Llama-3.3...",
      "Calculating skills match & experience alignment...",
      "Ranking candidates and compiling detailed evaluation drawers..."
    ];
    let idx = 0;
    setLoadingText(stages[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setLoadingText(stages[idx]);
    }, 2800);
    return () => clearInterval(interval);
  }, [loading]);

  const handleFilesSelect = (files) => {
    setResumeFiles(files);
  };

  const handleJobDescChange = (text) => {
    setJobDescription(text);
  };

  const handleUseSample = () => {
    setJobDescription(SAMPLE_JD);
  };

  const handleClearJD = () => {
    setJobDescription("");
  };

  const scrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleMinScoreChange = async (score) => {
    setMinScore(score);

    if (screeningId) {
      try {
        const data = await getResults(screeningId, score);
        setFilteredResults(data.results);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleSelectCandidate = (id) => {
    setSelectedCandidateIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleScreening = async () => {
    if (!jobDescription.trim() || jobDescription.trim().length < 10) {
      setError("Job description is too short. Minimum 10 characters required.");
      return;
    }

    if (resumeFiles.length === 0) {
      setError("Please upload or drag at least one candidate resume PDF.");
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedCandidateIds([]);
    setShowComparison(false);

    try {
      const response = await screenResumes(jobDescription, resumeFiles);
      setScreeningId(response.screening_id);

      const resultsData = await getResults(response.screening_id, minScore);
      setResults(resultsData.results);
      setFilteredResults(resultsData.results);

      // Reload history sidebar
      fetchSessions();
    } catch (err) {
      setError(err.message || "An unexpected error occurred during resume screening. Please check file validity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* 1. TOP NAVBAR */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.navLogo} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className={styles.logoMark}>✦</span>
            <span className={styles.logoText}>HireLens</span>
            <span className={styles.logoBadge}>AI</span>
          </div>
          <div className={styles.navLinks}>
            <button onClick={scrollToHowItWorks} className={styles.navLink}>
              How It Works
            </button>
            <button onClick={handleUseSample} className={styles.navLink}>
              Load Sample JD
            </button>
            <a
              href="https://github.com/VeCtORbytes/resume-screener"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navLink}
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroTag}> Recruiter intelligence workspace</div>
          <h1 className={styles.heroTitle}>Screen Candidates in Minutes, Not Hours</h1>
          <p className={styles.heroSubtitle}>
            Accelerate your hiring funnel. Upload a batch of resume PDFs and instantly rank technical, experience, and domain alignment against your specific job description in seconds.
          </p>
          <div className={styles.heroActions}>
            <button onClick={scrollToWorkspace} className={styles.heroCta}>
              Start Screening ➔
            </button>
            <button onClick={scrollToHowItWorks} className={styles.heroSecondaryCta}>
              Learn more
            </button>
          </div>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <main ref={workspaceRef} className={styles.workspaceSection}>
        <div className={styles.workspaceContainer}>
          <div className={styles.workspaceLayout}>
            {/* LEFT PANEL = Inputs */}
            <section className={styles.leftPanel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Screening Setup</h3>
                <p className={styles.panelSubtitle}>Configure your evaluation constraints</p>
              </div>

              <div className={styles.inputStack}>
                <FileUpload
                  files={resumeFiles}
                  onFilesSelect={handleFilesSelect}
                  isLoading={loading}
                />

                <JobDescInput
                  value={jobDescription}
                  onChange={handleJobDescChange}
                  isLoading={loading}
                  onUseSample={handleUseSample}
                  onClear={handleClearJD}
                />

                {/* Validation UX - elegant inline box */}
                {error && (
                  <div className={styles.errorBox}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <div className={styles.errorTextContainer}>
                      <span className={styles.errorTitle}>Validation Error</span>
                      <p className={styles.errorDetail}>{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className={styles.errorClose} title="Dismiss">
                      ✕
                    </button>
                  </div>
                )}

                {/* Primary Screening CTA */}
                <button
                  onClick={handleScreening}
                  disabled={loading || !jobDescription.trim() || resumeFiles.length === 0}
                  className={styles.submitBtn}
                >
                  {loading ? (
                    <>
                      <div className={styles.loaderSpinner}></div>
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <span>Initiate Candidates Screening</span>
                  )}
                </button>

                {/* 🕒 Screening History Panel */}
                <div className={styles.historyPanel}>
                  <div className={styles.historyHeader}>
                    <h4 className={styles.historyTitle}>
                      <span className={styles.historyTitleIcon}>🕒</span> Previous Screenings
                    </h4>
                  </div>

                  {sessions.length > 0 ? (
                    <div className={styles.historyList}>
                      {sessions.map((s) => {
                        const isActive = screeningId === s.id;
                        const dateStr = new Date(s.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });

                        // Clean role name from JD text
                        let roleName = "Screening Session";
                        if (s.job_description) {
                          const lines = s.job_description.split("\n");
                          const roleLine = lines.find(l => l.toLowerCase().includes("role:") || l.toLowerCase().includes("title:"));
                          if (roleLine) {
                            roleName = roleLine.replace(/(role:|title:)/i, "").trim();
                          } else {
                            // Fallback to first line or slice of description
                            roleName = lines[0].trim() || s.job_description.slice(0, 30);
                          }
                        }
                        if (roleName.length > 30) {
                          roleName = roleName.slice(0, 30) + "...";
                        }

                        return (
                          <button
                            key={s.id}
                            onClick={() => handleSelectSession(s)}
                            className={`${styles.historyItem} ${isActive ? styles.activeHistoryItem : ""}`}
                          >
                            <div className={styles.historyItemMeta}>
                              <span className={styles.historyItemTitle} title={roleName}>
                                {roleName}
                              </span>
                              <span className={styles.historyItemDate}>{dateStr}</span>
                            </div>
                            <div className={styles.historyItemDetails}>
                              <span className={styles.historyItemPill}>
                                {s.result_count} {s.result_count === 1 ? "resume" : "resumes"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={styles.emptyHistory}>No prior screenings found.</p>
                  )}
                </div>
              </div>
            </section>

            {/* RIGHT PANEL = Results */}
            <section className={styles.rightPanel}>
              {loading ? (
                /* Premium Dynamic Loading State */
                <div className={styles.loadingWrapper}>
                  <div className={styles.loadingInner}>
                    <div className={styles.doublePulse}>
                      <div className={styles.pulse1}></div>
                      <div className={styles.pulse2}></div>
                    </div>
                    <h4 className={styles.loadingTitle}>{loadingText}</h4>
                    <p className={styles.loadingSub}>
                      Our recruiting models are evaluating candidate files against your deterministic mathematical rubric.
                    </p>
                  </div>
                </div>
              ) : screeningId ? (
                /* Results Experience */
                <div className={styles.resultsStack}>
                  {showComparison ? (
                    <CandidateComparison
                      selectedCandidates={filteredResults.filter(r => selectedCandidateIds.includes(r.id))}
                      onClose={() => setShowComparison(false)}
                    />
                  ) : (
                    <>
                      <FilterControl
                        minScore={minScore}
                        onChange={handleMinScoreChange}
                        isLoading={loading}
                      />

                      {/* Premium Side-by-Side Compare Action Status Bar */}
                      <div className={styles.compareBar}>
                        <div className={styles.compareInfo}>
                          <span className={styles.compareIcon}>⚖️</span>
                          <span className={styles.compareText}>
                            Select candidates to compare side-by-side (max 3): <strong>{selectedCandidateIds.length} selected</strong>
                          </span>
                        </div>
                        <div className={styles.compareActions}>
                          {selectedCandidateIds.length > 0 && (
                            <button
                              onClick={() => setSelectedCandidateIds([])}
                              className={styles.resetBtn}
                            >
                              Reset
                            </button>
                          )}
                          <button
                            onClick={() => setShowComparison(true)}
                            disabled={selectedCandidateIds.length < 2}
                            className={styles.compareBtn}
                          >
                            Compare Candidates
                          </button>
                        </div>
                      </div>

                      <AnalyticsDashboard results={filteredResults} isLoading={loading} />
                      <ResultsTable
                        results={filteredResults}
                        isLoading={loading}
                        selectedIds={selectedCandidateIds}
                        onSelect={handleSelectCandidate}
                        screeningId={screeningId}
                      />
                    </>
                  )}
                </div>
              ) : (
                /* Elegant Empty State */
                <div className={styles.emptyResultsWrapper}>
                  <div className={styles.emptyStateCard}>
                    <span className={styles.emptyStateIcon}>📊</span>
                    <h4 className={styles.emptyStateTitle}>Evaluation Workspace</h4>
                    <p className={styles.emptyStateDesc}>
                      Configure your job requirements and upload candidate PDFs on the left, then trigger screening to load the ranked candidate list here.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* 9. HOW IT WORKS SECTION */}
      <section ref={howItWorksRef} className={styles.howItWorksSection}>
        <div className={styles.howContainer}>
          <h2 className={styles.sectionHeading}>Engineered for Recruiter Accuracy</h2>
          <p className={styles.sectionSub}>Standardized candidate filtering without subjective bias</p>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>1</div>
              <h4 className={styles.stepTitle}>Ingest Candidate Profiles</h4>
              <p className={styles.stepText}>
                Securely drop up to 20 candidate resume PDFs at a time. The system strips formatting and extracts raw biographical records.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNum}>2</div>
              <h4 className={styles.stepTitle}>Provide Job Mandates</h4>
              <p className={styles.stepText}>
                Input target role descriptions. High-speed filters validate semantic professional keyword alignment instantly.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepNum}>3</div>
              <h4 className={styles.stepTitle}>Explore Rubric Match</h4>
              <p className={styles.stepText}>
                Llama-3.3 reviews candidate records against a standardized mathematical rubric grading skills, history, and domain depth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.footerDev}>
            Engineered by <strong>Sarthak Gupta</strong>
          </p>
          <p className={styles.footerTech}>
            Powered by Next.js, FastAPI, PostgreSQL, and Groq LLM API
          </p>
          <div className={styles.footerLinks}>
            <a href="https://github.com/VeCtORbytes/resume-screener" target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}