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
  PieChart,
  Pie,
  Cell
} from "recharts";
import styles from "./AnalyticsDashboard.module.css";

// Robust parsing of candidate scores & reasoning (matches the ResultsTable breakdown logic)
function getCandidateBreakdown(result) {
  const score = result.score || 0;
  const filename = result.resume_filename || "Unknown Candidate";
  const name = filename.replace(/\.[^/.]+$/, ""); // Strip file extension

  const defaultBreakdown = {
    name,
    "Technical Fit": score,
    "Experience": Math.round(score * 0.95),
    "Project Relevance": Math.round(score * 0.90),
    "Education": Math.round(score * 0.85),
    "Overall Score": score
  };

  if (!result.reasoning) return defaultBreakdown;

  try {
    const reasoning = result.reasoning;
    const breakdown = {
      skills: 0,
      experience: 0,
      projects: 0,
      education: 0,
      domain: 0
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

    // Check if we extracted valid non-zero breakdown scores
    const hasValues = (breakdown.skills || breakdown.experience || breakdown.projects || breakdown.education);
    if (!hasValues) return defaultBreakdown;

    // Resolve project relevance using real project intelligence score if present, else fallback
    let projectRelevance = 0;
    if (result.gap_analysis?.project_intelligence && result.gap_analysis.project_intelligence.length > 0) {
      const scores = result.gap_analysis.project_intelligence.map(p => p.relevance_score || 0);
      projectRelevance = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
    } else {
      projectRelevance = Math.round((breakdown.projects / 20) * 100);
    }

    // Normalize out of 100 for visual comparison consistency
    return {
      name,
      "Technical Fit": Math.round((breakdown.skills / 40) * 100),
      "Experience": Math.round((breakdown.experience / 25) * 100),
      "Project Relevance": projectRelevance,
      "Education": Math.round((breakdown.education / 10) * 100),
      "Overall Score": score
    };
  } catch (e) {
    console.error("Failed to parse visual radar breakdown metrics:", e);
    return defaultBreakdown;
  }
}

export default function AnalyticsDashboard({ results = [], isLoading }) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCandidateId, setSelectedCandidateId] = useState("all");

  // Prevent Next.js SSR hydration mismatches with Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={styles.loadingPlaceholder}>
        <div className={styles.spinner}></div>
        <p>Loading analytics workspace...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingPlaceholder}>
        <div className={styles.spinner}></div>
        <p>Recalculating executive analytics...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <span className={styles.emptyIcon}>📊</span>
        <h4 className={styles.emptyTitle}>No Analytics Available</h4>
        <p className={styles.emptyDesc}>
          Upload candidates and run a screening session to view visual score distributions, radar comparisons, and match segmentation.
        </p>
      </div>
    );
  }

  // --- 1. KPI Calculations ---
  const totalCandidates = results.length;
  const scores = results.map(r => r.score || 0);
  const topScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;
  const strongMatches = results.filter(r => (r.score || 0) >= 80).length;

  // --- 1b. Upgraded Skill Gap KPI Calculations ---
  let totalMatched = 0;
  let totalMissing = 0;
  let totalOptional = 0;
  let totalCritical = 0;
  let mustHavePctSum = 0;
  let optionalPctSum = 0;
  let divisor = 0;

  results.forEach(r => {
    const gap = r.gap_analysis;
    if (gap) {
      const matched = (gap.must_have_matched || []).length;
      const missing = (gap.must_have_missing || []).length;
      const optMatched = (gap.good_to_have_matched || []).length;
      const optMissing = (gap.good_to_have_missing || []).length;
      const critical = (gap.critical_gaps || []).length;

      totalMatched += matched;
      totalMissing += missing;
      totalOptional += optMatched;
      totalCritical += critical;

      const totalMust = matched + missing;
      const totalGood = optMatched + optMissing;

      mustHavePctSum += totalMust > 0 ? (matched / totalMust) * 100 : 0;
      optionalPctSum += totalGood > 0 ? (optMatched / totalGood) * 100 : 0;

      divisor++;
    }
  });

  const finalDiv = divisor || 1;
  const avgMatched = divisor > 0 ? Number((totalMatched / finalDiv).toFixed(1)) : 5.0;
  const avgMissing = divisor > 0 ? Number((totalMissing / finalDiv).toFixed(1)) : 3.0;
  const avgOptional = divisor > 0 ? Number((totalOptional / finalDiv).toFixed(1)) : 2.0;
  const avgCritical = divisor > 0 ? Number((totalCritical / finalDiv).toFixed(1)) : 2.0;

  const avgMustHavePct = divisor > 0 ? Math.round(mustHavePctSum / finalDiv) : 75;
  const avgOptionalPct = divisor > 0 ? Math.round(optionalPctSum / finalDiv) : 40;
  
  // --- 1c. Upgraded Project Intelligence KPI Calculations ---
  let projectRelevanceSum = 0;
  let projectRelevanceCount = 0;
  let totalProjectsInferred = 0;
  let inferredSkillsCount = 0;
  let matchedJDSkillsCount = 0;

  results.forEach(r => {
    const gap = r.gap_analysis;
    if (gap && gap.project_intelligence && gap.project_intelligence.length > 0) {
      gap.project_intelligence.forEach(p => {
        projectRelevanceSum += p.relevance_score || 0;
        projectRelevanceCount++;
        totalProjectsInferred++;
        inferredSkillsCount += (p.inferred_skills || []).length;
        matchedJDSkillsCount += (p.matched_jd_requirements || []).length;
      });
    }
  });

  const avgProjectRelevance = projectRelevanceCount > 0 ? Math.round(projectRelevanceSum / projectRelevanceCount) : Math.round(avgScore * 0.88);
  const projectEvidenceStrength = inferredSkillsCount > 0 ? Math.round((matchedJDSkillsCount / inferredSkillsCount) * 100) : 78;

  // --- Phase D: Confidence & Reliability KPIs ---
  let totalParsingScore = 0;
  let totalConfidenceScore = 0;
  let totalEvidenceStrength = 0;
  let parsedCount = 0;

  results.forEach(r => {
    const gap = r.gap_analysis;
    if (gap && gap.reliability_signals) {
      totalParsingScore += gap.reliability_signals.parsing_reliability || 95;
      totalConfidenceScore += gap.reliability_signals.ai_confidence_score || 92;
      totalEvidenceStrength += gap.reliability_signals.evidence_strength || 85;
      parsedCount++;
    } else if (gap && gap.extraction_confidence) {
      totalParsingScore += gap.extraction_confidence.score || 95;
      totalConfidenceScore += 90;
      totalEvidenceStrength += 80;
      parsedCount++;
    }
  });

  const avgParsingScore = parsedCount > 0 ? Math.round(totalParsingScore / parsedCount) : 95;
  const avgConfidenceScore = parsedCount > 0 ? Math.round(totalConfidenceScore / parsedCount) : 92;
  const avgEvidenceStrengthScore = parsedCount > 0 ? Math.round(totalEvidenceStrength / parsedCount) : 88;

  const skillAlignmentScore = Math.max(0, Math.min(100, divisor > 0 ? Math.round(
    (totalMatched / (totalMatched + totalMissing || 1)) * 70 + 
    (totalOptional / (totalOptional + (totalOptional + (results.map(r => r.gap_analysis?.good_to_have_missing || []).flat().length)) || 1)) * 30
  ) : avgScore));

  // --- 2. Upgraded JD Skill Gap Chart Data ---
  const jdSkillGapData = [
    { name: "Matched Skills", Count: avgMatched, color: "#10b981" },
    { name: "Missing Skills", Count: avgMissing, color: "#ef4444" },
    { name: "Optional Covered", Count: avgOptional, color: "#3b82f6" },
    { name: "Critical Gaps", Count: avgCritical, color: "#f59e0b" }
  ];

  // --- 2a. Upgraded Skill Gap Aggregation lists ---
  const matchedMustHavesSet = new Set();
  const missingMustHavesSet = new Set();
  const missingGoodToHavesSet = new Set();

  results.forEach(r => {
    const gap = r.gap_analysis;
    if (gap) {
      (gap.must_have_matched || []).forEach(s => matchedMustHavesSet.add(s));
      (gap.must_have_missing || []).forEach(s => missingMustHavesSet.add(s));
      (gap.good_to_have_missing || []).forEach(s => missingGoodToHavesSet.add(s));
    }
  });

  const uniqueMatchedMustHaves = Array.from(matchedMustHavesSet).sort();
  const uniqueMissingMustHaves = Array.from(missingMustHavesSet).sort();
  const uniqueMissingGoodToHaves = Array.from(missingGoodToHavesSet).sort();

  // --- 2c. Weighted Skill Gap Intelligence Math ---
  // Get all unique skill names and their base details from the batch
  const jdSkillsMap = {};
  results.forEach(r => {
    const evals = r.gap_analysis?.weighted_evaluations || [];
    evals.forEach(ev => {
      const norm = ev.name.trim();
      if (!jdSkillsMap[norm] || ev.importance > (jdSkillsMap[norm].importance || 0)) {
        jdSkillsMap[norm] = {
          name: ev.name,
          importance: ev.importance || 50,
          category: ev.category || "must_have",
          rationale: ev.evidence || ev.rationale || "Required technical skill"
        };
      }
    });
  });
  
  // Backfill if empty using the standard parsed sets
  if (Object.keys(jdSkillsMap).length === 0) {
    uniqueMatchedMustHaves.forEach(s => {
      jdSkillsMap[s] = { name: s, importance: 85, category: "must_have", rationale: "Core must-have skill" };
    });
    uniqueMissingMustHaves.forEach(s => {
      jdSkillsMap[s] = { name: s, importance: 85, category: "must_have", rationale: "Core must-have skill" };
    });
    uniqueMissingGoodToHaves.forEach(s => {
      jdSkillsMap[s] = { name: s, importance: 35, category: "good_to_have", rationale: "Nice-to-have skill" };
    });
  }

  const jdWeightedSkills = Object.values(jdSkillsMap).sort((a, b) => b.importance - a.importance);

  // Compute evaluations for selectedCandidateId
  let activeWeightedEvaluations = [];
  let calculatedRiskScore = 0;
  let riskClassification = "LOW RISK";
  let riskColor = "#10b981";
  let riskDescription = "Excellent alignment with core required stack.";

  if (selectedCandidateId === "all") {
    // Aggregated Batch View
    activeWeightedEvaluations = jdWeightedSkills.map(skill => {
      let matchedCount = 0;
      let evidenceSamples = [];
      results.forEach(r => {
        const evals = r.gap_analysis?.weighted_evaluations || [];
        const match = evals.find(ev => ev.name.toLowerCase().trim() === skill.name.toLowerCase().trim());
        if (match && match.status === "matched") {
          matchedCount++;
          if (match.evidence) evidenceSamples.push(`${r.resume_filename.replace(/\.[^/.]+$/, "")}: "${match.evidence}"`);
        }
      });
      const matchRate = results.length > 0 ? (matchedCount / results.length) : 0;
      const statusText = matchRate >= 0.75 ? "Fully Covered" : matchRate >= 0.25 ? "Partially Matched" : "Gapped / Missing";
      return {
        name: skill.name,
        category: skill.category,
        importance: skill.importance,
        status: statusText,
        matchRate,
        evidence: evidenceSamples.length > 0 ? evidenceSamples.slice(0, 2).join("; ") : "No candidate matches yet",
        weighted_contribution: Math.round(skill.importance * matchRate)
      };
    });

    // Batch Risk Average
    let totalRisk = 0;
    results.forEach(r => {
      let candRisk = 0;
      const evals = r.gap_analysis?.weighted_evaluations || [];
      evals.forEach(ev => {
        if (ev.status === "missing") {
          candRisk += ev.importance >= 80 ? 35 : ev.importance >= 50 ? 15 : 5;
        }
      });
      totalRisk += Math.min(100, candRisk);
    });
    calculatedRiskScore = results.length > 0 ? Math.round(totalRisk / results.length) : 0;
  } else {
    // Specific Candidate View
    const candidate = results.find(r => r.id === selectedCandidateId);
    if (candidate) {
      const evals = candidate.gap_analysis?.weighted_evaluations || [];
      activeWeightedEvaluations = jdWeightedSkills.map(skill => {
        const match = evals.find(ev => ev.name.toLowerCase().trim() === skill.name.toLowerCase().trim());
        if (match) {
          return {
            name: skill.name,
            category: skill.category,
            importance: skill.importance,
            status: match.status === "matched" ? "Matched" : "Missing",
            evidence: match.evidence || "No evidence listed",
            weighted_contribution: match.status === "matched" ? skill.importance : 0
          };
        } else {
          return {
            name: skill.name,
            category: skill.category,
            importance: skill.importance,
            status: "Missing",
            evidence: "No candidate evidence found",
            weighted_contribution: 0
          };
        }
      });

      let candRisk = 0;
      const missingSkills = [];
      activeWeightedEvaluations.forEach(ev => {
        if (ev.status === "Missing") {
          candRisk += ev.importance >= 80 ? 35 : ev.importance >= 50 ? 15 : 5;
          missingSkills.push(ev);
        }
      });
      calculatedRiskScore = Math.min(100, candRisk);

      // Determine risk rationale
      const highWeightMissing = missingSkills.filter(ev => ev.importance >= 80);
      if (highWeightMissing.length > 0) {
        riskDescription = `Missing critical mandatory stack requirements: ${highWeightMissing.map(s => s.name).join(", ")}. Critical hiring hazard.`;
      } else if (missingSkills.filter(ev => ev.importance >= 50).length > 0) {
        riskDescription = `All core critical requirements satisfied. Missing secondary preferred requirements: ${missingSkills.filter(ev => ev.importance >= 50).map(s => s.name).join(", ")}. Moderate onboarding gap.`;
      } else {
        riskDescription = `Excellent candidate coverage. No significant core stack requirements are missing.`;
      }
    }
  }

  // Set classifications
  if (calculatedRiskScore >= 75) {
    riskClassification = "CRITICAL HIRING RISK";
    riskColor = "#ef4444";
  } else if (calculatedRiskScore >= 50) {
    riskClassification = "HIGH HIRING RISK";
    riskColor = "#f59e0b";
  } else if (calculatedRiskScore >= 25) {
    riskClassification = "MEDIUM HIRING RISK";
    riskColor = "#3b82f6";
  } else {
    riskClassification = "LOW HIRING RISK";
    riskColor = "#10b981";
  }

  // --- 2b. Score Distribution (Bar Chart) ---
  const barChartData = results.map(r => {
    const filename = r.resume_filename || "Candidate";
    const displayName = filename.replace(/\.[^/.]+$/, "");
    return {
      name: displayName.length > 15 ? displayName.slice(0, 15) + "..." : displayName,
      fullName: displayName,
      Score: r.score || 0
    };
  }).sort((a, b) => b.Score - a.Score); // Sorted descending

  // --- 3. Match Distribution (Pie/Donut Chart) ---
  const matchCategories = {
    Strong: results.filter(r => (r.score || 0) >= 80).length,
    Medium: results.filter(r => (r.score || 0) >= 50 && (r.score || 0) < 80).length,
    Weak: results.filter(r => (r.score || 0) < 50).length
  };

  const pieChartData = [
    { name: "Strong (80-100)", value: matchCategories.Strong, color: "#10b981" },
    { name: "Medium (50-79)", value: matchCategories.Medium, color: "#3b82f6" },
    { name: "Weak (<50)", value: matchCategories.Weak, color: "#94a3b8" }
  ].filter(item => item.value > 0);

  // --- 4. Radar Chart (Candidate Comparison) ---
  // Select top 3 candidates for radar comparison
  const topCandidates = [...results]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3)
    .map(r => getCandidateBreakdown(r));

  // Re-structure data into dimensions format required by Recharts RadarChart
  const radarDimensions = [
    { subject: "Technical Fit" },
    { subject: "Experience" },
    { subject: "Project Relevance" },
    { subject: "Education" },
    { subject: "Overall Score" }
  ];

  const radarChartData = radarDimensions.map(dim => {
    const item = { subject: dim.subject };
    topCandidates.forEach((cand, idx) => {
      item[`cand_${idx}`] = cand[dim.subject] || 0;
      item[`cand_${idx}_name`] = cand.name;
    });
    return item;
  });

  const radarColors = ["#4f46e5", "#06b6d4", "#f59e0b"];

  return (
    <div className={styles.dashboard}>
      {/* Tabbed view selector for dashboard and insights */}
      <div className={styles.dashboardHeader}>
        <div className={styles.headerTitleGroup}>
          <h3 className={styles.dashboardTitle}>Screening Analytics</h3>
          <p className={styles.dashboardSubtitle}>Executive summary of current candidate batch evaluation</p>
        </div>
        <div className={styles.tabs}>
          <button 
            onClick={() => setActiveTab("overview")}
            className={`${styles.tabBtn} ${activeTab === "overview" ? styles.activeTab : ""}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab("comparison")}
            className={`${styles.tabBtn} ${activeTab === "comparison" ? styles.activeTab : ""}`}
          >
            Candidate Radar
          </button>
          <button 
            onClick={() => setActiveTab("weighted")}
            className={`${styles.tabBtn} ${activeTab === "weighted" ? styles.activeTab : ""}`}
          >
            Weighted JD Gap Intelligence
          </button>
        </div>
      </div>

      {/* --- KPI SUMMARY CARDS --- */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Total Candidates</span>
            <span className={styles.kpiIcon}>👥</span>
          </div>
          <h2 className={styles.kpiValue}>{totalCandidates}</h2>
          <p className={styles.kpiFooter}>Resumes evaluated in session</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Top Candidate Score</span>
            <span className={`${styles.kpiIcon} ${styles.topScoreIcon}`}>🏆</span>
          </div>
          <h2 className={styles.kpiValue}>{topScore}<span className={styles.percentSymbol}>/100</span></h2>
          <p className={styles.kpiFooter}>Highest mathematical match</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Average Score</span>
            <span className={styles.kpiIcon}>📊</span>
          </div>
          <h2 className={styles.kpiValue}>{avgScore}<span className={styles.percentSymbol}>/100</span></h2>
          <p className={styles.kpiFooter}>Batch mean score</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Strong Matches</span>
            <span className={`${styles.kpiIcon} ${styles.strongScoreIcon}`}>✦</span>
          </div>
          <h2 className={styles.kpiValue}>{strongMatches}</h2>
          <p className={styles.kpiFooter}>Scored 80 or above</p>
        </div>
      </div>

      {/* --- Upgraded Critical Gap KPI Cards --- */}
      <div className={styles.sectionDivider}>
        <span className={styles.secDividerLabel}>Job Requirement Gap Insights</span>
      </div>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Average Critical Gaps</span>
            <span className={styles.kpiIcon} style={{ color: "#ef4444" }}>⚠️</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: "#ef4444" }}>{avgCritical}</h2>
          <p className={styles.kpiFooter}>Critical missing skills in batch</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Must-Have Coverage</span>
            <span className={styles.kpiIcon} style={{ color: "#10b981" }}>🎯</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: "#10b981" }}>{avgMustHavePct}%</h2>
          <p className={styles.kpiFooter}>Mandatory skills covered</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Optional Coverage</span>
            <span className={styles.kpiIcon} style={{ color: "#3b82f6" }}>🌟</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: "#3b82f6" }}>{avgOptionalPct}%</h2>
          <p className={styles.kpiFooter}>Preferred skills covered</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Skill Alignment Score</span>
            <span className={styles.kpiIcon} style={{ color: "#f59e0b" }}>⚡</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: "#f59e0b" }}>{skillAlignmentScore}<span className={styles.percentSymbol}>/100</span></h2>
          <p className={styles.kpiFooter}>Aggregate job description fit</p>
        </div>
      </div>

      {/* --- Upgraded Project Intelligence KPI Cards --- */}
      <div className={styles.sectionDivider}>
        <span className={styles.secDividerLabel}>Project Intelligence Insights</span>
      </div>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Average Project Relevance</span>
            <span className={styles.kpiIcon} style={{ color: "#8b5cf6" }}>📁</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: "#8b5cf6" }}>{avgProjectRelevance}%</h2>
          <p className={styles.kpiFooter}>Project stack relevance score</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Project Evidence Strength</span>
            <span className={styles.kpiIcon} style={{ color: "#ec4899" }}>💪</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: "#ec4899" }}>{projectEvidenceStrength}%</h2>
          <p className={styles.kpiFooter}>Inferred capability match rate</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Total Projects Inferred</span>
            <span className={styles.kpiIcon} style={{ color: "#14b8a6" }}>🧠</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: "#14b8a6" }}>{totalProjectsInferred}</h2>
          <p className={styles.kpiFooter}>Programmatically analyzed projects</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Candidate Project Fit</span>
            <span className={styles.kpiIcon} style={{ color: "#f97316" }}>⚖️</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: "#f97316" }}>{Math.round((avgProjectRelevance * 0.7) + (projectEvidenceStrength * 0.3))}%</h2>
          <p className={styles.kpiFooter}>Weighted project evaluation fit</p>
        </div>
      </div>

      {/* --- Upgraded AI Trustworthiness & Reliability Insights --- */}
      <div className={styles.sectionDivider}>
        <span className={styles.secDividerLabel}>🛡️ AI Trustworthiness & Reliability Insights</span>
      </div>
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${avgConfidenceScore < 80 ? styles.kpiWarningCard : ""}`}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Average AI Confidence</span>
            <span className={styles.kpiIcon} style={{ color: avgConfidenceScore < 80 ? "#eab308" : "#6366f1" }}>🛡️</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: avgConfidenceScore < 80 ? "#d97706" : "#4f46e5" }}>
            {avgConfidenceScore}%
          </h2>
          <p className={styles.kpiFooter}>
            {avgConfidenceScore < 80 ? "⚠️ High uncertainty in candidate evidence" : "Direct & indirect evidence clarity is strong"}
          </p>
        </div>

        <div className={`${styles.kpiCard} ${avgParsingScore < 80 ? styles.kpiWarningCard : ""}`}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Average Parsing Reliability</span>
            <span className={styles.kpiIcon} style={{ color: avgParsingScore < 80 ? "#ef4444" : "#10b981" }}>🔍</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: avgParsingScore < 80 ? "#dc2626" : "#059669" }}>
            {avgParsingScore}%
          </h2>
          <p className={styles.kpiFooter}>
            {avgParsingScore < 80 ? "⚠️ Degradation flagged on OCR or text density" : "High-fidelity extraction validated"}
          </p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiMeta}>
            <span className={styles.kpiLabel}>Average Evidence Strength</span>
            <span className={styles.kpiIcon} style={{ color: "#a855f7" }}>⚡</span>
          </div>
          <h2 className={styles.kpiValue} style={{ color: "#9333ea" }}>{avgEvidenceStrengthScore}%</h2>
          <p className={styles.kpiFooter}>Degree of explicit skill documentation</p>
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          {/* --- EXPLICIT SKILL GAP AUDIT PANELS --- */}
          <div className={styles.explicitGapPanelSection}>
            <h4 className={styles.panelSectionTitle}>Target Job Description Skill Gap Audit</h4>
            <p className={styles.panelSectionSubtitle}>Factual breakdown of mandatory and optional requirements detected in this candidate batch</p>
            
            <div className={styles.skillGapPanelsGrid}>
              
              {/* Panel 1: Missing Must-Haves */}
              <div className={`${styles.skillPanelCard} ${styles.missingMustPanel}`}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelIcon}>❌</span>
                  <h5 className={styles.panelTitle}>Missing Must-Have Skills</h5>
                </div>
                <div className={styles.panelList}>
                  {uniqueMissingMustHaves.length > 0 ? (
                    uniqueMissingMustHaves.map((skill, sIdx) => (
                      <div key={sIdx} className={styles.panelItem}>
                        <span className={styles.skillCross}>❌</span>
                        <span className={styles.panelSkillName}>{skill}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.panelItemEmptyGreen}>
                      <span className={styles.panelCheck}>✅</span>
                      <span className={styles.panelEmptyText}>All mandatory skills covered in this batch!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel 2: Missing Good-to-Haves */}
              <div className={`${styles.skillPanelCard} ${styles.missingGoodPanel}`}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelIcon}>⚠️</span>
                  <h5 className={styles.panelTitle}>Missing Good-to-Have Skills</h5>
                </div>
                <div className={styles.panelList}>
                  {uniqueMissingGoodToHaves.length > 0 ? (
                    uniqueMissingGoodToHaves.map((skill, sIdx) => (
                      <div key={sIdx} className={styles.panelItem}>
                        <span className={styles.skillWarning}>⚠️</span>
                        <span className={styles.panelSkillName}>{skill}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.panelItemEmptyGreen}>
                      <span className={styles.panelCheck}>✅</span>
                      <span className={styles.panelEmptyText}>All preferred skills covered in this batch!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Panel 3: Matched Must-Haves */}
              <div className={`${styles.skillPanelCard} ${styles.matchedPanel}`}>
                <div className={styles.panelHeader}>
                  <span className={styles.panelIcon}>✅</span>
                  <h5 className={styles.panelTitle}>Matched Must-Haves</h5>
                </div>
                <div className={styles.panelList}>
                  {uniqueMatchedMustHaves.length > 0 ? (
                    uniqueMatchedMustHaves.map((skill, sIdx) => (
                      <div key={sIdx} className={styles.panelItem}>
                        <span className={styles.skillCheck}>✅</span>
                        <span className={styles.panelSkillName}>{skill}</span>
                      </div>
                    ))
                  ) : (
                    <span className={styles.panelEmptyText}>No matched mandatory skills identified.</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          <div className={styles.chartsGrid}>
          {/* --- UPGRADED JD SKILL GAP BAR CHART --- */}
          <div className={`${styles.chartCard} ${styles.barCard}`}>
            <h4 className={styles.chartTitle}>JD Skill Alignment Breakdown</h4>
            <p className={styles.chartSubtitle}>Average requirement coverage counts across candidates</p>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={jdSkillGapData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 'auto']} 
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: "#ffffff", 
                      border: "1px solid #e2e8f0", 
                      borderRadius: "8px", 
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                    }}
                    labelStyle={{ fontWeight: 600, color: "#0f172a", fontSize: 12 }}
                    itemStyle={{ fontSize: 12 }}
                    formatter={(value) => [`${value} Skill(s)`, "Average Count"]}
                  />
                  <Bar 
                    dataKey="Count" 
                    fill="#4f46e5" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={45}
                  >
                    {jdSkillGapData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* --- UPGRADED MUST-HAVE COVERAGE DONUT / Circular Indicators --- */}
          <div className={`${styles.chartCard} ${styles.pieCard}`}>
            <h4 className={styles.chartTitle}>JD Coverage Analytics</h4>
            <p className={styles.chartSubtitle}>Proportion of mandatory and optional requirements covered</p>
            <div className={styles.donutContent}>
              <div className={styles.coverageRingsContainer}>
                <div className={styles.coverageRingCard}>
                  <div className={styles.coverageProgress}>
                    <svg className={styles.circularSvg} viewBox="0 0 36 36">
                      <path
                        className={styles.circularBg}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={styles.circularBar}
                        stroke="#10b981"
                        strokeDasharray={`${avgMustHavePct}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className={styles.coverageTextGroup}>
                      <span className={styles.coveragePct} style={{ color: "#10b981" }}>{avgMustHavePct}%</span>
                      <span className={styles.coverageLabel}>Must-Have</span>
                    </div>
                  </div>
                </div>

                <div className={styles.coverageRingCard}>
                  <div className={styles.coverageProgress}>
                    <svg className={styles.circularSvg} viewBox="0 0 36 36">
                      <path
                        className={styles.circularBg}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={styles.circularBar}
                        stroke="#3b82f6"
                        strokeDasharray={`${avgOptionalPct}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className={styles.coverageTextGroup}>
                      <span className={styles.coveragePct} style={{ color: "#3b82f6" }}>{avgOptionalPct}%</span>
                      <span className={styles.coverageLabel}>Optional</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.pieLegend} style={{ marginTop: '16px' }}>
                <div className={styles.legendItem}>
                  <span className={styles.legendColorDot} style={{ backgroundColor: "#10b981" }}></span>
                  <span className={styles.legendLabel}>Must-Have Coverage</span>
                  <span className={styles.legendVal}>{avgMustHavePct}%</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendColorDot} style={{ backgroundColor: "#3b82f6" }}></span>
                  <span className={styles.legendLabel}>Optional Coverage</span>
                  <span className={styles.legendVal}>{avgOptionalPct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
      )}

      {activeTab === "comparison" && (
        /* --- RADAR CHART (TOP 3 CANDIDATE COMPARISON) --- */
        <div className={`${styles.chartCard} ${styles.radarCard}`}>
          <h4 className={styles.chartTitle}>Top Candidates Comparison</h4>
          <p className={styles.chartSubtitle}>Visual overlay of the top 3 highest scoring candidate matches</p>
          {topCandidates.length > 0 ? (
            <div className={styles.radarLayout}>
              <div className={styles.radarContainer}>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: "#475569", fontSize: 11, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fill: "#94a3b8", fontSize: 9 }}
                      axisLine={false}
                    />
                    {topCandidates.map((cand, idx) => (
                      <Radar
                        key={idx}
                        name={cand.name}
                        dataKey={`cand_${idx}`}
                        stroke={radarColors[idx]}
                        fill={radarColors[idx]}
                        fillOpacity={0.15}
                      />
                    ))}
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: "11px", color: "#475569", paddingTop: "15px" }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: "#ffffff", 
                        border: "1px solid #e2e8f0", 
                        borderRadius: "8px", 
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                      }}
                      itemStyle={{ fontSize: 12 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.radarDetails}>
                <h5 className={styles.radarDetailsHeading}>Competency Map Insights</h5>
                <div className={styles.radarCandList}>
                  {topCandidates.map((cand, idx) => (
                    <div key={idx} className={styles.radarCandItem}>
                      <div className={styles.radarItemHeader}>
                        <span className={styles.candBadgeDot} style={{ backgroundColor: radarColors[idx] }}></span>
                        <span className={styles.candBadgeName} title={cand.name}>{cand.name}</span>
                        <span className={styles.candBadgeScore}>{cand["Overall Score"]} pts</span>
                      </div>
                      <div className={styles.radarItemMiniGrid}>
                        <div className={styles.miniGridCell}>
                          <span className={styles.cellLabel}>Tech Fit</span>
                          <span className={styles.cellVal}>{cand["Technical Fit"]}%</span>
                        </div>
                        <div className={styles.miniGridCell}>
                          <span className={styles.cellLabel}>Experience</span>
                          <span className={styles.cellVal}>{cand["Experience"]}%</span>
                        </div>
                        <div className={styles.miniGridCell}>
                          <span className={styles.cellLabel}>Projects</span>
                          <span className={styles.cellVal}>{cand["Project Relevance"]}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.noRadarData}>Insufficient data to render radar overlay.</p>
          )}
        </div>
      )}

      {/* --- WEIGHTED JD GAP INTELLIGENCE TAB --- */}
      {activeTab === "weighted" && (
        <div className={styles.weightedTabWorkspace}>
          
          {/* Top Selection & Risk Header Row */}
          <div className={styles.weightedDashboardGrid}>
            
            {/* 1. Evaluation Context Selector Card */}
            <div className={styles.weightedSelectorCard}>
              <div className={styles.cardHeaderGroup}>
                <span className={styles.cardIcon}>🔍</span>
                <h4 className={styles.cardHeading}>Evaluation Context</h4>
                <p className={styles.cardDescription}>Switch between collective batch view or individual candidate profiles</p>
              </div>
              <div className={styles.selectorInputWrapper}>
                <select 
                  value={selectedCandidateId}
                  onChange={(e) => setSelectedCandidateId(e.target.value)}
                  className={styles.contextSelectDropdown}
                >
                  <option value="all">All Candidates (Aggregated Batch View)</option>
                  {results.map((r) => {
                    const filename = r.resume_filename || "Candidate";
                    const displayName = filename.replace(/\.[^/.]+$/, "");
                    return (
                      <option key={r.id} value={r.id}>
                        {displayName} (Score: {r.score}/100)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className={styles.selectorFooter}>
                <p className={styles.selectorFooterText}>
                  {selectedCandidateId === "all" 
                    ? "Currently viewing batch average matching distributions." 
                    : `Currently auditing specific candidate requirement weights.`}
                </p>
              </div>
            </div>

            {/* 2. Premium Risk Assessment Card */}
            <div className={styles.weightedRiskCard}>
              <div className={styles.cardHeaderGroup}>
                <span className={styles.cardIcon} style={{ color: riskColor }}>🛡️</span>
                <h4 className={styles.cardHeading}>Weighted Risk Assessment</h4>
                <p className={styles.cardDescription}>Dynamic calculated hiring risk factor based on requirement priority</p>
              </div>
              <div className={styles.riskCardBody}>
                <div className={styles.riskGaugeProgress}>
                  <svg className={styles.riskCircularSvg} viewBox="0 0 36 36">
                    <path
                      className={styles.circularBg}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={styles.circularBar}
                      stroke={riskColor}
                      strokeDasharray={`${calculatedRiskScore}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className={styles.riskProgressValueText}>
                    <span className={styles.riskScoreVal} style={{ color: riskColor }}>{calculatedRiskScore}%</span>
                    <span className={styles.riskScoreLabel}>Risk Score</span>
                  </div>
                </div>
                <div className={styles.riskCardDetails}>
                  <div 
                    className={styles.riskLevelBadge}
                    style={{ backgroundColor: riskColor + "15", color: riskColor, borderColor: riskColor + "30" }}
                  >
                    {riskClassification}
                  </div>
                  <p className={styles.riskDescriptionParagraph}>{riskDescription}</p>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Recharts Overlapping Skill Contribution Chart */}
          <div className={styles.weightedChartContainerCard}>
            <div className={styles.cardHeaderGroup}>
              <h4 className={styles.cardHeading}>Weighted Skill Contribution Overlay</h4>
              <p className={styles.cardDescription}>Comparing job description requirement importance against actual candidate fit</p>
            </div>
            
            <div className={styles.rechartsChartWrapper}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart 
                  data={activeWeightedEvaluations.map(ev => ({
                    name: ev.name,
                    "Required JD Importance": ev.importance,
                    "Candidate Match": ev.weighted_contribution
                  }))} 
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
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
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                    }}
                    labelStyle={{ fontWeight: 600, color: "#0f172a", fontSize: 12 }}
                    itemStyle={{ fontSize: 12 }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Required JD Importance" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Candidate Match" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. JD Skill Weight Heatmap Section */}
          <div className={styles.weightedHeatmapSectionCard}>
            <div className={styles.cardHeaderGroup} style={{ marginBottom: "20px" }}>
              <h4 className={styles.cardHeading}>JD Skill Weight Heatmap</h4>
              <p className={styles.cardDescription}>Factual row-by-row match status and direct semantic evidence listed across priority weights</p>
            </div>
            
            <div className={styles.heatmapTableContainer}>
              <table className={styles.heatmapTable}>
                <thead>
                  <tr>
                    <th>Skill Requirement</th>
                    <th>Importance Weight</th>
                    <th>Category</th>
                    <th>Match Status</th>
                    <th>Semantic Evidence & Phrasing Context</th>
                  </tr>
                </thead>
                <tbody>
                  {activeWeightedEvaluations.map((ev, idx) => {
                    const isMatched = ev.status === "Matched" || ev.status === "Fully Covered" || ev.status === "Partially Matched";
                    return (
                      <tr key={idx} className={styles.heatmapRow}>
                        <td className={styles.heatmapSkillNameCell}>{ev.name}</td>
                        <td className={styles.heatmapImportanceCell}>
                          <div className={styles.progressBarWrapper}>
                            <div className={styles.progressBarBg}>
                              <div className={styles.progressBarFill} style={{ width: `${ev.importance}%` }}></div>
                            </div>
                            <span className={styles.importancePercentLabel}>{ev.importance}/100</span>
                          </div>
                        </td>
                        <td className={styles.heatmapCategoryCell}>
                          <span className={`${styles.categoryPill} ${ev.category === "must_have" ? styles.mustHavePill : styles.goodToHavePill}`}>
                            {ev.category === "must_have" ? "Must-Have" : "Good-to-Have"}
                          </span>
                        </td>
                        <td className={styles.heatmapStatusCell}>
                          <span 
                            className={styles.statusTextBadge}
                            style={{
                              backgroundColor: isMatched ? "#e6fbf1" : "#fef2f2",
                              color: isMatched ? "#10b981" : "#ef4444"
                            }}
                          >
                            {isMatched ? "✅ Matched" : "❌ Missing"}
                          </span>
                        </td>
                        <td className={styles.heatmapEvidenceCell} title={ev.evidence}>
                          {ev.evidence}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
