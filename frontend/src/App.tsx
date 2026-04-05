import React, { useState, useEffect } from 'react';
import PortfolioView from './PortfolioView';
// Assuming a global CSS file for base styles might exist
// import './App.css';

/**
 * Generates a mock, unsigned JWT for a given party.
 * In a production environment, this should be replaced with a call to a secure
 * authentication service that returns a valid, signed JWT for the Canton JSON API.
 * The token payload must contain ledgerId, applicationId, and actAs claims.
 *
 * @param partyId The party ID to include in the 'actAs' claim.
 * @returns A base64-encoded mock JWT string.
 */
const generateMockJwt = (partyId: string): string => {
  // Replace with your actual ledgerId from your Canton configuration
  const ledgerId = "canton-asset-tokenization-participant1";
  
  const payload = {
    "https://daml.com/ledger-api": {
      "ledgerId": ledgerId,
      "applicationId": "canton-asset-tokenization",
      "actAs": [partyId]
    }
  };

  // Create a base64 encoded JWT (header.payload.signature)
  // This token has no signature and is for development purposes only.
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.`;
};


const App: React.FC = () => {
  const [party, setParty] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [partyInput, setPartyInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // On initial load, check for a saved session in local storage
  useEffect(() => {
    const savedParty = localStorage.getItem('app_party');
    const savedToken = localStorage.getItem('app_token');
    if (savedParty && savedToken) {
      setParty(savedParty);
      setToken(savedToken);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyInput.trim()) {
      setError("Party ID cannot be empty.");
      return;
    }
    setIsLoading(true);
    setError(null);

    // Simulate an async login process
    setTimeout(() => {
      try {
        const jwt = generateMockJwt(partyInput);
        setParty(partyInput);
        setToken(jwt);
        localStorage.setItem('app_party', partyInput);
        localStorage.setItem('app_token', jwt);
      } catch (err) {
        console.error("Login failed:", err);
        setError("Failed to log in. Please check the Party ID and try again.");
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const handleLogout = () => {
    setParty('');
    setToken(null);
    setPartyInput('');
    localStorage.removeItem('app_party');
    localStorage.removeItem('app_token');
  };

  // Render Login screen if not authenticated
  if (!token || !party) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>Canton Asset Tokenization</h1>
          <p style={styles.loginSubtitle}>Login to your participant node</p>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              value={partyInput}
              onChange={(e) => setPartyInput(e.target.value)}
              placeholder="Enter Party ID (e.g., Issuer, Investor1)"
              style={styles.input}
              disabled={isLoading}
              autoFocus
            />
            <button type="submit" style={styles.button} disabled={isLoading}>
              {isLoading ? 'Logging In...' : 'Login'}
            </button>
            {error && <p style={styles.errorText}>{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  // Render Main Dashboard if authenticated
  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Asset Tokenization Dashboard</h1>
        <div style={styles.userInfo}>
          <span>Welcome, <strong>{party}</strong></span>
          <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
        </div>
      </header>
      <main style={styles.mainContent}>
        <PortfolioView party={party} token={token} />
      </main>
      <footer style={styles.footer}>
        <p>Powered by Canton Network and Daml</p>
      </footer>
    </div>
  );
};

// Basic CSS-in-JS for styling without external CSS files
const styles: { [key: string]: React.CSSProperties } = {
  loginContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(to right, #6a11cb, #2575fc)',
    fontFamily: 'sans-serif',
  },
  loginBox: {
    padding: '40px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(31, 38, 135, 0.37)',
    backdropFilter: 'blur(4px)',
    textAlign: 'center',
    width: '100%',
    maxWidth: '420px',
  },
  loginTitle: {
    fontSize: '28px',
    color: '#333',
    marginBottom: '10px',
  },
  loginSubtitle: {
    fontSize: '16px',
    color: '#555',
    marginBottom: '30px',
  },
  input: {
    width: 'calc(100% - 24px)',
    padding: '12px',
    marginBottom: '20px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '16px',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease, transform 0.1s ease',
  },
  errorText: {
    color: '#d93025',
    marginTop: '15px',
  },
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f4f7f9',
    fontFamily: 'sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.75rem',
    color: '#2c3e50',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    color: '#34495e',
  },
  logoutButton: {
    padding: '0.6rem 1.2rem',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
  mainContent: {
    flex: 1,
    padding: '2rem',
  },
  footer: {
    padding: '1rem',
    textAlign: 'center',
    backgroundColor: '#2c3e50',
    color: '#ecf0f1',
    fontSize: '0.9rem',
  },
};

export default App;