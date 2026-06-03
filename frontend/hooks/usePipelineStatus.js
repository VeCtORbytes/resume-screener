import { useState, useEffect } from "react";
import { ALL_FILTER_STATUSES } from "../constants/statuses";

export default function usePipelineStatus(screeningId, results) {
  const [candidateStatuses, setCandidateStatuses] = useState({});
  const [statusFilter, setStatusFilter] = useState("All");
  const [shortlistCount, setShortlistCount] = useState(0);

  // Load from local storage when screeningId or results change
  useEffect(() => {
    if (!screeningId) {
      setCandidateStatuses({});
      return;
    }
    
    try {
      const storedStatuses = localStorage.getItem(`hirelens_statuses_${screeningId}`);
      const parsedStatuses = storedStatuses ? JSON.parse(storedStatuses) : {};

      // Ensure all candidates in results have at least "New" status if not set
      const updatedStatuses = { ...parsedStatuses };
      let updated = false;
      
      (results || []).forEach(r => {
        if (!updatedStatuses[r.id]) {
          updatedStatuses[r.id] = "New";
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem(`hirelens_statuses_${screeningId}`, JSON.stringify(updatedStatuses));
      }

      setCandidateStatuses(updatedStatuses);
    } catch (e) {
      console.error("Failed to load statuses from localStorage:", e);
    }
  }, [screeningId, results]);

  // Update shortlist count
  useEffect(() => {
    const count = Object.values(candidateStatuses).filter(status => status === "Shortlisted").length;
    setShortlistCount(count);
  }, [candidateStatuses]);

  const handleStatusChange = (candId, newStatus) => {
    const updated = {
      ...candidateStatuses,
      [candId]: newStatus
    };
    setCandidateStatuses(updated);
    if (screeningId) {
      localStorage.setItem(`hirelens_statuses_${screeningId}`, JSON.stringify(updated));
    }
  };

  const getWorkspaceCounts = () => {
    const counts = {
      total: (results || []).length,
      shortlisted: 0,
      interview: 0,
      reviewing: 0,
      rejected: 0,
      hired: 0,
      new: 0
    };

    (results || []).forEach(r => {
      const status = candidateStatuses[r.id] || "New";
      if (status === "Shortlisted") counts.shortlisted++;
      else if (status === "Interview") counts.interview++;
      else if (status === "Reviewing") counts.reviewing++;
      else if (status === "Rejected") counts.rejected++;
      else if (status === "Hired") counts.hired++;
      else counts.new++;
    });

    return counts;
  };

  return {
    candidateStatuses,
    statusFilter,
    setStatusFilter,
    shortlistCount,
    handleStatusChange,
    getWorkspaceCounts
  };
}
