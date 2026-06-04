"use client";

import styles from "./WorkspaceHeader.module.css";

export default function WorkspaceHeader({ counts, statusFilter, setStatusFilter }) {
  const {
    total = 0,
    shortlisted = 0,
    interview = 0,
    reviewing = 0,
    rejected = 0
  } = counts;

  const cardConfig = [
    {
      label: "All Candidates",
      filterValue: "All",
      value: total,
      icon: "👥",
      className: styles.cardTotal,
      footer: "Total Screened Resumes"
    },
    {
      label: "Shortlisted",
      filterValue: "Shortlisted",
      value: shortlisted,
      icon: "⭐",
      className: styles.cardShortlisted,
      footer: "Prime matches for team fit"
    },
    {
      label: "Interview",
      filterValue: "Interview",
      value: interview,
      icon: "📅",
      className: styles.cardInterview,
      footer: "Scheduled or in-progress"
    },
    {
      label: "Reviewing",
      filterValue: "Reviewing",
      value: reviewing,
      icon: "⏳",
      className: styles.cardReviewLater,
      footer: "On hold for further review"
    },
    {
      label: "Rejected",
      filterValue: "Rejected",
      value: rejected,
      icon: "🚫",
      className: styles.cardRejected,
      footer: "Archived / Unmatched"
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.headerTitleGroup}>
        <h3 className={styles.title}>Hiring Decision Workspace</h3>
        <p className={styles.subtitle}>Directly record candidate decisions and monitor overall pipeline stages</p>
      </div>

      <div className={styles.grid}>
        {cardConfig.map((card, idx) => {
          const isActive = statusFilter === card.filterValue;
          return (
            <div 
              key={idx} 
              className={`${styles.card} ${card.className} ${isActive ? styles.activeCard : ""}`}
              onClick={() => setStatusFilter && setStatusFilter(card.filterValue)}
            >
              <div className={styles.cardHeader}>
                <span className={styles.cardLabel}>{card.label}</span>
                <span className={styles.cardIcon}>{card.icon}</span>
              </div>
              <h2 className={styles.cardValue}>{card.value}</h2>
              <p className={styles.cardFooter}>{card.footer}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
