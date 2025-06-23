import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';
import './App.css';
import { getLogs, log } from './loggingMiddleware';

interface ShortUrl {
  shortCode: string;
  originalUrl: string;
  createdAt: number;
  expiresAt: number;
  clickCount: number;
}

function generateShortCode(existing: Set<string>): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (existing.has(code));
  return code;
}

function App() {
  const [longUrl, setLongUrl] = useState('');
  const [validity, setValidity] = useState('');
  const [shortUrls, setShortUrls] = useState<ShortUrl[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [redirectCode, setRedirectCode] = useState('');
  const [redirectResult, setRedirectResult] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const handleShorten = (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) {
      log('Attempted to shorten empty URL', { longUrl });
      return;
    }
    let url;
    try {
      url = new URL(longUrl);
    } catch {
      log('Invalid URL entered', { longUrl });
      return;
    }
    const validityMinutes = validity ? parseInt(validity, 10) : 30;
    if (isNaN(validityMinutes) || validityMinutes <= 0) {
      log('Invalid validity entered', { validity });
      return;
    }
    const now = Date.now();
    const expiresAt = now + validityMinutes * 60 * 1000;
    const existingCodes = new Set(shortUrls.map(u => u.shortCode));
    const shortCode = generateShortCode(existingCodes);
    const newShort: ShortUrl = {
      shortCode,
      originalUrl: url.toString(),
      createdAt: now,
      expiresAt,
      clickCount: 0,
    };
    setShortUrls([newShort, ...shortUrls]);
    log('Shortened new URL', { shortCode, originalUrl: url.toString(), validityMinutes });
    setLongUrl('');
    setValidity('');
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(window.location.origin + '/s/' + code);
    setCopied(code);
    log('Copied short URL', { shortCode: code });
    setTimeout(() => setCopied(null), 1500);
  };

  const handleRedirect = (e: React.FormEvent) => {
    e.preventDefault();
    const found = shortUrls.find(u => u.shortCode === redirectCode);
    if (!found) {
      setRedirectResult('Short URL not found.');
      log('Redirection failed: code not found', { shortCode: redirectCode });
      return;
    }
    if (Date.now() > found.expiresAt) {
      setRedirectResult('This short URL has expired.');
      log('Redirection failed: code expired', { shortCode: redirectCode });
      return;
    }
    found.clickCount++;
    setShortUrls([...shortUrls]);
    setRedirectResult(`Redirected to: ${found.originalUrl}`);
    log('Short URL visited', { shortCode: redirectCode, originalUrl: found.originalUrl });
  };

  const now = Date.now();

  return (
    <div className="App">
      <h1>URL Shortener</h1>
      <form onSubmit={handleShorten} className="shorten-form">
        <input
          type="text"
          placeholder="Enter long URL"
          value={longUrl}
          onChange={e => setLongUrl(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Validity (minutes, default 30)"
          value={validity}
          onChange={e => setValidity(e.target.value)}
          min={1}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          Shorten
        </motion.button>
      </form>
      <h2>Shortened URLs</h2>
      <table className="url-table">
        <thead>
          <tr>
            <th>Short URL</th>
            <th>Original URL</th>
            <th>Clicks</th>
            <th>Expires In</th>
            <th>Copy</th>
          </tr>
        </thead>
        <AnimatePresence initial={false}>
          <tbody>
            {shortUrls.map(u => (
              <motion.tr
                key={u.shortCode}
                className={now > u.expiresAt ? 'expired' : ''}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <td>{window.location.origin + '/s/' + u.shortCode}</td>
                <td><a href={u.originalUrl} target="_blank" rel="noopener noreferrer">{u.originalUrl}</a></td>
                <td>{u.clickCount}</td>
                <td>{now > u.expiresAt ? 'Expired' : `${Math.max(0, Math.round((u.expiresAt - now) / 60000))} min`}</td>
                <td>
                  <motion.button
                    onClick={() => handleCopy(u.shortCode)}
                    animate={copied === u.shortCode ? { scale: 1.15, backgroundColor: '#28a745' } : { scale: 1, backgroundColor: '#007bff' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    {copied === u.shortCode ? 'Copied!' : 'Copy'}
                  </motion.button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </AnimatePresence>
      </table>
      <h2>Simulate Redirection</h2>
      <form onSubmit={handleRedirect} className="redirect-form">
        <input
          type="text"
          placeholder="Enter short code (e.g. abc123)"
          value={redirectCode}
          onChange={e => setRedirectCode(e.target.value)}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
        >
          Go
        </motion.button>
      </form>
      <AnimatePresence>
        {redirectResult && (
          <motion.div
            className="redirect-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {redirectResult}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => setShowLogs(l => !l)}
        className="logs-toggle"
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        {showLogs ? 'Hide Logs' : 'Show Logs'}
      </motion.button>
      <AnimatePresence>
        {showLogs && (
          <motion.div
            className="logs"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3>App Logs</h3>
            <ul>
              {getLogs().map((entry, idx) => (
                <li key={idx}>
                  <b>{entry.timestamp}</b>: {entry.message}
                  {entry.context && (
                    <pre>{JSON.stringify(entry.context, null, 2)}</pre>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
