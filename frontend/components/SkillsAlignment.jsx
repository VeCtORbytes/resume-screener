"use client";

import styles from "./CandidateWorkspace.module.css";

function renderSkillsList(matched, missing, sectionTitle) {
  const total = matched.length + missing.length;
  const matchPct = total > 0 ? Math.round((matched.length / total) * 100) : 0;

  return (
    <div className={styles.skillsDossierGroup}>
      <div className={styles.skillsDossierHeader}>
        <h4 className={styles.dossierSubheading}>{sectionTitle}</h4>
        <span className={styles.skillsDossierPct}>
          {matched.length} of {total} Matched ({matchPct}%)
        </span>
      </div>
      
      <div className={styles.skillsDossierProgressBg}>
        <div 
          className={styles.skillsDossierProgressFill} 
          style={{ width: `${matchPct}%`, background: sectionTitle.toLowerCase().includes("must") ? "#10b981" : "#3b82f6" }}
        ></div>
      </div>

      <div className={styles.skillsDossierList}>
        {matched.map((skill, idx) => (
          <div key={`matched-${idx}`} className={styles.skillsDossierRow}>
            <span className={styles.skillDossierBulletMatched}>✓</span>
            <span className={styles.skillDossierName}>{skill}</span>
            <span className={styles.skillDossierBadgeMatched}>Matched</span>
          </div>
        ))}
        {missing.map((skill, idx) => (
          <div key={`missing-${idx}`} className={styles.skillsDossierRow}>
            <span className={styles.skillDossierBulletMissing}>✗</span>
            <span className={styles.skillDossierName}>{skill}</span>
            <span className={styles.skillDossierBadgeMissing}>Missing</span>
          </div>
        ))}
        {total === 0 && (
          <p className={styles.emptySkillsText}>No explicit requirements listed for this category.</p>
        )}
      </div>
    </div>
  );
}

export default function SkillsAlignment({ gapAnalysis = {} }) {
  const mustHaveMatched = gapAnalysis?.must_have_matched || [];
  const mustHaveMissing = gapAnalysis?.must_have_missing || [];
  const goodToHaveMatched = gapAnalysis?.good_to_have_matched || [];
  const goodToHaveMissing = gapAnalysis?.good_to_have_missing || [];

  return (
    <div className={styles.dossierSectionCard}>
      <h3 className={styles.dossierSectionHeading}>Skills Alignment</h3>
      
      <div className={styles.skillsAlignmentLayout}>
        {renderSkillsList(mustHaveMatched, mustHaveMissing, "Must-Have Skill Mandates")}
        {renderSkillsList(goodToHaveMatched, goodToHaveMissing, "Nice-To-Have Skills")}
      </div>
    </div>
  );
}
