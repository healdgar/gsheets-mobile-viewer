import React, { useState, useEffect } from 'react';

const OAuthManager = ({ onAuthChange }) => {
  const [oauthStatus, setOauthStatus] = useState({
    hasAuth: false,
    configured: false,
    isElectronMode: false
  });
  const [config, setConfig] = useState({
    clientId: '',
    clientSecret: '',
    hasConfig: false
  });
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkServerMode();
    loadOAuthStatus();
    loadOAuthConfig();
  }, [onAuthChange]);

  const checkServerMode = async () => {
    try {
      const response = await fetch('/health');
      const data = await response.json();
      setOauthStatus(prev => ({ ...prev, isElectronMode: data.electronMode }));
    } catch (error) {
      console.error('Error checking server mode:', error);
    }
  };

  const loadOAuthStatus = async () => {
    try {
      const response = await fetch('/oauth/status');
      const status = await response.json();
      setOauthStatus(prev => ({ ...prev, ...status }));
      if (onAuthChange) {
        onAuthChange(status.hasAuth);
      }
    } catch (error) {
      console.error('Error loading OAuth status:', error);
    }
  };

  const loadOAuthConfig = async () => {
    try {
      const response = await fetch('/oauth/config');
      const configData = await response.json();
      setConfig(configData);
      setShowConfig(!configData.hasConfig);
    } catch (error) {
      console.error('Error loading OAuth config:', error);
    }
  };

  const handleLogin = async () => {
    if (!oauthStatus.configured) {
      setError('Please configure OAuth credentials first');
      setShowConfig(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (oauthStatus.isElectronMode) {
        // Open OAuth login URL in new tab
        window.open('/oauth/login', '_blank');
        
        setError('OAuth window opened. After authentication, you can close that window and return here.');
        
        // Check status periodically
        const checkInterval = setInterval(async () => {
          await loadOAuthStatus();
          if (oauthStatus.hasAuth) {
            clearInterval(checkInterval);
            setError('✅ Authentication successful! You can now access private spreadsheets.');
          }
        }, 3000);
        
        // Stop checking after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
        }, 300000);
      } else {
        setError('OAuth is only available in desktop mode');
      }
    } catch (error) {
      setError(error.message || 'OAuth login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);

    try {
      // In desktop mode, we can't directly logout, but we can clear status
      if (oauthStatus.isElectronMode) {
        setOauthStatus(prev => ({ ...prev, hasAuth: false }));
        if (onAuthChange) {
          onAuthChange(false);
        }
        setError('To fully logout, restart the desktop application or clear OAuth tokens from the system tray menu.');
      } else {
        setError('OAuth logout is only available in desktop mode');
      }
    } catch (error) {
      setError(error.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async () => {
    if (!config.clientId.trim() || !config.clientSecret.trim()) {
      setError('Please provide both Client ID and Client Secret');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/oauth/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: config.clientId.trim(),
          clientSecret: config.clientSecret.trim()
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfig(prev => ({ ...prev, hasConfig: true }));
        setOauthStatus(prev => ({ ...prev, configured: true }));
        setShowConfig(false);
        await loadOAuthStatus();
      } else {
        setError(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      setError(error.message || 'Failed to save OAuth configuration');
    } finally {
      setLoading(false);
    }
  };

  // Only render if in desktop mode
  if (!oauthStatus.isElectronMode) {
    return null;
  }

  return (
    <div className="oauth-manager">
      <div className="form-section" style={{ marginTop: '20px' }}>
        <h3 style={{ 
          marginBottom: '15px', 
          color: '#333',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          🔐 OAuth Authentication
          <span style={{ 
            fontSize: '12px',
            background: oauthStatus.hasAuth ? '#d4edda' : '#f8d7da',
            color: oauthStatus.hasAuth ? '#155724' : '#721c24',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 'normal'
          }}>
            {oauthStatus.hasAuth ? 'Authenticated' : 'Not Authenticated'}
          </span>
        </h3>

        {error && (
          <div style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '15px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {showConfig && (
          <div style={{
            background: '#f9f9f9',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '15px',
            border: '1px solid #e0e0e0'
          }}>
            <h4 style={{ marginTop: '0', marginBottom: '15px', color: '#333' }}>
              Configure Google OAuth
            </h4>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Google Client ID:
              </label>
              <input
                type="text"
                value={config.clientId}
                onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="Enter your Google OAuth Client ID"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Google Client Secret:
              </label>
              <input
                type="password"
                value={config.clientSecret}
                onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                placeholder="Enter your Google OAuth Client Secret"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{
              background: '#d1ecf1',
              color: '#0c5460',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '15px',
              fontSize: '14px'
            }}>
              <strong>Setup Instructions:</strong>
              <ol style={{ marginTop: '10px', marginBottom: '0', paddingLeft: '20px' }}>
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></li>
                <li>Create a new project or select existing one</li>
                <li>Enable the Google Sheets API</li>
                <li>Create OAuth 2.0 credentials (Application type: <strong>Web application</strong>)</li>
                <li>Add redirect URI: <code>http://localhost:3005/oauth/callback</code></li>
                <li>On the <strong>OAuth consent screen</strong> tab, scroll to <em>Test users</em> and click <strong>Add users</strong> – add the Google account(s) you will sign in with.</li>
                <li>Copy the Client ID and Client Secret here</li>
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleConfigSave}
                disabled={loading}
                style={{
                  background: '#28a745',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
              
              <button
                onClick={() => setShowConfig(false)}
                disabled={loading}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!oauthStatus.hasAuth ? (
            <button
              onClick={handleLogin}
              disabled={loading || !oauthStatus.configured}
              style={{
                background: oauthStatus.configured ? '#007bff' : '#6c757d',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: (loading || !oauthStatus.configured) ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {loading ? 'Connecting...' : 'Connect to Google'}
            </button>
          ) : (
            <button
              onClick={handleLogout}
              disabled={loading}
              style={{
                background: '#dc3545',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px'
              }}
            >
              {loading ? 'Disconnecting...' : 'Disconnect'}
            </button>
          )}

          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              background: 'none',
              color: '#007bff',
              padding: '12px 16px',
              border: '1px solid #007bff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {showConfig ? 'Hide Config' : 'Configure OAuth'}
          </button>
        </div>

        <div style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '10px'
        }}>
          {oauthStatus.configured 
            ? '✅ OAuth is configured and ready to use' 
            : '⚠️ OAuth configuration required for private sheets'}
        </div>
      </div>
    </div>
  );
};

export default OAuthManager; 