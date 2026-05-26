"use client";

import { useState } from "react";
import styles from "./FileUpload.module.css";

export default function FileUpload({ onFilesSelect, isLoading }) {
    const [files, setFiles] = useState([]);
    const [dragActive, setDragActive] = useState(false);

    const handleFileInput = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        handleFiles(selectedFiles);
    };

    const handleFiles = (newFiles) => {
        // Only accept PDFs
        const pdfFiles = newFiles.filter((file) => file.type === "application/pdf");

        if (pdfFiles.length === 0) {
            alert("Please upload PDF files only");
            return;
        }

        if (files.length + pdfFiles.length > 50) {
            alert("Maximum 50 resumes per batch");
            return;
        }

        const updatedFiles = [...files, ...pdfFiles];
        setFiles(updatedFiles);
        onFilesSelect(updatedFiles);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files || []);
        handleFiles(droppedFiles);
    };

    const removeFile = (index) => {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);
        onFilesSelect(updatedFiles);
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>📄 Upload Resumes</h2>

            {/* Drag and Drop Area */}
            <div
                className={`${styles.dropZone} ${dragActive ? styles.active : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className={styles.dropContent}>
                    <p className={styles.dropIcon}>📥</p>
                    <p className={styles.dropText}>
                        Drag and drop PDFs here, or click to select
                    </p>
                    <p className={styles.dropHint}>
                        {files.length > 0 ? `${files.length} file(s) selected` : "Max 50 resumes"}
                    </p>
                </div>

                <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileInput}
                    className={styles.fileInput}
                    disabled={isLoading}
                />
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className={styles.fileList}>
                    <h3 className={styles.fileListTitle}>Selected Files:</h3>
                    <ul className={styles.files}>
                        {files.map((file, index) => (
                            <li key={index} className={styles.fileItem}>
                                <span className={styles.fileName}>{file.name}</span>
                                <span className={styles.fileSize}>
                                    ({(file.size / 1024).toFixed(2)} KB)
                                </span>
                                <button
                                    onClick={() => removeFile(index)}
                                    className={styles.removeBtn}
                                    disabled={isLoading}
                                    title="Remove file"
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