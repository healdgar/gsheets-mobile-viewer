import React, { useState, useEffect } from 'react';
import MobileTableViewer from './components/MobileTableViewer';

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

  const fetchSheetData = async () => {
    if (!sheetId.trim()) {
      setError('Please enter a Google Sheet ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        id: sheetId.trim(),
        sheet: sheetName.trim(),
        ...(apiKey.trim() && { api_key: apiKey.trim() })
      });

      const response = await fetch(`/api?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data || 'Failed to fetch data');
      }

      if (data.rows && Array.isArray(data.rows)) {
        setSheetData(data.rows);
        setFilteredData(data.rows); // Initialize filtered data with all data
        
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
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div className="form-group" style={{ marginBottom: '0' }}>
                <label htmlFor="rowIdentifier">
                  Row Identifier Column:
                </label>
                <select
                  id="rowIdentifier"
                  value={rowIdentifierColumn}
                  onChange={(e) => setRowIdentifierColumn(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  {columns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label} ({col.key})
                    </option>
                  ))}
                </select>
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Column used for row identification in mobile view
                </small>
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label htmlFor="filterTerm">
                  Filter Search Term:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    id="filterTerm"
                    type="text"
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && applyFilter()}
                    placeholder="e.g., breakfast, recipe, etc."
                    style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
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
                <small style={{ color: '#666', fontSize: '12px' }}>
                  Show only rows containing this text
                </small>
              </div>
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