"use client";

import React, { useState, useEffect } from "react";
import styles from "./ResultsTable.module.css";
import { getScoreBadge } from "../lib/constants";
import { exportCSV } from "../lib/api";
import StatusBadge from "./StatusBadge";
import CandidateWorkspace from "./CandidateWorkspace";

// Removed legacy functions; now consuming CandidateViewModel properties.
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
                            const recInfo = result.recommendation;
                            const currentStatus = candidateStatuses[result.id] || "New";

                            return (
                                <React.Fragment key={result.id}>
                                <tr
                                    className={`${styles.row} ${activeCandidateId === result.id ? styles.activeCandidateRow : ""}`}
                                    onClick={() => onViewCandidate(result.id === activeCandidateId ? null : result.id)}
                                >
                                    <td className={styles.nameCol} style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <div className={styles.nameWrapper}>
                                            <div className={styles.fileNameRow} onClick={(e) => e.stopPropagation()}>
                                                <span className={styles.fileName} onClick={() => onViewCandidate(result.id)} style={{ cursor: "pointer", display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {result.name}
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
                                        <span className={`${styles.recBadge} ${styles[recInfo?.styleClass] || styles.reject}`}>
                                            {recInfo?.text}
                                        </span>
                                    </td>
                                    <td className="" onClick={(e) => e.stopPropagation()}>
                                        <StatusBadge
                                            status={currentStatus}
                                            onChange={(newStatus) => onStatusChange(result.id, newStatus)}
                                            interactive={true}
                                        />
                                    </td>
                                </tr>
                                {activeCandidateId === result.id && (
                                    <tr key={`${result.id}-workspace`} className={styles.workspaceRow}>
                                        <td colSpan="4" className={styles.workspaceCell}>
                                            <CandidateWorkspace
                                                candidate={result}
                                                status={currentStatus}
                                                onStatusChange={(newStatus) => onStatusChange(result.id, newStatus)}
                                                note={candidateNotes[result.id] || ""}
                                                onNoteChange={(newNote) => onNoteChange(result.id, newNote)}
                                                onExportPdf={() => {}}
                                            />
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}