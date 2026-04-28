import React, { useState, useEffect } from 'react';
import { DamlLedger } from '@c7/react';
import PortfolioView from './PortfolioView';
import './App.css'; // Assuming some basic styling exists

// In a production environment, these would come from environment variables
const LEDGER_HOST = process.env.REACT_APP_LEDGER_HOST || 'localhost';
const LEDGER_PORT = process.env.REACT_APP_LEDGER_PORT || '7575';
const LEDGER_URL = `http://${LEDGER_HOST}:${LEDGER_PORT}`;

/**
 * In a real application, you would get this token from an authentication service (e.g., OAuth).
 * For local development, we generate a dummy token for a given party.
 * This function creates a JWT with no signature, which is sufficient for a local sandbox
 * that doesn't enforce JWT signature validation.
 * @param party The party ID to embed in the token.
 * @returns A dummy JWT string.
 */
const createToken = (party: string): string => {
  const payload = {
    "https://daml.com/ledger-api": {
      "ledgerId": "sandbox", // This should match your sandbox ledger ID
      "participantId": "sandbox-participant",
      "applicationId": "canton-asset-tokenization-app",
      "actAs": [party],
      "readAs": [party]
    }
  };
  // Simple Base64 encoding for a dummy JWT (header.payload.signature)
  const header = btoa(JSON.stringify({ "alg": "none", "typ": "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.`;
};


const LoginScreen: React.FC<{ onLogin: (party: string) => void }> = ({ onLogin }) => {
  const [partyId, setPartyId] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (partyId.trim()) {
      onLogin(partyId.trim());
    }
  };

  const handlePresetLogin = (party: string) => {
    setPartyId(party);
    onLogin(party);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">Canton Asset Tokenization</h1>
        <p className="login-subtitle">Please log in with your Party ID</p>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            className="login-input"
            placeholder="Enter Party ID"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            autoFocus
          />
          <button type="submit" className="login-button">Login</button>
        </form>
        <div className="preset-logins">
            <p>Or use a preset party:</p>
            <button onClick={() => handlePresetLogin("AssetManager")}>AssetManager</button>
            <button onClick={() => handlePresetLogin("Alice")}>Alice</button>
            <button onClick={() => handlePresetLogin("Bob")}>Bob</button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [credentials, setCredentials] = useState<{ party: string; token: string } | null>(null);

  useEffect(() => {
    // Attempt to load credentials from local storage on component mount
    const savedParty = localStorage.getItem('partyId');
    if (savedParty) {
      handleLogin(savedParty);
    }
  }, []);

  const handleLogin = (party: string) => {
    const token = createToken(party);
    localStorage.setItem('partyId', party);
    setCredentials({ party, token });
  };

  const handleLogout = () => {
    localStorage.removeItem('partyId');
    setCredentials(null);
  };

  if (!credentials) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <DamlLedger token={credentials.token} party={credentials.party} httpBaseUrl={LEDGER_URL}>
      <div className="app-container">
        <header className="app-header">
          <h1>Asset Tokenization Platform</h1>
          <div className="user-info">
            <span>Logged in as: <strong>{credentials.party}</strong></span>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        </header>
        <main className="app-main">
          <PortfolioView />
        </main>
        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} Canton Asset Tokenization. Powered by Canton.</p>
        </footer>
      </div>
    </DamlLedger>
  );
};

export default App;