"use client";

import { useState, useEffect } from "react";
import styles from "./ResultsTable.module.css";
import { getScoreBadge } from "../lib/constants";
import { generateInterviewQuestions, exportPDF, exportCSV, exportComparison } from "../lib/api";
import StatusBadge from "./StatusBadge";
import CandidateWorkspace from "./CandidateWorkspace";

function getCandidateName(filename) {
    if (!filename) return "Unknown Candidate";
    return filename.split('.')[0].replace(/[_]/g, ' ').replace(/[-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getHiringRecommendation(score) {
    if (score >= 90) return { text: "Recommended for Interview", emoji: "", color: "#10b981", class: styles.strongHire };
    if (score >= 80) return { text: "Potential Match",           emoji: "", color: "#10b981", class: styles.hire };
    if (score >= 65) return { text: "Requires Further Review",   emoji: "", color: "#f59e0b", class: styles.needsInterview };
    if (score >= 50) return { text: "Requires Further Review",   emoji: "", color: "#f97316", class: styles.needsReview };
    return             { text: "Limited Alignment",              emoji: "", color: "#ef4444", class: styles.reject };
}



export default function ResultsTable({
    results = [],
    isLoading,
    selectedIds = [],
    onSelect,
    screeningId,
    activeSession,
    candidateStatuses = {},
    onStatusChange,
    candidateNotes = {},
    onNoteChange
}) {
    const [candidateQuestions, setCandidateQuestions] = useState({});
    const [generatingId, setGeneratingId] = useState(null);
    const [generationError, setGenerationError] = useState({});
    const [activeQuestionTab, setActiveQuestionTab] = useState({}); // Stores active tab name mapped per candidate
    const [advancedInsightsOpen, setAdvancedInsightsOpen] = useState({}); // Stores expanded state of Detailed Analysis drawer
    const [activeCandidateId, setActiveCandidateId] = useState(null); // Stores currently active candidate in vertical workflow
    const [copiedText, setCopiedText] = useState(null);
    const [exportingPdfId, setExportingPdfId] = useState(null);
    const [exportPdfError, setExportPdfError] = useState({});
    const [exportingGlobal, setExportingGlobal] = useState(false);
    const [globalExportError, setGlobalExportError] = useState(null);
    const [isShareOpen, setIsShareOpen] = useState(false);

    const toggleAdvancedOpen = (candId) => {
        setAdvancedInsightsOpen(prev => ({
            ...prev,
            [candId]: !prev[candId]
        }));
    };

    useEffect(() => {
        if (results && results.length > 0) {
            // Find a valid active candidate ID if the current one is no longer in the results
            const ids = results.map(r => r.id);
            if (!activeCandidateId || !ids.includes(activeCandidateId)) {
                setActiveCandidateId(results[0].id);
            }
        } else {
            setActiveCandidateId(null);
        }
    }, [results, screeningId, activeCandidateId]);

    useEffect(() => {
        if (!isShareOpen) return;
        const closeShare = () => setIsShareOpen(false);
        window.addEventListener("click", closeShare);
        return () => window.removeEventListener("click", closeShare);
    }, [isShareOpen]);

    // Reset dependent drawer and generation states when the screening session transitions
    useEffect(() => {
        setCandidateQuestions({});
        setGeneratingId(null);
        setGenerationError({});
        setActiveQuestionTab({});
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

    const handleExportPDF = async (resultId, filename) => {
        setExportingPdfId(resultId);
        setExportPdfError((prev) => ({ ...prev, [resultId]: null }));
        try {
            const candidateName = filename.split('.')[0].replace(/[_]/g, ' ');
            const candNotes = candidateNotes[resultId] || "";
            const candStatus = candidateStatuses[resultId] || "New";
            
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

            await exportPDF(resultId, candidateName, candNotes, candStatus, flatQuestions);
        } catch (err) {
            setExportPdfError((prev) => ({
                ...prev,
                [resultId]: "Failed to generate recruiter intelligence report: " + err.message
            }));
        } finally {
            setExportingPdfId(null);
        }
    };

    const handleGenerateQuestions = async (resultId) => {
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

    // Sort results: Shortlisted candidates rise to the top. Tie-breaker is score descending.
    const sortedResults = [...results].sort((a, b) => {
        const aShort = (candidateStatuses[a.id] || "New") === "Shortlisted";
        const bShort = (candidateStatuses[b.id] || "New") === "Shortlisted";
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
                        <h4 className={styles.premiumModalTitle}>Preparing export…</h4>
                        <p className={styles.premiumModalSubtitle}>Compiling candidate evaluation data.</p>
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
                                            await handleExportPDF(targetCand.id, targetCand.resume_filename);
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
                            <th className={styles.stageCol}>Status</th>
                            <th className={styles.actionCol}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedResults.map((result, index) => {
                            const score = result.score;

                            const scoreClass = score >= 80
                                ? styles.excellent
                                : score >= 60
                                    ? styles.good
                                    : score >= 40
                                        ? styles.fair
                                        : styles.poor;

                            const isSelected = selectedIds.includes(result.id);
                            const recInfo = getHiringRecommendation(score);
                            const currentStatus = candidateStatuses[result.id] || "New";

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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onStatusChange(result.id, currentStatus === "Shortlisted" ? "New" : "Shortlisted");
                                                    }}
                                                    className={`${styles.shortlistStarBtn} ${currentStatus === "Shortlisted" ? styles.shortlisted : ""}`}
                                                    title={currentStatus === "Shortlisted" ? "Remove from Shortlist" : "Add to Shortlist"}
                                                >
                                                    {currentStatus === "Shortlisted" ? "★" : "☆"}
                                                </button>
                                                <span className={styles.fileName} onClick={() => setActiveCandidateId(result.id)} style={{ cursor: "pointer" }}>
                                                    {getCandidateName(result.resume_filename)}
                                                </span>
                                            </div>
                                            

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
                                        <StatusBadge
                                            status={currentStatus}
                                            onChange={(newStatus) => onStatusChange(result.id, newStatus)}
                                            interactive={true}
                                        />
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleExportPDF(result.id, result.resume_filename);
                                                }}
                                                disabled={exportingPdfId === result.id}
                                                className={styles.pdfActionBtnSecondary}
                                                title="Export candidate report as PDF"
                                            >
                                                {exportingPdfId === result.id ? "…" : "Export"}
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

                const status = candidateStatuses[activeCandidate.id] || "New";
                const note = candidateNotes[activeCandidate.id] || "";

                return (
                    <CandidateWorkspace
                        candidate={activeCandidate}
                        status={status}
                        onStatusChange={(newStatus) => onStatusChange(activeCandidate.id, newStatus)}
                        note={note}
                        onNoteChange={(newNote) => onNoteChange(activeCandidate.id, newNote)}
                        onExportPdf={handleExportPDF}
                        isExportingPdf={exportingPdfId === activeCandidate.id}
                        isSelected={selectedIds.includes(activeCandidate.id)}
                        onSelect={onSelect}
                        candidateQuestions={candidateQuestions[activeCandidate.id]}
                        onGenerateQuestions={handleGenerateQuestions}
                        isGeneratingQuestions={generatingId === activeCandidate.id}
                        activeQuestionTab={activeQuestionTab[activeCandidate.id] || "technical"}
                        onActiveQuestionTabChange={(tab) => setActiveQuestionTab(prev => ({ ...prev, [activeCandidate.id]: tab }))}
                        isAdvancedOpen={!!advancedInsightsOpen[activeCandidate.id]}
                        onToggleAdvanced={() => toggleAdvancedOpen(activeCandidate.id)}
                    />
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