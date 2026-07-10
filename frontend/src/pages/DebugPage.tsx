import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [apiResult, setApiResult] = useState('loading...');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/guides?slug=breathing-478')
      .then(r => { setApiResult(`Status: ${r.status}, Type: ${r.headers.get('content-type')}`); return r.json(); })
      .then(d => setApiResult(JSON.stringify(d, null, 2).substring(0, 500)))
      .catch(e => setError(e.message));
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 14 }}>
      <h1 style={{ color: 'green' }}>Debug Page - Pills</h1>
      <p>React is working!</p>
      <h2>API Test:</h2>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <pre style={{ background: '#f0f0f0', padding: 10, borderRadius: 8, overflow: 'auto', maxHeight: 400 }}>{apiResult}</pre>
      <h2>Environment:</h2>
      <p>User Agent: {navigator.userAgent}</p>
      <p>URL: {window.location.href}</p>
    </div>
  );
}
