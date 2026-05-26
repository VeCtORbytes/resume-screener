"use client";

import { useState } from "react";
import FileUpload from "../components/FileUpload";
import JobDescInput from "../components/JobDescInput";
import ResultsTable from "../components/ResultsTable";
import FilterControl from "../components/FilterControl";
import { screenResumes, getResults } from "../lib/api";
import styles from "./page.module.css";

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeFiles, setResumeFiles] = useState([]);
  const [screeningId, setScreeningId] = useState(null);
  const [results, setResults] = useState([]);
  const [minScore, setMinScore] = useState(0);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle file selection
  const handleFilesSelect = (files) => {
    setResumeFiles(files);
  };

  // Handle job description change
  const handleJobDescChange = (text) => {
    setJobDescription(text);
  };

  // Handle min score filter change
  const handleMinScoreChange = async (score) => {
    setMinScore(score);

    if (screeningId) {
      try {
        const data = await getResults(screeningId, score);
        setFilteredResults(data.results);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Submit screening
  const handleScreening = async () => {
    // Validation
    if (!jobDescription.trim() || jobDescription.trim().length < 10) {
      setError("Job description must be at least 10 characters");
      return;
    }

    if (resumeFiles.length === 0) {
      setError("Please select at least one resume");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call backend
      const response = await screenResumes(jobDescription, resumeFiles);

      setScreeningId(response.screening_id);

      // Fetch results
      const resultsData = await getResults(response.screening_id, minScore);
      setResults(resultsData.results);
      setFilteredResults(resultsData.results);

      // Reset form (preserves selected files unless manually removed)
      setJobDescription("");
    } catch (err) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>🎯 Resume Screener</h1>
          <p className={styles.subtitle}>
            AI-powered resume screening using Groq
          </p>
        </div>
      </header>

      <main className={styles.main}>
        {/* Input Section */}
        <section className={styles.inputSection}>
          <FileUpload
            files={resumeFiles}
            onFilesSelect={handleFilesSelect}
            isLoading={loading}
          />
          <JobDescInput
            value={jobDescription}
            onChange={handleJobDescChange}
            isLoading={loading}
          />

          {/* Error Message */}
          {error && <div className={styles.errorBox}>{error}</div>}

          {/* Submit Button */}
          <button
            onClick={handleScreening}
            disabled={loading || !jobDescription.trim() || resumeFiles.length === 0}
            className={styles.submitBtn}
          >
            {loading ? "⏳ Screening..." : "🚀 Screen Resumes"}
          </button>
        </section>

        {/* Results Section */}
        {screeningId && (
          <section className={styles.resultsSection}>
            <FilterControl
              minScore={minScore}
              onChange={handleMinScoreChange}
              isLoading={loading}
            />
            <ResultsTable results={filteredResults} isLoading={loading} />
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          Built with Next.js, FastAPI, Groq, and Supabase ✨
        </p>
      </footer>
    </div>
  );
}