"use client";

import styles from "./RecruiterNotes.module.css";

export default function RecruiterNotes({ note = "", onNoteChange }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <span className={styles.icon}>✍️</span>
          <strong className={styles.title}>Recruiter Decision Commentary</strong>
        </div>
        <span className={styles.saveBadge}>✓ Saved to workspace</span>
      </div>
      <p className={styles.subtitle}>Add comments on portfolio evidence, screening performance, or team fit.</p>
      
      <textarea
        className={styles.textarea}
        placeholder="Add recruiter comments on portfolio evidence, screening performance, or team fit here..."
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
      />
    </div>
  );
}
