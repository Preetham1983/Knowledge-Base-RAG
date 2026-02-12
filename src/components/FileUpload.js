import React, { useState } from 'react';
import axios from 'axios';
import './FileUpload.css';

const FileUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('pdf_files', selectedFiles[i]);
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await axios.post('http://127.0.0.1:5000/upload-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadSuccess(true);
    } catch (error) {
      console.error('Error uploading PDFs:', error);
      setUploadError('Error uploading PDFs');
    } finally {
      setUploading(false);
    }
  };



  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const handleSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await axios.get('http://127.0.0.1:5000/generate-summary');
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setSummaryError('Failed to generate summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="file-upload-container">
      <label className="file-upload-label">
        <input type="file" onChange={handleFileChange} multiple className="file-upload-input" />
        Choose File(s)
      </label>

      {selectedFiles && selectedFiles.length > 0 && (
        <div className="selected-files-list">
          <h4>Selected Files:</h4>
          <ul>
            {Array.from(selectedFiles).map((file, index) => (
              <li key={index}>
                <a
                  href={URL.createObjectURL(file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-link"
                >
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={handleUpload} className="file-upload-button" disabled={!selectedFiles}>
        Upload & Process
      </button>

      {uploading && <p className="upload-status">Uploading...</p>}
      {uploadSuccess && <p className="upload-status success">DONE</p>}
      {uploadError && <p className="upload-status error">Error uploading PDFs</p>}

      {/* Summary Section */}
      {uploadSuccess && (
        <div className="summary-section">
          <button
            onClick={handleSummary}
            className="summary-button"
            disabled={summaryLoading}
          >
            {summaryLoading ? "Generating Summary..." : "Summarize PDF"}
          </button>

          {summaryError && <p className="summary-error">{summaryError}</p>}

          {summary && (
            <div className="summary-display">
              <h3>Document Summary</h3>
              <div className="summary-content">
                {summary}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;


