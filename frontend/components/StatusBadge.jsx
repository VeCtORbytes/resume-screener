"use client";

import styles from "./StatusBadge.module.css";

const STATUS_CONFIG = {
  "New": {
    label: "New",
    className: "hl-badge-neutral"
  },
  "Review Later": {
    label: "Hold",
    className: "hl-badge-warning"
  },
  "Shortlisted": {
    label: "Shortlisted",
    className: "hl-badge-success"
  },
  "Interview": {
    label: "Interview",
    className: "hl-badge-success"
  },
  "Rejected": {
    label: "Rejected",
    className: "hl-badge-danger"
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
          className={`hl-badge ${config.className} ${styles.select}`}
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
    <span className={`hl-badge ${config.className}`}>
      <span>{config.label}</span>
    </span>
  );
}
