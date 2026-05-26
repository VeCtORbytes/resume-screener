"use client";

import styles from "./JobDescInput.module.css";

export default function JobDescInput({ value, onChange, isLoading }) {
    const charCount = value.length;
    const maxChars = 5000;
    const isValid = charCount >= 10;

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>💼 Job Description</h2>

            <div className={styles.inputWrapper}>
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste the job description here. Include requirements, responsibilities, and skills..."
                    className={styles.textarea}
                    disabled={isLoading}
                    maxLength={maxChars}
                />

                <div className={styles.footer}>
                    <span className={`${styles.charCount} ${!isValid ? styles.error : ""}`}>
                        {charCount} / {maxChars} characters
                        {charCount < 10 && " (minimum 10 required)"}
                    </span>
                </div>
            </div>
        </div>
    );
}