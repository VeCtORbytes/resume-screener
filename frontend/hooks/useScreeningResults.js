import { useState, useEffect } from "react";
import { getResults, getSessions, screenResumes } from "../lib/api";

export default function useScreeningResults() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  
  const [screeningId, setScreeningId] = useState(null);
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [minScore, setMinScore] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Screening resumes...");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (screeningId && sessions.length > 0) {
      const found = sessions.find(s => s.id === screeningId);
      if (found) {
        setActiveSession(found);
      }
    } else if (!screeningId) {
      setActiveSession(null);
    }
  }, [screeningId, sessions]);

  const fetchSessions = async () => {
    try {
      const sessionsData = await getSessions();
      setSessions(sessionsData);
    } catch (err) {
      console.error("Failed to load screening history:", err);
    }
  };

  const loadSessionResults = async (session) => {
    setLoading(true);
    setError(null);
    setMinScore(0);
    try {
      setScreeningId(session.id);
      
      const resultsData = await getResults(session.id, 0);
      setResults(resultsData.results);
      setFilteredResults(resultsData.results);
      return true;
    } catch (err) {
      setError("Failed to load results for this session: " + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateMinScore = async (score) => {
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

  const performScreening = async (targetJD, resumeFiles) => {
    setLoading(true);
    setError(null);
    setMinScore(0);

    try {
      const response = await screenResumes(targetJD, resumeFiles);
      setScreeningId(response.screening_id);

      const resultsData = await getResults(response.screening_id, 0);
      setResults(resultsData.results);
      setFilteredResults(resultsData.results);

      await fetchSessions();
      return true;
    } catch (err) {
      setError(err.message || "An unexpected error occurred during resume screening.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sessions,
    activeSession,
    screeningId,
    setScreeningId,
    results,
    filteredResults,
    minScore,
    loading,
    loadingText,
    error,
    setError,
    loadSessionResults,
    updateMinScore,
    performScreening
  };
}
