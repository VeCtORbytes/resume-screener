// Score color mapping
export const SCORE_COLORS = {
    excellent: "#10b981", // green
    good: "#3b82f6", // blue
    fair: "#f59e0b", // amber
    poor: "#ef4444", // red
};

export function getScoreColor(score) {
    if (score >= 80) return SCORE_COLORS.excellent;
    if (score >= 60) return SCORE_COLORS.good;
    if (score >= 40) return SCORE_COLORS.fair;
    return SCORE_COLORS.poor;
}

export function getScoreBadge(score) {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
}

// Validation
export const VALIDATION = {
    MIN_JOB_DESC_LENGTH: 10,
    MAX_JOB_DESC_LENGTH: 5000,
    MAX_RESUMES_PER_BATCH: 50,
};