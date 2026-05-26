"use client";

import styles from "./ResultsTable.module.css";
import { getScoreColor, getScoreBadge } from "../lib/constants";

export default function ResultsTable({ results, isLoading }) {
    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Screening resumes...</p>
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className={styles.empty}>
                <p>📭 No results yet. Upload resumes to get started.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>
                📊 Results ({results.length} resume{results.length !== 1 ? "s" : ""})
            </h2>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.rankCol}>#</th>
                            <th className={styles.nameCol}>Resume</th>
                            <th className={styles.scoreCol}>Score</th>
                            <th className={styles.reasoningCol}>Reasoning</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((result, index) => (
                            <tr key={result.id} className={styles.row}>
                                <td className={styles.rankCol}>{index + 1}</td>
                                <td className={styles.nameCol}>
                                    <span className={styles.fileName}>
                                        {result.resume_filename}
                                    </span>
                                </td>
                                <td className={styles.scoreCol}>
                                    <div
                                        className={styles.scoreBadge}
                                        style={{ background: getScoreColor(result.score) }}
                                    >
                                        <span className={styles.scoreValue}>{result.score}</span>
                                        <span className={styles.scoreBadgeName}>
                                            {getScoreBadge(result.score)}
                                        </span>
                                    </div>
                                </td>
                                <td className={styles.reasoningCol}>
                                    <p className={styles.reasoning}>{result.reasoning}</p>
                                </td>
                            </tr>
                        ))}
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