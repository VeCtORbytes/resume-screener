"use client";

import styles from "./FilterControl.module.css";

export default function FilterControl({ minScore, onChange, isLoading }) {
    return (
        <div className={styles.container}>
            <h2 className={styles.title}>🔍 Filter Results</h2>

            <div className={styles.filterGroup}>
                <label className={styles.label}>Minimum Score</label>
                <div className={styles.inputRow}>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={minScore}
                        onChange={(e) => onChange(parseInt(e.target.value))}
                        className={styles.slider}
                        disabled={isLoading}
                    />
                    <span className={styles.valueDisplay}>{minScore}</span>
                </div>
                <div className={styles.presets}>
                    {[0, 40, 60, 80].map((score) => (
                        <button
                            key={score}
                            onClick={() => onChange(score)}
                            className={`${styles.presetBtn} ${minScore === score ? styles.active : ""
                                }`}
                            disabled={isLoading}
                        >
                            {score === 0 ? "All" : `${score}+`}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}