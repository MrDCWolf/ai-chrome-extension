import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleRunClick = () => {
    if (prompt.trim() && !loading) {
      setLoading(true);
      setStatusMessage(''); // Clear previous status on new run
      setIsError(false);
      console.log('Attempting to send prompt:', prompt);

      chrome.runtime.sendMessage({ type: 'RUN_WORKFLOW', prompt }, (response) => {
        console.log('Background response:', response);
        setLoading(false);
        if (response?.success) {
          setStatusMessage('Workflow completed successfully!');
          setIsError(false);
          setPrompt(''); // Clear prompt only on success
        } else {
          // Use response.error if available, otherwise provide a default
          setStatusMessage(response?.error || 'Workflow failed: An unknown error occurred.');
          setIsError(true);
        }
      });
      console.log('Sent prompt message to background.');
    }
  };

  return (
    <div style={{ padding: '10px', width: '350px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h1>AI Chrome Automation</h1>
      <textarea
        rows={3}
        placeholder="Enter command…"
        value={prompt}
        onChange={(e) => {
           setPrompt(e.target.value);
           // Optionally clear status message on typing
           // if (statusMessage) setStatusMessage(''); 
        }}
        style={{ width: '100%', boxSizing: 'border-box', padding: '5px' }}
        disabled={loading}
      />
      <button
        onClick={handleRunClick}
        style={{ padding: '8px 15px' }}
        disabled={loading || !prompt.trim()}
      >
        {loading ? 'Running...' : 'Run'}
      </button>

      {/* Status Message Display */}
      {statusMessage && (
        <div 
          style={{
            marginTop: '10px',
            padding: '8px',
            border: `1px solid ${isError ? 'red' : 'green'}`, 
            borderRadius: '4px',
            backgroundColor: isError ? '#ffebee' : '#e8f5e9',
            color: isError ? '#c62828' : '#2e7d32',
            fontSize: '0.9em'
          }}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
); 