"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import FileUpload from "../components/FileUpload";
import JobDescInput from "../components/JobDescInput";
import ResultsTable from "../components/ResultsTable";
import FilterControl from "../components/FilterControl";
import WorkspaceHeader from "../components/WorkspaceHeader";
import CandidateWorkspace from "../components/CandidateWorkspace";
import { screenResumes, getResults, getSessions } from "../lib/api";
import useStructuredJob from "../hooks/useStructuredJob";
import useScreeningResults from "../hooks/useScreeningResults";
import useCandidateSelection from "../hooks/useCandidateSelection";
import usePipelineStatus from "../hooks/usePipelineStatus";
import useRecruiterNotes from "../hooks/useRecruiterNotes";
import { buildJdFromStructured } from "../lib/jdBuilders";
import styles from "./page.module.css";
import { ALL_FILTER_STATUSES } from "../constants/statuses";

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [inputMode, setInputMode] = useState("paste");

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

  const {
    sessions,
    activeSession,
    screeningId,
    setScreeningId,
    results: rawResults,
    filteredResults: rawFilteredResults,
    minScore,
    loading,
    loadingText,
    error,
    setError,
    loadSessionResults,
    updateMinScore,
    performScreening
  } = useScreeningResults();

  const { activeCandidateId, setActiveCandidateId } = useCandidateSelection();

  // 1. Build ViewModels from raw data
  const { buildCandidateViewModel } = require("../lib/viewModels/candidateViewModel");
  const results = useMemo(() => rawResults.map(r => buildCandidateViewModel(r)), [rawResults]);
  const filteredResults = useMemo(() => rawFilteredResults.map(r => buildCandidateViewModel(r)), [rawFilteredResults]);

  const {
    candidateStatuses,
    statusFilter,
    setStatusFilter,
    shortlistCount,
    handleStatusChange,
    getWorkspaceCounts
  } = usePipelineStatus(screeningId, results);

  const {
    candidateNotes,
    handleNoteChange
  } = useRecruiterNotes(screeningId);

  const workspaceRef = useRef(null);
  const howItWorksRef = useRef(null);

  const handleSelectSession = async (session) => {
    setJobDescription(session.job_description);
    setInputMode("paste");
    await loadSessionResults(session);
    workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
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
    await updateMinScore(score);
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

    const success = await performScreening(targetJD, resumeFiles);
    if (success) {
      // Reload history sidebar is handled inside performScreening (it calls fetchSessions)
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

          {/* Screening History Drawer */}
          {isHistoryOpen && (
            <>
              <div className={styles.drawerOverlay} onClick={() => setIsHistoryOpen(false)} />
              <div className={styles.historyDrawer}>
                <div className={styles.historyDrawerHeader}>
                  <h3 className={styles.historyDrawerTitle}>Screening History</h3>
                  <button className={styles.closeDrawerBtn} style={{ position: 'relative', top: 'auto', right: 'auto' }} onClick={() => setIsHistoryOpen(false)}>×</button>
                </div>
                <div className={styles.historyDrawerContent}>
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
                        const roleLine = lines.find((l) => l.toLowerCase().includes("role:") || l.toLowerCase().includes("title:"));
                        if (roleLine) roleName = roleLine.replace(/(role:|title:)/i, "").trim();
                        else roleName = lines[0].trim() || s.job_description.slice(0, 30);
                      }
                      if (roleName.length > 40) roleName = roleName.slice(0, 40) + "...";

                      return (
                        <button
                          key={s.id}
                          onClick={() => { handleSelectSession(s); setIsHistoryOpen(false); }}
                          className={`${styles.historyDrawerItem} ${isActive ? styles.activeHistoryDrawerItem : ""}`}
                        >
                          <div className={styles.historyDrawerItemTitle}>{roleName}</div>
                          <div className={styles.historyDrawerItemMeta}>
                            <span className={styles.historyDrawerItemCount}>{s.result_count} Candidates</span>
                            <span className={styles.historyDrawerItemDate}>{dateStr}</span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <p className={styles.emptyHistory}>No prior screenings found.</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className={styles.topHistorySection}>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className={styles.historyToggleBtn}
            >
              <span className={styles.historyIcon}>🕒</span> Screening History
            </button>
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
                <div className={styles.modeToggle}>
                  <button 
                    className={`${styles.modeToggleBtn} ${inputMode === "paste" ? styles.activeMode : ""}`} 
                    onClick={() => setInputMode("paste")}
                  >
                    Paste JD
                  </button>
                  <button 
                    className={`${styles.modeToggleBtn} ${inputMode === "build" ? styles.activeMode : ""}`} 
                    onClick={() => setInputMode("build")}
                  >
                    Build JD
                  </button>
                </div>
                
                {inputMode === "paste" ? (
                  <JobDescInput
                    freeTextValue={jobDescription}
                    onFreeTextChange={handleJobDescChange}
                    isLoading={loading}
                    onUseSample={handleUseSample}
                    onClear={handleClearJD}
                  />
                ) : (
                  <div className={styles.builderPlaceholder}>
                    <p>Structured Builder UI coming soon. Please use Paste JD for now.</p>
                  </div>
                )}
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
                      <WorkspaceHeader counts={getWorkspaceCounts()} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />

                      <FilterControl
                        minScore={minScore}
                        onChange={handleMinScoreChange}
                        isLoading={loading}
                      />


                      <div className={styles.splitViewContainer}>
                        <div className={styles.queueColumn}>
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
                        
                        <div className={styles.workspaceColumn}>
                          {activeCandidateId ? (
                            (() => {
                              const activeCandidate = filteredResults.find(r => r.id === activeCandidateId);
                              if (!activeCandidate) return null;
                              return (
                                <CandidateWorkspace
                                  candidate={activeCandidate}
                                  status={candidateStatuses[activeCandidateId] || "New"}
                                  onStatusChange={(newStatus) => handleStatusChange(activeCandidateId, newStatus)}
                                  note={candidateNotes[activeCandidateId] || ""}
                                  onNoteChange={(newNote) => handleNoteChange(activeCandidateId, newNote)}
                                  onExportPdf={() => {}}
                                />
                              );
                            })()
                          ) : (
                            <div className={styles.emptyWorkspaceColumn}>
                              <span className={styles.emptyWorkspaceIcon}>📄</span>
                              <h4 className={styles.emptyWorkspaceTitle}>No Candidate Selected</h4>
                              <p className={styles.emptyWorkspaceDesc}>Select a candidate from the queue to view their full evaluation dossier.</p>
                            </div>
                          )}
                        </div>
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

      {/* Global Validation Toast */}
      {error && (
        <div className={styles.globalErrorToast}>
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