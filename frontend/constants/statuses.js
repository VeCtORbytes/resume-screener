/**
 * Single source of truth for pipeline statuses.
 */
export const STATUS_CONFIG = {
  "New": {
    label: "New",
    className: "hl-badge-neutral",
  },
  "Reviewing": {
    label: "Reviewing",
    className: "hl-badge-warning",
  },
  "Shortlisted": {
    label: "Shortlisted",
    className: "hl-badge-success",
  },
  "Interview": {
    label: "Interview",
    className: "hl-badge-success",
  },
  "Rejected": {
    label: "Rejected",
    className: "hl-badge-danger",
  },
  "Hired": {
    label: "Hired",
    className: "hl-badge-success",
  }
};

export const PIPELINE_STATUSES = Object.keys(STATUS_CONFIG);
export const ALL_FILTER_STATUSES = ["All", ...PIPELINE_STATUSES];
