import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRunClick = () => {
    if (prompt.trim() && !loading) {
      setLoading(true);
      console.log('Attempting to send prompt:', prompt);
      chrome.runtime.sendMessage({ type: 'RUN_WORKFLOW', prompt }, (response) => {
        console.log('Background response:', response);
        setPrompt('');
        setLoading(false);
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
        onChange={(e) => setPrompt(e.target.value)}
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
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
); 