import React, { useState, useEffect } from 'react';
import MobileTableViewer from './components/MobileTableViewer';
import OAuthManager from './components/OAuthManager';

// Cookie utility functions
const setCookie = (name, value, days = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${JSON.stringify(value)};expires=${expires.toUTCString()};path=/`;
};

const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      try {
        return JSON.parse(c.substring(nameEQ.length, c.length));
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

const App = () => {
  const [sheetData, setSheetData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobileViewerActive, setIsMobileViewerActive] = useState(false);
  
  // Form state
  const [sheetId, setSheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [apiKey, setApiKey] = useState('');
  
  // Mobile viewer configuration
  const [rowIdentifierColumn, setRowIdentifierColumn] = useState('');
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  
  // Recent sheets state
  const [recentSheets, setRecentSheets] = useState([]);
  
  // OAuth state
  const [hasOAuth, setHasOAuth] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  // Load recent sheets from cookies on component mount
  useEffect(() => {
    const saved = getCookie('recentSheets');
    if (saved && Array.isArray(saved)) {
      setRecentSheets(saved);
    }
    
    // Check if running in Electron
    setIsElectron(!!window.electronAPI?.isElectron);
  }, []);

  // Save a sheet to recent sheets
  const saveToRecentSheets = (id, name, data, spreadsheetTitle) => {
    // Use the actual Google Sheets title, with fallback
    let title = spreadsheetTitle || `${name} (${id.substring(0, 8)}...)`;
    
    // If we have the spreadsheet title, format it nicely
    if (spreadsheetTitle && spreadsheetTitle !== 'Unknown Sheet') {
      // If sheet name is not the default 'Sheet1', include it
      if (name && name !== 'Sheet1') {
        title = `${spreadsheetTitle} (${name})`;
      } else {
        title = spreadsheetTitle;
      }
    }

    const newSheet = {
      id,
      name,
      title,
      lastAccessed: new Date().toISOString(),
      rowCount: data ? data.length : 0
    };

    // Remove existing entry with same ID and name
    const filtered = recentSheets.filter(sheet => !(sheet.id === id && sheet.name === name));
    
    // Add to beginning and limit to 5 recent sheets
    const updated = [newSheet, ...filtered].slice(0, 5);
    
    setRecentSheets(updated);
    setCookie('recentSheets', updated);
  };

  // Load a sheet from recent sheets
  const loadRecentSheet = (sheet) => {
    setSheetId(sheet.id);
    setSheetName(sheet.name);
    // Trigger fetch after state is set
    setTimeout(() => {
      fetchSheetData();
    }, 100);
  };

  // Remove a sheet from recent sheets
  const removeRecentSheet = (index) => {
    const updated = recentSheets.filter((_, i) => i !== index);
    setRecentSheets(updated);
    setCookie('recentSheets', updated);
  };

  const fetchSheetData = async () => {
    if (!sheetId.trim()) {
      setError('Please enter a Google Sheet ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prepare request parameters
      const params = new URLSearchParams({
        id: sheetId.trim(),
        sheet: sheetName.trim()
      });

      // Add authentication - prefer OAuth over API key
      if (isElectron && hasOAuth && window.electronAPI) {
        try {
          const oauthToken = await window.electronAPI.getOAuthToken();
          if (oauthToken) {
            params.append('oauth_token', oauthToken);
          } else if (apiKey.trim()) {
            params.append('api_key', apiKey.trim());
          }
        } catch (oauthError) {
          console.warn('Failed to get OAuth token, falling back to API key:', oauthError);
          if (apiKey.trim()) {
            params.append('api_key', apiKey.trim());
          }
        }
      } else if (apiKey.trim()) {
        params.append('api_key', apiKey.trim());
      }

      const response = await fetch(`/api?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data || 'Failed to fetch data');
      }

      if (data.rows && Array.isArray(data.rows)) {
        setSheetData(data.rows);
        setFilteredData(data.rows); // Initialize filtered data with all data
        
        // Save to recent sheets on successful load (use spreadsheet title from API)
        saveToRecentSheets(sheetId.trim(), sheetName.trim(), data.rows, data.title);
        
        // Create columns from the first row keys
        if (data.rows.length > 0) {
          const firstRow = data.rows[0];
          const cols = Object.keys(firstRow).map((key, index) => ({
            key,
            label: formatColumnLabel(key),
            visible: true
          }));
          setColumns(cols);
          
          // Auto-select row identifier column (prefer common identifier names)
          const idColumns = ['id', 'name', 'title', 'recipe', 'item', 'description'];
          const foundIdColumn = idColumns.find(id => firstRow[id] !== undefined);
          const defaultIdColumn = foundIdColumn || Object.keys(firstRow)[0];
          setRowIdentifierColumn(defaultIdColumn);
        }
        
        // Reset filter search term when new data loads
        setFilterSearchTerm('');
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      setError(error.message || 'Failed to fetch sheet data');
    } finally {
      setLoading(false);
    }
  };

  const formatColumnLabel = (key) => {
    // Convert camelCase to Title Case with proper spacing
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^[a-z]/, match => match.toUpperCase());
  };

  const extractSheetIdFromUrl = (url) => {
    // Extract sheet ID from Google Sheets URL
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const handleSheetIdChange = (e) => {
    const value = e.target.value;
    // If it looks like a URL, extract the ID
    const extractedId = extractSheetIdFromUrl(value);
    setSheetId(extractedId);
  };

  const applyFilter = () => {
    if (!filterSearchTerm.trim()) {
      setFilteredData(sheetData);
      return;
    }

    const searchTerm = filterSearchTerm.toLowerCase().trim();
    const filtered = sheetData.filter(row => {
      // Search in all columns for the term
      return Object.values(row).some(value => 
        value && String(value).toLowerCase().includes(searchTerm)
      );
    });
    
    setFilteredData(filtered);
  };

  const clearFilter = () => {
    setFilterSearchTerm('');
    setFilteredData(sheetData);
  };

  const openMobileViewer = () => {
    if (filteredData.length > 0) {
      setIsMobileViewerActive(true);
    }
  };

  const closeMobileViewer = () => {
    setIsMobileViewerActive(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      fetchSheetData();
    }
  };

  const handleOAuthChange = (isAuthenticated) => {
    setHasOAuth(isAuthenticated);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Google Sheets Mobile Viewer</h1>
        <p>Enter your Google Sheet details to view data in a mobile-friendly format</p>
      </div>

      <div className="form-section">
        <div className="form-group">
          <label htmlFor="sheetId">
            Google Sheet ID or URL:
          </label>
          <input
            id="sheetId"
            type="text"
            value={sheetId}
            onChange={handleSheetIdChange}
            onKeyPress={handleKeyPress}
            placeholder="Enter Sheet ID or paste full Google Sheets URL"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="sheetName">
            Sheet Name:
          </label>
          <input
            id="sheetName"
            type="text"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Sheet1"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="apiKey">
            Google API Key (optional):
          </label>
          <input
            id="apiKey"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Leave empty to use server default"
            disabled={loading}
          />
        </div>

        <button 
          onClick={fetchSheetData} 
          disabled={loading || !sheetId.trim()}
        >
          {loading ? 'Loading...' : 'Load Sheet Data'}
        </button>
      </div>

      {/* OAuth Manager - only show in Electron */}
      <OAuthManager onAuthChange={handleOAuthChange} />

      {/* Recent Sheets */}
      {recentSheets.length > 0 && (
        <div className="form-section" style={{ marginTop: '20px' }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Recent Sheets</h3>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            maxWidth: '800px'
          }}>
            {recentSheets.map((sheet, index) => (
              <div 
                key={`${sheet.id}-${sheet.name}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  ':hover': {
                    backgroundColor: '#f0f0f0',
                    borderColor: '#007bff'
                  }
                }}
                onClick={() => loadRecentSheet(sheet)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                  e.currentTarget.style.borderColor = '#007bff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9f9f9';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '14px', 
                    color: '#333',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {sheet.title}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <span>ID: {sheet.id.substring(0, 12)}...</span>
                    <span>Sheet: {sheet.name}</span>
                    <span>{sheet.rowCount} rows</span>
                    <span>
                      {new Date(sheet.lastAccessed).toLocaleDateString()} {new Date(sheet.lastAccessed).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentSheet(index);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px',
                    marginLeft: '8px',
                    borderRadius: '3px',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#dc3545';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#999';
                  }}
                  title="Remove from recent sheets"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginTop: '8px' 
          }}>
            Click any recent sheet to load it, or ✕ to remove from history
          </div>
        </div>
      )}

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {sheetData.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Sheet Data ({sheetData.length} rows loaded)</h3>
          
          {/* Mobile Viewer Configuration */}
          <div className="form-section" style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Mobile Viewer Configuration</h4>
            
            {/* Row Identifier Column - Full Width */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="rowIdentifier">
                Row Identifier Column:
              </label>
              <select
                id="rowIdentifier"
                value={rowIdentifierColumn}
                onChange={(e) => setRowIdentifierColumn(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', maxWidth: '400px' }}
              >
                {columns.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label} ({col.key})
                  </option>
                ))}
              </select>
              <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Column used for row identification in mobile view
              </small>
            </div>

            {/* Filter Search Term - Full Width */}
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label htmlFor="filterTerm">
                Filter Search Term:
              </label>
              <div style={{ display: 'flex', gap: '8px', maxWidth: '600px' }}>
                <input
                  id="filterTerm"
                  type="text"
                  value={filterSearchTerm}
                  onChange={(e) => setFilterSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
                  placeholder="e.g., breakfast, recipe, etc."
                  style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minWidth: '200px' }}
                />
                <button 
                  onClick={applyFilter}
                  style={{ padding: '10px 15px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Filter
                </button>
                {filterSearchTerm && (
                  <button 
                    onClick={clearFilter}
                    style={{ padding: '10px 15px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Show only rows containing this text
              </small>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '10px 0'
            }}>
              <div style={{ color: '#666' }}>
                {filteredData.length !== sheetData.length ? (
                  <span>
                    Showing <strong>{filteredData.length}</strong> of {sheetData.length} rows
                    {filterSearchTerm && (
                      <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#e9ecef', borderRadius: '3px', fontSize: '12px' }}>
                        "{filterSearchTerm}"
                      </span>
                    )}
                  </span>
                ) : (
                  `Showing all ${sheetData.length} rows`
                )}
              </div>
              
              <button 
                onClick={openMobileViewer}
                disabled={filteredData.length === 0}
                style={{ 
                  padding: '12px 24px', 
                  background: filteredData.length > 0 ? '#007bff' : '#ccc', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: filteredData.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '16px'
                }}
              >
                📱 Open Mobile View ({filteredData.length} rows)
              </button>
            </div>
          </div>

          {/* Basic table preview */}
          <div style={{ 
            overflowX: 'auto', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead style={{ 
                backgroundColor: '#f8f9fa',
                position: 'sticky',
                top: 0
              }}>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} style={{ 
                      padding: '8px 12px', 
                      borderBottom: '2px solid #dee2e6',
                      textAlign: 'left',
                      fontWeight: 'bold'
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 10).map((row, index) => (
                  <tr key={index} style={{ 
                    borderBottom: '1px solid #e9ecef',
                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                  }}>
                    {columns.map((col) => (
                      <td key={col.key} style={{ 
                        padding: '8px 12px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {row[col.key] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredData.length > 10 && (
              <div style={{ 
                padding: '10px', 
                textAlign: 'center', 
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #dee2e6',
                fontSize: '12px',
                color: '#6c757d'
              }}>
                Showing first 10 rows of {filteredData.length} filtered rows
                {filteredData.length !== sheetData.length && (
                  <span> (total: {sheetData.length})</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isMobileViewerActive && (
        <MobileTableViewer
          tableData={filteredData}
          columns={columns}
          rowIdentifierColumn={rowIdentifierColumn}
          filterSearchTerm={filterSearchTerm}
          initialFocus={{ rowIndex: 0, colIndex: 0 }}
          onClose={closeMobileViewer}
          theme={{ mode: 'light' }}
        />
      )}
    </div>
  );
};

export default App; 