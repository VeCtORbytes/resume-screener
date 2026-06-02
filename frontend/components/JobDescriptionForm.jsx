"use client";

import styles from "./JobDescriptionForm.module.css";

export default function JobDescriptionForm({
    freeTextValue = "",
    onFreeTextChange,
    isLoading,
    onUseSample,
    onClear
}) {
    const charCount = freeTextValue.length;
    const maxChars = 5000;
    const isValidFree = charCount >= 10;

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
                        onClick={onUseSample}
                        disabled={isLoading}
                        className={`${styles.utilityBtn} hl-btn-secondary`}
                        title="Load premium sample requirements data"
                    >
                        Use Sample Requirements
                    </button>
                    <button
                        type="button"
                        onClick={onClear}
                        disabled={isLoading}
                        className={`${styles.clearBtn} hl-btn-secondary`}
                        title="Reset all input fields"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* FREE-FORM PASTED JD WORKFLOW */}
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
        </div>
    );
}
