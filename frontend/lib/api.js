const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Upload resumes and job description for screening
 */
export async function screenResumes(jobDescription, resumeFiles) {
    const formData = new FormData();
    formData.append("job_description", jobDescription);

    // Add all resume files
    resumeFiles.forEach((file) => {
        formData.append("resumes", file);
    });

    try {
        const response = await fetch(`${API_URL}/api/screen`, {
            method: "POST",
            body: formData,
            // Don't set Content-Type header - browser will set it with boundary
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to screen resumes");
        }

        return await response.json();
    } catch (error) {
        console.error("Screen resumes error:", error);
        throw error;
    }
}

/**
 * Fetch screening results
 */
export async function getResults(screeningId, minScore = 0) {
    try {
        const url = new URL(`${API_URL}/api/results/${screeningId}`);
        url.searchParams.append("min_score", minScore);

        const response = await fetch(url.toString());

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to fetch results");
        }

        return await response.json();
    } catch (error) {
        console.error("Get results error:", error);
        throw error;
    }
}

/**
 * Generate tailored interview questions for a screened candidate
 */
export async function generateInterviewQuestions(resultId) {
    try {
        const response = await fetch(`${API_URL}/api/results/${resultId}/questions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to generate interview questions");
        }

        return await response.json();
    } catch (error) {
        console.error("Generate interview questions error:", error);
        throw error;
    }
}

/**
 * Fetch all previous screening sessions for history
 */
export async function getSessions() {
    try {
        const response = await fetch(`${API_URL}/api/sessions`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to fetch screening sessions");
        }

        return await response.json();
    } catch (error) {
        console.error("Get sessions error:", error);
        throw error;
    }
}

/**
 * Export filtered candidate list as a CSV
 */
export async function exportCSV(screeningId, filteredResults = []) {
    try {
        const response = await fetch(`${API_URL}/api/export/csv`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                screening_id: screeningId,
                filtered_results: filteredResults
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to export CSV");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `screening_report_${screeningId.slice(0, 8)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export CSV error:", error);
        throw error;
    }
}

/**
 * Export premium multi-page candidate suitability PDF report
 */
export async function exportPDF(resultId, candidateName) {
    try {
        const response = await fetch(`${API_URL}/api/export/pdf`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                result_id: resultId
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to export PDF");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${candidateName.replace(/\s+/g, "_")}_recruiter_report.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export PDF error:", error);
        throw error;
    }
}

/**
 * Export recruiter side-by-side comparison matrix PDF report
 */
export async function exportComparison(resultIds) {
    try {
        const response = await fetch(`${API_URL}/api/export/comparison`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                result_ids: resultIds
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Failed to export comparison PDF");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `candidate_comparison_report.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export comparison error:", error);
        throw error;
    }
}