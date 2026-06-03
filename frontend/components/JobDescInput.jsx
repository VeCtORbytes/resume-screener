"use client";

import JobDescriptionForm from "./JobDescriptionForm";

/**
 * Legacy wrapper component which forwards all props to the new high-fidelity
 * JobDescriptionForm component to ensure zero legacy regressions.
 */
export default function JobDescInput(props) {
    return <JobDescriptionForm {...props} />;
}