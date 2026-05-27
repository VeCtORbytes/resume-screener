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

    // Normalize out of 100 for visual comparison consistency
    return {
      name,
      "Technical Fit": Math.round((breakdown.skills / 40) * 100),
      "Experience": Math.round((breakdown.experience / 25) * 100),
      "Project Relevance": Math.round((breakdown.projects / 20) * 100),
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

  // --- 2. Score Distribution (Bar Chart) ---
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

      {activeTab === "overview" ? (
        <div className={styles.chartsGrid}>
          {/* --- SCORE DISTRIBUTION CHART --- */}
          <div className={`${styles.chartCard} ${styles.barCard}`}>
            <h4 className={styles.chartTitle}>Score Ranking by Candidate</h4>
            <p className={styles.chartSubtitle}>Standardized match score for each resume</p>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={260}>
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
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                    }}
                    labelStyle={{ fontWeight: 600, color: "#0f172a", fontSize: 12 }}
                    itemStyle={{ color: "#4f46e5", fontSize: 12 }}
                    formatter={(value) => [`${value} Points`, "Match Score"]}
                  />
                  <Bar 
                    dataKey="Score" 
                    fill="#4f46e5" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  >
                    {barChartData.map((entry, idx) => {
                      // Alternate bar color based on score tier
                      const val = entry.Score;
                      let color = "#4f46e5"; // Indigo
                      if (val >= 80) color = "#10b981"; // Green
                      else if (val < 50) color = "#94a3b8"; // Gray
                      return <Cell key={`cell-${idx}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* --- MATCH DISTRIBUTION DONUT --- */}
          <div className={`${styles.chartCard} ${styles.pieCard}`}>
            <h4 className={styles.chartTitle}>Match Segmentation</h4>
            <p className={styles.chartSubtitle}>Proportion of batch match categories</p>
            <div className={styles.donutContent}>
              <div className={styles.chartContainerPie}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: "#ffffff", 
                        border: "1px solid #e2e8f0", 
                        borderRadius: "8px", 
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
                      }}
                      itemStyle={{ fontSize: 12 }}
                      formatter={(value) => [`${value} Candidate(s)`, "Count"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className={styles.donutCenter}>
                  <span className={styles.donutCenterVal}>{totalCandidates}</span>
                  <span className={styles.donutCenterLabel}>Candidates</span>
                </div>
              </div>
              <div className={styles.pieLegend}>
                {pieChartData.map((item, idx) => (
                  <div key={idx} className={styles.legendItem}>
                    <span className={styles.legendColorDot} style={{ backgroundColor: item.color }}></span>
                    <span className={styles.legendLabel}>{item.name}</span>
                    <span className={styles.legendVal}>
                      {item.value} ({Math.round((item.value / totalCandidates) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
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
    </div>
  );
}
