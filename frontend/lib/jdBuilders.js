/**
 * Serializes the structured recruiter job requirements form state
 * into a highly readable, structured Markdown text document.
 * This is fully parsed by the existing FastAPI LLM grading logic.
 */
export function buildJdFromStructured(structuredJob) {
    if (!structuredJob) return "";

    const {
        roleInfo = {},
        mustHaveSkills = [],
        goodToHaveSkills = [],
        experienceRequirements = "",
        responsibilities = "",
        educationRequirements = "",
        hiringPriority = ""
    } = structuredJob;

    const lines = [];

    // Job Header
    lines.push("# JOB PROFILE AND SCREENING PROTOCOLS\n");

    // Role details
    lines.push("## Role Information");
    if (roleInfo.title) lines.push(`- **Job Title**: ${roleInfo.title}`);
    if (roleInfo.department) lines.push(`- **Department**: ${roleInfo.department}`);
    if (roleInfo.location) lines.push(`- **Location**: ${roleInfo.location}`);
    if (roleInfo.employmentType) lines.push(`- **Employment Type**: ${roleInfo.employmentType}`);
    if (roleInfo.experienceRange) lines.push(`- **Experience Range**: ${roleInfo.experienceRange}`);
    lines.push("");

    // Must Have Skills
    if (mustHaveSkills && mustHaveSkills.length > 0) {
        lines.push("## Must-Have Required Skills");
        mustHaveSkills.forEach(skill => {
            if (skill && skill.trim()) {
                lines.push(`- ${skill.trim()}`);
            }
        });
        lines.push("");
    }

    // Nice to Have Skills
    if (goodToHaveSkills && goodToHaveSkills.length > 0) {
        lines.push("## Nice-To-Have Preferred Skills");
        goodToHaveSkills.forEach(skill => {
            if (skill && skill.trim()) {
                lines.push(`- ${skill.trim()}`);
            }
        });
        lines.push("");
    }

    // Experience requirements
    if (experienceRequirements && experienceRequirements.trim()) {
        lines.push("## Required Professional Experience");
        lines.push(experienceRequirements.trim());
        lines.push("");
    }

    // Responsibilities
    if (responsibilities && responsibilities.trim()) {
        lines.push("## Core Responsibilities");
        lines.push(responsibilities.trim());
        lines.push("");
    }

    // Education
    if (educationRequirements && educationRequirements.trim()) {
        lines.push("## Educational Qualifications & Certifications");
        lines.push(educationRequirements.trim());
        lines.push("");
    }

    // Hiring priority
    if (hiringPriority) {
        lines.push("## Screening Evaluation Priority");
        lines.push(`- **Hiring Focus Priority**: ${hiringPriority}`);
        lines.push("");
    }

    return lines.join("\n").trim();
}
