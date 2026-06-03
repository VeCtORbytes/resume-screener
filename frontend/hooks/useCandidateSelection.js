import { useState } from "react";

export default function useCandidateSelection() {
  const [activeCandidateId, setActiveCandidateId] = useState(null);

  const toggleCandidate = (candidateId) => {
    if (activeCandidateId === candidateId) {
      setActiveCandidateId(null);
    } else {
      setActiveCandidateId(candidateId);
    }
  };

  return {
    activeCandidateId,
    setActiveCandidateId,
    toggleCandidate
  };
}
