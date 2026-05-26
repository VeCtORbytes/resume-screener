"use client";

import { useState } from "react";
import styles from "./ResultsTable.module.css";
import { getScoreBadge } from "../lib/constants";

// Robust regex-based reasoning text parser
function parseReasoning(reasoning) {
    if (!reasoning) return null;
    
    try {
        const hasBreakdown = reasoning.includes("📊 Breakdown:") || reasoning.includes("Breakdown:");
        const hasStrengths = reasoning.includes("✅ Strengths:") || reasoning.includes("Strengths:");
        const hasGaps = reasoning.includes("⚠️ Gaps:") || reasoning.includes("Gaps:");
        
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

export default function ResultsTable({ results = [], isLoading }) {
    const [expandedIds, setExpandedIds] = useState({});

    const toggleExpand = (id) => {
        setExpandedIds((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.pulseContainer}>
                    <div className={styles.pulseDot}></div>
                    <div className={styles.pulseDot}></div>
                    <div className={styles.pulseDot}></div>
                </div>
                <p className={styles.loadingTitle}>Evaluating Candidates...</p>
                <p className={styles.loadingSub}>Analyzing technical fit, work alignment, and grading scores...</p>
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className={styles.emptyContainer}>
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🎯</span>
                    <h3 className={styles.emptyTitle}>Ready for Evaluation</h3>
                    <p className={styles.emptySubText}>
                        Upload candidate resumes and provide the target job requirements on the left to initiate screening.
                    </p>
                </div>
            </div>
        );
    }

    // Stats calculations
    const avgScore = (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1);
    const maxScore = Math.max(...results.map((r) => r.score));

    return (
        <div className={styles.resultsContainer}>
            {/* Header Dashboard Metrics */}
            <div className={styles.dashboardHeader}>
                <div className={styles.headerInfo}>
                    <h3 className={styles.dashboardTitle}>Screened Candidates</h3>
                    <p className={styles.dashboardSubtitle}>Factual ranking based on mathematical rubric scoring</p>
                </div>
                <div className={styles.statsRow}>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>Total Screened</span>
                        <span className={styles.statVal}>{results.length}</span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>Average Score</span>
                        <span className={styles.statVal}>{avgScore}<span className={styles.scoreScale}>/100</span></span>
                    </div>
                    <div className={styles.statBox}>
                        <span className={styles.statLabel}>Top Candidate</span>
                        <span className={styles.statVal}>{maxScore}<span className={styles.scoreScale}>/100</span></span>
                    </div>
                </div>
            </div>

            {/* Candidate Cards List */}
            <div className={styles.cardsList}>
                {results.map((result, index) => {
                    const score = result.score;
                    const parsed = parseReasoning(result.reasoning);
                    const isExpanded = !!expandedIds[result.id];

                    // Score tier color mapping
                    const scoreClass = score >= 80 
                        ? styles.excellent 
                        : score >= 60 
                            ? styles.good 
                            : score >= 40 
                                ? styles.fair 
                                : styles.poor;

                    const scoreLabel = getScoreBadge(score);

                    return (
                        <div key={result.id} className={`${styles.candidateCard} ${isExpanded ? styles.activeCard : ""}`}>
                            {/* Card Main Summary Row */}
                            <div className={styles.cardSummary} onClick={() => toggleExpand(result.id)}>
                                <div className={styles.cardHeaderLeft}>
                                    <div className={styles.rankBadge}>#{index + 1}</div>
                                    <div className={styles.candidateDetails}>
                                        <h4 className={styles.fileName}>{result.resume_filename}</h4>
                                        {parsed && parsed.type === "structured" && (
                                            <p className={styles.recommendationText}>
                                                Recommendation: <strong>{parsed.recommendation || scoreLabel}</strong>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.cardHeaderRight}>
                                    <div className={`${styles.scoreBadge} ${scoreClass}`}>
                                        <span className={styles.scoreValue}>{score}</span>
                                        <span className={styles.scoreLabel}>{scoreLabel}</span>
                                    </div>
                                    <button className={`${styles.expandBtn} ${isExpanded ? styles.expanded : ""}`} aria-label="Toggle Details">
                                        ▼
                                    </button>
                                </div>
                            </div>

                            {/* Expandable Detailed Evaluation Drawer */}
                            {isExpanded && (
                                <div className={styles.cardDetails}>
                                    {parsed && parsed.type === "structured" ? (
                                        <div className={styles.structuredDetails}>
                                            
                                            {/* Rubric Breakdown Grid */}
                                            <div className={styles.detailSection}>
                                                <h5 className={styles.sectionTitle}>📊 Rubric Alignment Breakdown</h5>
                                                <div className={styles.breakdownGrid}>
                                                    <div className={styles.rubricBar}>
                                                        <div className={styles.rubricInfo}>
                                                            <span>Technical Skills Match</span>
                                                            <strong>{parsed.breakdown.skills} / 40</strong>
                                                        </div>
                                                        <div className={styles.barContainer}>
                                                            <div className={`${styles.barFill} ${styles.skillsBar}`} style={{ width: `${(parsed.breakdown.skills / 40) * 100}%` }}></div>
                                                        </div>
                                                    </div>

                                                    <div className={styles.rubricBar}>
                                                        <div className={styles.rubricInfo}>
                                                            <span>Experience Relevance</span>
                                                            <strong>{parsed.breakdown.experience} / 25</strong>
                                                        </div>
                                                        <div className={styles.barContainer}>
                                                            <div className={`${styles.barFill} ${styles.expBar}`} style={{ width: `${(parsed.breakdown.experience / 25) * 100}%` }}></div>
                                                        </div>
                                                    </div>

                                                    <div className={styles.rubricBar}>
                                                        <div className={styles.rubricInfo}>
                                                            <span>Projects & Application</span>
                                                            <strong>{parsed.breakdown.projects} / 20</strong>
                                                        </div>
                                                        <div className={styles.barContainer}>
                                                            <div className={`${styles.barFill} ${styles.projBar}`} style={{ width: `${(parsed.breakdown.projects / 20) * 100}%` }}></div>
                                                        </div>
                                                    </div>

                                                    <div className={styles.rubricBar}>
                                                        <div className={styles.rubricInfo}>
                                                            <span>Education & Certs</span>
                                                            <strong>{parsed.breakdown.education} / 10</strong>
                                                        </div>
                                                        <div className={styles.barContainer}>
                                                            <div className={`${styles.barFill} ${styles.eduBar}`} style={{ width: `${(parsed.breakdown.education / 10) * 100}%` }}></div>
                                                        </div>
                                                    </div>

                                                    <div className={styles.rubricBar}>
                                                        <div className={styles.rubricInfo}>
                                                            <span>Domain & Keyword Fit</span>
                                                            <strong>{parsed.breakdown.domain} / 5</strong>
                                                        </div>
                                                        <div className={styles.barContainer}>
                                                            <div className={`${styles.barFill} ${styles.domBar}`} style={{ width: `${(parsed.breakdown.domain / 5) * 100}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Strengths & Gaps side-by-side */}
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

                                        </div>
                                    ) : (
                                        // Legacy plain-text fallback
                                        <div className={styles.rawReasoning}>
                                            <h5 className={styles.sectionTitle}>Evaluation Reasoning</h5>
                                            <p className={styles.rawText}>{result.reasoning}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}