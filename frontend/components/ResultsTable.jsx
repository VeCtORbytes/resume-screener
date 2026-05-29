"use client";

import { useState, Fragment, useEffect } from "react";
import styles from "./ResultsTable.module.css";
import { getScoreBadge } from "../lib/constants";
import { generateInterviewQuestions, exportPDF, exportCSV, exportComparison } from "../lib/api";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

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

function getCandidateRadarData(result) {
    const score = result.score || 0;
    const parsed = parseReasoning(result.reasoning);
    
    if (!parsed || parsed.type !== "structured" || !parsed.breakdown) {
        return [
            { subject: "Technical Fit", score: score },
            { subject: "Experience", score: Math.round(score * 0.95) },
            { subject: "Project Relevance", score: Math.round(score * 0.90) },
            { subject: "Education", score: Math.round(score * 0.85) },
            { subject: "Domain Fit", score: Math.round(score * 0.80) }
        ];
    }
    
    const b = parsed.breakdown;
    return [
        { subject: "Technical Fit", score: Math.round((b.skills / 40) * 100) },
        { subject: "Experience", score: Math.round((b.experience / 25) * 100) },
        { subject: "Project Relevance", score: Math.round((b.projects / 20) * 100) },
        { subject: "Education", score: Math.round((b.education / 10) * 100) },
        { subject: "Domain Fit", score: Math.round((b.domain / 5) * 100) }
    ];
}

function renderAiSummary(result, parsed) {
    const rawSummary = result.reasoning.split(/Strengths:|Gaps:/i)[0].replace(/Recommendation:\s*[^\n\r]+/i, "").trim();
    // Split by sentences to form clean bullets
    let bullets = rawSummary.split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 8);
    
    if (bullets.length === 0 && parsed && parsed.strengths) {
        bullets = parsed.strengths;
    }
    
    return (
        <div className={styles.aiSummaryCard}>
            <h4 className={styles.aiSummaryTitle}>🧠 AI Recruiter Summary</h4>
            <ul className={styles.aiSummaryList}>
                {bullets.map((bullet, idx) => {
                    const cleanBullet = bullet.replace(/^[-•*✅⚠️\s]+/, "").trim();
                    if (!cleanBullet) return null;
                    return (
                        <li key={idx} className={styles.aiSummaryItem}>
                            <span className={styles.aiSummaryBullet}>✦</span>
                            <span className={styles.aiSummaryText}>{cleanBullet}{cleanBullet.endsWith('.') ? '' : '.'}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function renderSkillsOverviewList(title, matched, missing, customClass) {
    const total = matched.length + missing.length;
    const matchPct = total > 0 ? Math.round((matched.length / total) * 100) : 0;
    
    return (
        <div className={`${styles.skillsSection} ${customClass}`}>
            <div className={styles.skillsSectionHeader}>
                <h5 className={styles.skillsSectionTitle}>{title}</h5>
                <span className={styles.skillsSectionProgress}>{matched.length} of {total} Matched ({matchPct}%)</span>
            </div>
            
            <div className={styles.skillsProgressBarBg}>
                <div className={styles.skillsProgressBarFill} style={{ width: `${matchPct}%` }}></div>
            </div>
            
            <ul className={styles.skillsOverviewList}>
                {matched.map((skill, idx) => (
                    <li key={`matched-${idx}`} className={`${styles.skillsOverviewItem} ${styles.matchedSkill}`}>
                        <span className={styles.skillCheckMark}>✓</span>
                        <span className={styles.skillNameText}>{skill}</span>
                        <span className={styles.skillStatusLabelMatched}>Matched</span>
                    </li>
                ))}
                {missing.map((skill, idx) => (
                    <li key={`missing-${idx}`} className={`${styles.skillsOverviewItem} ${styles.missingSkill}`}>
                        <span className={styles.skillCrossMark}>✗</span>
                        <span className={styles.skillNameText}>{skill}</span>
                        <span className={styles.skillStatusLabelMissing}>Missing</span>
                    </li>
                ))}
                {total === 0 && (
                    <li className={styles.skillsEmptyItem}>No specific requirements listed.</li>
                )}
            </ul>
        </div>
    );
}

export default function ResultsTable({ results = [], isLoading, selectedIds = [], onSelect, screeningId, activeSession }) {
    const [expandedIds, setExpandedIds] = useState({});
    const [candidateQuestions, setCandidateQuestions] = useState({});
    const [generatingId, setGeneratingId] = useState(null);
    const [generationError, setGenerationError] = useState({});
    const [activeQuestionTab, setActiveQuestionTab] = useState({}); // Stores active tab name mapped per candidate
    const [detailActiveTab, setDetailActiveTab] = useState({}); // Stores active details drawer tab per candidate
    const [advancedInsightsOpen, setAdvancedInsightsOpen] = useState({}); // Stores expanded state of Detailed Analysis drawer
    const [activeCandidateId, setActiveCandidateId] = useState(null); // Stores currently active candidate in vertical workflow

    const toggleAdvancedOpen = (candId) => {
        setAdvancedInsightsOpen(prev => ({
            ...prev,
            [candId]: !prev[candId]
        }));
    };

    useEffect(() => {
        if (results && results.length > 0) {
            setActiveCandidateId(results[0].id);
        } else {
            setActiveCandidateId(null);
        }
    }, [results, screeningId]);
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
                            const parsed = parseReasoning(result.reasoning);

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
                                <tr
                                    key={result.id}
                                    className={`${styles.row} ${activeCandidateId === result.id ? styles.activeCandidateRow : ""} ${isSelected ? styles.selectedRow : ""}`}
                                    onClick={() => setActiveCandidateId(result.id)}
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
                                                <span className={styles.fileName} onClick={() => setActiveCandidateId(result.id)} style={{ cursor: "pointer" }}>
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
                                                onClick={() => setActiveCandidateId(result.id)}
                                                className={`${styles.viewDetailsBtn} ${activeCandidateId === result.id ? styles.activeDetailsBtn : ""}`}
                                            >
                                                {activeCandidateId === result.id ? "Viewing Profile" : "View Profile"}
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
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Step 4: Selected Candidate Workspace rendered SEQUENTIALLY below the table wrapper */}
            {(() => {
                const activeCandidate = results.find(r => r.id === activeCandidateId);
                if (!activeCandidate) return null;

                const score = activeCandidate.score;
                const parsed = parseReasoning(activeCandidate.reasoning);
                const activeTab = activeQuestionTab[activeCandidate.id] || "technical";
                const isSelected = selectedIds.includes(activeCandidate.id);
                const recInfo = getHiringRecommendation(score);
                const isAdvancedOpen = !!advancedInsightsOpen[activeCandidate.id];

                const scoreClass = score >= 80
                    ? styles.excellent
                    : score >= 60
                        ? styles.good
                        : score >= 40
                            ? styles.fair
                            : styles.poor;

                return (
                    <div className={styles.workspaceProfileContainer}>
                        <div className={styles.workspaceSectionHeader}>
                            <div className={styles.stepBadge}>STEP 4</div>
                            <h3 className={styles.stepTitle}>Selected Candidate Workspace</h3>
                            <p className={styles.stepSubtitle}>Deep-dive evaluation of suitability parameters, semantic evidence, tailored questions, and intelligence metrics.</p>
                        </div>

                        <div className={styles.workspaceProfile}>
                            
                            {/* Premium Recruiter Loading Modal Overlay */}
                            {exportingPdfId === activeCandidate.id && (
                                <div className={styles.premiumModalOverlay}>
                                    <div className={styles.premiumModalContent}>
                                        <div className={styles.premiumPulseSpinner}></div>
                                        <h4 className={styles.premiumModalTitle}>Generating recruiter intelligence report...</h4>
                                        <p className={styles.premiumModalSubtitle}>Assembling executive summaries, weighted capability mapping, inferred portfolio evidence, and structured diagnostic interviewing toolkits.</p>
                                    </div>
                                </div>
                            )}

                            {/* A. HEADER SECTION */}
                            <div className={styles.profileHeader}>
                                <div className={styles.headerIdentity}>
                                    <button
                                        onClick={(e) => handleToggleShortlist(e, activeCandidate.id)}
                                        className={`${styles.profileShortlistBtn} ${shortlist[activeCandidate.id] ? styles.shortlisted : ""}`}
                                        title={shortlist[activeCandidate.id] ? "Remove from Shortlist" : "Add to Shortlist"}
                                    >
                                        {shortlist[activeCandidate.id] ? "★ Shortlisted" : "☆ Shortlist"}
                                    </button>
                                    <h2 className={styles.profileName}>{getCandidateName(activeCandidate.resume_filename)}</h2>
                                    <span className={styles.profileFilename}>📄 {activeCandidate.resume_filename}</span>
                                </div>
                                
                                <div className={styles.headerMetrics}>
                                    <div className={styles.headerMetricItem}>
                                        <span className={styles.metricLabel}>Match Score</span>
                                        <span className={`${styles.metricVal} ${scoreClass}`}>{score}%</span>
                                    </div>
                                    <div className={styles.headerMetricItem}>
                                        <span className={styles.metricLabel}>Recommendation</span>
                                        <span className={`${styles.recBadge} ${recInfo.class}`}>
                                            {recInfo.emoji} {recInfo.text}
                                        </span>
                                    </div>
                                    <div className={styles.headerMetricItem} onClick={(e) => e.stopPropagation()}>
                                        <span className={styles.metricLabel}>Current Stage</span>
                                        <select
                                            value={stages[activeCandidate.id] || "Applied"}
                                            onChange={(e) => handleChangeStage(e, activeCandidate.id, e.target.value)}
                                            className={`${styles.stageSelect} ${styles[getStageClass(stages[activeCandidate.id] || "Applied")]}`}
                                        >
                                            <option value="Applied">Applied</option>
                                            <option value="Screened">Screened</option>
                                            <option value="Shortlisted">Shortlisted</option>
                                            <option value="Interview Scheduled">Interview Scheduled</option>
                                            <option value="Interviewed">Interviewed</option>
                                            <option value="Offer">Offer</option>
                                            <option value="Rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div className={styles.headerMetricItem}>
                                        <span className={styles.metricLabel}>Screening Date</span>
                                        <span className={styles.dateVal}>
                                            {activeSession ? new Date(activeSession.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : new Date().toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.headerActions} onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => handleExportPDF(e, activeCandidate.id, activeCandidate.resume_filename)}
                                        disabled={exportingPdfId === activeCandidate.id}
                                        className={styles.headerPdfBtn}
                                    >
                                        {exportingPdfId === activeCandidate.id ? "..." : "📄 Export Report"}
                                    </button>
                                    <label className={styles.headerCompareLabel}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => onSelect(activeCandidate.id)}
                                            disabled={!isSelected && selectedIds.length >= 3}
                                            className={styles.headerCompareCheckbox}
                                        />
                                        <span>Compare</span>
                                    </label>
                                </div>
                            </div>

                            {/* B. SECTION 5: CANDIDATE OVERVIEW CARD & AI RECRUITER SUMMARY */}
                            <div className={styles.overviewSectionContainer}>
                                <h4 className={styles.sectionHeadingTitle}>📋 Candidate Overview & AI Assessment</h4>
                                <div className={styles.overviewCardsGrid}>
                                    {/* 1. Match Score Card */}
                                    <div className={`${styles.overviewCard} ${styles.matchScoreCard}`}>
                                        <h5 className={styles.overviewCardTitle}>🎯 Suitability Match</h5>
                                        <div className={styles.radialMatchProgress}>
                                            <span className={styles.radialMatchVal}>{score}%</span>
                                            <span className={styles.radialMatchLabel}>Match Score</span>
                                        </div>
                                        <div className={styles.suitabilitySliderContainer}>
                                            <div className={styles.suitabilitySliderBg}>
                                                <div className={styles.suitabilitySliderFill} style={{ width: `${score}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* 2. Resume Card */}
                                    <div className={`${styles.overviewCard} ${styles.resumeCard}`}>
                                        <h5 className={styles.overviewCardTitle}>📄 Candidate File</h5>
                                        <div className={styles.resumeInfo}>
                                            <span className={styles.resumeIcon}>📂</span>
                                            <div className={styles.resumeTextMeta}>
                                                <span className={styles.resumeNameText} title={activeCandidate.resume_filename}>{activeCandidate.resume_filename}</span>
                                                <span className={styles.resumeFormat}>Format: PDF Document</span>
                                            </div>
                                        </div>
                                        <a
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExportPDF(e, activeCandidate.id, activeCandidate.resume_filename); }}
                                            className={styles.resumeDownloadLink}
                                        >
                                            Download Recruiter Dossier ➔
                                        </a>
                                    </div>

                                    {/* 3. Recommendation Card */}
                                    <div className={`${styles.overviewCard} ${styles.recCard}`}>
                                        <h5 className={styles.overviewCardTitle}>🟢 Recommendation</h5>
                                        <div className={styles.recValueWrapper}>
                                            <span className={`${styles.recStatusBadge} ${recInfo.class}`}>
                                                {recInfo.text}
                                            </span>
                                        </div>
                                        <p className={styles.recSummaryText}>
                                            Candidate is categorized as <strong>{recInfo.text}</strong> based on screening matching logic.
                                        </p>
                                    </div>

                                    {/* 4. Interview Readiness Card */}
                                    <div className={`${styles.overviewCard} ${styles.readinessCard}`}>
                                        <h5 className={styles.overviewCardTitle}>⚡ Interview Readiness</h5>
                                        <div className={styles.readinessValueWrapper}>
                                            <span className={`${styles.readinessBadge} ${
                                                score >= 80 ? styles.highlyReady :
                                                score >= 65 ? styles.ready :
                                                score >= 50 ? styles.conditionallyReady :
                                                styles.notReady
                                            }`}>
                                                {score >= 80 ? "🔥 HIGHLY READY" :
                                                 score >= 65 ? "✓ READY" :
                                                 score >= 50 ? "⚠ NEEDS REVIEW" :
                                                 "✗ NOT READY"}
                                            </span>
                                        </div>
                                        <p className={styles.readinessDesc}>
                                            {score >= 80 ? "Demonstrates outstanding alignment with core stack. Clear candidate for interview scheduling." :
                                             score >= 65 ? "Demonstrates solid matching of must-haves. Recommended for screening call." :
                                             score >= 50 ? "Has some gaps in requirements. Review missing skills before proceeding." :
                                             "Substantial missing requirements. Not recommended for interview."}
                                        </p>
                                    </div>
                                </div>

                                {/* AI Recruiter Summary Block */}
                                {renderAiSummary(activeCandidate, parsed)}

                                {/* Strengths & Missing Skills Pills in Overview */}
                                {parsed && parsed.type === "structured" && (
                                    <div className={styles.overviewStrengthsGapsGrid}>
                                        {parsed.strengths && parsed.strengths.length > 0 && (
                                            <div className={styles.overviewStrengthBox}>
                                                <h5 className={styles.overviewPillHeader}>✓ Key Strengths</h5>
                                                <div className={styles.overviewPillList}>
                                                    {parsed.strengths.map((str, idx) => (
                                                        <span key={idx} className={styles.overviewStrengthPill}>
                                                            ✓ {str}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {parsed.gaps && parsed.gaps.length > 0 && (
                                            <div className={styles.overviewGapBox}>
                                                <h5 className={styles.overviewPillHeader}>✗ Missing Requirements</h5>
                                                <div className={styles.overviewPillList}>
                                                    {parsed.gaps.map((gap, idx) => (
                                                        <span key={idx} className={styles.overviewGapPill}>
                                                            ✗ {gap}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* C. SECTION 6: SKILLS EVALUATION (FULL-WIDTH) */}
                            <div className={styles.skillsSectionContainer}>
                                <h4 className={styles.sectionHeadingTitle}>🎯 Skills Alignment Overview</h4>
                                <div className={styles.skillsStackLayout}>
                                    {renderSkillsOverviewList(
                                        "Must-Have Skills Requirements",
                                        activeCandidate.gap_analysis?.must_have_matched || [],
                                        activeCandidate.gap_analysis?.must_have_missing || [],
                                        styles.mustHaveSection
                                    )}
                                    
                                    {renderSkillsOverviewList(
                                        "Nice-To-Have Skills Requirements",
                                        activeCandidate.gap_analysis?.good_to_have_matched || [],
                                        activeCandidate.gap_analysis?.good_to_have_missing || [],
                                        styles.niceToHaveSection
                                    )}
                                </div>
                            </div>

                            {/* D. SECTION 7: INTERVIEWING TOOLKIT & NOTES (FULL-WIDTH) */}
                            <div className={styles.interviewSectionContainer}>
                                <h4 className={styles.sectionHeadingTitle}>💬 Tailored Interview Questions & Decision Commentary</h4>
                                <div className={styles.toolkitAndNotesStack}>
                                    
                                    {/* Interview Toolkit */}
                                    <div className={styles.toolkitSectionFullWidth}>
                                        <div className={styles.toolkitHeader}>
                                            <strong className={styles.subHeading}>Structured Recruiter Interviewing Toolkit</strong>
                                            <p className={styles.toolkitSubtitle}>Generate candidate-specific behavioral, technical, and concern-probing questions.</p>
                                        </div>

                                        {candidateQuestions[activeCandidate.id] ? (
                                            <div className={styles.toolkitContainer}>
                                                <div className={styles.toolkitTabs}>
                                                    {["technical", "project_deep_dive", "behavioral", "risk_probing"].map(tab => (
                                                        <button
                                                            key={tab}
                                                            onClick={() => setActiveQuestionTab(prev => ({ ...prev, [activeCandidate.id]: tab }))}
                                                            className={`${styles.toolkitTabBtn} ${activeTab === tab ? styles.activeToolkitTab : ""}`}
                                                        >
                                                            {tab.replace(/_/g, ' ').toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className={styles.toolkitList}>
                                                    {(candidateQuestions[activeCandidate.id][activeTab] || []).map((q, idx) => (
                                                        <div key={idx} className={styles.toolkitQuestionItem}>
                                                            <p className={styles.toolkitQuestionText}>{q}</p>
                                                            <button
                                                                onClick={() => handleCopy(q)}
                                                                className={`${styles.copyBtn} ${copiedText === q ? styles.copied : ""}`}
                                                            >
                                                                {copiedText === q ? "✓ Copied" : "📋 Copy"}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.generatorPromptBox}>
                                                <p className={styles.generatorPromptText}>Generate candidate-specific behavioral, technical, and concern-probing questions based on detected resume gaps.</p>
                                                <button
                                                    onClick={(e) => handleGenerateQuestions(e, activeCandidate.id)}
                                                    disabled={generatingId === activeCandidate.id}
                                                    className={styles.generatorTriggerBtn}
                                                >
                                                    {generatingId === activeCandidate.id ? "Formulating questions..." : "Generate Interview Toolkit"}
                                                </button>
                                                {generationError[activeCandidate.id] && (
                                                    <span className={styles.genErrorBox}>{generationError[activeCandidate.id]}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Recruiter Decision Commentary */}
                                    <div className={styles.notesSectionFullWidth}>
                                        <strong className={styles.subHeading}>Recruiter Decision Commentary</strong>
                                        <p className={styles.toolkitSubtitle}>Add comments on portfolio evidence, screening performance, or team fit.</p>
                                        <textarea
                                            className={styles.notesTextarea}
                                            placeholder="Add comments on portfolio evidence, screening performance, or team fit..."
                                            value={notes[activeCandidate.id] || ""}
                                            onChange={(e) => handleSaveNote(activeCandidate.id, e.target.value)}
                                        />
                                        <span className={styles.saveNotesIndicator}>✓ Saved in local workspace</span>
                                    </div>

                                </div>
                            </div>

                            {/* E. SECTION 8: COLLAPSIBLE TECHNICAL ADVANCED ANALYSIS (FULL-WIDTH) */}
                            <div className={styles.advancedInsightsSection}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleAdvancedOpen(activeCandidate.id); }}
                                    className={styles.advancedToggleBtn}
                                >
                                    <span>{isAdvancedOpen ? "▼ Hide Advanced Suitability Intelligence" : "▶ Show Advanced Suitability Intelligence"}</span>
                                    <span className={styles.advancedToggleBadge}>⚙️ Intelligence Signals</span>
                                </button>

                                {isAdvancedOpen && (
                                    <div className={styles.advancedContentWrapper} onClick={(e) => e.stopPropagation()}>
                                        <div className={styles.advancedStack}>
                                            
                                            {/* 1. Skill Gap Intelligence & Weighted Evaluations */}
                                            <div className={styles.advancedSectionCard}>
                                                <h4 className={styles.advancedCardHeading}>🎯 Skill Gap Intelligence & Semantic Evidence</h4>
                                                {activeCandidate.gap_analysis?.weighted_evaluations && activeCandidate.gap_analysis.weighted_evaluations.length > 0 ? (
                                                    <div className={styles.weightedEvalsList}>
                                                        {activeCandidate.gap_analysis.weighted_evaluations.map((ev, i) => {
                                                            const status = ev.status || "missing";
                                                            const quality = ev.evidence_quality || 100;
                                                            let pillClass = styles.missingEvalCard;
                                                            let statusSymbol = "❌";
                                                            if (status === "matched") {
                                                                pillClass = styles.matchedEvalCard;
                                                                statusSymbol = "✓ Matched";
                                                            } else if (status === "inferred") {
                                                                pillClass = styles.inferredEvalCard;
                                                                statusSymbol = "✓ Inferred";
                                                            } else if (status === "ambiguous" || status === "partial") {
                                                                pillClass = styles.ambiguousEvalCard;
                                                                statusSymbol = "⚠️ Partial";
                                                            }
                                                            
                                                            return (
                                                                <div key={i} className={`${styles.weightedEvalItem} ${pillClass}`}>
                                                                    <div className={styles.weightedEvalItemHeader}>
                                                                        <span className={styles.weightedSkillName}>{ev.name}</span>
                                                                        <span className={styles.weightedSkillStatus}>{statusSymbol} ({quality}%)</span>
                                                                    </div>
                                                                    {ev.evidence && (
                                                                        <p className={styles.weightedSkillEvidence}><strong>Evidence:</strong> "{ev.evidence}"</p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className={styles.emptyAdvancedText}>No weighted skill evaluations found.</p>
                                                )}
                                            </div>

                                            {/* 2. Competency Inference & Projects Mapping */}
                                            <div className={styles.advancedSectionCard}>
                                                <h4 className={styles.advancedCardHeading}>📁 Competency Inference & Projects Mapping</h4>
                                                {activeCandidate.gap_analysis?.project_intelligence && activeCandidate.gap_analysis.project_intelligence.length > 0 ? (
                                                    <div className={styles.projectIntelList}>
                                                        {activeCandidate.gap_analysis.project_intelligence.map((proj, pIdx) => (
                                                            <div key={pIdx} className={styles.projectIntelItem}>
                                                                <div className={styles.projectIntelItemHeader}>
                                                                    <strong className={styles.projectIntelName}>📁 {proj.project_name}</strong>
                                                                    <span className={styles.projectIntelRelevance}>{proj.relevance_score}% Relevance</span>
                                                                </div>
                                                                <p className={styles.projectIntelDesc}>{proj.description}</p>
                                                                {proj.inferred_skills && proj.inferred_skills.length > 0 && (
                                                                    <div className={styles.projectIntelPills}>
                                                                        <strong>Capabilities:</strong>
                                                                        {proj.inferred_skills.map((skill, sIdx) => (
                                                                            <span key={sIdx} className={styles.inferredSkillPill}>{skill}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {proj.impact_summary && (
                                                                    <p className={styles.projectIntelImpact}><strong>Impact:</strong> {proj.impact_summary}</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className={styles.emptyAdvancedText}>No project competency evidence recorded in profile.</p>
                                                )}
                                            </div>

                                            {/* 3. Confidence Metrics & Radar Capabilities */}
                                            <div className={`${styles.advancedSectionCard} ${styles.doubleColCard}`}>
                                                <h4 className={styles.advancedCardHeading}>🛡️ Reliability Analytics & Capabilities Breakdown</h4>
                                                <div className={styles.reliabilityAndRadarLayoutStacked}>
                                                    
                                                    {/* Confidence Cards */}
                                                    <div className={styles.reliabilityMetricsList}>
                                                        {activeCandidate.gap_analysis?.reliability_signals ? (
                                                            <>
                                                                <div className={styles.reliabilityMetricBox}>
                                                                    <span className={styles.reliabilityBoxLabel}>AI Confidence Score</span>
                                                                    <span className={styles.reliabilityBoxValue}>{activeCandidate.gap_analysis.reliability_signals.ai_confidence_score}%</span>
                                                                </div>
                                                                <div className={styles.reliabilityMetricBox}>
                                                                    <span className={styles.reliabilityBoxLabel}>Evidence Strength</span>
                                                                    <span className={styles.reliabilityBoxValue}>{activeCandidate.gap_analysis.reliability_signals.evidence_strength}%</span>
                                                                </div>
                                                                <div className={styles.reliabilityMetricBox}>
                                                                    <span className={styles.reliabilityBoxLabel}>Parsing Reliability</span>
                                                                    <span className={styles.reliabilityBoxValue}>{activeCandidate.gap_analysis.reliability_signals.parsing_reliability}%</span>
                                                                </div>
                                                            </>
                                                        ) : activeCandidate.gap_analysis?.extraction_confidence ? (
                                                            <div className={styles.reliabilityMetricBox}>
                                                                <span className={styles.reliabilityBoxLabel}>Parsing Confidence</span>
                                                                <span className={styles.reliabilityBoxValue}>{activeCandidate.gap_analysis.extraction_confidence.score}%</span>
                                                            </div>
                                                        ) : (
                                                            <p className={styles.emptyAdvancedText}>No reliability signals recorded.</p>
                                                        )}
                                                        
                                                        {activeCandidate.gap_analysis?.recruiter_alerts && activeCandidate.gap_analysis.recruiter_alerts.length > 0 && (
                                                            <div className={styles.recruiterAlertsBox}>
                                                                <strong>Diagnostics & Alerts:</strong>
                                                                <ul className={styles.recAlertsList}>
                                                                    {activeCandidate.gap_analysis.recruiter_alerts.map((alert, idx) => (
                                                                        <li key={idx} className={styles.recAlertsItem}>{alert}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Recharts Radar Chart */}
                                                    <div className={styles.radarCardWrapperStacked}>
                                                        <span className={styles.radarCardLabel}>Qualifications Radar Alignment</span>
                                                        <div className={styles.radarChartContainer}>
                                                            <ResponsiveContainer width="100%" height={260}>
                                                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getCandidateRadarData(activeCandidate)}>
                                                                    <PolarGrid stroke="#e2e8f0" />
                                                                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10 }} />
                                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 9 }} />
                                                                    <Radar name="Candidate" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.15} />
                                                                </RadarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                );
            })()}

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