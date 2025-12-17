import React from 'react';

const CodeViewer = ({ code, language = 'python' }) => {
  return (
    <div className="code-viewer">
      <div className="code-viewer-header">
        <span className="code-language">{language}</span>
        <button 
          className="copy-btn"
          onClick={() => {
            navigator.clipboard.writeText(code);
            alert('Code copied to clipboard!');
          }}
        >
          📋 Copy
        </button>
      </div>
      <pre className="code-content">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeViewer;
