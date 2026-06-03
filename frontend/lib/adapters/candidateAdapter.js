/**
 * Candidate Adapter
 * Orchestrates parsing raw backend candidate objects into clean properties.
 */

export function parseCandidateName(filename) {
  if (!filename) return "Unknown Candidate";
  let name = filename.split('.')[0].replace(/[_]/g, ' ').replace(/[-]/g, ' ');
  name = name.replace(/\b(resume|cv|pdf|docx)\b/gi, '').trim();
  return name.replace(/\b\w/g, c => c.toUpperCase());
}

export function parseHiringRecommendation(score) {
  const numScore = typeof score === 'number' ? score : 0;
  if (numScore >= 90) return { text: "Recommended for Interview", styleClass: "strongHire" };
  if (numScore >= 80) return { text: "Potential Match",           styleClass: "hire" };
  if (numScore >= 65) return { text: "Requires Further Review",   styleClass: "needsInterview" };
  if (numScore >= 50) return { text: "Requires Further Review",   styleClass: "needsReview" };
  return                     { text: "Limited Alignment",         styleClass: "reject" };
}
