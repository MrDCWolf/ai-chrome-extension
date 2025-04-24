import React from 'react';
import { createRoot } from 'react-dom/client';

const Popup: React.FC = () => {
  return (
    <div style={{ width: '300px', padding: '16px' }}>
      <h1>AI Chrome Automation</h1>
      <p>Enter your automation prompt below:</p>
      <textarea
        style={{ width: '100%', height: '100px', marginBottom: '8px' }}
        placeholder="Describe what you want to automate..."
      />
      <button
        style={{
          width: '100%',
          padding: '8px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Run Automation
      </button>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
} 