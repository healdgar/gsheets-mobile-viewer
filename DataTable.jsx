import React, { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { ThemeContext } from './ThemeContext.js'; // Adjust path if needed
import { ChevronUp, ChevronDown, Eye, EyeOff, Search, Smartphone } from 'lucide-react';
import MobileTableViewer from './MobileTableViewer/MobileTableViewer';

// Component to render text with enhanced markdown (links, bold, italic, strikethrough)
const TextWithLinks = ({ content }) => {
  if (!content) return null;
  
  // Convert to string and ensure we have valid content
  const textContent = String(content || '');
  
  // Process markdown and render as HTML
  const html = processMarkdown(textContent);
  
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

// Simplified markdown processor
function processMarkdown(text) {
  if (!text) return '';

  // Preserve <br> tags before HTML escaping by replacing them with a placeholder
  const brPlaceholder = '___BR_PLACEHOLDER___';
  let processedText = String(text) // Ensure text is a string
    .replace(/<br\s*\/?>/gi, brPlaceholder); // Replace <br> tags with placeholder
  
  // 1. Escape HTML from the input text (except the placeholders)
  const escapedText = processedText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Restore <br> tags after escaping
  const textWithBrRestored = escapedText.replace(new RegExp(brPlaceholder, 'g'), '<br>');
  
  // Helper function to apply inline markdown (bold, italic, strikethrough)
  function applyInlineFormatting(segment) {
    let temp = segment;
    // Process bold
    temp = temp.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    temp = temp.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // Process italic
    temp = temp.replace(/\*([^\*]+?)\*/g, '<em>$1</em>');
    temp = temp.replace(/_([^_]+?)_/g, '<em>$1</em>');
    // Process strikethrough
    temp = temp.replace(/~~(.*?)~~/g, '<del>$1</del>');
    return temp;
  }

  const parts = [];
  const linkRegex = /\[(.*?)\]\((.*?)\)/g; // Regex for [text](url)
  let lastIndex = 0;
  let match;

  // 2. Iteratively find and process links
  while ((match = linkRegex.exec(textWithBrRestored)) !== null) {
    const [fullMatch, linkContent, linkUrl] = match;
    const matchStart = match.index;

    // Add text segment before the link
    if (matchStart > lastIndex) {
      parts.push(textWithBrRestored.substring(lastIndex, matchStart));
    }

    // Process the link text for inline formatting
    const processedLinkContent = applyInlineFormatting(linkContent);
    
    // Add the formatted link
    parts.push(`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" style="word-break: break-word;">${processedLinkContent}</a>`);
    
    lastIndex = matchStart + fullMatch.length;
  }

  // Add any remaining text after the last link
  if (lastIndex < textWithBrRestored.length) {
    parts.push(textWithBrRestored.substring(lastIndex));
  }
  
  // If textWithBrRestored was empty or contained only a link that started at index 0 and spanned the whole string,
  // parts might be ['link'] or parts might be empty if textWithBrRestored was empty.
  // If textWithBrRestored had content but no links, parts will contain [textWithBrRestored].

  // 3. Process inline formatting for non-link parts
  const finalHtmlParts = parts.map(part => {
    // If the part is an <a> tag, it's already processed and should not be touched further.
    if (part.startsWith('<a href=')) { 
      return part;
    } else {
      return applyInlineFormatting(part);
    }
  });

  return finalHtmlParts.join('');
}

// Process column keys to properly format them with preserved acronyms
function processColumnKey(key) {
  if (!key) return '';
  
  // Identify all acronyms (2+ uppercase letters)
  const acronyms = new Set();
  const acronymMatches = key.match(/\b[A-Z]{2,}\b/g) || [];
  acronymMatches.forEach(match => acronyms.add(match));
  
  // Create a safe version of the key with placeholders for acronyms
  let processed = key;
  const acronymMap = new Map();
  
  // Replace each acronym with a placeholder
  Array.from(acronyms).forEach((acronym, index) => {
    const placeholder = `__ACRO${index}__`;
    acronymMap.set(placeholder, acronym);
    
    // Replace only whole word matches using word boundaries
    const regex = new RegExp(`\\b${acronym}\\b`, 'g');
    processed = processed.replace(regex, placeholder);
  });
  
  // Format camelCase with spaces
  processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Capitalize first letter
  processed = processed.replace(/^[a-z]/, match => match.toUpperCase());
  
  // Restore acronyms
  for (const [placeholder, acronym] of acronymMap.entries()) {
    processed = processed.replace(new RegExp(placeholder, 'g'), acronym);
  }
  
  return processed;
}

// Define BREAKPOINTS outside the component to avoid recreation on every render
const BREAKPOINTS = [
  { width: 575, maxColumns: 2 },
  { width: 767, maxColumns: 3 },
  { width: 991, maxColumns: 4 },
  { width: 1199, maxColumns: 5 },
  { width: 1399, maxColumns: 7 },
];

const MIN_COLUMN_WIDTH = 120;

// Reusable DataTable Component
const DataTable = ({ dataUrl, title = "Data Table", viewportWidth }) => {
  const { theme } = useContext(ThemeContext);
  const [rawData, setRawData] = useState([]);
  const [columnShadingInfo, setColumnShadingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableWidth, setTableWidth] = useState('100%');
  const [visibleColumns, setVisibleColumns] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Mobile table viewer state
  const [isMobileViewerActive, setIsMobileViewerActive] = useState(false);
  const [initialMobileFocus, setInitialMobileFocus] = useState({ rowIndex: 0, colIndex: 0 });

  // Store previous values to prevent unnecessary rerenders
  const prevColumnsRef = useRef([]);
  const prevViewportWidthRef = useRef(0);
  
  // Use ref to get the actual parent container width
  const containerRef = useRef(null);

  // --- Data Fetching Logic ---
  useEffect(() => {
    const fetchDataAndStyling = async () => {
      if (!dataUrl) {
        setError("No data URL provided.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        setColumnShadingInfo(null); // Reset styling info on new data load

        // Fetch main data
        const dataResponse = await fetch(dataUrl);
        if (!dataResponse.ok) {
          throw new Error(`HTTP error fetching data! status: ${dataResponse.status}`);
        }
        const data = await dataResponse.json();
        if (Array.isArray(data)) {
          setRawData(data);
        } else {
          // Handle cases where main data might be in the new structured format by mistake,
          // or if it's just not an array as expected.
          if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
            console.warn(`[${title}] Main data URL (${dataUrl}) returned a structured object. Using 'data' property. Consider using a direct array for dataUrl.`);
            setRawData(data.data);
          } else {
            console.error(`[${title}] Main data from ${dataUrl} is not an array as expected. Received:`, data);
            setRawData([]);
            setError("Unexpected data format for main content.");
            // We might still try to load styling, or decide to stop here.
            // For now, let's assume we stop if main data is bad.
            setLoading(false);
            return;
          }
        }

        // Attempt to fetch styling data
        const stylingUrl = dataUrl.replace(/\.json$/, '.styling.json');
        if (stylingUrl !== dataUrl) { // Ensure the URL changed (i.e., it was a .json file)
          try {
            const stylingResponse = await fetch(stylingUrl);
            if (stylingResponse.ok) {
              const stylingData = await stylingResponse.json();
              if (stylingData && typeof stylingData === 'object') {
                // Assuming stylingData is the columnShadingInfo object itself
                setColumnShadingInfo(stylingData);
                console.log(`[${title}] Successfully loaded styling from ${stylingUrl}`);
              } else {
                console.warn(`[${title}] Styling data from ${stylingUrl} is not a valid object. Received:`, stylingData);
              }
            } else if (stylingResponse.status === 404) {
              console.log(`[${title}] Optional styling file not found at ${stylingUrl}. Proceeding with default styles.`);
            } else {
              console.warn(`[${title}] Failed to fetch styling file from ${stylingUrl}. Status: ${stylingResponse.status}`);
            }
          } catch (styleError) {
            console.warn(`[${title}] Error processing styling file from ${stylingUrl}: ${styleError.message}`);
          }
        }
      } catch (e) {
        console.error(`[${title}] Failed to fetch data or styling:`, e);
        setError(`Failed to load data from ${dataUrl}. Error: ${e.message}`);
        setRawData([]); // Ensure rawData is empty on error
      } finally {
        setLoading(false);
      }
    };
    fetchDataAndStyling();
  }, [dataUrl, title]); // Added title to dependency array for logging context

  // Effect to update table width when viewport changes
  useEffect(() => {
    const updateTableWidth = () => {
      if (containerRef.current) {
        setTableWidth(`${containerRef.current.clientWidth}px`);
      }
    };

    // Initial measurement
    updateTableWidth();

    // Store current ref
    const currentContainer = containerRef.current;
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateTableWidth);
    if (currentContainer) {
      resizeObserver.observe(currentContainer);
    }

    return () => {
      if (currentContainer) {
        resizeObserver.unobserve(currentContainer);
      }
    };
  }, [viewportWidth]); // Only depend on viewportWidth

  // Column Definition Logic
  const columns = useMemo(() => {
    if (rawData.length === 0 || !rawData[0]) return [];
    const firstRowKeys = Object.keys(rawData[0]);
    return firstRowKeys.map(key => ({
      key: key,
      label: processColumnKey(key),
      width: 180,
      shading: columnShadingInfo && columnShadingInfo[key] ? columnShadingInfo[key] : null,
    }));
  }, [rawData, columnShadingInfo]);

  // Update visible columns when columns or viewport changes
  useEffect(() => {
    // Skip if dependencies haven't changed
    if (
      columns === prevColumnsRef.current && 
      viewportWidth === prevViewportWidthRef.current
    ) {
      return;
    }
    
    // Update refs
    prevColumnsRef.current = columns;
    prevViewportWidthRef.current = viewportWidth;
    
    if (columns.length === 0) {
      setVisibleColumns({});
      return;
    }
    
    // Calculate columns to show - use stable sort
    const sortedBreakpoints = [...BREAKPOINTS].sort((a, b) => a.width - b.width);
    let columnsToShow = columns.length;
    
    const activeBreakpoint = sortedBreakpoints.find(bp => viewportWidth <= bp.width);
    if (activeBreakpoint) {
      columnsToShow = activeBreakpoint.maxColumns;
    }
    
    const maxFitColumns = Math.floor(viewportWidth / MIN_COLUMN_WIDTH);
    if (maxFitColumns > 0) {
      columnsToShow = Math.min(columnsToShow, maxFitColumns, columns.length);
    } else if (columns.length > 0) {
      columnsToShow = 1;
    }
    
    if (columns.length > 0) {
      columnsToShow = Math.max(1, Math.min(columnsToShow, columns.length));
    } else {
      columnsToShow = 0;
    }
    
    // Create new visibility state object
    const newVisibleColumns = {};
    columns.forEach((col, index) => {
      newVisibleColumns[col.key] = index < columnsToShow;
    });
    
    setVisibleColumns(newVisibleColumns);
  }, [columns, viewportWidth]); // No BREAKPOINTS dependency

  // --- State Management (Visibility, Sort, Filter) ---
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleColumnVisibility = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = rawData;
    if (searchTerm) {
      filtered = rawData.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    if (sortConfig.key && columns.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        const directionModifier = sortConfig.direction === 'asc' ? 1 : -1;
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
        }
        return comparison * directionModifier;
      });
    }
    return filtered;
  }, [rawData, searchTerm, sortConfig, columns]);

  const calculateColumnWidths = useMemo(() => {
    if (rawData.length === 0 || columns.length === 0) return {};
    const contentLengths = {};
    const visibleColumnKeys = columns
      .filter(col => visibleColumns[col.key])
      .map(col => col.key);
    if (visibleColumnKeys.length === 0) return {};
    visibleColumnKeys.forEach(key => {
      contentLengths[key] = { totalChars: 0, samples: 0, avgLength: 0, weight: 0 };
    });
    rawData.forEach(row => {
      visibleColumnKeys.forEach(key => {
        if (row[key]) {
          const cleanContent = String(row[key]).replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Corrected regex for markdown links
          contentLengths[key].totalChars += cleanContent.length;
          contentLengths[key].samples++;
        }
      });
    });
    let totalAvgLength = 0;
    visibleColumnKeys.forEach(key => {
      const avgLength = contentLengths[key].samples > 0
        ? contentLengths[key].totalChars / contentLengths[key].samples
        : 0;
      const scaledLength = avgLength > 0 ? Math.log2(avgLength) * 10 : 10;
      contentLengths[key].avgLength = Math.max(10, Math.min(100, scaledLength));
      totalAvgLength += contentLengths[key].avgLength;
    });
    visibleColumnKeys.forEach(key => {
      if (totalAvgLength > 0) {
        contentLengths[key].weight = contentLengths[key].avgLength / totalAvgLength;
      } else {
        contentLengths[key].weight = 1 / visibleColumnKeys.length;
      }
    });
    const widthMap = {};
    visibleColumnKeys.forEach(key => {
      widthMap[key] = `${Math.max(5, Math.round(contentLengths[key].weight * 100))}%`;
    });
    return widthMap;
  }, [rawData, columns, visibleColumns]);

  const getColumnWidth = (column, index) => {
    if (!visibleColumns || !visibleColumns[column.key]) return '0';
    const calculatedWidth = calculateColumnWidths[column.key];
    const priorityMultiplier = 1;
    if (calculatedWidth) {
      const numericWidth = parseFloat(calculatedWidth);
      if (!isNaN(numericWidth)) {
        return `${Math.min(40, numericWidth * priorityMultiplier)}%`;
      }
      return calculatedWidth;
    }
    const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;
    return `${Math.floor(100 / (visibleColumnCount || 1))}%`;
  };

  // Mobile viewer handlers
  const handleCellClickForMobile = (rowIndex, colIndex) => {
    if (viewportWidth < 768) { // Use same breakpoint as used elsewhere
      setInitialMobileFocus({ rowIndex, colIndex });
      setIsMobileViewerActive(true); 
    }
  };

  const openMobileViewer = () => {
    // Set initial focus to the first cell by default
    setInitialMobileFocus({ rowIndex: 0, colIndex: 0 });
    setIsMobileViewerActive(true); 
  };

  const closeMobileViewer = () => {
    setIsMobileViewerActive(false);
  };

  const getCellColor = (value) => {
    const stringValue = String(value);
    const plainText = stringValue.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove markdown links
    const lowerPlainText = plainText.toLowerCase();

    if (lowerPlainText.startsWith('yes')) return 'cell-yes';

    if (lowerPlainText.startsWith('no')) {
      // Check for "but" within the first two sentences
      let firstSentenceEnd = -1;
      let secondSentenceEnd = -1;
      const terminators = ['.', '!', '?'];
      
      for (let i = 0; i < plainText.length; i++) {
        if (terminators.includes(plainText[i])) {
          if (firstSentenceEnd === -1) {
            firstSentenceEnd = i;
          } else {
            secondSentenceEnd = i;
            break; 
          }
        }
      }

      let searchScopeEnd = plainText.length;
      if (secondSentenceEnd !== -1) {
        searchScopeEnd = secondSentenceEnd + 1; 
      } else if (firstSentenceEnd !== -1) {
        searchScopeEnd = firstSentenceEnd + 1; 
      }
      
      const textToSearchForBut = plainText.substring(0, searchScopeEnd);
      
      if (textToSearchForBut.toLowerCase().includes('but')) {
        return ''; // "no" at the start, and "but" is found within the relevant scope
      }
      return 'cell-no'; // "no" at the start, and no "but" found
    }
    return '';
  };

  // --- Render Logic ---
  if (loading) {
    return <div>Loading data...</div>; // Changed from Loading...
  }
  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>; // Changed from {error}
  }
  
  // If mobile viewer is active, render it instead of the table
  if (isMobileViewerActive) {
    return (
      <MobileTableViewer
        tableData={filteredAndSortedData}
        columns={columns} // Pass all columns to the mobile viewer
        initialFocus={initialMobileFocus}
        onClose={closeMobileViewer}
        theme={theme}
      />
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ color: theme?.blogTextColor || '#000', marginBottom: '1rem' }}>{title}</h1>

      {/* Mobile View Button - only shown on small screens */}
      {viewportWidth < 768 && ( 
        <button 
          onClick={openMobileViewer}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            backgroundColor: theme?.buttonBackgroundColor || '#007bff',
            color: theme?.buttonTextColor || 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            width: '100%',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            fontWeight: 'bold',
            transition: 'transform 0.2s, background-color 0.2s'
          }}
        >
          <Smartphone size={20} />
          <span>Mobile Table Nav</span>
        </button>
      )}

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: theme?.blogTextColor || '#000', zIndex: 1 }} />
        <input
          type="text"
          placeholder="Search table..."
          style={{
            width: '100%',
            padding: '0.5rem 0.5rem 0.5rem 2.5rem',
            border: `1px solid ${theme?.tableBorderColor || '#ccc'}`,
            borderRadius: '4px',
            backgroundColor: theme?.blogPostContentBackgroundColor || '#fff',
            color: theme?.blogTextColor || '#000',
            boxSizing: 'border-box',
          }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Column Visibility Controls */}
      <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {columns.map((column) => (
          <button
            key={`visibility-${column.key}`}
            onClick={() => toggleColumnVisibility(column.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '4px 8px',
              border: `1px solid ${theme?.tableBorderColor || '#ccc'}`,
              borderRadius: '4px',
              background: visibleColumns[column.key] ? (theme?.tableHeaderBackground || '#f2f2f2') : 'transparent',
              color: theme?.blogTextColor || '#000',
              cursor: 'pointer',
              fontSize: '0.55rem', // Adjusted font size for buttons
            }}
            title={`${String(column.label).replace(/\[(.*?)\]\(.*?\)/g, '$1')} ${visibleColumns[column.key] ? `(width: ${calculateColumnWidths[column.key] || 'auto'})` : ''}`}
          >
            {visibleColumns[column.key] ? <EyeOff size={14} style={{ marginRight: '4px' }} /> : <Eye size={14} style={{ marginRight: '4px' }} />}
            <TextWithLinks content={column.label} />
          </button>
        ))}
      </div>

      <style>
        {`
          .cell-yes {
            background-color: ${theme?.mode === 'dark' ? 'rgba(46, 139, 87, 0.25)' : 'rgba(220, 255, 220, 0.6)'}; /* Faint SeaGreen for dark, Faint light green for light */
          }
          .cell-no {
            background-color: ${theme?.mode === 'dark' ? 'rgba(178, 34, 34, 0.25)' : 'rgba(255, 220, 220, 0.6)'}; /* Faint Firebrick for dark, Faint light red for light */
          }
          /* Example CSS classes that could be targeted by LLM shading hints */
          .llm-highlight-header {
            /* Define styles for LLM-suggested header class */
            font-style: italic;
          }
          .llm-highlight-cell {
            /* Define styles for LLM-suggested cell class */
            font-weight: bold;
          }
        `}
      </style>

      {/* Table Container - MODIFIED for better sticky header behavior */}
      <div style={{
        overflowX: 'auto',
        overflowY: 'auto',
        width: '100%',
        flex: 1,
        position: 'relative',
      }}>
        {filteredAndSortedData.length > 0 ? (
          <table 
            data-datatable-controlled="true" // Added this attribute
            style={{
            width: tableWidth,
            maxWidth: '100%',
            borderCollapse: 'collapse', // Revert to standard collapse
            border: `${theme?.tableBorder || '1px solid'} ${theme?.tableBorderColor || '#ccc'}`,
            tableLayout: 'fixed',
          }}>
            <colgroup>
              {columns.map((column, index) => (
                visibleColumns[column.key] ? (
                  <col
                    key={`col-${column.key}`}
                    style={{
                      width: getColumnWidth(column, index),
                    }}
                  />
                ) : null
              ))}
            </colgroup>
            <thead style={{
              backgroundColor: theme?.tableHeaderBackground || '#f2f2f2',
              // Remove position: 'sticky', top: 0, and zIndex properties
            }}>
              <tr>
                {columns.map((column) => (
                  visibleColumns[column.key] && (
                    <th
                      key={column.key}
                      className={column.shading?.headerClass || ''} // Apply LLM/external class
                      style={{
                        // backgroundColor is important for th to cover content when thead is sticky
                        backgroundColor: theme?.tableHeaderBackground || '#f2f2f2',
                        padding: '0.75rem 0.5rem',
                        textAlign: 'left',
                        fontWeight: 'bold',
                        borderBottom: `${theme?.tableBorder || '1px solid'} ${theme?.tableBorderColor || '#ccc'}`,
                        cursor: 'pointer',
                        color: theme?.blogTextColor || '#000',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        ...(column.shading?.headerStyle || {}), // Apply LLM/external style
                      }}
                      onClick={() => handleSort(column.key)}
                      title={String(column.label).replace(/\\[(.*?)\\]\\(.*?\\)/g, '$1')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '5px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.8rem' /* Added font size for header text */ }}>
                          <TextWithLinks content={column.label} />
                        </span>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', flexShrink: 0 }}>
                          <ChevronUp size={12} style={{ opacity: sortConfig.key === column.key && sortConfig.direction === 'asc' ? 1 : 0.3 }} />
                          <ChevronDown size={12} style={{ opacity: sortConfig.key === column.key && sortConfig.direction === 'desc' ? 1 : 0.3 }} />
                        </div>
                      </div>
                    </th>
                  )
                ))}
              </tr>
            </thead>
            <tbody style={{ backgroundColor: theme?.blogPostContentBackgroundColor || '#fff' }}>
              {filteredAndSortedData.map((row, rowIndex) => {
                const rowStyle = {
                  borderBottom: `${theme?.tableBorder || '1px solid'} ${theme?.tableBorderColor || '#ccc'}`,
                  backgroundColor: 'inherit', // Default to inherit tbody background
                };

                // Apply alternating row color for odd rows (index is 0-based)
                if (rowIndex % 2 !== 0) {
                  rowStyle.backgroundColor = theme.tableRowOddBackground || 
                                             (theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)');
                } else if (theme.tableRowEvenBackground) { // Explicit even background from theme
                  rowStyle.backgroundColor = theme.tableRowEvenBackground;
                }

                return (
                  <tr key={rowIndex} style={rowStyle}>
                    {columns.map((column, colIndex) => (
                      visibleColumns[column.key] && (
                        <td
                          key={column.key}
                          className={`${getCellColor(row[column.key])} ${column.shading?.cellClass || ''}`} // Apply LLM/external class
                          onClick={() => handleCellClickForMobile(rowIndex, colIndex)}
                          style={{
                            padding: '0.5rem',
                            verticalAlign: 'top',
                            color: theme?.blogTextColor || '#000',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            wordWrap: 'break-word',
                            maxWidth: '1px',
                            ...(column.shading?.cellStyle || {}), // Apply LLM/external style
                          }}
                        >
                          <div style={{
                            maxHeight: column.key === 'focus' || column.key === 'subjectMatter' || column.key === 'obligations' ? '300px' : 'none',
                            overflowY: column.key === 'focus' || column.key === 'subjectMatter' || column.key === 'obligations' ? 'auto' : 'visible',
                            fontSize: '0.70rem' // Adjusted font size for table cell content
                          }}>
                            <TextWithLinks content={row[column.key]} />
                          </div>
                        </td>
                      )
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: theme?.blogTextColor || '#000' }}>
            No data available.
          </div>
        )}
      </div>

      {/* This mobile table viewer code is not needed as we're using the openMobileViewer button for activation */}
    </div>
  );
};

export default DataTable;