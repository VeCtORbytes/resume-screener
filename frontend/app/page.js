"use client";

import { useState, useEffect, useRef } from "react";
import FileUpload from "../components/FileUpload";
import JobDescInput from "../components/JobDescInput";
import ResultsTable from "../components/ResultsTable";
import FilterControl from "../components/FilterControl";
import WorkspaceHeader from "../components/WorkspaceHeader";
import CandidateWorkspace from "../components/CandidateWorkspace";
import { screenResumes, getResults, getSessions } from "../lib/api";
import useStructuredJob from "../hooks/useStructuredJob";
import { buildJdFromStructured } from "../lib/jdBuilders";
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
  const [shortlistCount, setShortlistCount] = useState(0);
  const [activeCandidateId, setActiveCandidateId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [inputMode, setInputMode] = useState("paste");

  const [candidateStatuses, setCandidateStatuses] = useState({});
  const [candidateNotes, setCandidateNotes] = useState({});
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    if (!screeningId) {
      setCandidateStatuses({});
      setCandidateNotes({});
      return;
    }
    try {
      const storedStatuses = localStorage.getItem(`hirelens_statuses_${screeningId}`);
      const storedNotes = localStorage.getItem(`hirelens_notes_${screeningId}`);

      const parsedStatuses = storedStatuses ? JSON.parse(storedStatuses) : {};
      const parsedNotes = storedNotes ? JSON.parse(storedNotes) : {};

      // Ensure all candidates in results have at least "New" status if not set
      const updatedStatuses = { ...parsedStatuses };
      let updated = false;
      results.forEach(r => {
        if (!updatedStatuses[r.id]) {
          updatedStatuses[r.id] = "New";
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem(`hirelens_statuses_${screeningId}`, JSON.stringify(updatedStatuses));
      }

      setCandidateStatuses(updatedStatuses);
      setCandidateNotes(parsedNotes);
    } catch (e) {
      console.error("Failed to load statuses/notes from localStorage:", e);
    }
  }, [screeningId, results]);

  useEffect(() => {
    const count = Object.values(candidateStatuses).filter(status => status === "Shortlisted").length;
    setShortlistCount(count);
  }, [candidateStatuses]);

  const handleStatusChange = (candId, newStatus) => {
    const updated = {
      ...candidateStatuses,
      [candId]: newStatus
    };
    setCandidateStatuses(updated);
    if (screeningId) {
      localStorage.setItem(`hirelens_statuses_${screeningId}`, JSON.stringify(updated));
    }
  };

  const handleNoteChange = (candId, newNote) => {
    const updated = {
      ...candidateNotes,
      [candId]: newNote
    };
    setCandidateNotes(updated);
    if (screeningId) {
      localStorage.setItem(`hirelens_notes_${screeningId}`, JSON.stringify(updated));
    }
  };

  const getWorkspaceCounts = () => {
    const counts = {
      total: results.length,
      shortlisted: 0,
      interview: 0,
      reviewLater: 0,
      rejected: 0,
      new: 0
    };

    results.forEach(r => {
      const status = candidateStatuses[r.id] || "New";
      if (status === "Shortlisted") counts.shortlisted++;
      else if (status === "Interview") counts.interview++;
      else if (status === "Review Later") counts.reviewLater++;
      else if (status === "Rejected") counts.rejected++;
      else counts.new++;
    });

    return counts;
  };

  const {
    structuredJob,
    setStructuredJob,
    updateRoleInfo,
    addMustHaveSkill,
    removeMustHaveSkill,
    addGoodToHaveSkill,
    removeGoodToHaveSkill,
    updateTextField,
    resetJob
  } = useStructuredJob();

  useEffect(() => {
    if (screeningId && sessions.length > 0) {
      const found = sessions.find(s => s.id === screeningId);
      if (found) {
        setActiveSession(found);
      }
    } else if (!screeningId) {
      setActiveSession(null);
    }
  }, [screeningId, sessions]);

  // shortlist count is managed by candidateStatuses state sync

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
    setMinScore(0);
    try {
      setScreeningId(session.id);
      setJobDescription(session.job_description);
      setInputMode("paste"); // Force history sessions to Pasteur mode

      const resultsData = await getResults(session.id, 0);
      setResults(resultsData.results);
      setFilteredResults(resultsData.results);

      workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError("Failed to load results for this session: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic status text cycler removed for simplicity
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
    resetJob();
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


  const handleScreening = async () => {
    let targetJD = jobDescription;

    if (inputMode === "build") {
      if (!structuredJob.roleInfo.title || !structuredJob.roleInfo.title.trim()) {
        setError("Job Title is required in structured requirements builder mode.");
        return;
      }
      targetJD = buildJdFromStructured(structuredJob);
      setJobDescription(targetJD);
    } else {
      if (!jobDescription.trim() || jobDescription.trim().length < 10) {
        setError("Job description is too short. Minimum 10 characters required.");
        return;
      }
    }

    if (resumeFiles.length === 0) {
      setError("Please upload or drag at least one candidate resume PDF.");
      return;
    }

    setLoading(true);
    setError(null);
    setMinScore(0);

    try {
      const response = await screenResumes(targetJD, resumeFiles);
      setScreeningId(response.screening_id);

      const resultsData = await getResults(response.screening_id, 0);
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

      {/* 2. EDITORIAL HERO SECTION */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Review candidates,<br />not resumes.</h1>
          <p className={styles.heroSubtitle}>
            Create hiring requirements and let HireLens surface the strongest matches. Intentional recruitment software designed to find target capabilities with absolute simplicity.
          </p>
          <div className={styles.heroActions}>
            <button onClick={scrollToWorkspace} className={styles.heroCta}>
              Create Hiring Requirements
            </button>
          </div>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE */}
      <main ref={workspaceRef} className={styles.workspaceSection}>
        <div className={styles.workspaceContainer}>

          {/* Horizontal Recruiter Workflow Timeline Navigator */}
          <div className={styles.workflowNav}>
            <div className={`${styles.workflowNavStep} ${(!screeningId && !resumeFiles.length) ? styles.activeNavStep : ""}`}>
              <span className={styles.navStepNum}>01</span>
              <div className="">
                <strong>Job Requirements</strong>

              </div>
            </div>
            <div className={styles.workflowNavArrow}>→</div>
            <div className={`${styles.workflowNavStep} ${(resumeFiles.length > 0 && !screeningId) ? styles.activeNavStep : ""}`}>
              <span className={styles.navStepNum}>02</span>
              <div className="">
                <strong>Upload Resumes</strong>

              </div>
            </div>
            <div className={styles.workflowNavArrow}>→</div>
            <div className={`${styles.workflowNavStep} ${(screeningId && !activeSession) ? styles.activeNavStep : ""}`}>
              <span className={styles.navStepNum}>03</span>
              <div className="">
                <strong>Review Candidates</strong>

              </div>
            </div>
            <div className={styles.workflowNavArrow}>→</div>
            <div className={`${styles.workflowNavStep} ${(activeSession) ? styles.activeNavStep : ""}`}>
              <span className={styles.navStepNum}>04</span>
              <div className="">
                <strong>Hiring Decision</strong>

              </div>
            </div>
          </div>

          {/* Screening History */}
          <div className={styles.topHistorySection}>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={styles.historyToggleBtn}
            >
              {isHistoryOpen ? "Hide History" : "Screening History"}
            </button>

            {isHistoryOpen && (
              <div
                className={styles.topHistoryList}
                style={{
                  maxHeight: "280px",
                  overflowY: "auto",
                  marginTop: "12px",
                }}
              >
                {sessions.length > 0 ? (
                  sessions.map((s) => {
                    const isActive = screeningId === s.id;
                    const dateStr = new Date(s.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    let roleName = "Screening Session";

                    if (s.job_description) {
                      const lines = s.job_description.split("\n");
                      const roleLine = lines.find(
                        (l) =>
                          l.toLowerCase().includes("role:") ||
                          l.toLowerCase().includes("title:")
                      );

                      if (roleLine) {
                        roleName = roleLine.replace(/(role:|title:)/i, "").trim();
                      } else {
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
                        className={`${styles.topHistoryItem} ${isActive ? styles.activeTopHistoryItem : ""
                          }`}
                      >
                        <div className={styles.topHistoryItemContent}>
                          <div className={styles.topHistoryItemTitle}>
                            {roleName}
                          </div>

                          <div className={styles.topHistoryItemCount}>
                            {s.result_count} Candidates
                          </div>

                          <div className={styles.topHistoryItemDate}>
                            {dateStr}
                          </div>
                        </div>

                        <span className="">
                          {s.result_count}{" "}
                          {s.result_count === 1 ? "resume" : "resumes"}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className={styles.emptyHistory}>No prior screenings found.</p>
                )}
              </div>
            )}
          </div>

          <div className={styles.workflowStack}>

            {/* STEP 1: Job Description */}
            <div className={styles.workflowStep}>
              <div className={styles.stepHeader}>
                <span className={`${styles.stepBadge} hl-badge`}>STEP 1</span>
                <h3 className={styles.stepTitle}>Job Description & Mandates</h3>
                <p className={styles.stepDesc}>Define the target role description, key skills, and mandatory requirements</p>
              </div>
              <div className={styles.workflowCard}>
                <JobDescInput
                  freeTextValue={jobDescription}
                  onFreeTextChange={handleJobDescChange}
                  isLoading={loading}
                  onUseSample={handleUseSample}
                  onClear={handleClearJD}
                />
              </div>
            </div>

            {/* STEP 2: Resume Upload & Screening Ingestion */}
            <div className={styles.workflowStep}>
              <div className={styles.stepHeader}>
                <span className={`${styles.stepBadge} hl-badge`}>STEP 2</span>

                <h3 className={styles.stepTitle}>
                  Upload Candidate Resumes
                </h3>

                <p className={styles.stepDesc}>
                  Upload resumes and let HireLens identify the strongest candidates for this role.
                </p>
              </div>
              <div className={styles.workflowCard}>
                <FileUpload
                  files={resumeFiles}
                  onFilesSelect={handleFilesSelect}
                  isLoading={loading}
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
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <span>Review Candidates</span>
                  )}
                </button>
              </div>
            </div>

            {/* STEP 3: Candidate Results */}
            <div className={styles.workflowStep}>
              <div className={styles.stepHeader}>
                <span className={`${styles.stepBadge} hl-badge`}>STEP 3</span>
                <h3 className={styles.stepTitle}>Hiring Suitability Results</h3>
                <p className={styles.stepDesc}>Explore screened candidates, match score comparisons, and make final decisions</p>
              </div>

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
                      Our AI models are evaluating candidate files against your standardized mathematical grading rubric.
                    </p>
                  </div>
                </div>
              ) : screeningId ? (
                /* Results Experience */
                <div className={styles.resultsStack}>
                  <>
                      <WorkspaceHeader counts={getWorkspaceCounts()} />

                      <FilterControl
                        minScore={minScore}
                        onChange={handleMinScoreChange}
                        isLoading={loading}
                      />

                      {/* Premium Pipeline Filtering Bar */}
                      <div className={styles.pipelineFilterBar}>
                        <span className={styles.pipelineFilterLabel}>Pipeline Status:</span>
                        <div className={styles.pipelineFilterTabs}>
                          {["All", "New", "Review Later", "Shortlisted", "Interview", "Rejected"].map(filterVal => {
                            const counts = getWorkspaceCounts();
                            let displayCount = counts.total;
                            if (filterVal === "New") displayCount = counts.new;
                            else if (filterVal === "Review Later") displayCount = counts.reviewLater;
                            else if (filterVal === "Shortlisted") displayCount = counts.shortlisted;
                            else if (filterVal === "Interview") displayCount = counts.interview;
                            else if (filterVal === "Rejected") displayCount = counts.rejected;

                            return (
                              <button
                                key={filterVal}
                                onClick={() => setStatusFilter(filterVal)}
                                className={`${styles.pipelineFilterBtn} ${statusFilter === filterVal ? styles.activePipelineFilter : ""}`}
                              >
                                <span>{filterVal}</span>
                                <span className={styles.pipelineFilterBadge}>{displayCount}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>


                      <div className={styles.resultsGrid}>
                        <div className={styles.tableColumn}>
                          <ResultsTable
                            results={filteredResults.filter(r => {
                              if (statusFilter === "All") return true;
                              const status = candidateStatuses[r.id] || "New";
                              return status === statusFilter;
                            })}
                            isLoading={loading}
                            screeningId={screeningId}
                            activeSession={activeSession}
                            candidateStatuses={candidateStatuses}
                            onStatusChange={handleStatusChange}
                            candidateNotes={candidateNotes}
                            onNoteChange={handleNoteChange}
                            onViewCandidate={setActiveCandidateId}
                            activeCandidateId={activeCandidateId}
                          />
                        </div>
                        {activeCandidateId && (
                          <div className={styles.workspaceColumn}>
                            {(() => {
                              const activeCandidate = results.find(r => r.id === activeCandidateId);
                              if (!activeCandidate) return null;

                              const status = candidateStatuses[activeCandidate.id] || "New";
                              const note = candidateNotes[activeCandidate.id] || "";

                              return (
                                <CandidateWorkspace
                                  candidate={activeCandidate}
                                  status={status}
                                  onStatusChange={(newStatus) => handleStatusChange(activeCandidate.id, newStatus)}
                                  note={note}
                                  onNoteChange={(newNote) => handleNoteChange(activeCandidate.id, newNote)}
                                  onExportPdf={() => {}}
                                />
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </>

                </div>
              ) : (
                /* Elegant simplified recruiter empty state */
                <div className={styles.emptyResultsWrapper}>
                  <div className={styles.emptyStateCard}>
                    <span className={styles.emptyStateIcon}>📂</span>
                    <h4 className={styles.emptyStateTitle}>No resumes uploaded yet</h4>
                    <p className={styles.emptyStateDesc}>
                      Upload candidate resumes in Step 2 to start reviewing and screening candidates.
                    </p>
                  </div>
                </div>
              )}
            </div>

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