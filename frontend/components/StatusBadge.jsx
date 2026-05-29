"use client";

import styles from "./StatusBadge.module.css";

const STATUS_CONFIG = {
  "New": {
    label: "New",
    className: styles.badgeNew
  },
  "Review Later": {
    label: "Review Later",
    className: styles.badgeReviewLater
  },
  "Shortlisted": {
    label: "Shortlisted",
    className: styles.badgeShortlisted
  },
  "Interview": {
    label: "Interview",
    className: styles.badgeInterview
  },
  "Rejected": {
    label: "Rejected",
    className: styles.badgeRejected
  }
};

export default function StatusBadge({ status = "New", onChange, interactive = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["New"];

  if (interactive && onChange) {
    return (
      <div className={styles.interactiveWrapper}>
        <select
          value={status}
          onChange={(e) => onChange(e.target.value)}
          className={`${styles.select} ${config.className}`}
        >
          {Object.keys(STATUS_CONFIG).map((key) => (
            <option key={key} value={key} className={styles.option}>
              {STATUS_CONFIG[key].label}
            </option>
          ))}
        </select>
        <span className={styles.selectCaret}>▼</span>
      </div>
    );
  }

  return (
    <span className={`${styles.badge} ${config.className}`}>
      <span className={styles.label}>{config.label}</span>
    </span>
  );
}
