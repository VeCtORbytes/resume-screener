import { useState, useEffect } from "react";

export default function useRecruiterNotes(screeningId) {
  const [candidateNotes, setCandidateNotes] = useState({});

  useEffect(() => {
    if (!screeningId) {
      setCandidateNotes({});
      return;
    }
    try {
      const storedNotes = localStorage.getItem(`hirelens_notes_${screeningId}`);
      const parsedNotes = storedNotes ? JSON.parse(storedNotes) : {};
      setCandidateNotes(parsedNotes);
    } catch (e) {
      console.error("Failed to load notes from localStorage:", e);
    }
  }, [screeningId]);

  const handleNoteChange = (candId, newNote) => {
    const updated = {
      ...candidateNotes,
      [candId]: newNote
    };
    setCandidateNotes(updated);
    if (screeningId) {
      localStorage.setItem(`hirelens_notes_${screeningId}`, JSON.stringify(updated));
    }
  };

  return {
    candidateNotes,
    handleNoteChange
  };
}
