"use client";

import { useState, useEffect } from "react";
import styles from "./ResultsTable.module.css";
import { getScoreBadge } from "../lib/constants";
import { generateInterviewQuestions, exportPDF, exportCSV, exportComparison } from "../lib/api";
import StatusBadge from "./StatusBadge";

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
    onNoteChange,
    onViewCandidate,
    activeCandidateId
}) {
    const [exportingPdfId, setExportingPdfId] = useState(null);
    const [exportPdfError, setExportPdfError] = useState({});

    const handleExportPDF = async (resultId, filename) => {
        setExportingPdfId(resultId);
        setExportPdfError((prev) => ({ ...prev, [resultId]: null }));
        try {
            const candidateName = filename.split('.')[0].replace(/[_]/g, ' ');
            const candNotes = candidateNotes[resultId] || "";
            const candStatus = candidateStatuses[resultId] || "New";
            
            await exportPDF(resultId, candidateName, candNotes, candStatus, []);
        } catch (err) {
            setExportPdfError((prev) => ({
                ...prev,
                [resultId]: "Failed to generate recruiter intelligence report: " + err.message
            }));
        } finally {
            setExportingPdfId(null);
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

            <div className={styles.resultsHeaderRow}>
                <h2 className={styles.title}>
                    📊 Results ({results.length} resume{results.length !== 1 ? "s" : ""})
                </h2>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.nameCol}>Candidate</th>
                            <th className={styles.scoreCol}>Match Score</th>
                            <th className="">Recommendation</th>
                            <th className="">Status</th>
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
                                    className={`${styles.row} ${activeCandidateId === result.id ? styles.activeCandidateRow : ""}`}
                                    onClick={() => onViewCandidate(result.id)}
                                >
                                    <td className={styles.nameCol}>
                                        <div className={styles.nameWrapper}>
                                            <div className={styles.fileNameRow} onClick={(e) => e.stopPropagation()}>
                                                <span className={styles.fileName} onClick={() => onViewCandidate(result.id)} style={{ cursor: "pointer" }}>
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
                                    <td className="">
                                        <span className={`${styles.recBadge} ${recInfo.class}`}>
                                            {recInfo.emoji} {recInfo.text}
                                        </span>
                                    </td>
                                    <td className="" onClick={(e) => e.stopPropagation()}>
                                        <StatusBadge
                                            status={currentStatus}
                                            onChange={(newStatus) => onStatusChange(result.id, newStatus)}
                                            interactive={true}
                                        />
                                    </td>
                                    <td className={styles.actionCol} onClick={(e) => e.stopPropagation()}>
                                        <div className={styles.actionCellContainer}>
                                            <button 
                                                onClick={() => onViewCandidate(result.id)}
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