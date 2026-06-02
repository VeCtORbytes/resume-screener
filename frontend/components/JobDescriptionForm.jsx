"use client";

import { useState } from "react";
import styles from "./JobDescriptionForm.module.css";

// Sample structured requirements matching the sample JD string
export const SAMPLE_STRUCTURED = {
    roleInfo: {
        title: "Full Stack Developer (MERN Stack)",
        department: "Engineering / AI Solutions",
        location: "Remote / Hybrid",
        employmentType: "Full-time",
        experienceRange: "0-1 Year (Intern / Fresher / Junior)"
    },
    mustHaveSkills: ["React.js", "JavaScript (ES6+)", "Node.js", "Express.js", "MongoDB", "REST API development", "HTML5", "CSS3", "Tailwind CSS", "Git", "GitHub"],
    goodToHaveSkills: ["AI API integration (Groq / OpenAI / LLM workflows)", "Cloudinary / media storage", "Vercel / Render / Netlify Deployment", "Chart.js / dynamic data visualization", "DSA / problem solving"],
    experienceRequirements: "Hands-on experience in building scalable web applications using the MERN stack. Practical experience developing end-to-end applications, integrating APIs, working with databases, and implementing modern responsive frontend interfaces.",
    responsibilities: "- Develop responsive and interactive frontend applications using React.js\n- Build scalable backend services and RESTful APIs using Node.js and Express.js\n- Design and manage MongoDB databases, schemas, CRUD operations, and queries\n- Integrate third-party APIs such as AI APIs, cloud media storage, and external data services\n- Implement user authentication, session handling, and authorization flows\n- Build dashboard interfaces, analytics views, and dynamic data visualizations\n- Optimize application performance, responsiveness, and maintainability\n- Collaborate using Git/GitHub workflows in team environments",
    educationRequirements: "B.Tech / BE in Computer Science, Information Technology, or related field. Final year students / recent graduates are welcome to apply.",
    hiringPriority: "Skills First"
};

export default function JobDescriptionForm({
    inputMode = "paste",
    onInputModeChange,
    freeTextValue = "",
    onFreeTextChange,
    structuredJob,
    updateRoleInfo,
    addMustHaveSkill,
    removeMustHaveSkill,
    addGoodToHaveSkill,
    removeGoodToHaveSkill,
    updateTextField,
    setStructuredJob,
    isLoading,
    onUseSample,
    onClear
}) {
    const [mustHaveInput, setMustHaveInput] = useState("");
    const [goodToHaveInput, setGoodToHaveInput] = useState("");

    const charCount = freeTextValue.length;
    const maxChars = 5000;
    const isValidFree = charCount >= 10;

    const handleAddMustHave = (e) => {
        if (e.key === "Enter" || e.type === "click") {
            e.preventDefault();
            if (mustHaveInput.trim()) {
                addMustHaveSkill(mustHaveInput.trim());
                setMustHaveInput("");
            }
        }
    };

    const handleAddGoodTo = (e) => {
        if (e.key === "Enter" || e.type === "click") {
            e.preventDefault();
            if (goodToHaveInput.trim()) {
                addGoodToHaveSkill(goodToHaveInput.trim());
                setGoodToHaveInput("");
            }
        }
    };

    const handleUseSampleMode = () => {
        if (inputMode === "paste") {
            onUseSample();
        } else {
            // Load pre-populated structured job
            setStructuredJob(JSON.parse(JSON.stringify(SAMPLE_STRUCTURED)));
        }
    };

    const handleClearMode = () => {
        if (inputMode === "paste") {
            onClear();
        } else {
            // Reset fields
            onClear(); // triggers structural reset
        }
    };

    return (
        <div className={styles.container}>
            
            {/* Header Row with Actions */}
            <div className={styles.headerRow}>
                <div className={styles.titleWrapper}>
                    <h2 className={styles.title}>💼 Hiring Intake Setup</h2>
                    <p className={styles.subtitle}>Specify the requirements for this screening assessment</p>
                </div>
                <div className={styles.utilityActions}>
                    <button
                        type="button"
                        onClick={handleUseSampleMode}
                        disabled={isLoading}
                        className={`${styles.utilityBtn} hl-btn-secondary`}
                        title="Load premium sample requirements data"
                    >
                        Use Sample Requirements
                    </button>
                    <button
                        type="button"
                        onClick={handleClearMode}
                        disabled={isLoading}
                        className={`${styles.clearBtn} hl-btn-secondary`}
                        title="Reset all input fields"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Segmented Mode Selector */}
            <div className={styles.tabsWrapper}>
                <button
                    type="button"
                    onClick={() => onInputModeChange("paste")}
                    className={`${styles.tabBtn} ${inputMode === "paste" ? styles.activeTab : ""}`}
                >
                    📝 Paste Job Description
                </button>
                <button
                    type="button"
                    onClick={() => onInputModeChange("build")}
                    className={`${styles.tabBtn} ${inputMode === "build" ? styles.activeTab : ""}`}
                >
                    ⚙️ Build Job Requirements
                </button>
            </div>

            {/* Content Switcher */}
            {inputMode === "paste" ? (
                /* FREE-FORM PASTED JD WORKFLOW */
                <div className={styles.inputWrapper}>
                    <textarea
                        value={freeTextValue}
                        onChange={(e) => onFreeTextChange(e.target.value)}
                        placeholder="Paste your professional job description here. Describe the role scope, responsibilities, technical skill requirements, and team structure..."
                        className={styles.textarea}
                        disabled={isLoading}
                        maxLength={maxChars}
                    />
                    <div className={styles.footer}>
                        <span className={`${styles.charCount} ${!isValidFree && charCount > 0 ? styles.error : ""}`}>
                            {charCount} / {maxChars} characters
                            {charCount > 0 && charCount < 10 && " (minimum 10 required)"}
                        </span>
                    </div>
                </div>
            ) : (
                /* STRUCTURED RECRUITER INTAKE FORM BUILDER */
                <div className={styles.builderWrapper}>
                    
                    {/* A. Role Information Section */}
                    <div className={styles.formSection}>
                        <h4 className={styles.sectionHeader}>📋 Role Information</h4>
                        <div className={styles.formRowGrid}>
                            <div className={styles.formField}>
                                <label className={styles.label}>Job Title <span className={styles.required}>*</span></label>
                                <input
                                    type="text"
                                    value={structuredJob.roleInfo.title || ""}
                                    onChange={(e) => updateRoleInfo("title", e.target.value)}
                                    placeholder="e.g. Senior Frontend Engineer"
                                    className={styles.input}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Department</label>
                                <input
                                    type="text"
                                    value={structuredJob.roleInfo.department || ""}
                                    onChange={(e) => updateRoleInfo("department", e.target.value)}
                                    placeholder="e.g. Engineering / Product"
                                    className={styles.input}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className={styles.formRowGrid3Col}>
                            <div className={styles.formField}>
                                <label className={styles.label}>Location</label>
                                <input
                                    type="text"
                                    value={structuredJob.roleInfo.location || ""}
                                    onChange={(e) => updateRoleInfo("location", e.target.value)}
                                    placeholder="e.g. Remote / Hybrid / New York"
                                    className={styles.input}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Employment Type</label>
                                <select
                                    value={structuredJob.roleInfo.employmentType || "Full-time"}
                                    onChange={(e) => updateRoleInfo("employmentType", e.target.value)}
                                    className={styles.select}
                                    disabled={isLoading}
                                >
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                    <option value="Remote">Remote</option>
                                </select>
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Experience Range</label>
                                <input
                                    type="text"
                                    value={structuredJob.roleInfo.experienceRange || ""}
                                    onChange={(e) => updateRoleInfo("experienceRange", e.target.value)}
                                    placeholder="e.g. 3-5 Years / Entry Level"
                                    className={styles.input}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* B. Must Have Skills Section */}
                    <div className={styles.formSection}>
                        <h4 className={styles.sectionHeader}>🔥 Must-Have Technical Skills</h4>
                        <p className={styles.sectionHelper}>These represent hard-stop capability mandates for recruiters. Candidates lacking these will be penalized heavily.</p>
                        
                        <div className={styles.tagInputContainer}>
                            <input
                                type="text"
                                value={mustHaveInput}
                                onChange={(e) => setMustHaveInput(e.target.value)}
                                onKeyDown={handleAddMustHave}
                                placeholder="Type a skill and press Enter (e.g. React, Node.js)"
                                className={styles.tagInput}
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={handleAddMustHave}
                                className={styles.addTagBtn}
                                disabled={isLoading || !mustHaveInput.trim()}
                            >
                                + Add
                            </button>
                        </div>

                        <div className={styles.chipsWrapper}>
                            {structuredJob.mustHaveSkills.map((skill, index) => (
                                <span key={`must-${index}`} className={`${styles.chip} ${styles.mustHaveChip}`}>
                                    <span>✓ {skill}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeMustHaveSkill(skill)}
                                        className={styles.removeChipBtn}
                                        title="Remove skill requirement"
                                        disabled={isLoading}
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                            {structuredJob.mustHaveSkills.length === 0 && (
                                <span className={styles.emptyChipsText}>No must-have skill chips added yet.</span>
                            )}
                        </div>
                    </div>

                    {/* C. Good To Have Skills Section */}
                    <div className={styles.formSection}>
                        <h4 className={styles.sectionHeader}>✨ Nice-To-Have Preferred Skills</h4>
                        <p className={styles.sectionHelper}>Secondary skill tags or preferred competencies which act as strong candidate tie-breakers.</p>
                        
                        <div className={styles.tagInputContainer}>
                            <input
                                type="text"
                                value={goodToHaveInput}
                                onChange={(e) => setGoodToHaveInput(e.target.value)}
                                onKeyDown={handleAddGoodTo}
                                placeholder="Type a preferred skill and press Enter (e.g. AWS, Docker)"
                                className={styles.tagInput}
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={handleAddGoodTo}
                                className={styles.addTagBtn}
                                disabled={isLoading || !goodToHaveInput.trim()}
                            >
                                + Add
                            </button>
                        </div>

                        <div className={styles.chipsWrapper}>
                            {structuredJob.goodToHaveSkills.map((skill, index) => (
                                <span key={`good-${index}`} className={`${styles.chip} ${styles.goodToHaveChip}`}>
                                    <span>★ {skill}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeGoodToHaveSkill(skill)}
                                        className={styles.removeChipBtn}
                                        title="Remove preferred skill"
                                        disabled={isLoading}
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                            {structuredJob.goodToHaveSkills.length === 0 && (
                                <span className={styles.emptyChipsText}>No nice-to-have skill chips added yet.</span>
                            )}
                        </div>
                    </div>

                    {/* D. Required Experience Section */}
                    <div className={styles.formSection}>
                        <h4 className={styles.sectionHeader}>📈 Required Experience Details</h4>
                        <textarea
                            value={structuredJob.experienceRequirements || ""}
                            onChange={(e) => updateTextField("experienceRequirements", e.target.value)}
                            placeholder="Describe relevant industry history, specific product lifecycle experience, or target background contexts..."
                            className={styles.builderTextarea}
                            disabled={isLoading}
                        />
                    </div>

                    {/* E. Responsibilities Section */}
                    <div className={styles.formSection}>
                        <h4 className={styles.sectionHeader}>🎯 Role Responsibilities</h4>
                        <textarea
                            value={structuredJob.responsibilities || ""}
                            onChange={(e) => updateTextField("responsibilities", e.target.value)}
                            placeholder="Detail everyday team roles, architectural expectations, collaborative workflows, and leadership duties..."
                            className={styles.builderTextarea}
                            disabled={isLoading}
                        />
                    </div>

                    {/* F. Education Section */}
                    <div className={styles.formSection}>
                        <h4 className={styles.sectionHeader}>🎓 Educational Credentials (Optional)</h4>
                        <input
                            type="text"
                            value={structuredJob.educationRequirements || ""}
                            onChange={(e) => updateTextField("educationRequirements", e.target.value)}
                            placeholder="e.g. M.S. or B.S. in Computer Science or equivalent evidence of capabilities"
                            className={styles.input}
                            disabled={isLoading}
                        />
                    </div>

                    {/* G. Hiring Priorities Section */}
                    <div className={styles.formSection}>
                        <h4 className={styles.sectionHeader}>🛡️ Primary Screening Ingestion Priority</h4>
                        <p className={styles.sectionHelper}>Define which axis of suitability represents the highest weight during candidate rankings.</p>
                        
                        <div className={styles.radioGroupGrid}>
                            {[
                                { id: "skills", label: "Skills First", desc: "Prioritize technical capabilities and tag match coverage." },
                                { id: "experience", label: "Experience First", desc: "Prioritize career years, roles, and relevance history." },
                                { id: "education", label: "Education First", desc: "Prioritize college, academic tiering, and credentials." },
                                { id: "leadership", label: "Leadership First", desc: "Prioritize architecture, project ownership, and mentoring." }
                            ].map((priority) => (
                                <label
                                    key={priority.label}
                                    className={`${styles.radioBoxLabel} ${structuredJob.hiringPriority === priority.label ? styles.activeRadioBox : ""}`}
                                >
                                    <input
                                        type="radio"
                                        name="hiringPriority"
                                        checked={structuredJob.hiringPriority === priority.label}
                                        onChange={() => updateTextField("hiringPriority", priority.label)}
                                        className={styles.radioInput}
                                        disabled={isLoading}
                                    />
                                    <div className={styles.radioTextContent}>
                                        <strong className={styles.radioBoxHeading}>{priority.label}</strong>
                                        <span className={styles.radioBoxDesc}>{priority.desc}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
