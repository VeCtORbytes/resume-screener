"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Cell
} from "recharts";
import styles from "./CandidateComparison.module.css";

// Robust parsing of candidate scores & reasoning (matches the ResultsTable breakdown logic)
function parseReasoning(reasoning) {
  if (!reasoning) return null;

  try {
    const hasBreakdown = reasoning.includes("Breakdown:") || reasoning.includes("Breakdown");
    const hasStrengths = reasoning.includes("Strengths:") || reasoning.includes("Strengths");
    const hasGaps = reasoning.includes("Gaps:") || reasoning.includes("Gaps");

    if (!hasBreakdown && !hasStrengths && !hasGaps) {
      return { type: "raw", text: reasoning };
    }

    let recommendation = "";
    const recMatch = reasoning.match(/Recommendation:\s*([^\n\r]+)/i);
    if (recMatch) {
      recommendation = recMatch[1].trim();
    }

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

    let strengths = [];
    const strengthsParts = reasoning.split(/✅ Strengths:|Strengths:/i);
    if (strengthsParts.length > 1) {
      const strengthsText = strengthsParts[1].split(/⚠️ Gaps:|Gaps:/i)[0];
      strengths = strengthsText
        .split("\n")
        .map(line => line.replace(/^[-•*✅\s]+/, "").trim())
        .filter(line => line.length > 3);
    }

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
    console.error("Failed to parse reasoning details in compare view:", e);
    return null;
  }
}

function getCandidateMetrics(cand) {
  const score = cand.score || 0;
  const filename = cand.resume_filename || "Candidate";
  const name = filename.replace(/\.[^/.]+$/, "");

  const parsed = parseReasoning(cand.reasoning);
  const fallbackMetrics = {
    name,
    "Technical Fit": score,
    "Experience": Math.round(score * 0.95),
    "Project Relevance": Math.round(score * 0.90),
    "Education": Math.round(score * 0.85),
    "Overall Score": score
  };

  if (!parsed || !parsed.breakdown) return fallbackMetrics;

  const b = parsed.breakdown;
  return {
    name,
    "Technical Fit": Math.round((b.skills / 40) * 100),
    "Experience": Math.round((b.experience / 25) * 100),
    "Project Relevance": Math.round((b.projects / 20) * 100),
    "Education": Math.round((b.education / 10) * 100),
    "Overall Score": score
  };
}

export default function CandidateComparison({ selectedCandidates = [], onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (selectedCandidates.length === 0) {
    return (
      <div className={styles.empty}>
        <h4>No Candidates Selected for Comparison</h4>
        <button onClick={onClose} className={styles.closeBtn}>Close</button>
      </div>
    );
  }

  // --- Match Tier resolution helper ---
  const getMatchTier = (score) => {
    if (score >= 80) return { label: "Strong Match", class: styles.strongBadge };
    if (score >= 50) return { label: "Medium Match", class: styles.mediumBadge };
    return { label: "Weak Match", class: styles.weakBadge };
  };

  // --- Interview Readiness index helper ---
  const getReadiness = (score) => {
    if (score >= 80) return { label: "Highly Ready", value: 92, class: styles.readyHigh };
    if (score >= 65) return { label: "Ready", value: 75, class: styles.readyMedHigh };
    if (score >= 50) return { label: "Needs Review", value: 50, class: styles.readyMed };
    return { label: "Not Recommended", value: 25, class: styles.readyLow };
  };

  // --- Chart 1: Bar Chart Data (Score Comparison) ---
  const barChartData = selectedCandidates.map(c => {
    const filename = c.resume_filename || "Candidate";
    const displayName = filename.replace(/\.[^/.]+$/, "");
    return {
      name: displayName.length > 15 ? displayName.slice(0, 15) + "..." : displayName,
      Score: c.score || 0
    };
  });

  // --- Chart 2: Radar Chart Data ---
  const candMetrics = selectedCandidates.map(c => getCandidateMetrics(c));
  const radarDimensions = [
    { subject: "Technical Fit" },
    { subject: "Experience" },
    { subject: "Project Relevance" },
    { subject: "Education" },
    { subject: "Overall Score" }
  ];

  const radarChartData = radarDimensions.map(dim => {
    const item = { subject: dim.subject };
    candMetrics.forEach((cand, idx) => {
      item[`cand_${idx}`] = cand[dim.subject] || 0;
      item[`cand_${idx}_name`] = cand.name;
    });
    return item;
  });

  const radarColors = ["#4f46e5", "#06b6d4", "#f59e0b"];

  return (
    <div className={styles.workspace}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon}>⚖️</span>
          <h3 className={styles.title}>Candidate Comparison Matrix</h3>
          <p className={styles.subtitle}>Side-by-side evaluation comparison of top candidate profiles</p>
        </div>
        <button onClick={onClose} className={styles.backBtn}>
          ← Back to Candidates List
        </button>
      </div>

      {/* --- SIDE-BY-SIDE CARDS GRID --- */}
      <div className={styles.cardsGrid} style={{ gridTemplateColumns: `repeat(${selectedCandidates.length}, 1fr)` }}>
        {selectedCandidates.map((cand, idx) => {
          const score = cand.score || 0;
          const tier = getMatchTier(score);
          const readiness = getReadiness(score);
          const parsed = parseReasoning(cand.reasoning);
          const filename = cand.resume_filename || "Resume.pdf";
          const displayName = filename.replace(/\.[^/.]+$/, "");

          // Combine AI match strengths & fallback strengths
          const strengths = cand.gap_analysis?.strength_areas?.length
            ? cand.gap_analysis.strength_areas
            : (parsed?.strengths || ["Technical stack suitability"]);
          
          const gaps = cand.gap_analysis?.critical_gaps?.length
            ? cand.gap_analysis.critical_gaps
            : (parsed?.gaps || ["No major gaps flagged"]);

          const summary = parsed?.recommendation 
            ? `${parsed.recommendation}. Standard mathematical evaluation matching job directives.`
            : "Satisfactory candidate evaluation matching guidelines.";

          return (
            <div key={cand.id} className={styles.compareCard}>
              <div className={styles.cardHeader} style={{ borderTop: `4px solid ${radarColors[idx]}` }}>
                <span className={styles.cardRank}>#{idx + 1} Candidate</span>
                <h4 className={styles.cardName} title={displayName}>{displayName}</h4>
                <div className={styles.cardScoreGroup}>
                  <h1 className={styles.cardScore}>{score}</h1>
                  <div className={styles.cardBadges}>
                    <span className={`${styles.badge} ${tier.class}`}>{tier.label}</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className={styles.section}>
                <span className={styles.secTitle}>Evaluation Summary</span>
                <p className={styles.secText}>{summary}</p>
              </div>

              {/* Strengths */}
              <div className={styles.section}>
                <span className={`${styles.secTitle} ${styles.greenTitle}`}>Key Strengths</span>
                <ul className={styles.bulletList}>
                  {strengths.slice(0, 3).map((st, i) => (
                    <li key={i} className={styles.bulletItemGreen}>✓ {st}</li>
                  ))}
                </ul>
              </div>

              {/* Gaps */}
              <div className={styles.section}>
                <span className={`${styles.secTitle} ${styles.redTitle}`}>Critical Gaps</span>
                <ul className={styles.bulletList}>
                  {gaps.slice(0, 3).map((gp, i) => (
                    <li key={i} className={styles.bulletItemRed}>⚠️ {gp}</li>
                  ))}
                </ul>
              </div>

              {/* Interview Readiness Indicator */}
              <div className={styles.section}>
                <span className={styles.secTitle}>Interview Readiness</span>
                <div className={styles.readinessContainer}>
                  <div className={styles.readinessHeader}>
                    <span className={`${styles.readinessBadge} ${readiness.class}`}>{readiness.label}</span>
                    <span className={styles.readinessPercent}>{readiness.value}%</span>
                  </div>
                  <div className={styles.readinessTrack}>
                    <div 
                      className={`${styles.readinessBar} ${readiness.class}`} 
                      style={{ width: `${readiness.value}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- COMPARISON CHARTS ROW --- */}
      <div className={styles.chartsRow}>
        {/* A) Candidate Comparison Bar Chart */}
        <div className={styles.chartBox}>
          <h4 className={styles.chartTitle}>Overall Score Comparison</h4>
          <p className={styles.chartSubtitle}>Direct score match comparison</p>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: "#ffffff", 
                    border: "1px solid #e2e8f0", 
                    borderRadius: "8px",
                    fontSize: 12
                  }}
                />
                <Bar dataKey="Score" radius={[4, 4, 0, 0]} maxBarSize={45}>
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={radarColors[index % radarColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* B) Multi-Candidate Radar Chart */}
        <div className={styles.chartBox}>
          <h4 className={styles.chartTitle}>Competency Overlay Mapping</h4>
          <p className={styles.chartSubtitle}>Multi-dimensional skill & background overlap</p>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: "#475569", fontSize: 10, fontWeight: 500 }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: "#94a3b8", fontSize: 8 }}
                  axisLine={false}
                />
                {selectedCandidates.map((cand, idx) => {
                  const displayName = (cand.resume_filename || "Candidate").replace(/\.[^/.]+$/, "");
                  return (
                    <Radar
                      key={idx}
                      name={displayName.length > 12 ? displayName.slice(0, 12) + "..." : displayName}
                      dataKey={`cand_${idx}`}
                      stroke={radarColors[idx]}
                      fill={radarColors[idx]}
                      fillOpacity={0.12}
                    />
                  );
                })}
                <Tooltip 
                  contentStyle={{ 
                    background: "#ffffff", 
                    border: "1px solid #e2e8f0", 
                    borderRadius: "8px",
                    fontSize: 11
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={32} 
                  iconType="circle"
                  iconSize={6}
                  wrapperStyle={{ fontSize: "10px", color: "#475569", paddingTop: "10px" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
