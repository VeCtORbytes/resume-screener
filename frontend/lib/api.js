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