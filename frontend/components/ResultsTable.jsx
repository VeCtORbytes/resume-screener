"use client";

import { useState, Fragment, useEffect } from "react";
import styles from "./ResultsTable.module.css";
import { getScoreBadge } from "../lib/constants";
import { generateInterviewQuestions, exportPDF, exportCSV, exportComparison } from "../lib/api";

function getCandidateName(filename) {
    if (!filename) return "Unknown Candidate";
    return filename.split('.')[0].replace(/[_]/g, ' ').replace(/[-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getHiringRecommendation(score) {
    if (score >= 90) return { text: "Strong Hire", emoji: "🟢", color: "#10b981", class: styles.strongHire };
    if (score >= 80) return { text: "Hire", emoji: "🟢", color: "#10b981", class: styles.hire };
    if (score >= 65) return { text: "Needs Interview", emoji: "🟡", color: "#f59e0b", class: styles.needsInterview };
    if (score >= 50) return { text: "Needs Review", emoji: "🟠", color: "#f97316", class: styles.needsReview };
    return { text: "Reject", emoji: "🔴", color: "#ef4444", class: styles.reject };
}

function getStageClass(stage) {
    switch (stage) {
        case "Applied": return "stageApplied";
        case "Screened": return "stageScreened";
        case "Shortlisted": return "stageShortlisted";
        case "Interview Scheduled": return "stageInterviewScheduled";
        case "Interviewed": return "stageInterviewed";
        case "Offer": return "stageOffer";
        case "Rejected": return "stageRejected";
        default: return "stageApplied";
    }
}

// Robust regex-based reasoning text parser
function parseReasoning(reasoning) {
    if (!reasoning) return null;

    try {
        const hasBreakdown = reasoning.includes("Breakdown:") || reasoning.includes("Breakdown");
        const hasStrengths = reasoning.includes("Strengths:") || reasoning.includes("Strengths");
        const hasGaps = reasoning.includes("Gaps:") || reasoning.includes("Gaps");

        if (!hasBreakdown && !hasStrengths && !hasGaps) {
            return { type: "raw", text: reasoning };
        }

        // Extract Recommendation
        let recommendation = "";
        const recMatch = reasoning.match(/Recommendation:\s*([^\n\r]+)/i);
        if (recMatch) {
            recommendation = recMatch[1].trim();
        }

        // Extract Breakdown metrics
        const breakdown = {
            skills: 0, maxSkills: 40,
            experience: 0, maxExperience: 25,
            projects: 0, maxProjects: 20,
            education: 0, maxEducation: 10,
            domain: 0, maxDomain: 5
        };

        const skillsMatch = reasoning.match(/(?:Skills|Skills Match):\s*(\d+)/i);
        if (skillsMatch) breakdown.skills = parseInt(skillsMatch[1]);

        const expMatch = reasoning.match(/(?:Experience|Experience Relevance):\s*(\d+)/i);
        if (expMatch) breakdown.experience = parseInt(expMatch[1]);

        const projMatch = reasoning.match(/(?:Projects|Project Relevance):\s*(\d+)/i);
        if (projMatch) breakdown.projects = parseInt(projMatch[1]);

        const eduMatch = reasoning.match(/(?:Education|Education & Certifications):\s*(\d+)/i);
        if (eduMatch) breakdown.education = parseInt(eduMatch[1]);

        const domMatch = reasoning.match(/(?:Domain|Domain & Keyword Fit):\s*(\d+)/i);
        if (domMatch) breakdown.domain = parseInt(domMatch[1]);

        // Extract Strengths list
        let strengths = [];
        const strengthsParts = reasoning.split(/✅ Strengths:|Strengths:/i);
        if (strengthsParts.length > 1) {
            const strengthsText = strengthsParts[1].split(/⚠️ Gaps:|Gaps:/i)[0];
            strengths = strengthsText
                .split("\n")
                .map(line => line.replace(/^[-•*✅\s]+/, "").trim())
                .filter(line => line.length > 3);
        }

        // Extract Gaps list
        let gaps = [];
        const gapsParts = reasoning.split(/⚠️ Gaps:|Gaps:/i);
        if (gapsParts.length > 1) {
            gaps = gapsParts[1]
                .split("\n")
                .map(line => line.replace(/^[-•*⚠️\s]+/, "").trim())
                .filter(line => line.length > 3);
        }

        return {
            type: "structured",
            recommendation,
            breakdown,
            strengths,
            gaps
        };
    } catch (e) {
        console.error("Error parsing reasoning text:", e);
        return { type: "raw", text: reasoning };
    }
}

export default function ResultsTable({ results = [], isLoading, selectedIds = [], onSelect, screeningId }) {
    const [expandedIds, setExpandedIds] = useState({});
    const [candidateQuestions, setCandidateQuestions] = useState({});
    const [generatingId, setGeneratingId] = useState(null);
    const [generationError, setGenerationError] = useState({});
    const [activeQuestionTab, setActiveQuestionTab] = useState({}); // Stores active tab name mapped per candidate
    const [detailActiveTab, setDetailActiveTab] = useState({}); // Stores active details drawer tab per candidate
    const [shortlist, setShortlist] = useState({}); // Stores shortlist state mapped per candidate
    const [notes, setNotes] = useState({}); // Stores recruiter notes mapped per candidate
    const [stages, setStages] = useState({}); // Stores candidate pipeline stages mapped per candidate
    const [copiedText, setCopiedText] = useState(null);
    const [exportingPdfId, setExportingPdfId] = useState(null);
    const [exportPdfError, setExportPdfError] = useState({});
    const [exportingGlobal, setExportingGlobal] = useState(false);
    const [globalExportError, setGlobalExportError] = useState(null);
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Sync recruiter workflow state from localStorage when screeningId changes
    useEffect(() => {
        if (!screeningId) return;
        try {
            const storedShortlist = localStorage.getItem(`hirelens_shortlist_${screeningId}`);
            setShortlist(storedShortlist ? JSON.parse(storedShortlist) : {});
            
            const storedNotes = localStorage.getItem(`hirelens_notes_${screeningId}`);
            setNotes(storedNotes ? JSON.parse(storedNotes) : {});
            
            const storedStages = localStorage.getItem(`hirelens_stages_${screeningId}`);
            setStages(storedStages ? JSON.parse(storedStages) : {});
        } catch (e) {
            console.error("Failed to load recruiter workflow state:", e);
        }
    }, [screeningId]);

    const handleToggleShortlist = (e, candId) => {
        if (e) e.stopPropagation();
        const updated = {
            ...shortlist,
            [candId]: !shortlist[candId]
        };
        setShortlist(updated);
        localStorage.setItem(`hirelens_shortlist_${screeningId}`, JSON.stringify(updated));
        
        // Dispatch custom event to notify counter in page.js
        window.dispatchEvent(new Event("hirelens_shortlist_update"));
    };

    const handleSaveNote = (candId, text) => {
        const updated = {
            ...notes,
            [candId]: text
        };
        setNotes(updated);
        localStorage.setItem(`hirelens_notes_${screeningId}`, JSON.stringify(updated));
    };

    const handleChangeStage = (e, candId, newStage) => {
        if (e) e.stopPropagation();
        const updated = {
            ...stages,
            [candId]: newStage
        };
        setStages(updated);
        localStorage.setItem(`hirelens_stages_${screeningId}`, JSON.stringify(updated));
    };

    useEffect(() => {
        if (!isShareOpen) return;
        const closeShare = () => setIsShareOpen(false);
        window.addEventListener("click", closeShare);
        return () => window.removeEventListener("click", closeShare);
    }, [isShareOpen]);

    // Reset dependent drawer and generation states when the screening session transitions
    useEffect(() => {
        setExpandedIds({});
        setCandidateQuestions({});
        setGeneratingId(null);
        setGenerationError({});
        setActiveQuestionTab({});
        setDetailActiveTab({});
        setCopiedText(null);
        setExportingPdfId(null);
        setExportPdfError({});
        setExportingGlobal(false);
        setGlobalExportError(null);
        setIsShareOpen(false);
    }, [screeningId]);

    const toggleShareDropdown = (e) => {
        e.stopPropagation();
        setIsShareOpen((prev) => !prev);
    };

    const handleGlobalCSVExport = async (e) => {
        if (e) e.stopPropagation();
        if (!screeningId || results.length === 0) return;
        setExportingGlobal(true);
        setGlobalExportError(null);
        try {
            const dataToExport = results.map(r => ({
                id: r.id,
                resume_filename: r.resume_filename,
                score: r.score,
                reasoning: r.reasoning
            }));
            await exportCSV(screeningId, dataToExport);
        } catch (err) {
            setGlobalExportError("Failed to export spreadsheet: " + err.message);
        } finally {
            setExportingGlobal(false);
        }
    };

    const handleGlobalComparisonExport = async (e) => {
        if (e) e.stopPropagation();
        if (selectedIds.length === 0) return;
        setExportingGlobal(true);
        setGlobalExportError(null);
        try {
            await exportComparison(selectedIds);
        } catch (err) {
            setGlobalExportError("Failed to generate comparison report: " + err.message);
        } finally {
            setExportingGlobal(false);
        }
    };

    const handleExportPDF = async (e, resultId, filename) => {
        e.stopPropagation();
        setExportingPdfId(resultId);
        setExportPdfError((prev) => ({ ...prev, [resultId]: null }));
        try {
            const candidateName = filename.split('.')[0].replace(/[_]/g, ' ');
            const candNotes = notes[resultId] || "";
            const candStage = stages[resultId] || "Applied";
            
            // Flatten generated interview questions if present
            let flatQuestions = [];
            const questionsObj = candidateQuestions[resultId];
            if (questionsObj) {
                if (Array.isArray(questionsObj)) {
                    flatQuestions = questionsObj;
                } else if (typeof questionsObj === 'object') {
                    Object.keys(questionsObj).forEach((cat) => {
                        const list = questionsObj[cat];
                        if (Array.isArray(list)) {
                            list.forEach((q) => {
                                flatQuestions.push(`[${cat.replace(/_/g, ' ').toUpperCase()}] ${q}`);
                            });
                        }
                    });
                }
            }

            await exportPDF(resultId, candidateName, candNotes, candStage, flatQuestions);
        } catch (err) {
            setExportPdfError((prev) => ({
                ...prev,
                [resultId]: "Failed to generate recruiter intelligence report: " + err.message
            }));
        } finally {
            setExportingPdfId(null);
        }
    };

    const toggleExpand = (id) => {
        setExpandedIds((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
    };

    const handleGenerateQuestions = async (e, resultId) => {
        e.stopPropagation();
        setGeneratingId(resultId);
        setGenerationError((prev) => ({ ...prev, [resultId]: null }));

        try {
            const questionsData = await generateInterviewQuestions(resultId);
            setCandidateQuestions((prev) => ({
                ...prev,
                [resultId]: questionsData
            }));
            // Default to technical tab on success
            setActiveQuestionTab((prev) => ({
                ...prev,
                [resultId]: "technical"
            }));
        } catch (err) {
            setGenerationError((prev) => ({
                ...prev,
                [resultId]: err.message || "Failed to generate interview questions. Please retry."
            }));
        } finally {
            setGeneratingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Evaluating Resumes...</p>
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className={styles.empty}>
                <span className={styles.emptyIcon}>📂</span>
                <p className={styles.emptyText}>No results yet</p>
                <p className={styles.emptySubText}>Upload resumes and paste a job description to initiate screening.</p>
            </div>
        );
    }

    // Metric score badge tags
    const getRatioBadge = (val, max) => {
        const pct = (val / max) * 100;
        if (pct >= 85) return { text: "High Fit", class: styles.highFitTag };
        if (pct >= 60) return { text: "Moderate Fit", class: styles.moderateFitTag };
        return { text: "Low Fit", class: styles.lowFitTag };
    };

    // Sort results: Shortlisted candidates rise to the top. Tie-breaker is score descending.
    const sortedResults = [...results].sort((a, b) => {
        const aShort = !!shortlist[a.id];
        const bShort = !!shortlist[b.id];
        if (aShort && !bShort) return -1;
        if (!aShort && bShort) return 1;
        return (b.score || 0) - (a.score || 0);
    });

    return (
        <div className={styles.container}>
            {/* Global Viewport Loader Modal Overlay */}
            {exportingGlobal && (
                <div className={styles.premiumModalOverlay} style={{ position: "fixed", width: "100vw", height: "100vh", zIndex: 10000, top: 0, left: 0 }}>
                    <div className={styles.premiumModalContent}>
                        <div className={styles.premiumPulseSpinner}></div>
                        <h4 className={styles.premiumModalTitle}>Generating recruiter dossier...</h4>
                        <p className={styles.premiumModalSubtitle}>Compiling all candidate suitability scores, capability matrices, semantic gap evaluations, and interview toolkits.</p>
                    </div>
                </div>
            )}

            <div className={styles.resultsHeaderRow}>
                <h2 className={styles.title}>
                    📊 Results ({results.length} resume{results.length !== 1 ? "s" : ""})
                </h2>
                <div className={styles.globalRecruiterActions}>
                    {globalExportError && (
                        <span className={styles.pdfExportError} style={{ marginRight: "10px" }}>{globalExportError}</span>
                    )}

                    <div className={styles.shareDropdownWrapper}>
                        <button
                            onClick={toggleShareDropdown}
                            disabled={exportingGlobal || results.length === 0}
                            className={styles.shareBtn}
                            title="Share or export recruiter insights"
                        >
                            <span>📤 Share</span>
                            <span className={`${styles.shareCaret} ${isShareOpen ? styles.shareCaretActive : ""}`}>▼</span>
                        </button>

                        {isShareOpen && (
                            <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={async (e) => {
                                        setIsShareOpen(false);
                                        const targetId = selectedIds.length > 0 ? selectedIds[0] : results[0]?.id;
                                        const targetCand = results.find(r => r.id === targetId);
                                        if (targetCand) {
                                            await handleExportPDF(e, targetCand.id, targetCand.resume_filename);
                                        }
                                    }}
                                    disabled={exportingGlobal || results.length === 0}
                                    className={styles.dropdownItem}
                                    title="Download premium executive single-page briefing PDF"
                                >
                                    <span className={styles.dropdownIcon}>📄</span>
                                    <div className={styles.dropdownItemText}>
                                        <strong>Export Recruiter Report (PDF)</strong>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                                            {selectedIds.length > 0 ? "For selected candidate" : "For top ranking candidate"}
                                        </div>
                                    </div>
                                    <span className={styles.dropdownShortcut}>⌘P</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        setIsShareOpen(false);
                                        handleGlobalCSVExport(e);
                                    }}
                                    disabled={exportingGlobal || results.length === 0}
                                    className={styles.dropdownItem}
                                    title="Export full evaluation table to spreadsheet format"
                                >
                                    <span className={styles.dropdownIcon}>📊</span>
                                    <div className={styles.dropdownItemText}>
                                        <strong>Export CSV</strong>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                                            Complete screening spreadsheet
                                        </div>
                                    </div>
                                    <span className={styles.dropdownShortcut}>⌘S</span>
                                </button>

                                <div className={styles.dropdownDivider}></div>

                                <button
                                    onClick={(e) => {
                                        setIsShareOpen(false);
                                        handleGlobalComparisonExport(e);
                                    }}
                                    disabled={exportingGlobal || selectedIds.length < 2}
                                    className={styles.dropdownItem}
                                    title={selectedIds.length < 2 ? "Select 2 or more candidates to compare" : "Generate comparison brief"}
                                >
                                    <span className={styles.dropdownIcon}>⚖️</span>
                                    <div className={styles.dropdownItemText}>
                                        <strong>Export Comparison Report</strong>
                                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                                            {selectedIds.length < 2 ? "Requires 2+ selected candidates" : `Compare ${selectedIds.length} candidates`}
                                        </div>
                                    </div>
                                    <span className={styles.dropdownShortcut}>⌘C</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.selectCol}>Compare</th>
                            <th className={styles.nameCol}>Candidate</th>
                            <th className={styles.scoreCol}>Match Score</th>
                            <th className={styles.recommendationCol}>Recommendation</th>
                            <th className={styles.stageCol}>Hiring Stage</th>
                            <th className={styles.actionCol}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedResults.map((result, index) => {
                            const score = result.score;
                            const isExpanded = !!expandedIds[result.id];
                            const parsed = parseReasoning(result.reasoning);
                            const activeTab = activeQuestionTab[result.id] || "technical";
                            const activeDetailTab = detailActiveTab[result.id] || "overview";

                            const scoreClass = score >= 80
                                ? styles.excellent
                                : score >= 60
                                    ? styles.good
                                    : score >= 40
                                        ? styles.fair
                                        : styles.poor;

                            const isSelected = selectedIds.includes(result.id);
                            const recInfo = getHiringRecommendation(score);

                            return (
                                <Fragment key={result.id}>
                                    {/* Main Row */}
                                    <tr
                                        key={result.id}
                                        className={`${styles.row} ${isExpanded ? styles.expandedRow : ""} ${isSelected ? styles.selectedRow : ""}`}
                                        onClick={() => toggleExpand(result.id)}
                                    >
                                        <td className={styles.selectCol} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onSelect(result.id)}
                                                disabled={!isSelected && selectedIds.length >= 3}
                                                className={styles.checkboxInput}
                                            />
                                        </td>
                                        <td className={styles.nameCol}>
                                            <div className={styles.nameWrapper}>
                                                <div className={styles.fileNameRow} onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => handleToggleShortlist(e, result.id)}
                                                        className={`${styles.shortlistStarBtn} ${shortlist[result.id] ? styles.shortlisted : ""}`}
                                                        title={shortlist[result.id] ? "Remove from Shortlist" : "Add to Shortlist"}
                                                    >
                                                        {shortlist[result.id] ? "★" : "☆"}
                                                    </button>
                                                    <span className={styles.fileName} onClick={() => toggleExpand(result.id)} style={{ cursor: "pointer" }}>
                                                        {getCandidateName(result.resume_filename)}
                                                    </span>
                                                </div>
                                                
                                                {/* Recruiter-First Summary of Strengths and Gaps */}
                                                {parsed && parsed.type === "structured" && (
                                                    <div className={styles.rowSummary}>
                                                        {parsed.strengths && parsed.strengths.length > 0 && (
                                                            <div className={styles.rowSummarySection}>
                                                                <span className={styles.rowSummaryLabel}>Strengths:</span>
                                                                <div className={styles.rowSummaryPills}>
                                                                    {parsed.strengths.slice(0, 3).map((str, idx) => (
                                                                        <span key={idx} className={styles.rowStrengthPill} title={str}>
                                                                            ✓ {str.length > 20 ? str.slice(0, 20) + "..." : str}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {parsed.gaps && parsed.gaps.length > 0 && (
                                                            <div className={styles.rowSummarySection}>
                                                                <span className={styles.rowSummaryLabel}>Missing:</span>
                                                                <div className={styles.rowSummaryPills}>
                                                                    {parsed.gaps.slice(0, 3).map((gap, idx) => (
                                                                        <span key={idx} className={styles.rowGapPill} title={gap}>
                                                                            ✗ {gap.length > 20 ? gap.slice(0, 20) + "..." : gap}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className={styles.scoreCol}>
                                            <div className={`${styles.scoreBadge} ${scoreClass}`}>
                                                <span className={styles.scoreValue}>{score}%</span>
                                            </div>
                                        </td>
                                        <td className={styles.recommendationCol}>
                                            <span className={`${styles.recBadge} ${recInfo.class}`}>
                                                {recInfo.emoji} {recInfo.text}
                                            </span>
                                        </td>
                                        <td className={styles.stageCol} onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={stages[result.id] || "Applied"}
                                                onChange={(e) => handleChangeStage(e, result.id, e.target.value)}
                                                className={`${styles.stageSelect} ${styles[getStageClass(stages[result.id] || "Applied")]}`}
                                            >
                                                <option value="Applied">Applied</option>
                                                <option value="Screened">Screened</option>
                                                <option value="Shortlisted">Shortlisted</option>
                                                <option value="Interview Scheduled">Interview Scheduled</option>
                                                <option value="Interviewed">Interviewed</option>
                                                <option value="Offer">Offer</option>
                                                <option value="Rejected">Rejected</option>
                                            </select>
                                        </td>
                                        <td className={styles.actionCol} onClick={(e) => e.stopPropagation()}>
                                            <div className={styles.actionCellContainer}>
                                                <button 
                                                    onClick={() => toggleExpand(result.id)}
                                                    className={styles.viewDetailsBtn}
                                                >
                                                    {isExpanded ? "Hide Details" : "View Details"}
                                                </button>
                                                <button
                                                    onClick={(e) => handleExportPDF(e, result.id, result.resume_filename)}
                                                    disabled={exportingPdfId === result.id}
                                                    className={styles.pdfActionBtn}
                                                    title="Download Recruiter Intelligence Report"
                                                >
                                                    {exportingPdfId === result.id ? "..." : "📄 Export"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {/* Expandable Dashboard Details Workspace */}
                                    {isExpanded && (
                                        <tr key={`${result.id}-details`} className={styles.detailsRow}>
                                            <td colSpan={6} className={styles.detailsCell}>
                                                <div className={styles.drawerContainer}>

                                                    {/* Premium Recruiter Loading Modal Overlay */}
                                                    {exportingPdfId === result.id && (
                                                        <div className={styles.premiumModalOverlay}>
                                                            <div className={styles.premiumModalContent}>
                                                                <div className={styles.premiumPulseSpinner}></div>
                                                                <h4 className={styles.premiumModalTitle}>Generating recruiter intelligence report...</h4>
                                                                <p className={styles.premiumModalSubtitle}>Assembling executive summaries, weighted capability mapping, inferred portfolio evidence, and structured diagnostic interviewing toolkits.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Recruiter-First Navigation Tabs inside Candidate Drawer */}
                                                    <div className={styles.drawerTabs}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDetailActiveTab(prev => ({ ...prev, [result.id]: "overview" })); }}
                                                            className={`${styles.drawerTab} ${activeDetailTab === "overview" ? styles.drawerTabActive : ""}`}
                                                        >
                                                            👤 Overview
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDetailActiveTab(prev => ({ ...prev, [result.id]: "skills_match" })); }}
                                                            className={`${styles.drawerTab} ${activeDetailTab === "skills_match" ? styles.drawerTabActive : ""}`}
                                                        >
                                                            🎯 Skills Match
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDetailActiveTab(prev => ({ ...prev, [result.id]: "projects_experience" })); }}
                                                            className={`${styles.drawerTab} ${activeDetailTab === "projects_experience" ? styles.drawerTabActive : ""}`}
                                                        >
                                                            📁 Projects & Experience
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDetailActiveTab(prev => ({ ...prev, [result.id]: "interview_questions" })); }}
                                                            className={`${styles.drawerTab} ${activeDetailTab === "interview_questions" ? styles.drawerTabActive : ""}`}
                                                        >
                                                            💬 Interview Questions
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDetailActiveTab(prev => ({ ...prev, [result.id]: "notes" })); }}
                                                            className={`${styles.drawerTab} ${activeDetailTab === "notes" ? styles.drawerTabActive : ""}`}
                                                        >
                                                            📝 Notes
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setDetailActiveTab(prev => ({ ...prev, [result.id]: "advanced_insights" })); }}
                                                            className={`${styles.drawerTab} ${activeDetailTab === "advanced_insights" ? styles.drawerTabActive : ""}`}
                                                        >
                                                            ⚙️ Detailed Analysis
                                                        </button>
                                                        
                                                        {/* Action to export candidate PDF directly from header */}
                                                        <button
                                                            onClick={(e) => handleExportPDF(e, result.id, result.resume_filename)}
                                                            disabled={exportingPdfId === result.id}
                                                            className={styles.drawerPdfBtn}
                                                        >
                                                            📄 {exportingPdfId === result.id ? "Generating PDF..." : "Export Report (PDF)"}
                                                        </button>
                                                    </div>

                                                    {exportPdfError[result.id] && (
                                                        <div className={styles.pdfExportErrorRow}>
                                                            <span className={styles.pdfExportError}>⚠️ {exportPdfError[result.id]}</span>
                                                        </div>
                                                    )}

                                                    {/* TAB CONTENT PANELS */}
                                                    <div className={styles.drawerTabContent}>

                                                        {/* 1. OVERVIEW TAB */}
                                                        {activeDetailTab === "overview" && (
                                                            <div className={styles.tabPanel} style={{ animation: "fadeIn 0.20s ease-out" }}>
                                                                {result.gap_analysis?.extraction_confidence && result.gap_analysis.extraction_confidence.score < 80 && (
                                                                    <div className={styles.lowConfidenceAlert}>
                                                                        <span className={styles.alertIcon}>⚠️</span>
                                                                        <div className={styles.alertContent}>
                                                                            <h5 className={styles.alertTitle}>
                                                                                Low Resume Extraction Quality (Confidence: {result.gap_analysis.extraction_confidence.score}%)
                                                                            </h5>
                                                                            <p className={styles.alertDescription}>
                                                                                Resume text density is unusually sparse or heavily corrupted (e.g., poor scanned OCR or image-only file). 
                                                                                Reasons: <strong>{result.gap_analysis.extraction_confidence.reasons?.join("; ") || "Corrupted character patterns or missing mandatory sections."}</strong>.
                                                                                Please check the raw PDF file directly to verify experience.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {parsed && parsed.type === "structured" && parsed.recommendation && (
                                                                    <div className={styles.fitCalloutCard}>
                                                                        <div className={styles.fitCalloutHeader}>
                                                                            <span className={styles.fitCalloutLabel}>Recommendation Match:</span>
                                                                            <span className={styles.fitCalloutBadge}>{parsed.recommendation}</span>
                                                                        </div>
                                                                        <p className={styles.fitCalloutDesc}>
                                                                            This candidate is classified as a <strong>{parsed.recommendation}</strong> based on their technical skills coverage, experience relevance, and project evidence.
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {parsed && parsed.type === "structured" ? (
                                                                    <>
                                                                        {/* Side-by-Side Strengths and Gaps */}
                                                                        <div className={styles.feedbackGrid}>
                                                                            <div className={styles.feedbackCol}>
                                                                                <h5 className={`${styles.feedbackTitle} ${styles.strengthHeader}`}>✅ Core Strengths</h5>
                                                                                {parsed.strengths.length > 0 ? (
                                                                                    <ul className={styles.feedbackList}>
                                                                                        {parsed.strengths.map((str, idx) => (
                                                                                            <li key={idx} className={styles.feedbackItem}>
                                                                                                <span className={styles.bulletCheck}>✓</span>
                                                                                                <span className={styles.feedbackText}>{str}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                ) : (
                                                                                    <p className={styles.emptyFeedback}>General alignment observed.</p>
                                                                                )}
                                                                            </div>

                                                                            <div className={styles.feedbackCol}>
                                                                                <h5 className={`${styles.feedbackTitle} ${styles.gapHeader}`}>⚠️ Areas of Misalignment / Gaps</h5>
                                                                                {parsed.gaps.length > 0 ? (
                                                                                    <ul className={styles.feedbackList}>
                                                                                        {parsed.gaps.map((gap, idx) => (
                                                                                            <li key={idx} className={styles.feedbackItem}>
                                                                                                <span className={styles.bulletWarning}>!</span>
                                                                                                <span className={styles.feedbackText}>{gap}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                ) : (
                                                                                    <p className={styles.emptyFeedback}>No critical mismatches detected.</p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* High-level Description & Evaluation Reasoning */}
                                                                        <div className={styles.legacyReasoning} style={{ marginTop: "16px" }}>
                                                                            <h4 className={styles.sectionHeading} style={{ marginBottom: "12px" }}>🔍 Executive Summary & Rationale</h4>
                                                                            <p className={styles.legacyText}>
                                                                                {result.reasoning.split(/Strengths:|Gaps:/i)[0].replace(/Recommendation:\s*[^\n\r]+/i, "").trim()}
                                                                            </p>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className={styles.legacyReasoning}>
                                                                        <h4 className={styles.sectionHeading}>Evaluation Reasoning</h4>
                                                                        <p className={styles.legacyText}>{result.reasoning}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* 2. SKILLS MATCH TAB */}
                                                        {activeDetailTab === "skills_match" && (
                                                            <div className={styles.tabPanel} style={{ animation: "fadeIn 0.20s ease-out" }}>
                                                                {result.gap_analysis ? (
                                                                    <div className={styles.gapIntelligenceSection} style={{ marginTop: 0 }}>
                                                                        <h4 className={styles.sectionHeading}>🎯 Candidate Skill Gap Intelligence</h4>
                                                                        <div className={styles.gapGrid}>

                                                                            {/* Card 1: Core Skill Matching */}
                                                                            <div className={styles.gapCard}>
                                                                                <h5 className={styles.gapCardTitle}>📌 Skill Evaluation & Semantic Match Confidence</h5>
                                                                                {result.gap_analysis.weighted_evaluations && result.gap_analysis.weighted_evaluations.length > 0 ? (
                                                                                    <div className={styles.skillsEvalGrid}>
                                                                                        {result.gap_analysis.weighted_evaluations.map((ev, i) => {
                                                                                            const status = ev.status || "missing";
                                                                                            const confidence = ev.confidence || "high";
                                                                                            const quality = ev.evidence_quality || 100;
                                                                                            const category = ev.category === "must_have" ? "Must-Have" : "Good-to-Have";
                                                                                            
                                                                                            let pillClass = styles.missingEvalCard;
                                                                                            let statusSymbol = "❌";
                                                                                            if (status === "matched") {
                                                                                                pillClass = styles.matchedEvalCard;
                                                                                                statusSymbol = "✅";
                                                                                            } else if (status === "inferred") {
                                                                                                pillClass = styles.inferredEvalCard;
                                                                                                statusSymbol = "✓";
                                                                                            } else if (status === "ambiguous" || status === "partial") {
                                                                                                pillClass = styles.ambiguousEvalCard;
                                                                                                statusSymbol = "⚠️";
                                                                                            }
                                                                                            
                                                                                            return (
                                                                                                <div key={i} className={`${styles.skillsEvalCard} ${pillClass}`}>
                                                                                                    <div className={styles.skillsEvalHeader}>
                                                                                                        <span className={styles.skillsEvalName}>{ev.name}</span>
                                                                                                        <span className={styles.skillsEvalCategory}>{category}</span>
                                                                                                    </div>
                                                                                                    <div className={styles.skillsEvalDetails}>
                                                                                                        <span className={styles.skillsEvalStatus}>{statusSymbol} {status.toUpperCase()}</span>
                                                                                                        <span className={styles.skillsEvalConfidence}>Confidence: {confidence.toUpperCase()} ({quality}%)</span>
                                                                                                    </div>
                                                                                                    {ev.evidence && (
                                                                                                        <p className={styles.skillsEvalEvidence}>{ev.evidence}</p>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className={styles.gapColumns}>
                                                                                        <div className={styles.gapSubCol}>
                                                                                            <span className={styles.gapSubLabel}>Required Matched</span>
                                                                                            {result.gap_analysis.must_have_matched && result.gap_analysis.must_have_matched.length > 0 ? (
                                                                                                <div className={styles.gapPills}>
                                                                                                    {result.gap_analysis.must_have_matched.map((s, i) => (
                                                                                                        <span key={i} className={`${styles.gapPill} ${styles.matchedPill}`}>✓ {s}</span>
                                                                                                    ))}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <span className={styles.gapEmptyText}>No matched required skills found.</span>
                                                                                            )}
                                                                                        </div>

                                                                                        <div className={styles.gapSubCol}>
                                                                                            <span className={styles.gapSubLabel}>Preferred Matched</span>
                                                                                            {result.gap_analysis.good_to_have_matched && result.gap_analysis.good_to_have_matched.length > 0 ? (
                                                                                                <div className={styles.gapPills}>
                                                                                                    {result.gap_analysis.good_to_have_matched.map((s, i) => (
                                                                                                        <span key={i} className={`${styles.gapPill} ${styles.prefMatchedPill}`}>✓ {s}</span>
                                                                                                    ))}
                                                                                                </div>
                                                                                            ) : (
                                                                                                <span className={styles.gapEmptyText}>No matched preferred skills found.</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Card 2: Critical Gaps */}
                                                                            <div className={`${styles.gapCard} ${styles.criticalGapsCard}`}>
                                                                                <h5 className={styles.gapCardTitle}>⚠️ Critical Gaps & Mismatches</h5>
                                                                                {result.gap_analysis.must_have_missing && result.gap_analysis.must_have_missing.length > 0 ? (
                                                                                    <div className={styles.criticalListContainer}>
                                                                                        <span className={styles.gapSubLabel}>Missing Required Stack:</span>
                                                                                        <div className={styles.gapPills}>
                                                                                            {result.gap_analysis.must_have_missing.map((s, i) => (
                                                                                                <span key={i} className={`${styles.gapPill} ${styles.missingPill}`}>✗ {s}</span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : null}

                                                                                {result.gap_analysis.critical_gaps && result.gap_analysis.critical_gaps.length > 0 ? (
                                                                                    <ul className={styles.criticalList}>
                                                                                        {result.gap_analysis.critical_gaps.map((gap, i) => (
                                                                                            <li key={i} className={styles.criticalListItem}>
                                                                                                <span className={styles.bulletWarning}>!</span>
                                                                                                <span>{gap}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                ) : (
                                                                                    <span className={styles.gapEmptyText}>No critical required gaps identified! Exceptional core fit.</span>
                                                                                )}
                                                                            </div>

                                                                            {/* Card 3: Strength & Growth Areas */}
                                                                            <div className={styles.gapCard}>
                                                                                <h5 className={styles.gapCardTitle}>💪 Strength & Growth Areas</h5>
                                                                                <div className={styles.gapColumns}>
                                                                                    <div className={styles.gapSubCol}>
                                                                                        <span className={styles.gapSubLabel}>Key Demonstrated Strengths</span>
                                                                                        {result.gap_analysis.strength_areas && result.gap_analysis.strength_areas.length > 0 ? (
                                                                                            <ul className={styles.strengthList}>
                                                                                                {result.gap_analysis.strength_areas.map((str, i) => (
                                                                                                    <li key={i} className={styles.strengthListItem}>
                                                                                                        <span className={styles.bulletCheck}>✓</span>
                                                                                                        <span>{str}</span>
                                                                                                    </li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        ) : (
                                                                                            <span className={styles.gapEmptyText}>General technical profile alignment.</span>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className={styles.gapSubCol}>
                                                                                        <span className={styles.gapSubLabel}>Preferred Stack Gaps</span>
                                                                                        {result.gap_analysis.good_to_have_missing && result.gap_analysis.good_to_have_missing.length > 0 ? (
                                                                                            <div className={styles.gapPills}>
                                                                                                {result.gap_analysis.good_to_have_missing.map((s, i) => (
                                                                                                    <span key={i} className={`${styles.gapPill} ${styles.prefMissingPill}`}>✗ {s}</span>
                                                                                                ))}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className={styles.gapEmptyText}>Demonstrated all nice-to-have items!</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className={styles.legacyReasoning}>
                                                                        <p className={styles.legacyText}>No skill gap analysis data detected in candidate evaluation.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* 3. PROJECTS & EXPERIENCE TAB */}
                                                        {activeDetailTab === "projects_experience" && (
                                                            <div className={styles.tabPanel} style={{ animation: "fadeIn 0.20s ease-out" }}>
                                                                {result.gap_analysis?.project_intelligence && result.gap_analysis.project_intelligence.length > 0 ? (
                                                                    <div className={styles.projectIntelligenceWrapper} style={{ marginTop: 0 }}>
                                                                        <h4 className={styles.sectionSubHeading}>📁 Project Intelligence & Competency Inference</h4>
                                                                        <div className={styles.projectGrid}>
                                                                            {result.gap_analysis.project_intelligence.map((proj, pIdx) => (
                                                                                <div key={pIdx} className={styles.projectCard}>
                                                                                    <div className={styles.projectCardHeader}>
                                                                                        <span className={styles.projectFolderIcon}>📁</span>
                                                                                        <h5 className={styles.projectName}>{proj.project_name}</h5>
                                                                                        <span className={`${styles.projectRelevanceScore} ${proj.relevance_score >= 80
                                                                                                ? styles.projectHighRelevance
                                                                                                : proj.relevance_score >= 50
                                                                                                    ? styles.projectMidRelevance
                                                                                                    : styles.projectLowRelevance
                                                                                            }`}>
                                                                                            {proj.relevance_score}% Relevance
                                                                                        </span>
                                                                                    </div>

                                                                                    <p className={styles.projectDescription}>{proj.description}</p>

                                                                                    <div className={styles.projectIntelligenceDetails}>
                                                                                        <div className={styles.intelSubSection}>
                                                                                            <strong className={styles.intelLabel}>Demonstrated Capabilities:</strong>
                                                                                            <div className={styles.gapPills}>
                                                                                                {proj.inferred_skills && proj.inferred_skills.map((skill, sIdx) => (
                                                                                                    <span key={sIdx} className={`${styles.gapPill} ${styles.matchedPill}`}>✅ {skill}</span>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className={styles.intelSubSection}>
                                                                                            <strong className={styles.intelLabel}>Matched JD Requirements:</strong>
                                                                                            <div className={styles.gapPills}>
                                                                                                {proj.matched_jd_requirements && proj.matched_jd_requirements.map((skill, sIdx) => (
                                                                                                    <span key={sIdx} className={`${styles.gapPill} ${styles.prefMatchedPill}`}>✓ {skill}</span>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>

                                                                                        {proj.missing_related_requirements && proj.missing_related_requirements.length > 0 && (
                                                                                            <div className={styles.intelSubSection}>
                                                                                                <strong className={styles.intelLabel}>Risk Areas (Not evidenced in project):</strong>
                                                                                                <div className={styles.gapPills}>
                                                                                                    {proj.missing_related_requirements.map((skill, sIdx) => (
                                                                                                        <span key={sIdx} className={`${styles.gapPill} ${styles.missingPill}`}>⚠ {skill}</span>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}

                                                                                        <div className={styles.intelSubSection}>
                                                                                            <strong className={styles.intelLabel}>Why It Matters:</strong>
                                                                                            <p className={styles.impactSummaryText}>{proj.impact_summary}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className={styles.legacyReasoning}>
                                                                        <p className={styles.legacyText}>No project evidence or capability mapping detected in candidate file.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* 4. INTERVIEW QUESTIONS TAB */}
                                                        {activeDetailTab === "interview_questions" && (
                                                            <div className={styles.tabPanel} style={{ animation: "fadeIn 0.20s ease-out" }}>
                                                                <div className={styles.questionsWrapper} style={{ marginTop: 0, padding: 0, border: "none", boxShadow: "none" }}>
                                                                    <div className={styles.toolkitHeader}>
                                                                        <h4 className={styles.toolkitTitle}>💬 Candidate Interviewing Toolkit</h4>
                                                                        <p className={styles.toolkitSubtitle}>Tailored diagnostic questions mapping achievements, tech stacks, and gaps</p>
                                                                    </div>

                                                                    {candidateQuestions[result.id] ? (
                                                                        <div className={styles.toolkitContainer}>
                                                                            {/* Tab controls */}
                                                                            <div className={styles.toolkitTabs}>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setActiveQuestionTab(prev => ({ ...prev, [result.id]: "technical" })); }}
                                                                                    className={`${styles.toolkitTab} ${activeTab === "technical" ? styles.toolkitTabActive : ""}`}
                                                                                >
                                                                                    💻 Technical Depth
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setActiveQuestionTab(prev => ({ ...prev, [result.id]: "project_deep_dive" })); }}
                                                                                    className={`${styles.toolkitTab} ${activeTab === "project_deep_dive" ? styles.toolkitTabActive : ""}`}
                                                                                >
                                                                                    🚀 Project Deep-Dive
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setActiveQuestionTab(prev => ({ ...prev, [result.id]: "behavioral" })); }}
                                                                                    className={`${styles.toolkitTab} ${activeTab === "behavioral" ? styles.toolkitTabActive : ""}`}
                                                                                >
                                                                                    🤝 Behavioral Fit
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setActiveQuestionTab(prev => ({ ...prev, [result.id]: "risk_probing" })); }}
                                                                                    className={`${styles.toolkitTab} ${styles.riskTab} ${activeTab === "risk_probing" ? styles.toolkitTabActiveRisk : ""}`}
                                                                                >
                                                                                    ⚠️ Concern Probes
                                                                                </button>
                                                                            </div>

                                                                            {/* Active Tab Panel */}
                                                                            <div className={styles.toolkitContent}>
                                                                                <div className={styles.questionToolkitGrid}>
                                                                                    {(candidateQuestions[result.id][activeTab] || []).map((q, idx) => {
                                                                                        let accentClass = styles.techAccent;
                                                                                        if (activeTab === "project_deep_dive") accentClass = styles.projAccent;
                                                                                        if (activeTab === "behavioral") accentClass = styles.behavioralAccent;
                                                                                        if (activeTab === "risk_probing") accentClass = styles.riskAccent;

                                                                                        return (
                                                                                            <div key={idx} className={`${styles.toolkitQuestionCard} ${accentClass}`}>
                                                                                                <div className={styles.questionCardHeader}>
                                                                                                    <span className={styles.questionNumberLabel}>QUESTION {idx + 1}</span>
                                                                                                    <button
                                                                                                        onClick={(e) => { e.stopPropagation(); handleCopy(q); }}
                                                                                                        className={`${styles.copyQuestionBtn} ${copiedText === q ? styles.copied : ""}`}
                                                                                                        title="Copy to clipboard"
                                                                                                    >
                                                                                                        {copiedText === q ? "✓ Copied" : "📋 Copy"}
                                                                                                    </button>
                                                                                                </div>
                                                                                                <p className={styles.toolkitQuestionText}>{q}</p>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={styles.generatorPrompt}>
                                                                            <p className={styles.generatorText}>
                                                                                Formulate candidate-specific technical, project, behavioral, and risk questions based on their experience relative to job requirements.
                                                                            </p>
                                                                            {generationError[result.id] && (
                                                                                <div className={styles.genErrorBox}>
                                                                                    ⚠️ {generationError[result.id]}
                                                                                </div>
                                                                            )}
                                                                            <button
                                                                                onClick={(e) => handleGenerateQuestions(e, result.id)}
                                                                                disabled={generatingId === result.id}
                                                                                className={styles.generatorBtn}
                                                                            >
                                                                                {generatingId === result.id ? (
                                                                                    <>
                                                                                        <span className={styles.miniSpinner}></span>
                                                                                        <span>Formulating Toolkit...</span>
                                                                                    </>
                                                                                ) : (
                                                                                    "Generate Tailored Interview Questions"
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                         {/* 5. NOTES TAB */}
                                                         {activeDetailTab === "notes" && (
                                                             <div className={styles.tabPanel} style={{ animation: "fadeIn 0.20s ease-out" }}>
                                                                 <div className={styles.notesWrapper}>
                                                                     <div className={styles.notesHeader}>
                                                                         <h4 className={styles.notesTitle}>📝 Recruiter Decision Notes</h4>
                                                                         <p className={styles.notesSubtitle}>Add custom commentary or onboarding requirements for this candidate</p>
                                                                     </div>
                                                                     <textarea
                                                                         className={styles.notesTextarea}
                                                                         placeholder="Write recruiter notes here... (e.g., 'Strong MERN skills, needs AWS verification')"
                                                                         value={notes[result.id] || ""}
                                                                         onChange={(e) => handleSaveNote(result.id, e.target.value)}
                                                                     />
                                                                     <div className={styles.notesFooter}>
                                                                         <span className={styles.notesSaveIndicator}>
                                                                             ✓ Changes saved persistently in local workspace
                                                                         </span>
                                                                     </div>
                                                                 </div>
                                                             </div>
                                                         )}

                                                        {/* 6. DETAILED ANALYSIS TAB */}
                                                        {activeDetailTab === "advanced_insights" && (
                                                            <div className={styles.tabPanel} style={{ animation: "fadeIn 0.20s ease-out" }}>
                                                                {parsed && parsed.type === "structured" ? (
                                                                    <>
                                                                        {/* Rubric Breakdown Metrics Grid */}
                                                                        <div className={styles.rubricSection}>
                                                                            <h4 className={styles.sectionHeading}>📊 Rubric Alignment Breakdown</h4>
                                                                            <div className={styles.metricGrid}>

                                                                                {/* Card 1: Technical Skills Match */}
                                                                                <div className={styles.metricCard}>
                                                                                    <div className={styles.cardHeader}>
                                                                                        <span className={styles.cardLabel}>Technical Skills Match</span>
                                                                                        <span className={`${styles.tileFitBadge} ${getRatioBadge(parsed.breakdown.skills, 40).class}`}>
                                                                                            {getRatioBadge(parsed.breakdown.skills, 40).text}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className={styles.cardValueRow}>
                                                                                        <span className={styles.cardBigVal}>{parsed.breakdown.skills}</span>
                                                                                        <span className={styles.cardMaxVal}>/ 40</span>
                                                                                    </div>
                                                                                    <div className={styles.meterContainer}>
                                                                                        <div className={`${styles.meterFill} ${styles.skillsMeter}`} style={{ width: `${(parsed.breakdown.skills / 40) * 100}%` }}></div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Card 2: Experience Relevance */}
                                                                                <div className={styles.metricCard}>
                                                                                    <div className={styles.cardHeader}>
                                                                                        <span className={styles.cardLabel}>Experience Relevance</span>
                                                                                        <span className={`${styles.tileFitBadge} ${getRatioBadge(parsed.breakdown.experience, 25).class}`}>
                                                                                            {getRatioBadge(parsed.breakdown.experience, 25).text}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className={styles.cardValueRow}>
                                                                                        <span className={styles.cardBigVal}>{parsed.breakdown.experience}</span>
                                                                                        <span className={styles.cardMaxVal}>/ 25</span>
                                                                                    </div>
                                                                                    <div className={styles.meterContainer}>
                                                                                        <div className={`${styles.meterFill} ${styles.expMeter}`} style={{ width: `${(parsed.breakdown.experience / 25) * 100}%` }}></div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Card 3: Project Relevance */}
                                                                                <div className={styles.metricCard}>
                                                                                    <div className={styles.cardHeader}>
                                                                                        <span className={styles.cardLabel}>Project Relevance</span>
                                                                                        <span className={`${styles.tileFitBadge} ${getRatioBadge(parsed.breakdown.projects, 20).class}`}>
                                                                                            {getRatioBadge(parsed.breakdown.projects, 20).text}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className={styles.cardValueRow}>
                                                                                        <span className={styles.cardBigVal}>{parsed.breakdown.projects}</span>
                                                                                        <span className={styles.cardMaxVal}>/ 20</span>
                                                                                    </div>
                                                                                    <div className={styles.meterContainer}>
                                                                                        <div className={`${styles.meterFill} ${styles.projMeter}`} style={{ width: `${(parsed.breakdown.projects / 20) * 100}%` }}></div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Card 4: Education & Certifications */}
                                                                                <div className={styles.metricCard}>
                                                                                    <div className={styles.cardHeader}>
                                                                                        <span className={styles.cardLabel}>Education & Certifications</span>
                                                                                        <span className={`${styles.tileFitBadge} ${getRatioBadge(parsed.breakdown.education, 10).class}`}>
                                                                                            {getRatioBadge(parsed.breakdown.education, 10).text}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className={styles.cardValueRow}>
                                                                                        <span className={styles.cardBigVal}>{parsed.breakdown.education}</span>
                                                                                        <span className={styles.cardMaxVal}>/ 10</span>
                                                                                    </div>
                                                                                    <div className={styles.meterContainer}>
                                                                                        <div className={`${styles.meterFill} ${styles.eduMeter}`} style={{ width: `${(parsed.breakdown.education / 10) * 100}%` }}></div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Card 5: Domain Fit */}
                                                                                <div className={styles.metricCard}>
                                                                                    <div className={styles.cardHeader}>
                                                                                        <span className={styles.cardLabel}>Domain Fit</span>
                                                                                        <span className={`${styles.tileFitBadge} ${getRatioBadge(parsed.breakdown.domain, 5).class}`}>
                                                                                            {getRatioBadge(parsed.breakdown.domain, 5).text}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className={styles.cardValueRow}>
                                                                                        <span className={styles.cardBigVal}>{parsed.breakdown.domain}</span>
                                                                                        <span className={styles.cardMaxVal}>/ 5</span>
                                                                                    </div>
                                                                                    <div className={styles.meterContainer}>
                                                                                        <div className={`${styles.meterFill} ${styles.domMeter}`} style={{ width: `${(parsed.breakdown.domain / 5) * 100}%` }}></div>
                                                                                    </div>
                                                                                </div>

                                                                            </div>
                                                                        </div>

                                                                        {/* 🛡️ AI Reliability & Recruitment Guardrails */}
                                                                        {result.gap_analysis?.reliability_signals && (
                                                                            <div className={styles.reliabilityPanel} style={{ marginTop: "20px" }}>
                                                                                <div className={styles.reliabilityMetric}>
                                                                                    <span className={styles.reliabilityLabel}>🛡️ AI Confidence Score</span>
                                                                                    <div className={styles.reliabilityValueBadge}>
                                                                                        <div className={styles.reliabilityProgressBg}>
                                                                                            <div className={styles.reliabilityProgressFill} style={{ width: `${result.gap_analysis.reliability_signals.ai_confidence_score}%` }}></div>
                                                                                        </div>
                                                                                        <span className={styles.reliabilityScoreText}>{result.gap_analysis.reliability_signals.ai_confidence_score}%</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className={styles.reliabilityMetric}>
                                                                                    <span className={styles.reliabilityLabel}>⚡ Evidence Strength</span>
                                                                                    <span className={styles.reliabilityScoreText}>{result.gap_analysis.reliability_signals.evidence_strength}%</span>
                                                                                </div>
                                                                                <div className={styles.reliabilityMetric}>
                                                                                    <span className={styles.reliabilityLabel}>🔍 Parsing Reliability</span>
                                                                                    <span className={styles.reliabilityScoreText}>{result.gap_analysis.reliability_signals.parsing_reliability}%</span>
                                                                                </div>
                                                                                {result.gap_analysis.recruiter_alerts && result.gap_analysis.recruiter_alerts.length > 0 && (
                                                                                    <div className={styles.alertsListContainer}>
                                                                                        {result.gap_analysis.recruiter_alerts.map((alert, idx) => (
                                                                                            <div key={idx} className={styles.recruiterAlertItem}>
                                                                                                {alert.includes("⚠️") || alert.includes("💡") ? alert : `💡 ${alert}`}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <div className={styles.legacyReasoning}>
                                                                        <p className={styles.legacyText}>Advanced intelligence signals are not available for this candidate format.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                    </div>

                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={styles.stats}>
                <p>
                    Average Score:{" "}
                    <strong>
                        {(
                            results.reduce((sum, r) => sum + r.score, 0) / results.length
                        ).toFixed(1)}
                    </strong>
                </p>
                <p>
                    Highest Score:{" "}
                    <strong>{Math.max(...results.map((r) => r.score))}</strong>
                </p>
            </div>
        </div>
    );
}