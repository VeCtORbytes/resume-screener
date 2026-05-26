"use client";

import styles from "./JobDescInput.module.css";

export default function JobDescInput({ value = "", onChange, isLoading, onUseSample, onClear }) {
    const charCount = value.length;
    const maxChars = 5000;
    const isValid = charCount >= 10;

    return (
        <div className={styles.container}>
            <div className={styles.headerRow}>
                <h2 className={styles.title}>💼 Job Description</h2>
                <div className={styles.utilityActions}>
                    <button
                        type="button"
                        onClick={onUseSample}
                        disabled={isLoading}
                        className={styles.utilityBtn}
                        title="Load software engineering role requirements"
                    >
                        Use Sample JD
                    </button>
                    {value && (
                        <button
                            type="button"
                            onClick={onClear}
                            disabled={isLoading}
                            className={styles.clearBtn}
                            title="Clear job description content"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.inputWrapper}>
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste your professional job description here. Describe the role scope, responsibilities, technical skill requirements, and team structure..."
                    className={styles.textarea}
                    disabled={isLoading}
                    maxLength={maxChars}
                />

                <div className={styles.footer}>
                    <span className={`${styles.charCount} ${!isValid && charCount > 0 ? styles.error : ""}`}>
                        {charCount} / {maxChars} characters
                        {charCount > 0 && charCount < 10 && " (minimum 10 required)"}
                    </span>
                </div>
            </div>
        </div>
    );
}