"use client";

import { useState, useRef } from "react";
import styles from "./FileUpload.module.css";

export default function FileUpload({ files = [], onFilesSelect, isLoading }) {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileInput = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        handleFiles(selectedFiles);
        
        // Reset file input value so that the exact same file can be selected and re-uploaded
        if (e.target) {
            e.target.value = "";
        }
    };

    const handleFiles = (newFiles) => {
        setError(null);

        if (isLoading) return;

        // 1. Robust PDF Validation (mime + extension fallback)
        const pdfFiles = newFiles.filter((file) => {
            const mimeType = file.type;
            const fileName = file.name.toLowerCase();
            return (
                mimeType === "application/pdf" ||
                mimeType === "application/x-pdf" ||
                fileName.endsWith(".pdf")
            );
        });

        const nonPdfCount = newFiles.length - pdfFiles.length;
        if (nonPdfCount > 0) {
            setError(`Skipped ${nonPdfCount} non-PDF file(s). Resumes must be in PDF format.`);
        }

        if (pdfFiles.length === 0) {
            return;
        }

        // 2. Max File Size Validation (10MB limit per PDF)
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        const sizeValidFiles = pdfFiles.filter((file) => file.size <= MAX_SIZE);
        
        const oversizedCount = pdfFiles.length - sizeValidFiles.length;
        if (oversizedCount > 0) {
            setError(
                (prev) =>
                    (prev ? prev + " " : "") +
                    `Skipped ${oversizedCount} file(s) exceeding the 10MB size limit.`
            );
        }

        if (sizeValidFiles.length === 0) {
            return;
        }

        // 3. Prevent Duplicate File Uploads
        const uniqueNewFiles = sizeValidFiles.filter((newFile) => {
            const isDuplicate = files.some(
                (existingFile) =>
                    existingFile.name === newFile.name && existingFile.size === newFile.size
            );
            return !isDuplicate;
        });

        const duplicateCount = sizeValidFiles.length - uniqueNewFiles.length;
        if (duplicateCount > 0) {
            setError(
                (prev) =>
                    (prev ? prev + " " : "") +
                    `Ignored ${duplicateCount} duplicate file(s).`
            );
        }

        if (uniqueNewFiles.length === 0) {
            return;
        }

        // 4. Batch limit check (Max 50)
        if (files.length + uniqueNewFiles.length > 50) {
            setError("Maximum of 50 resumes per batch reached.");
            return;
        }

        const updatedFiles = [...files, ...uniqueNewFiles];
        onFilesSelect(updatedFiles);
    };

    const handleDrag = (e) => {
        if (isLoading) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        if (isLoading) return;
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files || []);
        handleFiles(droppedFiles);
    };

    const removeFile = (index) => {
        if (isLoading) return;
        const updatedFiles = files.filter((_, i) => i !== index);
        onFilesSelect(updatedFiles);
    };

    // Keyboard accessibility for clickable upload zone (Enter / Space keys)
    const handleKeyDown = (e) => {
        if (isLoading) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault(); // Stop page scrolling on space bar press
            fileInputRef.current?.click();
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>📄 Upload Resumes</h2>

            {/* Inline Error UI */}
            {error && (
                <div className={styles.errorContainer}>
                    <span className={styles.errorIcon}>⚠️</span>
                    <span className={styles.errorText}>{error}</span>
                    <button onClick={() => setError(null)} className={styles.errorCloseBtn} title="Dismiss">
                        ✕
                    </button>
                </div>
            )}

            {/* Drag and Drop Area */}
            <div
                className={`${styles.dropZone} ${dragActive ? styles.active : ""} ${
                    isLoading ? styles.disabled : ""
                }`}
                role="button"
                tabIndex={isLoading ? -1 : 0}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => {
                    if (!isLoading) {
                        fileInputRef.current?.click();
                    }
                }}
                onKeyDown={handleKeyDown}
                aria-label="Upload Resumes"
            >
                <div className={styles.dropContent}>
                    <p className={styles.dropIcon}>📥</p>
                    <p className={styles.dropText}>
                        {isLoading ? "Screening in progress..." : "Drag & drop PDFs here, or click to browse"}
                    </p>
                    <p className={styles.dropHint}>
                        {files.length > 0 ? `${files.length} file(s) selected` : "PDF format only (Max 10MB) • Max 50 files"}
                    </p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,application/pdf,application/x-pdf"
                    onChange={handleFileInput}
                    className={styles.fileInput}
                    disabled={isLoading}
                />
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className={styles.fileList}>
                    <div className={styles.fileListHeader}>
                        <h3 className={styles.fileListTitle}>Selected Resumes</h3>
                        <span className={styles.fileListCount}>
                            {files.length} / 50 files
                        </span>
                    </div>
                    <ul className={styles.files}>
                        {files.map((file, index) => (
                            <li key={`${file.name}-${index}`} className={styles.fileItem}>
                                <span className={styles.pdfIcon}>📄</span>
                                <div className={styles.fileDetails}>
                                    <span className={styles.fileName}>{file.name}</span>
                                    <span className={styles.fileSize}>
                                        {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(index);
                                    }}
                                    className={styles.removeBtn}
                                    disabled={isLoading}
                                    title="Remove resume"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}