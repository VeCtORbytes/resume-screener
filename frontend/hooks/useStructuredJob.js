import { useState } from "react";

export const initialStructuredJob = {
    roleInfo: {
        title: "",
        department: "",
        location: "",
        employmentType: "Full-time",
        experienceRange: ""
    },
    mustHaveSkills: [],
    goodToHaveSkills: [],
    experienceRequirements: "",
    responsibilities: "",
    educationRequirements: "",
    hiringPriority: "Skills First"
};

/**
 * Custom React Hook to manage state and actions for the Structured Job intake form.
 */
export default function useStructuredJob(initialState = initialStructuredJob) {
    const [structuredJob, setStructuredJob] = useState(initialState);

    const updateRoleInfo = (field, value) => {
        setStructuredJob((prev) => ({
            ...prev,
            roleInfo: {
                ...prev.roleInfo,
                [field]: value
            }
        }));
    };

    const addMustHaveSkill = (skill) => {
        if (!skill || !skill.trim()) return;
        const trimmed = skill.trim();
        setStructuredJob((prev) => {
            if (prev.mustHaveSkills.includes(trimmed)) return prev;
            return {
                ...prev,
                mustHaveSkills: [...prev.mustHaveSkills, trimmed]
            };
        });
    };

    const removeMustHaveSkill = (skill) => {
        setStructuredJob((prev) => ({
            ...prev,
            mustHaveSkills: prev.mustHaveSkills.filter((s) => s !== skill)
        }));
    };

    const addGoodToHaveSkill = (skill) => {
        if (!skill || !skill.trim()) return;
        const trimmed = skill.trim();
        setStructuredJob((prev) => {
            if (prev.goodToHaveSkills.includes(trimmed)) return prev;
            return {
                ...prev,
                goodToHaveSkills: [...prev.goodToHaveSkills, trimmed]
            };
        });
    };

    const removeGoodToHaveSkill = (skill) => {
        setStructuredJob((prev) => ({
            ...prev,
            goodToHaveSkills: prev.goodToHaveSkills.filter((s) => s !== skill)
        }));
    };

    const updateTextField = (field, value) => {
        setStructuredJob((prev) => ({
            ...prev,
            [field]: value
        }));
    };

    const resetJob = () => {
        setStructuredJob(JSON.parse(JSON.stringify(initialState)));
    };

    return {
        structuredJob,
        setStructuredJob,
        updateRoleInfo,
        addMustHaveSkill,
        removeMustHaveSkill,
        addGoodToHaveSkill,
        removeGoodToHaveSkill,
        updateTextField,
        resetJob
    };
}
